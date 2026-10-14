/** Offline proposal/presentation policy only. No geometry or production operations. */
import assert from "node:assert/strict";
import { normalizeZoning } from "./clearwater-pilot.mjs";
export const RULE_VERSION="2.0.0-provisional";
export const NOTICE_THRESHOLD_PERCENT=2;
export const policyBand=n=>{
  assert.ok(Number.isFinite(n)&&n>=0,"Measured P coverage required");
  return n<=2?"P ≤2%":n<=3?"P >2–3%":n<=5?"P >3–5%":n<=10?"P >5–10%":"P >10%";
};
export const noticeVisibility=(eligible,p,threshold=NOTICE_THRESHOLD_PERCENT)=>!eligible?"UNRESOLVED_NO_PRIMARY_PROPOSAL":p>threshold?"RECOMMENDED_PHYSICAL_PROJECT_GUIDES":"NOT_PROMINENT_IN_ORDINARY_GUIDES";

export function normalizeReviewSession(records){
  const statuses={CONFIRMED:"human_confirmed",PRIMARY_CANDIDATE:"human_primary_candidate",TRUE_SPLIT:"human_true_split",UNCLEAR:"human_primary_applicability_unclear"};
  assert.ok(records.every(r=>Object.hasOwn(statuses,r.humanReview.category)),"Unrecognized human review category");
  return records.map(r=>({caseNumber:r.caseId,parcelId:r.parcelId,humanReview:{
    reviewStatus:statuses[r.humanReview.category],
    result:r.humanReview.confirmedPrimaryCode?`CONFIRMED: ${r.humanReview.confirmedPrimaryCode}`:null,
    reportedPrimaryCode:r.humanReview.reportedPrimaryCode,
    category:r.humanReview.category}}));
}

const empty=()=>({parcels:0,addresses:0,cleanAddresses:0,reviewAddresses:0,reviewAlreadyMatched:0,reviewDifferentCode:0,reviewUnclassified:0});
function add(m,r,profiles){
  m.parcels++;m.addresses+=profiles.length;
  for(const p of profiles){
    if(p.status==="clean")m.cleanAddresses++;else{
      m.reviewAddresses++;
      const code=r.decision.hypotheticalNonP;
      if(code){if(!p.zoningCode)m.reviewUnclassified++;else if(normalizeZoning(p.zoningCode)===normalizeZoning(code))m.reviewAlreadyMatched++;else m.reviewDifferentCode++;}
    }
  }
}

