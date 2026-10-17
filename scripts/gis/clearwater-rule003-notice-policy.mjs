/** Presentation only. Membership/classification eligibility is independent. */
import assert from 'node:assert/strict';
export const POLICY_ID='CLR-Z-003-NOTICE-6PCT-2026-10-17';
export const POLICY_VERSION='2.0.0-approved-presentation';
export function noticeRecommendation(percent){
  assert.ok(Number.isFinite(percent)&&percent>=0&&percent<=100.1,'Finite mapped percentage required');
  return percent>6?'RECOMMENDED_PHYSICAL_PROJECT_GUIDES':'NOT_PROMINENT_IN_ORDINARY_GUIDES';
}
export function validateNoticePolicy(p,config,manifest){
  assert.equal(p.schemaVersion,1);assert.equal(p.policyId,POLICY_ID);assert.equal(p.policyVersion,POLICY_VERSION);assert.ok(p.authorization);
  assert.equal(p.basisCommit,'9d6331c');assert.equal(p.ruleId,'CLR-Z-003');assert.equal(p.membershipApprovalId,config.approvalId);
  assert.equal(p.sourceSnapshotId,manifest.snapshotId);assert.equal(p.sourceArchiveSha256,manifest.archiveSha256);
  assert.equal(p.thresholdPercent,6);assert.equal(p.comparison,'STRICT_GREATER_THAN_WITHOUT_ROUNDING');
  for(const key of ['appliesOnlyToPinnedMembership','sourceOrGeometryOrMembershipChangeRequiresReassessment','presentationOnly','preserveProjectSpecificCaveats'])assert.equal(p[key],true,key);
  assert.equal(p.legalZoningExemption,false);assert.equal(p.boundaryCorrection,false);
  assert.equal(p.membershipSha256,config.basisFileSha256['research/gis/rule003-membership.v1.json']);
  assert.equal(p.investigationInventorySha256,config.investigationInventorySha256);
  assert.equal(p.observedMaximumOsrPercent,5.841653);
  assert.deepEqual(p.expected,{addresses:731,parcelIds:146,reviewedParcelIds:25,prominent:0,nonProminent:731});
  for(const key of ['geometryEvidenceSha256','originalApprovalConfigSha256'])assert.match(p[key],/^[a-f0-9]{64}$/);
  for(const name of ['research/gis/rule003-manual-qc/human-observations.v1.json','research/gis/rule003-manual-qc/six-percent-decision-memo.md','research/gis/rule003-manual-qc/analysis.json','research/gis/rule003-manual-qc/sample-index.csv','scripts/gis/assess-clearwater-rule003-notice.py'])assert.match(p.evidenceSha256[name],/^[a-f0-9]{64}$/);
}
export function validateNoticeQc(human,inventory){
  assert.equal(human.ruleId,'CLR-Z-003');assert.equal(human.sourceSnapshotId,'clearwater-gis-2026-09-28');assert.equal(human.records.length,25);
  assert.equal(new Set(human.records.map(r=>r.parcelId)).size,25);
  const references=new Map();
  human.records.forEach((r,i)=>{
    assert.equal(r.caseId,`R003-QC-${String(i+1).padStart(2,'0')}`);
    const parcel=inventory.find(p=>p.parcelId===r.parcelId);assert.ok(parcel,'Reviewed parcel must remain in frozen scope');
    assert.equal(r.osrPercent,parcel.osrPercent);assert.equal(r.address,parcel.remainingProfiles[0].address);
    assert.deepEqual(r.sourceAddressIds.slice().sort((a,b)=>a-b),parcel.remainingProfiles.map(a=>a.addressId).sort((a,b)=>a-b));
    assert.equal(r.humanReview.result,'NEGLIGIBLE_FOR_PROMINENT_SPLIT_ZONING_NOTICE');
    assert.equal(r.humanReview.legalBoundaryDetermination,false);assert.equal(r.humanReview.doesNotEraseMappedOsr,true);
    references.set(r.parcelId,r.caseId);
  });
  return references;
}
export function validateNoticeBindings(policy,actual){
  assert.equal(actual.geometrySha256,policy.geometryEvidenceSha256,'Geometry changed: notice QC reassessment required');
  assert.equal(actual.membershipSha256,policy.membershipSha256,'Membership changed: notice QC reassessment required');
  assert.equal(actual.inventorySha256,policy.investigationInventorySha256,'Investigation changed: notice QC reassessment required');
}
