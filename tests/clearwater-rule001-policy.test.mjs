import test from "node:test";
import assert from "node:assert/strict";
import { classify } from "../scripts/gis/clearwater-rule001.mjs";
import { policyBand,noticeVisibility,normalizeReviewSession,analyzePolicy } from "../scripts/gis/clearwater-rule001-policy.mjs";

const profile={normalizedJurisdiction:"clearwater",jurisdictionStatus:"confirmed",issues:["parcel_ambiguous_zoning"],status:"review",zoningCode:"LMDR"};
const evidence=p=>({parcelFound:true,parcelGeometryValid:true,parcelAreaSquareMeters:100,totalZoningCoveragePercent:100,
  zoningFeatures:[{rawZoningCode:"P",normalizedZoningCode:"p"},{rawZoningCode:"LMDR",normalizedZoningCode:"lmdr"}],
  zoningCodeCoverage:[{normalizedZoningCode:"p",percentOfParcel:p},{normalizedZoningCode:"lmdr",percentOfParcel:100-p}]});

test("exact 2/3/5/10 boundaries form mutually exclusive bands and presentation uses strict >2",()=>{
  const cases=[[0,"P ≤2%"],[2,"P ≤2%"],[2.000001,"P >2–3%"],[3,"P >2–3%"],[3.000001,"P >3–5%"],[5,"P >3–5%"],[5.000001,"P >5–10%"],[10,"P >5–10%"],[10.000001,"P >10%"]];
  for(const [n,band] of cases)assert.equal(policyBand(n),band);
  assert.throws(()=>policyBand(NaN));assert.throws(()=>policyBand(-1));
  assert.equal(noticeVisibility(true,2),"NOT_PROMINENT_IN_ORDINARY_GUIDES");
  assert.equal(noticeVisibility(true,2.000001),"RECOMMENDED_PHYSICAL_PROJECT_GUIDES");
  assert.equal(noticeVisibility(false,0.001),"UNRESOLVED_NO_PRIMARY_PROPOSAL");
});

test("P percentage never determines primary eligibility and small overlap never bypasses quality exclusions",()=>{
  for(const p of [0.000041,2,2.000001,30,90.9]){
    const r=classify(evidence(p),[profile]);assert.equal(r.eligible,true);assert.equal(r.proposedPrimaryGuidanceZoning,"LMDR");
    assert.equal(r.retainedSecondaryPreservation,"P");assert.equal(r.approvalStatus,"NOT_APPROVED");assert.equal(r.pCoveragePercent,p);
  }
  const r=classify({...evidence(0.001),hasRepeatedNormalizedCode:true},[profile]);
  assert.equal(r.eligible,false);assert.equal(r.proposedNoticeVisibility,"UNRESOLVED_NO_PRIMARY_PROPOSAL");
});

test("completed human TRUE SPLIT and UNCLEAR primary results block proposals at every percentage",()=>{
  for(const category of ["TRUE_SPLIT","UNCLEAR"]){
    const reviews=normalizeReviewSession([{caseId:"human-1",parcelId:"001",humanReview:{category,reportedPrimaryCode:"LMDR",confirmedPrimaryCode:null}}]);
    for(const p of [0.001,2,80])assert.equal(classify(evidence(p),[profile],reviews).eligible,false);
  }
  const candidate=normalizeReviewSession([{caseId:"human-2",parcelId:"001",humanReview:{category:"PRIMARY_CANDIDATE",reportedPrimaryCode:"MDR",confirmedPrimaryCode:null}}]);
  assert.ok(classify(evidence(1),[profile],candidate).flags.includes("conflicting_human_candidate_evidence"));
  const industrial=normalizeReviewSession([{caseId:"human-3",parcelId:"001",humanReview:{category:"PRIMARY_CANDIDATE",reportedPrimaryCode:"I",confirmedPrimaryCode:null}}]);
  const irt=evidence(1);irt.zoningFeatures[1]={rawZoningCode:"IRT",normalizedZoningCode:"irt"};irt.zoningCodeCoverage[1].normalizedZoningCode="irt";
  assert.ok(classify(irt,[profile],industrial).flags.includes("conflicting_human_candidate_evidence"),"I and IRT are distinct districts, not prefix equivalents");
  assert.throws(()=>normalizeReviewSession([{humanReview:{category:"UNKNOWN"}}]));
});

test("threshold comparisons preserve recovery counts and keep excluded/CLEAN populations separate",()=>{
  const make=(id,p,eligible=true)=>({parcelId:id,combination:"LMDR + P",pCoveragePercent:p,
    originalIntersections:[{normalizedZoningCode:"p",code:"P"},{normalizedZoningCode:"lmdr",code:"LMDR"}],
    decision:{eligible,hypotheticalNonP:"LMDR",proposedPrimaryGuidanceZoning:eligible?"LMDR":null}});
  const city=[make("a",2),make("b",2.5),make("c",4),make("excluded",1,false)];
  const profiles=new Map([["a",[{...profile}]],["b",[{...profile,zoningCode:"P"}]],["c",[{...profile,status:"clean"}]],["excluded",[{...profile}]]]);
  const r=analyzePolicy(city,profiles,[],{records:[]});
  assert.equal(r.totals.all.parcels,4);assert.equal(r.totals.qualifying.parcels,3);assert.equal(r.totals.excluded.parcels,1);
  assert.equal(r.bands["P ≤2%"].all.parcels,2);assert.equal(r.bands["P ≤2%"].qualifying.parcels,1);
  assert.equal(r.thresholdOptions[2].prominentNotice.addresses,2);
  assert.equal(r.thresholdOptions[3].prominentNotice.addresses,1);
  assert.equal(r.thresholdOptions[5].prominentNotice.addresses,0);
  for(const option of Object.values(r.thresholdOptions)){
    assert.equal(option.reviewRecoveryOpportunity,2);assert.equal(option.resolutionCountChangedByNoticeThreshold,0);
  }
  assert.equal(r.totals.qualifying.reviewAlreadyMatched,1);assert.equal(r.totals.qualifying.reviewDifferentCode,1);
  assert.equal(r.totals.qualifying.cleanAddresses,1);assert.equal(r.currentlyActivatedGuidanceAddresses,0);
});
