/** Provisional LMDR + OS/R interpretation only. No approvals or source changes. */
import { normalizeZoning as norm } from './clearwater-pilot.mjs';
export const RULE_ID='CLR-Z-002';
export const RULE_VERSION='1.0.0-provisional';
export function classify(d,profiles,reviews=[],duplicateIdentity=false){
  const codes=[...new Set(d.zoningCodeCoverage.map(e=>e.normalizedZoningCode))].sort();
  const structuralMatch=codes.length===2&&codes[0]==='lmdr'&&codes[1]==='os/r';
  const flags=[];
  if(!structuralMatch)flags.push('not_exactly_LMDR_and_OSR');
  if(!d.parcelFound||!d.parcelGeometryValid||!(d.parcelAreaSquareMeters>0))flags.push('invalid_or_missing_parcel_geometry');
  if(d.hasInvalidZoningGeometry)flags.push('invalid_zoning_geometry');
  flags.push(...(d.sourceErrors??[]));
  if(!Number.isFinite(d.totalZoningCoveragePercent)||d.totalZoningCoveragePercent<99.9||d.totalZoningCoveragePercent>100.1)flags.push('coverage_outside_99.9_to_100.1_percent');
  if(d.zoningCodeCoverage.some(e=>!Number.isFinite(e.percentOfParcel)||e.percentOfParcel<=0||e.percentOfParcel>100.1))flags.push('invalid_district_coverage');
  if(d.hasRepeatedNormalizedCode||d.zoningCodeCoverage.some(e=>e.repeatedPolygons))flags.push('repeated_same_code_polygons');
  if(d.hasOverlappingSameCodePolygons||d.zoningCodeCoverage.some(e=>e.overlappingPolygons))flags.push('overlapping_same_code_polygons');
  if(duplicateIdentity)flags.push('duplicate_parcel_identity');
  if(!profiles.length)flags.push('no_authoritative_clearwater_address_membership');
  if(profiles.some(p=>p.normalizedJurisdiction!=='clearwater'||p.jurisdictionStatus!=='confirmed'))flags.push('jurisdiction_not_confirmed');
  if(profiles.some(p=>!['clean','review'].includes(p.status)||!Array.isArray(p.issues)||p.issues.some(i=>i!=='parcel_ambiguous_zoning')))flags.push('unrelated_source_profile_issue');
  if(reviews.some(r=>['human_true_split','human_staff_review','human_primary_applicability_unclear'].includes(r.humanReview.reviewStatus)))flags.push('human_split_or_uncertain');
  if(reviews.some(r=>r.humanReview.reviewStatus==='human_confirmed'&&norm(r.humanReview.result.replace(/^CONFIRMED:\s*/,''))!=='lmdr'))flags.push('gold_contradiction');
  if(reviews.some(r=>r.humanReview.reviewStatus==='human_primary_candidate'&&r.humanReview.reportedPrimaryCode&&norm(r.humanReview.reportedPrimaryCode)!=='lmdr'))flags.push('conflicting_human_candidate_evidence');
  const eligible=structuralMatch&&!flags.length;
  return {ruleId:RULE_ID,ruleVersion:RULE_VERSION,structuralMatch,eligible,approvalStatus:'NOT_APPROVED',
    decisionStatus:eligible?'PENDING_QC':'EXCLUDED',productionEligible:false,
    proposedPrimaryGuidanceZoning:eligible?'LMDR':null,retainedSecondaryDistrict:eligible?'OS/R':null,
    osrCoveragePercent:d.zoningCodeCoverage.find(e=>e.normalizedZoningCode==='os/r')?.percentOfParcel??null,
    flags:[...new Set(flags)]};
}
export function addProvisionalLayer(row,parcel){
  // A disjoint rule must never overwrite any prior approved guidance or evidence.
  if(parcel?.decision.eligible&&row.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED')throw new Error('Rule 002 overlaps an approved Rule 001 record');
  return {...row,researchRule002:{ruleId:RULE_ID,ruleVersion:RULE_VERSION,approvalStatus:'NOT_APPROVED',productionEligible:false,
    sourceSnapshotIdentifier:row.researchRule001.sourceSnapshotIdentifier,
    decisionStatus:parcel?.decision.decisionStatus??'NOT_APPLICABLE',
    proposedPrimaryGuidanceZoning:parcel?.decision.proposedPrimaryGuidanceZoning??null,
    retainedSecondaryDistrict:parcel?.decision.retainedSecondaryDistrict??null,
    osrCoveragePercent:parcel?.decision.osrCoveragePercent??null,
    flags:parcel?.decision.flags??[],
    originalZoningIntersections:parcel?.evidence.zoningCodeCoverage??null,
    intersectionEvidence:parcel?`lmdr-osr-parcel-inventory.json#${parcel.parcelId}`:null,
    originalSourceQaStatus:row.status,existingPrimaryZoning:row.zoningCode,
    potentialIncrementalReviewRecovery:!!parcel?.decision.eligible&&row.status==='review'&&row.approvedPrimaryGuidance.status!=='GUIDANCE_READY_APPROVED'}};
}
const distance=(a,b)=>Math.hypot((a[0]-b[0])*98500,(a[1]-b[1])*111300);
export function sampleQc(population,previousReviews,limit=10){
  const known=new Set(previousReviews.map(g=>g.parcelId));
  const pool=population.filter(r=>r.decision.eligible&&!known.has(r.parcelId)&&r.addresses[0]?.coordinates);
  const selected=[];
  const add=(candidates,purpose,order=(a,b)=>a.parcelId.localeCompare(b.parcelId))=>{
    const available=candidates.filter(r=>!selected.some(s=>s.parcelId===r.parcelId)).sort(order);
    // Prefer distinct contexts; relax only if the requested stress stratum is otherwise absent.
    const separated=available.filter(r=>selected.every(s=>distance(r.addresses[0].coordinates,s.addresses[0].coordinates)>=500));
    const r=separated[0]??available[0];if(r&&selected.length<limit)selected.push({...r,reviewPurpose:purpose});
  };
  const pct=r=>r.decision.osrCoveragePercent;
  const desc=(a,b)=>pct(b)-pct(a)||a.parcelId.localeCompare(b.parcelId);
  const asc=(a,b)=>pct(a)-pct(b)||a.parcelId.localeCompare(b.parcelId);
  add(pool,'Largest OS/R coverage: try to disprove LMDR primary interpretation.',desc);
  add(pool.filter(r=>r.originalProfiles.some(p=>norm(p.zoningCode)!=='lmdr')),'Existing primary-code mismatch: inspect whether LMDR guidance is defensible.',desc);
  add(pool.filter(r=>pct(r)>=10&&pct(r)<=50),'Intermediate OS/R intersection; inspect functional split.',desc);
  add(pool.filter(r=>pct(r)<1),'Small technical-looking overlap; do not assume restrictions disappear.',asc);
  add(pool.filter(r=>pct(r)>1&&pct(r)<10),'Moderate OS/R overlap away from earlier cases.',desc);
  while(selected.length<Math.min(limit,pool.length)){
    const candidates=pool.filter(r=>!selected.some(s=>s.parcelId===r.parcelId));
    const min=r=>selected.length?Math.min(...selected.map(s=>distance(r.addresses[0].coordinates,s.addresses[0].coordinates))):0;
    const r=candidates.sort((a,b)=>min(b)-min(a)||desc(a,b))[0];
    selected.push({...r,reviewPurpose:'Geographic and coverage stress check; independent of prior gold cases.'});
  }
  return selected.map((r,i)=>({caseId:`R002-${String(i+1).padStart(2,'0')}`,batch:Math.floor(i/5)+1,
    parcelId:r.parcelId,address:r.addresses[0].address,coordinates:r.addresses[0].coordinates,
    originalIntersections:r.evidence.zoningCodeCoverage,originalZoningFeatures:r.evidence.zoningFeatures,
    originalProfiles:r.originalProfiles,diagnosticFlags:r.decision.flags,proposal:'LMDR',
    osrCoveragePercent:r.decision.osrCoveragePercent,reviewPurpose:r.reviewPurpose,
    independentNewParcel:true,sourceSnapshotIdentifier:r.sourceSnapshotIdentifier,
    nearestOtherQcMeters:Math.round(Math.min(...selected.filter(s=>s.parcelId!==r.parcelId).map(s=>distance(r.addresses[0].coordinates,s.addresses[0].coordinates)))),
    humanReview:{result:null,note:null,reviewStatus:'pending',verificationMethod:'Clearwater official zoning viewer'}}));
}

export function confirmedPairGold(records){
  return records.filter(g=>g.humanReview.reviewStatus==='human_confirmed'&&g.diagnostic.candidates.length===2&&['lmdr','os/r'].every(c=>g.diagnostic.candidates.some(e=>norm(e.zoningCode)===c)));
}