export function analyzePolicy(city,profilesByParcel,observations,gold){
  const groups=Object.fromEntries([0,2.5,4,7,11].map(n=>[policyBand(n),{all:empty(),qualifying:empty(),excluded:empty(),humanCases:[]} ]));
  const byPair={};
  const qualifying=city.filter(r=>r.decision.eligible);
  for(const r of city){
    if(!r.originalIntersections.some(e=>e.normalizedZoningCode==="p"))continue;
    const profiles=profilesByParcel.get(r.parcelId)??[];
    const band=groups[policyBand(r.pCoveragePercent)];
    add(band.all,r,profiles);add(r.decision.eligible?band.qualifying:band.excluded,r,profiles);
    const p=byPair[r.combination]??={all:empty(),qualifying:empty(),excluded:empty()};
    add(p.all,r,profiles);add(r.decision.eligible?p.qualifying:p.excluded,r,profiles);
  }
  const regression=[];
  for(const o of observations){
    const r=city.find(r=>r.parcelId===o.parcelId);
    assert.ok(r,`Reviewed P parcel ${o.caseId} must be analyzed`);
    const category=o.humanReview.category;
    const prohibited=["TRUE_SPLIT","UNCLEAR"].includes(category);
    const exact=o.humanReview.reportedPrimaryCode&&normalizeZoning(o.humanReview.reportedPrimaryCode)===normalizeZoning(r.decision.hypotheticalNonP);
    const entry={caseId:o.caseId,parcelId:o.parcelId,address:o.address,humanCategory:category,independentNewParcel:o.independentNewParcel,
      pCoveragePercent:r.pCoveragePercent,qualifying:r.decision.eligible,proposal:r.decision.proposedPrimaryGuidanceZoning,
      flags:r.decision.flags,originalQualityFlags:o.originalDiagnosticFlags,interpretationFlags:o.humanReview.interpretationFlags,
      codeAgreement:exact?"NAMED_CODE_MATCH":category==="TRUE_SPLIT"?"TRUE_SPLIT":"NO_EXACT_FULL_CODE_CONFIRMATION",
      prohibitedAssignment:prohibited&&r.decision.eligible,
      previousQualityExclusionPreserved:!o.originalDiagnosticFlags.length||!r.decision.eligible,
      noticeVisibility:noticeVisibility(r.decision.eligible,r.pCoveragePercent),observationVerbatim:o.humanReview.observationVerbatim};
    regression.push(entry);groups[policyBand(r.pCoveragePercent)].humanCases.push(entry);
  }
  const historicalRegression=gold.records.map(g=>{
    const r=city.find(r=>r.parcelId===g.parcelId);
    const eligible=r?.decision.eligible??false;
    const confirmed=g.humanReview.reviewStatus==="human_confirmed";
    const match=!r||!r.decision.structuralMatch||!confirmed||normalizeZoning(g.humanReview.result.replace(/^CONFIRMED:\s*/,""))===normalizeZoning(r.decision.hypotheticalNonP);
    return {caseId:g.caseNumber,parcelId:g.parcelId,reviewStatus:g.humanReview.reviewStatus,
      prohibitedAssignment:["human_true_split","human_staff_review"].includes(g.humanReview.reviewStatus)&&eligible,
      conflictingConfirmation:!match,qualifying:eligible};
  });
  const options=Object.fromEntries([2,3,5].map(threshold=>{
    const prominent=empty(),notProminent=empty();
    for(const r of qualifying)add(r.pCoveragePercent>threshold?prominent:notProminent,r,profilesByParcel.get(r.parcelId)??[]);
    return [threshold,{thresholdPercent:threshold,prominentNotice:prominent,notProminent,
      qualifyingParcels:qualifying.length,qualifyingAddresses:prominent.addresses+notProminent.addresses,
      reviewRecoveryOpportunity:prominent.reviewAddresses+notProminent.reviewAddresses,
      resolutionCountChangedByNoticeThreshold:0}];
  }));
  const totals={all:empty(),qualifying:empty(),excluded:empty()};
  for(const g of Object.values(groups))for(const k of Object.keys(totals))for(const key of Object.keys(totals[k]))totals[k][key]+=g[k][key];
  for(const g of Object.values(groups)){
    assert.equal(g.all.parcels,g.qualifying.parcels+g.excluded.parcels);
    assert.equal(g.all.addresses,g.qualifying.addresses+g.excluded.addresses);
  }
  assert.equal(totals.qualifying.reviewAddresses,totals.qualifying.reviewAlreadyMatched+totals.qualifying.reviewDifferentCode+totals.qualifying.reviewUnclassified);
  const failures=regression.filter(r=>r.prohibitedAssignment||!r.previousQualityExclusionPreserved);
  assert.equal(failures.length,0,"New human exclusions must be honored");
  assert.ok(historicalRegression.every(r=>!r.prohibitedAssignment&&!r.conflictingConfirmation));
  return {ruleId:"CLR-Z-001",ruleVersion:RULE_VERSION,approvalStatus:"NOT_APPROVED",noticeThresholdPercent:NOTICE_THRESHOLD_PERCENT,
    thresholdMeaning:"Presentation only; never a legal exemption or primary-eligibility test",totals,bands:groups,byPair,thresholdOptions:options,
    regression,historicalRegression,regressionFailures:failures.length,currentlyActivatedGuidanceAddresses:0,
    recommendation:"Retain 2%. Activation requires explicit authorization; prioritize original-REVIEW same-code qualifiers. Keep all quality and human exclusions; no source status promotion.",
    higherThresholdNoticeReductions:{3:options[2].prominentNotice.addresses-options[3].prominentNotice.addresses,5:options[2].prominentNotice.addresses-options[5].prominentNotice.addresses}};
}

