import test from "node:test";
import assert from "node:assert/strict";
import { classify, RULE_ID, sampleQc } from "../scripts/gis/clearwater-rule001.mjs";
import { measureParcel } from "../scripts/gis/clearwater-rule001-intersections.mjs";

const profile={normalizedJurisdiction:"clearwater",jurisdictionStatus:"confirmed",issues:["parcel_ambiguous_zoning"]};
const evidence=(p=20,other="LMDR")=>({parcelFound:true,parcelGeometryValid:true,parcelAreaSquareMeters:100,
  totalZoningCoveragePercent:100,zoningFeatures:[{rawZoningCode:"P",normalizedZoningCode:"p"},{rawZoningCode:other,normalizedZoningCode:other.toLowerCase()}],
  zoningCodeCoverage:[{normalizedZoningCode:"p",percentOfParcel:p},{normalizedZoningCode:other.toLowerCase(),percentOfParcel:100-p}]});

test("candidate works regardless of P dominance without changing original evidence or profile",()=>{
  for(const percent of [0.000041,5,30,49,70,99.9]){
    const d=evidence(percent);const before=structuredClone(d);const p=structuredClone(profile);
    const result=classify(d,[p]);
    assert.equal(result.proposedPrimaryGuidanceZoning,"LMDR");assert.equal(result.decisionStatus,"PENDING_QC");
    assert.equal(result.ruleId,RULE_ID);assert.deepEqual(result.otherIntersectingZoningDistricts,["P"]);
    assert.deepEqual(d,before);assert.deepEqual(p,profile);
  }
});
test("P-only stays P; P with two non-P districts cannot be forced to one",()=>{
  const d=evidence();d.zoningFeatures=d.zoningFeatures.slice(0,1);d.zoningCodeCoverage=[{normalizedZoningCode:"p",percentOfParcel:100}];
  assert.equal(classify(d,[profile]).decisionStatus,"P_ONLY_PRESERVED");
  d.zoningFeatures.push({rawZoningCode:"MDR",normalizedZoningCode:"mdr"},{rawZoningCode:"C",normalizedZoningCode:"c"});
  d.zoningCodeCoverage.push({normalizedZoningCode:"mdr",percentOfParcel:10},{normalizedZoningCode:"c",percentOfParcel:10});
  const result=classify(d,[profile]);assert.equal(result.proposedPrimaryGuidanceZoning,null);assert.ok(result.flags.includes("multiple_non_P_districts"));
});
test("supported pairs include commercial and US19 but NCOD is not silently reduced to its base code",()=>{
  for(const code of ["C","HDR","US19","MDR"])assert.equal(classify(evidence(60,code),[profile]).proposedPrimaryGuidanceZoning,code);
  assert.ok(classify(evidence(20,"HDR-NCOD Island Est"),[profile]).flags.includes("unsupported_zoning_code_combination"));
});
test("coverage, geometry, identity, source errors and prior human splits block proposals",()=>{
  for(const change of [
    {totalZoningCoveragePercent:97.628407},{totalZoningCoveragePercent:100.2},{parcelGeometryValid:false},
    {hasInvalidZoningGeometry:true},{hasRepeatedNormalizedCode:true},{hasOverlappingSameCodePolygons:true},{sourceErrors:["intersection_error"]}
  ])assert.equal(classify({...evidence(),...change},[profile]).eligible,false);
  assert.equal(classify(evidence(),[profile],[],true).eligible,false);
  assert.equal(classify(evidence(),[]).eligible,false);
  assert.equal(classify(evidence(),[{...profile,issues:["address_multiple_parcels"]}]).eligible,false);
  for(const reviewStatus of ["human_true_split","human_staff_review"])assert.equal(classify(evidence(),[profile],[{humanReview:{reviewStatus}}]).eligible,false);
  const gold=[{humanReview:{reviewStatus:"human_confirmed",result:"CONFIRMED: MDR"}}];
  assert.ok(classify(evidence(),[profile],gold).flags.includes("gold_contradiction"));
});
const square=(x1,y1,x2,y2,properties)=>({type:"Feature",properties,geometry:{type:"Polygon",coordinates:[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]}});
test("exact area excludes mere touches and preserves repeated/overlapping polygon flags",()=>{
  const parcel=square(0,0,1,1,{PARCELID:"001"});
  const touch={feature:square(1,0,2,1,{ZONING:"P",OBJECTID:1}),index:0};
  assert.equal(measureParcel(parcel,[touch]),null);
  const p={feature:square(0,0,0.2,1,{ZONING:"P",OBJECTID:2}),index:1};
  const c={feature:square(0.2,0,1,1,{ZONING:"C",OBJECTID:3}),index:2};
  const r=measureParcel(parcel,[p,c]);assert.equal(r.zoningCodeCoverage.length,2);assert.ok(Math.abs(r.totalZoningCoveragePercent-100)<0.001);
  const repeated=measureParcel(parcel,[p,c,{...p,index:3}]);
  assert.equal(repeated.hasRepeatedNormalizedCode,true);assert.equal(repeated.hasOverlappingSameCodePolygons,true);
  assert.equal(classify(repeated,[profile]).eligible,false);
});
test("QC is deterministic, distinct, unlabelled, and separates five quality exceptions",()=>{
  const population=Array.from({length:45},(_,i)=>({parcelId:String(i).padStart(18,"0"),combination:i%2?"LMDR + P":"C + P",
    coverageBand:i%2?"minimal <1%":"P dominant >90%",addresses:[{address:`${i} EXAMPLE`,coordinates:[-82.8+i*0.005,28+i*0.002]}],
    originalIntersections:[{code:"P",percentOfParcel:10},{code:"LMDR",percentOfParcel:90}],
    decision:{eligible:i<35,structuralMatch:true,proposedPrimaryGuidanceZoning:i<35?"LMDR":null,hypotheticalNonP:"LMDR",
      decisionStatus:i<35?"PENDING_QC":"REVIEW",flags:i<35?[]:["coverage_outside_99.9_to_100.1_percent"]}}));
  const a=sampleQc(population,{records:[]});assert.deepEqual(a,sampleQc(population,{records:[]}));
  assert.equal(a.length,30);assert.equal(new Set(a.map(c=>c.parcelId)).size,30);
  assert.ok(a.slice(0,25).every(c=>c.decisionStatus==="PENDING_QC"));
  assert.ok(a.slice(25).every(c=>c.proposedPrimaryGuidanceZoning===null));
  assert.ok(a.every(c=>c.humanReview.result===null));
});
