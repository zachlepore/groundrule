import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { impact, assess } from "../scripts/gis/assess-clearwater-rule001-qc.mjs";

const observations=JSON.parse(await readFile(new URL("../research/gis/zoning-gold/rule001-qc-observations.json",import.meta.url),"utf8"));
const packetBytes=await readFile(new URL("../research/gis/rule001-results/qc-batch.json",import.meta.url));
const packet=JSON.parse(packetBytes);
const reference=JSON.parse(await readFile(new URL("../research/gis/zoning-gold/reference-dataset.json",import.meta.url),"utf8"));

test("all 30 supplied observations retain exact packet identities, intersections and quality flags",()=>{
  assert.equal(createHash("sha256").update(packetBytes).digest("hex"),observations.sourceQcPacket.sha256);
  assert.equal(observations.records.length,30);assert.equal(new Set(observations.records.map(r=>r.caseId)).size,30);
  for(const r of observations.records){
    const q=packet.find(q=>q.caseId===r.caseId);
    assert.equal(r.address,q.address);assert.equal(r.parcelId,q.parcelId);assert.equal(typeof r.parcelId,"string");
    assert.deepEqual(r.originalIntersections,q.originalIntersections);
    assert.deepEqual(r.originalZoningFeatures,q.originalZoningFeatures);
    assert.deepEqual(r.originalDiagnosticFlags,q.diagnosticFlags);
    assert.equal(r.frozenDecisionStatus,q.decisionStatus);assert.equal(r.frozenProposal,q.proposedPrimaryGuidanceZoning);
    assert.equal(r.humanReview.approvalGranted,false);assert.equal(r.humanReview.reviewDate,null);
    assert.equal(r.humanReview.preservationDesignationRetained,true);
    const existing=reference.records.filter(g=>g.parcelId===r.parcelId).map(g=>g.caseNumber);
    assert.deepEqual(r.previousGoldCaseIds,existing);assert.equal(r.independentNewParcel,existing.length===0);
    if(r.independentNewParcel)assert.notEqual(r.humanReview.category,"CONFIRMED");
  }
});

test("new candidate wording and an excluded true split are not presented as confirmed automatic successes",()=>{
  const report=assess(observations.records,[]);
  assert.deepEqual(report.categoryCounts,{CONFIRMED:2,PRIMARY_CANDIDATE:23,TRUE_SPLIT:1,UNCLEAR:4});
  assert.equal(report.declaredGoldControls,2);assert.equal(report.repeatGoldParcels,3);assert.equal(report.independentNewParcels,27);
  assert.equal(report.newIndependentConfirmedParcels,0);
  assert.deepEqual(report.eligibleQc,{total:25,confirmedControls:2,provisionalSupportingObservations:21,primaryApplicabilityUnclear:2,trueSplitContradictions:0});
  assert.deepEqual(report.excludedQc,{total:5,primaryCandidates:2,unclear:2,trueSplit:1});
  const split=report.comparisons.find(r=>r.caseId==="R001-29");
  assert.equal(split.frozenCandidateEligible,false);assert.equal(split.frozenProposal,null);
  assert.equal(split.codeAgreement,"TRUE_SPLIT_CONTRADICTS_FORCED_SINGLE_PRIMARY");
  assert.deepEqual(observations.records.find(r=>r.caseId==="R001-29").humanReview.reportedSplitCodes,["P","LMDR"]);
  assert.equal(report.pDominantEligible.length,8);assert.equal(report.pDominantExcludedTrueSplits.length,1);
  assert.equal(report.comparisons.find(r=>r.caseId==="R001-27").codeAgreement,"FAMILY_ONLY_NOT_FULL_NCOD_CONFIRMATION");
  assert.equal(report.currentlyPromotedAddresses,0);assert.equal(report.approvalStatus,"NOT_APPROVED");
});

test("REVIEW recovery counts do not include CLEAN rows or double count matching-code REVIEW rows",()=>{
  const row=(id,status,old,proposal="LMDR")=>({parcelId:id,originalStatus:status,originalZoningCode:old,proposedPrimaryGuidanceZoning:proposal});
  const result=impact([row("a","review","LMDR"),row("b","review","P"),row("c","review",null),row("d","clean","LMDR"),row("e","clean","P")]);
  assert.equal(result.potentialReviewReduction,3);assert.equal(result.existingReviewCodesWouldBecomeTrusted,1);
  assert.equal(result.reviewCodesWouldChange,1);assert.equal(result.reviewPreviouslyUnclassified,1);
  assert.equal(result.originallyCleanAddresses,2);assert.equal(result.candidateAddresses,5);
  assert.equal(Object.values(result.partitions).reduce((s,n)=>s+n,0),5);assert.equal(result.currentlyPromotedAddresses,0);
});

test("identified-hold arithmetic removes only those parcel records and is never an approval",()=>{
  const by=id=>observations.records.find(r=>r.caseId===id);
  const row=(id,status,code)=>({parcelId:by(id).parcelId,originalStatus:status,originalZoningCode:code,proposedPrimaryGuidanceZoning:code});
  const rows=[row("R001-14","review","MHDR"),row("R001-21","review","D"),row("R001-21","review","D"),row("R001-17","clean","US19"),row("R001-05","review","LMDR")];
  const r=assess(observations.records,rows);
  assert.equal(r.scopes.all_qualifying_pairs.potentialReviewReduction,4);
  assert.equal(r.scopes.all_qualifying_minus_identified_applicability_context_holds.potentialReviewReduction,1);
  assert.equal(r.scopes.all_qualifying_minus_identified_applicability_context_holds.originallyCleanAddresses,0);
  for(const s of Object.values(r.scopes)){assert.equal(s.approvalStatus,"NOT_APPROVED");assert.equal(s.currentlyPromotedAddresses,0);}
});
