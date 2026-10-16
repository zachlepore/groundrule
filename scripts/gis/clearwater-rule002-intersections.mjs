/** Narrow OS/R screening supplement, using Rule 001's existing Turf area conventions. */
import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import bbox from '@turf/bbox';
import area from '@turf/area';
import booleanValid from '@turf/boolean-valid';
import intersect from '@turf/intersect';
import { featureCollection } from '@turf/helpers';
import RBush from 'rbush';
import { normalizeZoning } from './clearwater-pilot.mjs';
export const indexItem=(feature,index=0)=>{const [minX,minY,maxX,maxY]=bbox(feature);return {minX,minY,maxX,maxY,feature,index};};
const round=n=>Number(n.toFixed(6));
const valid=f=>{try{return booleanValid(f);}catch{return false;}};
export function measureOsrParcel(parcel,entries){
  const errors=[];
  const overlap=(a,b)=>{try{const f=intersect(featureCollection([a,b]));return f?area(f):0;}catch{errors.push('intersection_error');return null;}};
  const parcelArea=area(parcel);
  const zoningFeatures=[];
  for(const e of entries){
    const a=overlap(parcel,e.feature);
    if(a==null||a<=0.000001)continue;
    zoningFeatures.push({sourceIndex:e.index,sourceIdentifier:e.feature.properties.OBJECTID,
      rawZoningCode:e.feature.properties.ZONING,normalizedZoningCode:normalizeZoning(e.feature.properties.ZONING),
      geometryValid:valid(e.feature),multipart:e.feature.geometry.type==='MultiPolygon',
      intersectionAreaSquareMeters:round(a),percentOfParcel:round(100*a/parcelArea)});
  }
  const zoningCodeCoverage=[...new Set(zoningFeatures.map(e=>e.normalizedZoningCode))].sort().map(normalizedZoningCode=>{
    const group=zoningFeatures.filter(e=>e.normalizedZoningCode===normalizedZoningCode);
    let overlappingPolygons=false;
    for(let a=0;a<group.length;a++)for(let b=a+1;b<group.length;b++){
      if(overlap(entries.find(e=>e.index===group[a].sourceIndex).feature,entries.find(e=>e.index===group[b].sourceIndex).feature)>0.000001)overlappingPolygons=true;
    }
    return {normalizedZoningCode,featureCount:group.length,repeatedPolygons:group.length>1,overlappingPolygons,
      intersectionAreaSquareMeters:round(group.reduce((s,e)=>s+e.intersectionAreaSquareMeters,0)),percentOfParcel:round(group.reduce((s,e)=>s+e.percentOfParcel,0))};
  });
  return {parcelIdentifier:String(parcel.properties.PARCELID??parcel.properties.STRAP),parcelFound:true,
    parcelGeometryValid:valid(parcel),parcelMultipart:parcel.geometry.type==='MultiPolygon',parcelAreaSquareMeters:round(parcelArea),
    hasInvalidZoningGeometry:zoningFeatures.some(e=>!e.geometryValid),hasRepeatedNormalizedCode:zoningCodeCoverage.some(e=>e.repeatedPolygons),
    hasOverlappingSameCodePolygons:zoningCodeCoverage.some(e=>e.overlappingPolygons),
    totalZoningCoveragePercent:round(zoningCodeCoverage.reduce((s,e)=>s+e.percentOfParcel,0)),zoningFeatures,zoningCodeCoverage,
    sourceErrors:[...new Set(errors)],evidenceMethod:'rule002_supplemental_exact_intersection'};
}
if(parentPort&&workerData){
  const zoning=JSON.parse(await readFile(`${workerData.input}/zoning.geojson`,'utf8'));
  const parcels=JSON.parse(await readFile(`${workerData.input}/parcels.geojson`,'utf8'));
  const tree=new RBush();tree.load(zoning.features.map(indexItem));
  const ids=new Set(workerData.ids),results=[];let count=0;
  for(const p of parcels.features){
    if(!ids.has(String(p.properties.PARCELID??p.properties.STRAP)))continue;
    results.push(measureOsrParcel(p,tree.search(indexItem(p))));
    if(++count%500===0)parentPort.postMessage({progress:count,total:ids.size});
  }
  parentPort.postMessage({results});
}