export function focusedQc(city,profilesByParcel,observations,gold){
  const used=new Set([...observations.map(r=>r.parcelId),...gold.records.map(r=>r.parcelId)]);
  const selected=[];
  const eligible=city.filter(r=>r.decision.eligible&&!used.has(r.parcelId));
  const mismatch=r=>(profilesByParcel.get(r.parcelId)??[]).some(p=>p.status==="review"&&p.zoningCode&&normalizeZoning(p.zoningCode)!==normalizeZoning(r.decision.hypotheticalNonP));
  const choose=(pool,compare,purpose)=>{
    const r=pool.filter(r=>!selected.some(s=>s.parcelId===r.parcelId)).sort(compare)[0];
    if(r)selected.push({...r,reviewPurpose:purpose});
  };
  const id=(a,b)=>a.parcelId.localeCompare(b.parcelId);
  const separation=r=>selected.length?Math.min(...selected.map(s=>{
    const a=r.addresses[0]?.coordinates,b=s.addresses[0]?.coordinates;
    return a&&b?Math.hypot((a[0]-b[0])*98.5,(a[1]-b[1])*111.3):0;
  })):0;
  choose(eligible.filter(r=>r.pCoveragePercent<=2),(a,b)=>b.pCoveragePercent-a.pCoveragePercent||id(a,b),"Nearest qualifying parcel below/equal 2%: validate presentation boundary and retained P details, not a legal exemption.");
  choose(eligible.filter(r=>r.pCoveragePercent>2),(a,b)=>a.pCoveragePercent-b.pCoveragePercent||id(a,b),"Nearest qualifying parcel above 2%: test the strict greater-than notice boundary.");
  choose(eligible.filter(r=>r.pCoveragePercent>2&&r.pCoveragePercent<=3),id,"2–3% tradeoff: would raising the notice threshold hide context the reviewer needs? Does not test primary eligibility.");
  choose(eligible.filter(r=>r.pCoveragePercent>3&&r.pCoveragePercent<=5),(a,b)=>separation(b)-separation(a)||id(a,b),"3–5% tradeoff, separated from earlier samples: presentation benefit remains unverified; P stays mapped at either threshold.");
  choose(eligible.filter(r=>r.pCoveragePercent<=2&&["c","o","i","d","us19","os/r"].includes(normalizeZoning(r.decision.hypotheticalNonP))),(a,b)=>b.evidence.parcelAreaSquareMeters-a.evidence.parcelAreaSquareMeters||id(a,b),"Small P in an unusually large nonresidential source parcel: challenge whether a non-prominent notice still gives adequate context. Area is existing diagnostic evidence; physical use is not inferred.");
  choose(eligible.filter(mismatch),(a,b)=>b.pCoveragePercent-a.pCoveragePercent||id(a,b),"Original REVIEW primary-code mismatch: verify the proposed change independently of area dominance.");
  choose(eligible.filter(r=>r.pCoveragePercent>50&&!['lmdr','ldr','mdr','hdr'].includes(normalizeZoning(r.decision.hypotheticalNonP))),(a,b)=>b.pCoveragePercent-a.pCoveragePercent||id(a,b),"Large P/nonresidential case: test uncertain primary applicability; physical water context alone cannot confirm zoning.");
  choose(eligible.filter(r=>r.pCoveragePercent<=2&&mismatch(r)),id,"Small-P primary-code mismatch: challenge guidance interpretation when suppression of prominence is proposed. Viewer access/details must remain available.");
  const cases=selected.map((r,i)=>({caseId:`R001-P2-${String(i+1).padStart(2,"0")}`,address:r.addresses[0]?.address,parcelId:r.parcelId,
    sourceSnapshotIdentifier:r.sourceSnapshotIdentifier,ruleVersion:RULE_VERSION,pCoveragePercent:r.pCoveragePercent,
    originalIntersections:r.originalIntersections,originalProfiles:(profilesByParcel.get(r.parcelId)??[]).map(p=>({address:p.displayAddress,originalZoning:p.zoningCode,originalStatus:p.status})),
    proposal:r.decision.proposedPrimaryGuidanceZoning,noticeVisibility:noticeVisibility(true,r.pCoveragePercent),flags:r.decision.flags,
    reviewPurpose:r.reviewPurpose,previouslyReviewed:false,newInspectionRequested:true,humanReview:{result:null,note:null,reviewDate:null}}));
  for(const caseId of ["R001-14","R001-21","R001-27","R001-29"]){
    const o=observations.find(o=>o.caseId===caseId);const r=city.find(r=>r.parcelId===o.parcelId);
    cases.push({caseId,address:o.address,parcelId:o.parcelId,sourceSnapshotIdentifier:r.sourceSnapshotIdentifier,ruleVersion:RULE_VERSION,
      pCoveragePercent:r.pCoveragePercent,originalIntersections:r.originalIntersections,proposal:r.decision.proposedPrimaryGuidanceZoning,
      noticeVisibility:noticeVisibility(r.decision.eligible,r.pCoveragePercent),flags:r.decision.flags,
      reviewPurpose:"Already-reviewed regression control: human/quality/NCOD exclusion applies before presentation. No repeat inspection requested.",
      previouslyReviewed:true,newInspectionRequested:false,humanReview:o.humanReview});
  }
  assert.ok(cases.length<=12);assert.equal(new Set(cases.map(c=>c.parcelId)).size,cases.length);
  return cases;
}

