#!/usr/bin/env node
/** Verified approved export -> read-only, stratified human QC evidence. No policy writes. */
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir,access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const SQFT_PER_SQM=1/(.3048*.3048);
export const BANDS=[[0,.25],[.25,.5],[.5,1],[1,2],[2,3],[3,5],[5,10],[10,Infinity]];
export const THRESHOLDS=[0,.5,1,2,3,5];
const QUOTAS=[5,2,2,5,0,5,6,0];
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function digest(p){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(p)){h.update(b);bytes+=b.length;}return {sha256:h.digest('hex'),bytes};}
export const bandIndex=p=>BANDS.findIndex(([lo,hi])=>p>lo&&p<=hi);
export const counts=rs=>({addresses:rs.reduce((s,r)=>s+r.addresses.length,0),parcels:rs.length});
export function sensitivity(population){return THRESHOLDS.map(threshold=>({thresholdPercent:threshold,remaining:counts(population.filter(r=>r.osrPercent>threshold)),suppressed:counts(population.filter(r=>r.osrPercent<=threshold))}));}
function canonicalRing(ring){
  const points=ring.slice(0,-1).map(p=>JSON.stringify(p));
  const rotations=a=>a.map((_,i)=>a.slice(i).concat(a.slice(0,i)).join('|')).sort()[0];
  return [rotations(points),rotations(points.slice().reverse())].sort()[0];
}
export function footprintKey(g){
  const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  return hash(JSON.stringify(polys.map(p=>[canonicalRing(p[0]),p.slice(1).map(canonicalRing).sort()]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))));
}
export function selectSample(population){
  const selected=[],footprints=new Set(),contexts=new Set();
  const context=r=>r.sampleContextKey??r.footprintKey;
  const add=(r,reason)=>{if(r&&!footprints.has(r.footprintKey)&&!contexts.has(context(r))){selected.push({...r,selectionReason:reason});footprints.add(r.footprintKey);contexts.add(context(r));return true;}return false;};
  for(let i=0;i<BANDS.length;i++){
    const pool=population.filter(r=>bandIndex(r.osrPercent)===i),target=Math.min(QUOTAS[i],new Set(pool.map(context)).size);
    if(!target)continue;
    const start=selected.length;
    // In the lowest band explicitly stress absolute-area and address concentrations.
    if(i===0){for(const r of pool.slice().sort((a,b)=>b.osrAreaSqFt-a.osrAreaSqFt||a.parcelId.localeCompare(b.parcelId)).slice(0,3))add(r,'Large absolute OS/R area despite <=0.25% coverage; shared/multiple-address exposure.');}
    const nearest=(t)=>pool.slice().sort((a,b)=>Math.abs(a.osrPercent-t)-Math.abs(b.osrPercent-t)||b.osrAreaSqFt-a.osrAreaSqFt||a.parcelId.localeCompare(b.parcelId));
    for(const boundary of [BANDS[i][0],BANDS[i][1]]){
      if(selected.length-start>=target)break;
      for(const r of nearest(boundary))if(add(r,`Nearest available distinct footprint to ${boundary}% band/notice boundary; not an example at an absent threshold.`))break;
    }
    for(const r of pool.slice().sort((a,b)=>b.osrAreaSqFt-a.osrAreaSqFt||a.parcelId.localeCompare(b.parcelId))){
      if(selected.length-start>=target)break;
      add(r,i>=5?'Exhaustive >3% parcel stratum; inspect mapped edge/project applicability.':'Absolute-area stress case within this percentage stratum; preserve uncertainty.');
    }
    assert.equal(selected.length-start,target,`Insufficient distinct footprints for band ${i}`);
  }
  return selected.map((r,i)=>({...r,caseId:`R003-QC-${String(i+1).padStart(2,'0')}`,humanQc:'',prominentNoticeWarranted:'',reviewerNotes:''}));
}
export async function run(source,approved,output){
  [source,approved,output]=[source,approved,output].map(p=>path.resolve(p));
  assert.ok(![source,approved].some(p=>output===p||output.startsWith(p+path.sep)));
  try{await access(output);throw new Error('Fresh QC output required');}catch(e){if(e.code!=='ENOENT')throw e;}
  const manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json'));
  for(const [f,v] of Object.entries(manifest.files))assert.deepEqual(await digest(path.join(source,f)),v,`Frozen source ${f}`);
  const checks=await json(path.join(approved,'output-checksums.json'));
  for(const [f,v] of Object.entries(checks)){assert.ok(!f.split('/').includes('..')&&!path.isAbsolute(f));assert.deepEqual(await digest(path.join(approved,f)),v,`Approved output ${f}`);}
  const config=await json(path.join(ROOT,'research/gis/rule003-approval.bounded-v1.json'));
  assert.deepEqual(await json(path.join(approved,'rule003-approval-config.json')),config);
  const provenance=await json(path.join(approved,'provenance.json'));
  assert.deepEqual(await digest(path.join(ROOT,'research/gis/rule003-approval.bounded-v1.json')),provenance.rule003ApprovalConfig);
  const membership=await json(path.join(ROOT,config.scope.membershipFile));assert.deepEqual(await json(path.join(approved,'rule003-membership.json')),membership);
  const members=new Map(membership.categories.approvedCandidates.map(m=>[m.addressId,m.parcelId]));
  const originals=await json(path.join(source,'property-profiles.json')),approvedRows=[],ruleCounts={};let n=0;
  for await(const l of createInterface({input:createReadStream(path.join(approved,'clearwater-approved-address-lookup.jsonl')),crlfDelay:Infinity})){
    const row=JSON.parse(l),{researchRule001,researchRule002,approvedPrimaryGuidance:a,...original}=row;
    assert.deepEqual(original,originals[n++],'Original profile/evidence changed');
    if(a.status==='GUIDANCE_READY_APPROVED')ruleCounts[a.ruleId]=(ruleCounts[a.ruleId]??0)+1;
    if(a.ruleId==='CLR-Z-003'){
      assert.equal(members.get(row.sourceAddressIdentifier),String(row.parcelIdentifier));assert.equal(row.status,'review');assert.equal(row.zoningCode,'MDR');
      assert.equal(a.noticeThresholdPercent,0);assert.equal(a.osrNoticeText,config.presentation.noticeText);assert.equal(a.osrNoticeRecommendation,'RECOMMENDED_PHYSICAL_PROJECT_GUIDES');approvedRows.push(row);
    }
  }
  assert.equal(n,63430);assert.deepEqual(ruleCounts,{'CLR-Z-001':1967,'CLR-Z-002':262,'CLR-Z-003':731});
  assert.deepEqual(approvedRows.map(r=>r.sourceAddressIdentifier).sort((a,b)=>a-b),[...members.keys()].sort((a,b)=>a-b));
  const inventory=await json(path.join(approved,'investigation/parcel-inventory.json'));
  const zoning=await json(path.join(source,'zoning.geojson'));
  const maps=await json(path.join(approved,'investigation/map-geometries.json')),mapById=new Map(maps.map(r=>[r.parcelId,r]));
  const parcelIds=new Set(members.values());assert.equal(parcelIds.size,146);
  const population=inventory.filter(r=>parcelIds.has(r.parcelId)).map(r=>{
    assert.deepEqual(r.flags,[]);assert.deepEqual(r.investigativeHolds,[]);assert.deepEqual(r.districts,['mdr','os/r']);
    const addresses=approvedRows.filter(a=>String(a.parcelIdentifier)===r.parcelId).map(a=>({address:a.displayAddress,addressId:a.sourceAddressIdentifier,originalStatus:a.status,primary:a.zoningCode,sourceFlags:a.issues,coordinates:a.addressCoordinates}));
    const osr=r.evidence.zoningCodeCoverage.find(z=>z.normalizedZoningCode==='os/r'),geometry={...mapById.get(r.parcelId),contextZoningFeatures:r.evidence.zoningFeatures.map(z=>{
      const feature=zoning.features[z.sourceIndex];assert.equal(feature.properties.OBJECTID,z.sourceIdentifier);
      return {district:z.normalizedZoningCode,feature};
    })};
    const g=geometry.parcel.geometry,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates,points=polys.flat(2);
    const bounds=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
    // Sampling context only: avoid near-identical unit-footprint panels. Never alters source geometry or population counts.
    const sampleContextKey=bounds.map(v=>v.toFixed(6)).join(',');
    return {parcelId:r.parcelId,addresses,primary:'MDR',secondary:'OS/R',parcelAreaSqM:r.evidence.parcelAreaSquareMeters,parcelAreaSqFt:r.evidence.parcelAreaSquareMeters*SQFT_PER_SQM,osrAreaSqM:osr.intersectionAreaSquareMeters,osrAreaSqFt:osr.intersectionAreaSquareMeters*SQFT_PER_SQM,osrPercent:r.osrPercent,flags:r.flags,sourceQualityEvidence:r.evidence,noticeRecommendation:'RECOMMENDED_PHYSICAL_PROJECT_GUIDES',noticeThresholdPercent:0,footprintKey:footprintKey(g),sampleContextKey,geometry};
  }).sort((a,b)=>a.parcelId.localeCompare(b.parcelId));
  assert.deepEqual(counts(population),{addresses:731,parcels:146});
  const sample=selectSample(population);assert.equal(sample.length,25);assert.equal(new Set(sample.map(r=>r.footprintKey)).size,25);
  assert.equal(new Set(sample.map(r=>r.sampleContextKey)).size,25);
  const grouped={};for(const r of population)(grouped[r.footprintKey]??=[]).push(r.parcelId);
  const outliers=population.filter(r=>r.osrAreaSqFt>=250||r.osrPercent>3||r.addresses.length>1).map(({geometry,...r})=>({...r,reasons:[...(r.osrAreaSqFt>=250?['OSR_area_at_least_250_sqft_analysis_marker_not_legal_cutoff']:[]),...(r.osrPercent>3?['above_3_percent']:[]),...(r.addresses.length>1?['multiple_addresses']:[])]}));
  const combined=[];for(const pct of [.5,1,2,3,5])for(const area of [100,250,500,1000]){
    const remaining=population.filter(r=>r.osrPercent>pct||r.osrAreaSqFt>area);
    combined.push({percentThreshold:pct,areaThresholdSqFt:area,operator:'percent > threshold OR area > threshold',remaining:counts(remaining),suppressed:counts(population.filter(r=>!(r.osrPercent>pct||r.osrAreaSqFt>area))),rescuedFromPercentSuppression:counts(population.filter(r=>r.osrPercent<=pct&&r.osrAreaSqFt>area))});
  }
  const quantiles=xs=>Object.fromEntries([0,.25,.5,.75,.9,.95,1].map(q=>[q,xs.slice().sort((a,b)=>a-b)[Math.floor(q*(xs.length-1))]]));
  const summary={evidenceOnly:true,noPolicyChange:true,sourceSnapshotId:manifest.snapshotId,sourceArchiveSha256:manifest.archiveSha256,originalProfiles:n,ruleCounts,population:counts(population),uniqueCanonicalFootprints:Object.keys(grouped).length,
    sampleParcels:sample.length,sampleAddresses:sample.reduce((s,r)=>s+r.addresses.length,0),bands:BANDS.map(([lo,hi],i)=>({band:`>${lo}–${hi===Infinity?'unbounded':hi}%`,...counts(population.filter(r=>bandIndex(r.osrPercent)===i)),sampleParcels:sample.filter(r=>bandIndex(r.osrPercent)===i).length})),
    parcelWeightedQuantiles:{percent:quantiles(population.map(r=>r.osrPercent)),areaSqFt:quantiles(population.map(r=>r.osrAreaSqFt))},sensitivity:sensitivity(population),combinedPolicyIllustrations:combined,
    exclusionsRetained:Object.fromEntries(Object.entries(membership.categories).filter(([k])=>k!=='approvedCandidates').map(([k,rs])=>[k,rs.length])),sourceQAFlagsRetained:true,
    sourceManifest:manifest,inputApprovedLookup:await digest(path.join(approved,'clearwater-approved-address-lookup.jsonl')),inputApprovedManifest:await digest(path.join(approved,'output-checksums.json')),inputApprovalConfig:await digest(path.join(ROOT,'research/gis/rule003-approval.bounded-v1.json')),preparer:await digest(fileURLToPath(import.meta.url)),areaConversionSqFtPerSqM:SQFT_PER_SQM,largeAreaMarkerSqFt:250,largeAreaMarkerMeaning:'INVESTIGATION_MARKER_ONLY_NOT_SIGNIFICANCE_OR_PROPOSED_POLICY',sharedFootprintParcelGroups:Object.values(grouped).filter(g=>g.length>1)};
  await mkdir(output,{recursive:true});
  for(const [name,v] of Object.entries({'population.json':population,'sample.json':sample,'analysis.json':summary,'outliers.json':outliers}))await writeFile(path.join(output,name),JSON.stringify(v,null,2)+'\n');
  console.log(JSON.stringify(summary,null,2));return summary;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)await run(...process.argv.slice(2));
