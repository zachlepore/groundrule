import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { noticeRecommendation,validateNoticePolicy,validateNoticeQc,validateNoticeBindings } from '../scripts/gis/clearwater-rule003-notice-policy.mjs';
const json=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url)));
const policy=await json('research/gis/rule003-notice-policy.v2.json'),config=await json('research/gis/rule003-approval.bounded-v1.json'),manifest=await json('scripts/gis/clearwater-rule001-source.json'),human=await json('research/gis/rule003-manual-qc/human-observations.v1.json');
test('strict six-percent notice boundary uses the unrounded value, including adjacent doubles',()=>{
  for(const p of [0,.005949,5.841653,5.999999,6-2**-50,6])assert.equal(noticeRecommendation(p),'NOT_PROMINENT_IN_ORDINARY_GUIDES');
  for(const p of [6+2**-50,6.0000001,6.000001,10])assert.equal(noticeRecommendation(p),'RECOMMENDED_PHYSICAL_PROJECT_GUIDES');
  for(const p of [NaN,Infinity,-1,null,'6.1'])assert.throws(()=>noticeRecommendation(p));
});
test('policy cannot inherit approval after source, membership, geometry-basis or legal-semantics drift',()=>{
  validateNoticePolicy(policy,config,manifest);
  for(const mutate of [p=>p.thresholdPercent=3,p=>p.membershipSha256='changed',p=>p.sourceArchiveSha256='changed',p=>p.investigationInventorySha256='changed',p=>p.sourceOrGeometryOrMembershipChangeRequiresReassessment=false,p=>p.legalZoningExemption=true,p=>p.boundaryCorrection=true,p=>p.observedMaximumOsrPercent=6,p=>p.expected.addresses++]){
    const p=structuredClone(policy);mutate(p);assert.throws(()=>validateNoticePolicy(p,config,manifest));
  }
});
const inventory=()=>human.records.map(r=>({parcelId:r.parcelId,osrPercent:r.osrPercent,remainingProfiles:r.sourceAddressIds.map((addressId,i)=>({addressId,address:i===0?r.address:'other linked address'}))}));
test('changed geometry cannot reuse human QC even if percentages and membership are unchanged',()=>{
  const actual={geometrySha256:policy.geometryEvidenceSha256,membershipSha256:policy.membershipSha256,inventorySha256:policy.investigationInventorySha256};
  validateNoticeBindings(policy,actual);
  for(const key of Object.keys(actual))assert.throws(()=>validateNoticeBindings(policy,{...actual,[key]:'0'.repeat(64)}));
});
test('all 25 visual findings are identity-checked without becoming legal determinations',()=>{
  assert.equal(validateNoticeQc(human,inventory()).size,25);
  for(const change of [h=>h.records.pop(),h=>h.records[0].parcelId='replacement',h=>h.records[0].osrPercent+=.000001,h=>h.records[0].sourceAddressIds.pop(),h=>h.records[0].humanReview.legalBoundaryDetermination=true]){
    const h=structuredClone(human);change(h);assert.throws(()=>validateNoticeQc(h,inventory()));
  }
});
