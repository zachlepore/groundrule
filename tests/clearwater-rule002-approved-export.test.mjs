import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { approveRecord, validateApproval, exportApproved, rankRemaining } from '../scripts/gis/export-clearwater-approved-rule002.mjs';
import { classify, addProvisionalLayer } from '../scripts/gis/clearwater-rule002-policy.mjs';
const config=JSON.parse(await readFile(new URL('../research/gis/rule002-approval.same-code-v1.json',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('../scripts/gis/clearwater-rule001-source.json',import.meta.url)));
function fixture(pct=3){
  const source={sourceAddressIdentifier:1,parcelIdentifier:'test',status:'review',zoningCode:'LMDR',issues:['parcel_ambiguous_zoning'],normalizedJurisdiction:'clearwater',jurisdictionStatus:'confirmed',
    researchRule001:{sourceSnapshotIdentifier:config.sourceSnapshotId},approvedPrimaryGuidance:{status:'NO_NEW_APPROVAL',ruleId:null,originalSourceQaStatus:'review',originalZoningCode:'LMDR',stillRequiresReview:true}};
  const d={parcelFound:true,parcelGeometryValid:true,parcelAreaSquareMeters:100,hasInvalidZoningGeometry:false,sourceErrors:[],hasRepeatedNormalizedCode:false,hasOverlappingSameCodePolygons:false,totalZoningCoveragePercent:100,
    zoningCodeCoverage:[{normalizedZoningCode:'lmdr',percentOfParcel:100-pct},{normalizedZoningCode:'os/r',percentOfParcel:pct}]};
  return addProvisionalLayer(source,{parcelId:'test',evidence:d,decision:classify(d,[source])});
}
test('bounded approval rejects scope, count, snapshot, legal and presentation drift',()=>{
  validateApproval(config,manifest);
  for(const mutate of [c=>c.expected.rule002Approved++,c=>c.expected.totalApproved++,c=>c.scope.originalQaStatus='clean',c=>c.scope.existingPrimaryCode='OS/R',c=>c.scope.preserveAllRule001Approvals=false,c=>c.sourceArchiveSha256='wrong',c=>c.presentation.osrNoticeProminentWhenPercentGreaterThan=5,c=>c.presentation.noticeThresholdIsLegalExemption=true,c=>c.presentation.impliesExclusivelyLmdr=true]){const c=structuredClone(config);mutate(c);assert.throws(()=>validateApproval(c,manifest));}
});
test('approved offline fields retain both mapped districts and original research/source QA',()=>{
  const r=fixture(),out=approveRecord(r,config);assert.equal(out.approvedPrimaryGuidance.status,'GUIDANCE_READY_APPROVED');assert.equal(out.approvedPrimaryGuidance.ruleId,'CLR-Z-002');assert.equal(out.zoningCode,'LMDR');assert.equal(out.status,'review');
  assert.equal(out.researchRule001,r.researchRule001);assert.equal(out.researchRule002,r.researchRule002);assert.deepEqual(out.approvedPrimaryGuidance.sourceMappedDistricts,['LMDR','OS/R']);assert.equal(out.approvedPrimaryGuidance.retainedSecondaryDistrict,'OS/R');assert.equal(out.approvedPrimaryGuidance.exclusiveZoningClassification,false);assert.equal(out.approvedPrimaryGuidance.legalZoningDetermination,false);assert.ok(out.approvedPrimaryGuidance.officialViewerAccess.mapViewerUrl);
});
test('strict 3 percent notice boundary never changes eligibility or retained OS/R',()=>{
  for(const [pct,notice] of [[3,'NOT_PROMINENT_IN_ORDINARY_GUIDES'],[3.000001,'RECOMMENDED_PHYSICAL_PROJECT_GUIDES']]){const out=approveRecord(fixture(pct),config);assert.equal(out.approvedPrimaryGuidance.status,'GUIDANCE_READY_APPROVED');assert.equal(out.approvedPrimaryGuidance.osrNoticeRecommendation,notice);assert.equal(out.approvedPrimaryGuidance.mappedOsrPercent,pct);assert.equal(out.approvedPrimaryGuidance.retainedSecondaryDistrict,'OS/R');}
});
test('meaningful secondary observations remain substantive and never imply exclusive LMDR',()=>{
  const r=fixture(30.946006);r.researchRule002.secondaryOsrRelevance='MEANINGFUL_SECONDARY_OSR';r.researchRule002.substantiveSecondaryOsr=true;r.researchRule002.humanReviewReferences=[{caseId:'R002-01',observationVerbatim:'Meaningful waterfront strip'}];
  const out=approveRecord(r,config);assert.equal(out.approvedPrimaryGuidance.substantiveSecondaryOsr,true);assert.deepEqual(out.approvedPrimaryGuidance.humanReviewReferences,r.researchRule002.humanReviewReferences);assert.equal(out.approvedPrimaryGuidance.doesNotEraseMappedSplitZoning,true);
});
test('CLEAN, changed-code, new-code, quality, third districts and known human exceptions stay unapproved',()=>{
  for(const mutate of [r=>{r.status='clean';r.researchRule002.originalSourceQaStatus='clean';},r=>{r.zoningCode='OS/R';r.researchRule002.existingPrimaryZoning='OS/R';},r=>{r.zoningCode=null;r.researchRule002.existingPrimaryZoning=null;},r=>r.issues.push('parcel_missing'),r=>r.researchRule002.flags.push('invalid_zoning_geometry'),r=>r.researchRule002.flags.push('human_split_or_uncertain'),r=>r.researchRule002.originalZoningIntersections.push({normalizedZoningCode:'p',percentOfParcel:1}),r=>r.researchRule002.originalZoningIntersections[0].repeatedPolygons=true,r=>r.researchRule002.originalZoningIntersections[0].percentOfParcel=0,r=>r.researchRule002.potentialIncrementalReviewRecovery=false]){
    const r=fixture();mutate(r);assert.equal(approveRecord(r,config).approvedPrimaryGuidance.status,'NO_NEW_APPROVAL');
  }
  const r=fixture();assert.equal(approveRecord(r,config,new Set(['test'])).approvedPrimaryGuidance.status,'NO_NEW_APPROVAL');
});
test('Rule 001 approval object remains exactly unchanged and overlapping approvals fail closed',()=>{
  const r=fixture();r.approvedPrimaryGuidance={status:'GUIDANCE_READY_APPROVED',ruleId:'CLR-Z-001',preservationNoticeRecommendation:'RECOMMENDED_PHYSICAL_PROJECT_GUIDES',retainedSecondaryPreservation:'P'};
  assert.throws(()=>approveRecord(r,config),/overlap/);r.researchRule002.potentialIncrementalReviewRecovery=false;r.researchRule002.proposedPrimaryGuidanceZoning=null;
  assert.equal(approveRecord(r,config),r);assert.equal(approveRecord(r,config).approvedPrimaryGuidance,r.approvedPrimaryGuidance);
});
test('remaining REVIEW ranking excludes both approved rules and does not assign a next primary',()=>{
  const r=fixture(),approved=approveRecord(r,config),unresolved={...fixture(),sourceAddressIdentifier:2,parcelIdentifier:'other'};
  const diag={parcelIdentifier:'other',zoningCodeCoverage:[{normalizedZoningCode:'lmdr'},{normalizedZoningCode:'mdr'}],parcelFound:true,parcelGeometryValid:true,parcelAreaSquareMeters:100,totalZoningCoveragePercent:100};
  const a=rankRemaining([approved,unresolved],[diag],[]);assert.equal(a.remainingReviewAddresses,1);assert.equal(a.ranking[0].remainingReviewAddresses,1);assert.equal(a.ranking[0].combination,'lmdr + mdr');assert.equal(a.ranking[0].proposedPrimary,undefined);
});
test('export refuses overwriting or nesting into verified source and candidate directories',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'rule002-approved-test-'));try{await assert.rejects(exportApproved('/source','/r1','/candidate',dir),/overwrite/);await assert.rejects(exportApproved(dir,'/r1','/candidate',path.join(dir,'child')),/Separate/);}finally{await rm(dir,{recursive:true,force:true});}
});
