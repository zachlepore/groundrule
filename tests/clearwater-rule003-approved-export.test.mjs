import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateApproval,reconcileMembership,approveRecord,assess,NOTICE,UNCERTAINTIES } from '../scripts/gis/export-clearwater-approved-rule003.mjs';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url)));
const config=await read('../research/gis/rule003-approval.bounded-v1.json');
const membership=await read('../research/gis/rule003-membership.v1.json');
const manifest=await read('../scripts/gis/clearwater-rule001-source.json');
function fixture(percent=1){
  const member={addressId:7,parcelId:'p'};
  const row={sourceAddressIdentifier:7,parcelIdentifier:'p',status:'review',zoningCode:'MDR',normalizedJurisdiction:'clearwater',jurisdictionStatus:'confirmed',issues:['parcel_ambiguous_zoning'],sourceSnapshots:{preserve:true},researchRule001:{preserve:true},researchRule002:{preserve:true},approvedPrimaryGuidance:{status:'NO_NEW_APPROVAL',ruleId:null,originalZoningCode:'MDR',originalSourceQaStatus:'review'}};
  const parcel={parcelId:'p',districts:['mdr','os/r'],flags:[],investigativeHolds:[],knownReviews:[],crossCodeOverlapM2:0,osrPercent:percent,
    evidence:{parcelFound:true,parcelGeometryValid:true,parcelAreaSquareMeters:100,hasInvalidZoningGeometry:false,totalZoningCoveragePercent:100,zoningCodeCoverage:[{normalizedZoningCode:'mdr',percentOfParcel:100-percent,intersectionAreaSquareMeters:100-percent},{normalizedZoningCode:'os/r',percentOfParcel:percent,intersectionAreaSquareMeters:percent}],zoningFeatures:[{sourceIdentifier:123}]},
    addressPointEvidence:[{addressId:7,insideLinkedParcel:true,mappedDistrictsAtAddress:['mdr']}],representativePointEvidence:[{addressId:7,mappedDistricts:['mdr']}]};
  return {row,parcel,member};
}
test('Rule 003 authorization rejects changed scope, source, count, threshold or notice wording',()=>{
  validateApproval(config,manifest);
  for(const mutate of [c=>c.scope.maximumNewApprovals++,c=>c.presentation.osrNoticeProminentWhenPercentGreaterThan=3,c=>c.presentation.osrNoticeProminentWhenPercentGreaterThan=2,c=>c.presentation.secondaryOsrAppliesToEntireParcel=true,c=>c.presentation.noticeText+='x',c=>c.uncertainties.pop(),c=>c.sourceArchiveSha256='wrong',c=>c.expected.maximumTotalApproved++]){const c=structuredClone(config);mutate(c);assert.throws(()=>validateApproval(c,manifest));}
});
test('membership pins all 884 identities and rejects equal-count substitutions and category moves',()=>{
  const population=Object.entries(membership.categories).flatMap(([kind,rows])=>rows.map(m=>({parcelId:m.parcelId,districts:kind==='additionalDistricts'?['mdr','os/r','p']:['mdr','os/r'],flags:kind==='unsupportedOsrPrimary'?['unrelated_source_profile_issue']:[],investigativeHolds:kind==='addressLinkHolds'?['address_link']:[],remainingProfiles:[{addressId:m.addressId}]})));
  assert.deepEqual(reconcileMembership(population,membership),membership.categories);
  const changed=structuredClone(population);changed[0].remainingProfiles[0].addressId=999999999;assert.throws(()=>reconcileMembership(changed,membership));
  const moved=structuredClone(population);moved[0].investigativeHolds=['address_link'];assert.throws(()=>reconcileMembership(moved,membership));
  assert.deepEqual(membership.categories.addressLinkHolds.map(m=>m.addressId).sort((a,b)=>a-b),[639060,645435]);
});
test('positive OSR intersections retain evidence and receive the approved six-percent presentation policy',()=>{
  for(const pct of [.00001,.1,2,3,5.841653,6,6.0000001,7]){
    const {row,parcel,member}=fixture(pct),out=approveRecord(row,parcel,member,config);
    assert.deepEqual(out.failures,[]);const a=out.row.approvedPrimaryGuidance;
    assert.equal(a.ruleId,'CLR-Z-003');assert.equal(a.noticeThresholdPercent,6);assert.equal(a.osrNoticeRecommendation,pct>6?'RECOMMENDED_PHYSICAL_PROJECT_GUIDES':'NOT_PROMINENT_IN_ORDINARY_GUIDES');assert.equal(a.noticeSuppressionIsLegalExemption,false);assert.equal(a.noticeSuppressionIsBoundaryCorrection,false);assert.equal(a.osrNoticeText,NOTICE);
    assert.deepEqual(a.unresolvedInterpretations,UNCERTAINTIES);assert.equal(a.secondaryOsrAppliesToEntireParcel,false);assert.equal(a.exclusiveZoningClassification,false);assert.equal(a.legalZoningDetermination,false);
    assert.deepEqual(a.mappedZoningIntersections,parcel.evidence.zoningCodeCoverage);assert.deepEqual(a.sourceZoningFeatures,parcel.evidence.zoningFeatures);
    const {approvedPrimaryGuidance,...before}=row,{approvedPrimaryGuidance:_,...after}=out.row;assert.deepEqual(after,before);
  }
});
test('zero OSR, wrong primary, original CLEAN and missing membership cannot receive approval',()=>{
  for(const change of [f=>f.parcel.osrPercent=0,f=>f.row.zoningCode='OS/R',f=>f.row.status='clean',f=>f.member=null,f=>f.member.parcelId='other']){
    const f=fixture();change(f);const out=approveRecord(f.row,f.parcel,f.member,config);assert.ok(out.failures.length);assert.equal(out.row,f.row);
  }
});
test('holds, third districts, source quality, uncertain humans and location conflicts veto approval',()=>{
  for(const change of [f=>f.parcel.investigativeHolds.push('address_link'),f=>f.parcel.districts.push('p'),f=>f.parcel.evidence.hasInvalidZoningGeometry=true,f=>f.parcel.evidence.hasRepeatedNormalizedCode=true,f=>f.row.issues.push('unsupported_zoning_code'),f=>f.parcel.knownReviews.push({humanReview:{reviewStatus:'human_true_split'}}),f=>f.parcel.knownReviews.push({humanReview:{reviewStatus:'human_staff_review'}}),f=>f.parcel.crossCodeOverlapM2=1,f=>f.parcel.addressPointEvidence[0].insideLinkedParcel=false,f=>f.parcel.representativePointEvidence[0].mappedDistricts=['os/r']]){
    const f=fixture();change(f);const out=approveRecord(f.row,f.parcel,f.member,config);assert.ok(out.failures.length);assert.equal(out.row,f.row);
  }
});
test('previous Rule 001/002 approval objects and notice policies cannot be overwritten',()=>{
  for(const [ruleId,threshold] of [['CLR-Z-001',2],['CLR-Z-002',3]]){
    const f=fixture();f.row.approvedPrimaryGuidance={status:'GUIDANCE_READY_APPROVED',ruleId,noticeThresholdPercent:threshold};const before=structuredClone(f.row);
    assert.ok(assess(f.row,f.parcel,f.member).includes('prior_approval_conflict'));
    assert.equal(approveRecord(f.row,f.parcel,f.member,config).row,f.row);assert.deepEqual(f.row,before);
  }
});
