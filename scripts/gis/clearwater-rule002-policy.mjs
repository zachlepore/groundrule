/** Provisional LMDR + OS/R interpretation only. No approvals or source changes. */
import assert from 'node:assert/strict';
import { normalizeZoning as norm } from './clearwater-pilot.mjs';
export const RULE_ID='CLR-Z-002';
export const RULE_VERSION='1.1.0-provisional';
export const NOTICE_THRESHOLD_PERCENT=3;
export const OFFICIAL_ZONING_LAYER_URL='https://gis.myclearwater.com/arcgis/rest/services/ArcGISMapServices/Zoning_WGS84/MapServer/1';
export const noticeVisibility=(eligible,p,threshold=NOTICE_THRESHOLD_PERCENT)=>!eligible?'UNRESOLVED_NO_PRIMARY_PROPOSAL':p>threshold?'RECOMMENDED_PHYSICAL_PROJECT_GUIDES':'NOT_PROMINENT_IN_ORDINARY_GUIDES';
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
  const osrCoveragePercent=d.zoningCodeCoverage.find(e=>e.normalizedZoningCode==='os/r')?.percentOfParcel??null;
  const human=reviews.find(r=>r.humanReview.ruleId===RULE_ID)?.humanReview;
  return {ruleId:RULE_ID,ruleVersion:RULE_VERSION,structuralMatch,eligible,approvalStatus:'NOT_APPROVED',
    decisionStatus:eligible?'PENDING_QC':'EXCLUDED',productionEligible:false,
    proposedPrimaryGuidanceZoning:eligible?'LMDR':null,retainedSecondaryDistrict:eligible?'OS/R':null,
    osrCoveragePercent,noticeThresholdPercent:NOTICE_THRESHOLD_PERCENT,
    proposedNoticeVisibility:noticeVisibility(eligible,osrCoveragePercent),
    secondaryOsrRelevance:human?.secondaryOsrRelevance??'NOT_HUMAN_ASSESSED',
    substantiveSecondaryOsr:human?.secondaryOsrRelevance==='MEANINGFUL_SECONDARY_OSR'?true:human?.secondaryOsrRelevance==='HUMAN_REPORTED_NEGLIGIBLE'?false:null,
    humanReviewReferences:reviews.filter(r=>r.humanReview.ruleId===RULE_ID).map(r=>({caseId:r.caseNumber,observationVerbatim:r.humanReview.observationVerbatim})),
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
    noticeThresholdPercent:NOTICE_THRESHOLD_PERCENT,noticeThresholdMeaning:'PRESENTATION_ONLY_NOT_ELIGIBILITY_OR_ZONING_APPLICABILITY',
    proposedNoticeVisibility:parcel?.decision.proposedNoticeVisibility??'NOT_APPLICABLE',
    secondaryOsrRelevance:parcel?.decision.secondaryOsrRelevance??'NOT_HUMAN_ASSESSED',
    substantiveSecondaryOsr:parcel?.decision.substantiveSecondaryOsr??null,
    humanReviewReferences:parcel?.decision.humanReviewReferences??[],
    doesNotEraseMappedSplitZoning:true,
    officialViewerAccess:parcel?{zoningLayerUrl:OFFICIAL_ZONING_LAYER_URL,mapViewerUrl:`https://www.arcgis.com/home/webmap/viewer.html?url=${encodeURIComponent(OFFICIAL_ZONING_LAYER_URL)}&source=sd`}:null,
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
    nearestOtherQcMeters:selected.length>1?Math.round(Math.min(...selected.filter(s=>s.parcelId!==r.parcelId).map(s=>distance(r.addresses[0].coordinates,s.addresses[0].coordinates)))):null,
    humanReview:{result:null,note:null,reviewStatus:'pending',verificationMethod:'Clearwater official zoning viewer'}}));
}

export function confirmedPairGold(records){
  return records.filter(g=>g.humanReview.reviewStatus==='human_confirmed'&&g.diagnostic.candidates.length===2&&['lmdr','os/r'].every(c=>g.diagnostic.candidates.some(e=>norm(e.zoningCode)===c)));
}


