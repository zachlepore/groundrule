import test from 'node:test';
import assert from 'node:assert/strict';
import { bandIndex,footprintKey,selectSample,sensitivity,SQFT_PER_SQM } from '../scripts/gis/prepare-clearwater-rule003-qc.mjs';
test('percentage bands are lower exclusive and do not manufacture empty 2–3 or >10 bands',()=>{
  assert.equal(bandIndex(.25),0);assert.equal(bandIndex(.5),1);assert.equal(bandIndex(1),2);assert.equal(bandIndex(2),3);assert.equal(bandIndex(3),4);assert.equal(bandIndex(5),5);assert.equal(bandIndex(10),6);assert.equal(bandIndex(0),-1);
});
test('sensitivity keeps address weighting separate from distinct parcel IDs and strict thresholds',()=>{
  const p=[{osrPercent:.5,addresses:[{},{}]},{osrPercent:1,addresses:[{}]},{osrPercent:3,addresses:[{}, {}, {}]}];
  const s=sensitivity(p);assert.deepEqual(s[0].remaining,{addresses:6,parcels:3});assert.deepEqual(s[1].remaining,{addresses:4,parcels:2});assert.deepEqual(s[2].remaining,{addresses:3,parcels:1});assert.deepEqual(s[4].suppressed,{addresses:6,parcels:3});
  assert.ok(Math.abs(SQFT_PER_SQM-10.763910416709722)<1e-12);
});
test('canonical footprint ignores ring starting point and orientation without rounding source geometry',()=>{
  const g={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
  const r={type:'Polygon',coordinates:[[[1,1],[1,0],[0,0],[0,1],[1,1]]]};assert.equal(footprintKey(g),footprintKey(r));
  const changed=structuredClone(g);changed.coordinates[0][1][0]+=.000000001;assert.notEqual(footprintKey(g),footprintKey(changed));
});
test('sampling is deterministic, removes duplicate footprints and leaves human fields blank',()=>{
  const pool=[.01,.02,.03,.1,.24,.3,.49,.6,.99,1.1,1.2,1.5,1.7,1.9,3.1,3.2,4,4.5,4.9,5.1,5.2,6,7,8,9].map((osrPercent,i)=>({parcelId:String(i).padStart(3,'0'),osrPercent,osrAreaSqFt:i,footprintKey:String(i),addresses:[{}]}));
  pool.push({...pool[0],parcelId:'duplicate'});
  const before=structuredClone(pool),sample=selectSample(pool);assert.equal(sample.length,25);assert.equal(new Set(sample.map(r=>r.footprintKey)).size,25);assert.deepEqual(sample,selectSample(pool));assert.deepEqual(pool,before);
  for(const r of sample){assert.equal(r.humanQc,'');assert.equal(r.prominentNoticeWarranted,'');assert.equal(r.reviewerNotes,'');}
});
test('near-identical unit context cannot create extra panels even when exact geometry keys differ',()=>{
  const pool=[.01,.02,.03,.1,.24].map((osrPercent,i)=>({parcelId:String(i),osrPercent,osrAreaSqFt:i,footprintKey:String(i),sampleContextKey:String(i),addresses:[{}]}));
  pool.push({...pool[0],parcelId:'other-unit',footprintKey:'different-exact-coordinates',osrAreaSqFt:999});
  const sample=selectSample(pool);assert.equal(sample.length,5);assert.equal(new Set(sample.map(r=>r.sampleContextKey)).size,5);
});