export function renderPolicyReport(p,summary,qc){
  const bandRows=Object.entries(p.bands).map(([name,b])=>`| ${name} | ${b.all.parcels} | ${b.all.addresses} | ${b.qualifying.parcels} / ${b.qualifying.addresses} | ${b.excluded.parcels} / ${b.excluded.addresses} | ${b.all.cleanAddresses} | ${b.all.reviewAddresses} | ${b.qualifying.reviewAlreadyMatched} | ${b.qualifying.reviewDifferentCode} + ${b.qualifying.reviewUnclassified} | ${b.humanCases.filter(r=>["UNCLEAR","TRUE_SPLIT"].includes(r.humanCategory)).map(r=>`${r.caseId} (${r.humanCategory})`).join("; ")||"none"} |`);
  const thresholdRows=Object.values(p.thresholdOptions).map(o=>`| ${o.thresholdPercent}% | ${o.prominentNotice.parcels} | ${o.prominentNotice.addresses} | ${o.notProminent.parcels} | ${o.notProminent.addresses} | ${o.reviewRecoveryOpportunity} |`);
  const pairRows=Object.entries(p.byPair).sort((a,b)=>b[1].all.parcels-a[1].all.parcels).map(([name,v])=>`| ${name} | ${v.all.parcels} / ${v.all.addresses} | ${v.qualifying.parcels} / ${v.qualifying.addresses} | ${v.excluded.parcels} / ${v.excluded.addresses} | ${v.qualifying.reviewAlreadyMatched} | ${v.qualifying.reviewDifferentCode} | ${v.qualifying.reviewUnclassified} | ${v.qualifying.cleanAddresses} |`);
  return `# Rule 001 v${RULE_VERSION} — simplified Preservation proposal\n\n**NOT APPROVED.** Complete ${summary.inputCounts.profiles}-address frozen population retained. Original zoning, source QA statuses and evaluator facts are unchanged. Currently promoted/guidance-ready additional addresses: **0**.\n\n## Primary and notice policy\n\nExactly P plus one supported non-P district can receive a proposed primary district only after all existing source safeguards and historical/new human exclusions. P is retained at every percentage. The exact 2% boundary controls prominence only: P ≤2% recommends no prominent warning in ordinary Guides, while P >2% recommends the locked informational notice on relevant physical-project Guides. Neither value is a legal exemption, an eligibility threshold, a water assumption, or authorization to implement UI. Property details/backend evidence and official viewer access remain required for both. Excluded properties have no primary/notice recommendation; they remain unresolved.\n\n## Complete address-linked P population and separate exceptions\n\n| P coverage | Parcels | Addresses | Qualifying parcels / addresses | Excluded parcels / addresses | Original CLEAN | Original REVIEW | Qualifying REVIEW same code | Qualifying REVIEW different + unclassified | Known human uncertainty / split |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---|\n${bandRows.join("\n")}\n\nThe five bands are mutually exclusive and reconcile to ${summary.pParcels} parcels / ${summary.pAddresses} addresses. Detailed excluded hypothetical-code matches and quality flags remain in policy-analysis.json / p-parcel-inventory.json; they are never recovery opportunities. Neighboring/unaddressed raw parcels (${summary.unverifiedMembershipPParcels} P-overlap parcels) have unverified Clearwater membership and are inventoried separately, not added to city address counts.\n\n## Notice-threshold comparison\n\n| Threshold | Prominent parcels | Prominent addresses | Non-prominent parcels | Non-prominent addresses | Potential REVIEW recovery |\n|---|---:|---:|---:|---:|---:|\n${thresholdRows.join("\n")}\n\nMoving from 2% to 3% would remove prominence for ${p.higherThresholdNoticeReductions[3]} additional qualifying addresses; 5% would remove it for ${p.higherThresholdNoticeReductions[5]}. Resolution counts do not change. Retain **2%**: higher thresholds may reduce notice frequency, but their presentation benefit is unverified and does not establish that mapped P is irrelevant. This comparison does not invent a legal tolerance.\n\n## Easy gains and exact impact\n\n${summary.candidateParcels} qualifying parcels / ${summary.candidateAddresses} addresses. Original REVIEW recovery opportunity: ${summary.originallyReviewCandidates}, comprising ${summary.candidateAddressCategories.reviewAlreadyMatched} already-matching codes, ${summary.candidateAddressCategories.reviewDifferentCode} changed codes, and ${summary.candidateAddressCategories.reviewPreviouslyUnclassified} previously unclassified. Original CLEAN proposals: ${summary.originallyCleanCandidates}, a separate population. Source REVIEW addresses with no eligible proposal: ${summary.unresolvedReviewWithoutCandidate}. No status is promoted.\n\nCompared with v1, R001-14 (one REVIEW address) and R001-21 (eight REVIEW addresses) are now excluded for recorded unclear primary applicability. Thus prior 1,976 same-code REVIEW opportunities become 1,967, while 201 changed-code and 1 unclassified REVIEW opportunity remain; 329 original CLEAN candidates remain. This change comes from human safeguards, never the notice threshold. A proposed resident-guidance readiness field is separate from source-GIS quality, and is pending explicit authorization.\n\n## Results by zoning combination\n\n| Pair / combination | All parcels / addresses | Qualifying parcels / addresses | Excluded parcels / addresses | Qualifying REVIEW same | REVIEW changed | REVIEW unclassified | Already CLEAN |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${pairRows.join("\n")}\n\n## Existing human regression evidence\n\nHistorical 25 records and all 30 Rule 001 observations were checked. Regression failures: ${p.regressionFailures}. The two prior confirmed controls and other repeated parcels are not new confirmations. All recorded TRUE SPLIT / staff-review / unclear-primary decisions block assignments; conflicting confirmations also block assignments. R001-17 remains candidate wording with uncertain marina context; it is not silently upgraded to a confirmation. NCOD retains full source distinctions and unsupported combinations remain excluded. Seven supporting P-dominant candidate observations do not erase the meaningful P/LMDR split R001-29. See human-review-regression.json for every original quality flag and human outcome.\n\n## Focused QC and recommendation\n\n${qc.filter(c=>c.newInspectionRequested).length} new cases and four already-reviewed exclusion controls, ${qc.length} total. No new 30-case project. There are no qualifying changed/new-primary REVIEW records at P ≤2% in this snapshot, so no such sample was fabricated. Threshold-adjacent and 2–5% cases test presentation assumptions; code-mismatch and large/nonresidential cases test primary interpretation. Existing controls require no repeat inspection. Cases are proposals, not reviewer instructions. The packet explains the unsupported assumption per case.\n\nRecommend explicitly authorizing a first static-lookup scope of original-REVIEW, already-matching eligible primary codes after the limited boundary/context check, retaining all exclusions. That scope has ${summary.candidateAddressCategories.reviewAlreadyMatched} potential addresses and no primary-code changes. Separately authorize the ${summary.candidateAddressCategories.reviewDifferentCode+summary.candidateAddressCategories.reviewPreviouslyUnclassified} changed/new-code proposals if desired; existing CLEAN rows are not REVIEW recovery. Keep unresolved properties separate. No approval is inferred from adoption of this proposed design direction.\n\n## Reproduction and later approved static lookup\n\nUse the permanent September 28 Release and committed processor; verify its pinned hashes and counts, and run into a new output directory. Optional immutable area measurements must match the same source and algorithm hashes; no prior classifications are reused. The browser workflow produces downloadable full outputs without committing raw datasets.\n\nAfter explicit authorization, record the approved rule version, 2% presentation threshold, approval scope and source/evidence hashes in a small reviewed research configuration. Regenerate from the original release with that approved scope. Export all 63,430 source addresses: approved qualified records get a separately marked guidance-ready primary and retained P/notice metadata; exceptions retain review requirements; original source QA and zoning remain immutable. Validate counts, every known human exclusion, exact threshold boundaries and file hashes. Publish the resulting static file as a workflow/release artifact. No Supabase import, production classifier update, CLEAN promotion or Guide implementation is included or authorized here.\n`;
}

export function renderFocusedQc(cases,predictions=false){
  return `# Rule 001 focused checks — at most 12 cases\n\nIndependently inspect the official viewer; reply with primary interpretation, TRUE SPLIT codes or UNCLEAR, and notes. New cases are not approved. Four controls below already have human outcomes and require no repeat inspection.\n\n${cases.map(c=>`## ${c.caseId}: ${c.address}\n\n- Parcel: ${c.parcelId}\n- Mapped coverage: ${c.originalIntersections.map(e=>`${e.code} ${e.percentOfParcel}%`).join("; ")}\n- Original classifications/statuses: ${c.originalProfiles?.map(p=>`${p.address}: ${p.originalZoning??"unclassified"} / ${p.originalStatus}`).join("; ")??"See existing observation record"}\n- Flags: ${c.flags.join(", ")||"none"}\n- Purpose: ${c.reviewPurpose}\n${predictions?`- Research proposal: ${c.proposal??"WITHHELD"}; notice: ${c.noticeVisibility}\n`:""}- New inspection requested: ${c.newInspectionRequested}\n- Human result: ${c.humanReview.category??"pending"}\n`).join("\n")}\nResearch predictions and notice recommendations are in qc-batch.json; the reviewer-only packet omits them as instructions.\n`;
}