export function validateHumanEvidence(session,packet){
  assert.equal(session.ruleId,RULE_ID);assert.equal(session.sourceSnapshotIdentifier,'clearwater-gis-2026-09-28');
  assert.equal(session.records.length,5);assert.equal(new Set(session.records.map(o=>o.caseId)).size,5);
  return session.records.map((o,i)=>{
    assert.equal(o.caseId,`R002-${String(i+1).padStart(2,'0')}`);
    const q=packet.find(q=>q.caseId===o.caseId);assert.ok(q);
    for(const k of ['parcelId','address','osrCoveragePercent','originalIntersections','originalZoningFeatures'])assert.deepEqual(o[k],q[k],`Human QC identity ${o.caseId} ${k}`);
    assert.ok(o.humanReview.observationVerbatim);assert.equal(o.humanReview.approvalGranted,false);assert.equal(o.humanReview.legalSplitDetermination,false);
    const statuses={PRIMARY_GUIDANCE_SUPPORTED:'human_primary_candidate',PRIMARY_UNCERTAIN:'human_primary_applicability_unclear',TRUE_SPLIT_PREVENTS_PRIMARY:'human_true_split'};
    assert.ok(Object.hasOwn(statuses,o.humanReview.category));
    assert.ok(['MEANINGFUL_SECONDARY_OSR','HUMAN_REPORTED_NEGLIGIBLE','NOT_HUMAN_ASSESSED'].includes(o.humanReview.secondaryOsrRelevance));
    return {caseNumber:o.caseId,parcelId:o.parcelId,humanReview:{...o.humanReview,ruleId:RULE_ID,reviewStatus:statuses[o.humanReview.category]}};
  });
}
export function analyzePresentation(population,reviews=[]){
  const qualifying=population.filter(r=>r.decision.eligible);
  const metrics=rs=>({parcels:rs.length,addresses:rs.reduce((s,r)=>s+r.originalProfiles.length,0)});
  const options=Object.fromEntries([2,3,5].map(t=>[t,{thresholdPercent:t,prominent:metrics(qualifying.filter(r=>r.decision.osrCoveragePercent>t)),notProminent:metrics(qualifying.filter(r=>r.decision.osrCoveragePercent<=t)),potentialReviewRecovery:qualifying.reduce((s,r)=>s+r.originalProfiles.filter(p=>p.status==='review').length,0)}]));
  const inRange=r=>r.decision.osrCoveragePercent>3&&r.decision.osrCoveragePercent<=17.5;
  const reviewedIds=new Set(reviews.filter(r=>r.humanReview.reviewStatus&&r.humanReview.reviewStatus!=='pending').map(r=>r.parcelId));
  const range=qualifying.filter(inRange);
  return {noticeThresholdPercent:NOTICE_THRESHOLD_PERCENT,presentationOnly:true,legalExemption:false,options,
    rangeStudy:{bounds:'OS/R >3% and <=17.5%',qualifying:metrics(range),qualifyingAlreadyReviewed:metrics(range.filter(r=>reviewedIds.has(r.parcelId))),qualifyingUnreviewed:metrics(range.filter(r=>!reviewedIds.has(r.parcelId))),supportingReviews:reviews.filter(r=>range.some(p=>p.parcelId===r.parcelId)&&r.humanReview.reviewStatus!=='pending').map(r=>({caseId:r.caseNumber,parcelId:r.parcelId,humanReview:r.humanReview})),excluded:metrics(population.filter(r=>r.decision.structuralMatch&&!r.decision.eligible&&inRange(r)))},
    note:'Meaningful secondary OS/R does not by itself prevent confident LMDR primary starting guidance. It never removes potentially applicable mapped split zoning. Human true splits preventing primary guidance and all quality exceptions remain excluded.'};
}
export function progressQc(population,session,packet,priorReviews){
  const completed=session.records.map(o=>({...packet.find(q=>q.caseId===o.caseId),newInspectionRequested:false,
    humanReview:{...o.humanReview,result:o.humanReview.category==='PRIMARY_GUIDANCE_SUPPORTED'?'LMDR PRIMARY GUIDANCE SUPPORTED':o.humanReview.category,reviewStatus:'completed'},
    reviewPurpose:'Completed human evidence; preserve secondary interpretation. No repeat inspection requested.'}));
  const known=[...priorReviews,...session.records];
  const range=population.filter(r=>r.decision.osrCoveragePercent>3&&r.decision.osrCoveragePercent<=17.5);
  const targeted=sampleQc(range,known,3).map((q,i)=>({...q,caseId:`R002-T${String(i+1).padStart(2,'0')}`,batch:'TARGETED',newInspectionRequested:true,
    reviewPurpose:'Only unreviewed qualifying >3% to <=17.5% OS/R range; check contextual significance just above the proposed notice boundary.'}));
  return [...completed,...targeted];
}
