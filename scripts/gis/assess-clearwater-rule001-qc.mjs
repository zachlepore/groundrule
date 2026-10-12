#!/usr/bin/env node
/** Read-only human-evidence assessment. Never regenerates or activates candidates. */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const sha=b=>createHash("sha256").update(b).digest("hex");
const normalize=s=>String(s??"").toLowerCase().replace(/[\s_-]+/g,"");
const json=async p=>JSON.parse(await readFile(p,"utf8"));

export function impact(rows) {
  const partitions={reviewAlreadyMatched:0,reviewDifferentCode:0,reviewPreviouslyUnclassified:0,
    cleanAlreadyMatched:0,cleanDifferentCode:0,cleanPreviouslyUnclassified:0};
  for(const r of rows){
    assert.ok(["review","clean"].includes(r.originalStatus));
    const kind=!r.originalZoningCode?"PreviouslyUnclassified":normalize(r.originalZoningCode)===normalize(r.proposedPrimaryGuidanceZoning)?"AlreadyMatched":"DifferentCode";
    partitions[r.originalStatus+kind]++;
  }
  return {candidateParcels:new Set(rows.map(r=>r.parcelId)).size,candidateAddresses:rows.length,
    potentialReviewReduction:partitions.reviewAlreadyMatched+partitions.reviewDifferentCode+partitions.reviewPreviouslyUnclassified,
    existingReviewCodesWouldBecomeTrusted:partitions.reviewAlreadyMatched,
    reviewCodesWouldChange:partitions.reviewDifferentCode,reviewPreviouslyUnclassified:partitions.reviewPreviouslyUnclassified,
    originallyCleanAddresses:partitions.cleanAlreadyMatched+partitions.cleanDifferentCode+partitions.cleanPreviouslyUnclassified,
    partitions,currentlyPromotedAddresses:0,approvalStatus:"NOT_APPROVED"};
}

export function assess(records,audit) {
  assert.equal(new Set(records.map(r=>r.caseId)).size,records.length);
  const categoryCounts={CONFIRMED:0,PRIMARY_CANDIDATE:0,TRUE_SPLIT:0,UNCLEAR:0};
  const comparisons=records.map(r=>{
    assert.ok(Object.hasOwn(categoryCounts,r.humanReview.category));categoryCounts[r.humanReview.category]++;
    const named=r.humanReview.reportedPrimaryCode;
    const exact=Boolean(named)&&normalize(named)===normalize(r.frozenHypotheticalNonP);
    const codeAgreement=r.humanReview.category==="TRUE_SPLIT"?"TRUE_SPLIT_CONTRADICTS_FORCED_SINGLE_PRIMARY":exact?"NAMED_CODE_MATCH":named&&normalize(r.frozenHypotheticalNonP).startsWith(normalize(named))?"FAMILY_ONLY_NOT_FULL_NCOD_CONFIRMATION":"NO_PRIMARY_DETERMINATION";
    return {caseId:r.caseId,address:r.address,parcelId:r.parcelId,
      pair:r.originalIntersections.map(e=>e.code).sort().join(" + "),
      pCoveragePercent:r.originalIntersections.find(e=>e.normalizedZoningCode==="p").percentOfParcel,
      frozenCandidateEligible:r.frozenDecisionStatus==="PENDING_QC",frozenProposal:r.frozenProposal,
      humanCategory:r.humanReview.category,codeAgreement,independentNewParcel:r.independentNewParcel,
      previousGoldCaseIds:r.previousGoldCaseIds,originalDiagnosticFlags:r.originalDiagnosticFlags,
      humanInterpretationFlags:r.humanReview.interpretationFlags,observationVerbatim:r.humanReview.observationVerbatim};
  });
  const pairs={};
  for(const row of audit){const key=["P",row.proposedPrimaryGuidanceZoning].sort().join(" + ");pairs[key]??={audit:[],reviews:[]};pairs[key].audit.push(row);}
  for(const r of comparisons){pairs[r.pair]??={audit:[],reviews:[]};pairs[r.pair].reviews.push(r);}
  const byPair=Object.fromEntries(Object.entries(pairs).sort().map(([key,value])=>[key,{
    ...impact(value.audit),qcCases:value.reviews.length,
    independentlyNewQcParcels:value.reviews.filter(r=>r.independentNewParcel).length,
    confirmedControls:value.reviews.filter(r=>r.humanCategory==="CONFIRMED").length,
    primaryCandidateObservations:value.reviews.filter(r=>r.humanCategory==="PRIMARY_CANDIDATE").length,
    unclearCases:value.reviews.filter(r=>r.humanCategory==="UNCLEAR").length,
    trueSplitCases:value.reviews.filter(r=>r.humanCategory==="TRUE_SPLIT").length,
    excludedQcCases:value.reviews.filter(r=>!r.frozenCandidateEligible).length,
    cases:value.reviews.map(r=>r.caseId)}]));
  const selected=codes=>audit.filter(r=>codes.map(normalize).includes(normalize(r.proposedPrimaryGuidanceZoning)));
  const originalCodeResidential=selected(["LMDR","MDR","HDR","LDR"]).filter(r=>r.originalStatus==="review"&&normalize(r.originalZoningCode)===normalize(r.proposedPrimaryGuidanceZoning));
  const heldParcels=new Set(records.filter(r=>["R001-14","R001-17","R001-21"].includes(r.caseId)).map(r=>r.parcelId));
  const scopes={
    no_approval_now:impact([]),
    lmdr_pair_only:impact(selected(["LMDR"])),
    residential_pairs_excluding_mhdr:impact(selected(["LMDR","MDR","HDR","LDR"])),
    original_code_preserving_residential_review_only:impact(originalCodeResidential),
    all_except_D_MHDR_OSR:impact(selected(["LMDR","MDR","HDR","LDR","C","O","I","T","US19"])),
    all_qualifying_pairs:impact(audit),
    all_qualifying_minus_identified_applicability_context_holds:impact(audit.filter(r=>!heldParcels.has(r.parcelId)))};
  const eligible=comparisons.filter(r=>r.frozenCandidateEligible);
  const excluded=comparisons.filter(r=>!r.frozenCandidateEligible);
  return {approvalStatus:"NOT_APPROVED",recommendation:"Additional targeted confirmation, followed by separate district-pair approvals; no universal approval now.",
    categoryCounts,totalQcObservations:records.length,
    declaredGoldControls:records.filter(r=>r.declaredGoldControl).length,
    repeatGoldParcels:records.filter(r=>!r.independentNewParcel).length,
    independentNewParcels:records.filter(r=>r.independentNewParcel).length,
    newIndependentConfirmedParcels:records.filter(r=>r.independentNewParcel&&r.humanReview.category==="CONFIRMED").length,
    eligibleQc:{total:eligible.length,confirmedControls:eligible.filter(r=>r.humanCategory==="CONFIRMED").length,
      provisionalSupportingObservations:eligible.filter(r=>r.humanCategory==="PRIMARY_CANDIDATE").length,
      primaryApplicabilityUnclear:eligible.filter(r=>r.humanCategory==="UNCLEAR").length,
      trueSplitContradictions:eligible.filter(r=>r.humanCategory==="TRUE_SPLIT").length},
    excludedQc:{total:excluded.length,primaryCandidates:excluded.filter(r=>r.humanCategory==="PRIMARY_CANDIDATE").length,
      unclear:excluded.filter(r=>r.humanCategory==="UNCLEAR").length,trueSplit:excluded.filter(r=>r.humanCategory==="TRUE_SPLIT").length},
    namedCodeAgreements:comparisons.filter(r=>r.codeAgreement==="NAMED_CODE_MATCH").length,
    pDominantEligible:eligible.filter(r=>r.pCoveragePercent>50),
    pDominantExcludedTrueSplits:excluded.filter(r=>r.pCoveragePercent>50&&r.humanCategory==="TRUE_SPLIT"),
    scopes,byPair,comparisons,currentlyPromotedAddresses:0,
    caveats:["Candidate wording and physical-context observations are not definitive legal zoning confirmations.",
      "An excluded true split contradicts an unconditional structural-only rule; it does not falsify a qualifying assignment that was never made. Quality exceptions are not guaranteed to catch every future genuine split.",
      "Approval-scope numbers are conditional ceilings, not statistically established safe outcomes or authorization.",
      "R001-14 and R001-21 are unclear on primary applicability; R001-17 is a named candidate with uncertain marina context, not a legal confirmation.",
      "R001-26 repeats historical gold case 2A-03 and supplies important new context, but is not a new independent parcel. Historical confirmation is preserved, not silently replaced.",
      "All five excluded cases keep their original source/geometry flags, NCOD qualifiers and Preservation intersections."]};
}

function render(report){
  const pairRows=Object.entries(report.byPair).map(([pair,r])=>`| ${pair} | ${r.qcCases} | ${r.independentlyNewQcParcels} | ${r.confirmedControls} | ${r.primaryCandidateObservations} | ${r.unclearCases} | ${r.trueSplitCases} | ${r.excludedQcCases} | ${r.potentialReviewReduction} | ${r.existingReviewCodesWouldBecomeTrusted} | ${r.reviewCodesWouldChange} | ${r.reviewPreviouslyUnclassified} | ${r.originallyCleanAddresses} |`);
  const scopeRows=Object.entries(report.scopes).map(([name,r])=>`| ${name} | ${r.candidateParcels} | ${r.candidateAddresses} | ${r.potentialReviewReduction} | ${r.existingReviewCodesWouldBecomeTrusted} | ${r.reviewCodesWouldChange} | ${r.reviewPreviouslyUnclassified} | ${r.originallyCleanAddresses} |`);
  return `# Rule 001 — 30-case human evidence assessment\n\n**NOT APPROVED.** No candidate logic, frozen classifications, CLEAN/REVIEW statuses, Supabase data or Guides changed. Currently promoted/trusted additional addresses: **0**.\n\n## Human outcomes\n\n${report.totalQcObservations} exact observations: ${report.categoryCounts.CONFIRMED} CONFIRMED controls, ${report.categoryCounts.PRIMARY_CANDIDATE} PRIMARY CANDIDATE observations, ${report.categoryCounts.TRUE_SPLIT} TRUE SPLIT, ${report.categoryCounts.UNCLEAR} UNCLEAR. There are ${report.declaredGoldControls} declared controls and ${report.repeatGoldParcels} previously reviewed parcels in total (OWEN DR is also a repeat), leaving ${report.independentNewParcels} independent new parcels. There are **${report.newIndependentConfirmedParcels} new unqualified confirmations**. Named-code agreement in ${report.namedCodeAgreements} notes is not legal confirmation; it includes named but uncertain hypotheses. R001-27 supports only the LMDR-NCOD family, not an independently verified full subtype.\n\nOf 25 eligible sampled candidates, 2 are already-confirmed controls, 21 have provisional supporting direction, and 2 (R001-14/MHDR and R001-21/D) remain unclear on primary applicability. R001-17 names US19 but explicitly reports uncertain marina context. None of the 25 eligible samples is reported TRUE SPLIT.\n\nAmong five excluded examples, R001-26 supports an LMDR candidate while retaining a potentially meaningful P strip and gap; R001-27 names LMDR-NCOD while preserving the full source qualifier and exceptions; R001-28 and R001-30 remain unclear; R001-29 is **TRUE SPLIT: P / LMDR**. Existing exclusions prevented all five automatic assignments. R001-29 contradicts the unconditional P-plus-one-code shortcut, but not a qualifying assignment that was never made. Do not conclude that poor geometry will always identify true splits.\n\n## P dominance and physical context\n\n${report.pDominantEligible.length} eligible QC parcels have P >50%: ${report.pDominantEligible.map(r=>`${r.caseId} (${r.pCoveragePercent}%, ${r.humanCategory})`).join("; ")}. Seven provide candidate support and MHDR R001-14 remains unclear. The LMDR R001-19 observation reaches 90.904052% P but is still candidate wording, not an unqualified legal confirmation. Excluded R001-29 has 56.933515% P and a genuine reported split. No P-percentage threshold separates these outcomes.\n\nPark context must remain attached to R001-13/OS-R, R001-14/MHDR and R001-21/D; physical use does not establish the legally applicable primary district. R001-17, R001-28 and R001-30 require careful marina/regional-center interpretation. P remains substantive in every case, including water-associated observations.\n\n## Evidence and impact by pair\n\nAll address counts are drawn from the exact frozen candidate audit, not extrapolated from sample frequency. The REVIEW code categories are mutually exclusive. CLEAN candidates are separate and do not count as REVIEW reduction.\n\n| Pair | QC | New parcels | Confirmed controls | Primary candidates | Unclear | True split | Excluded QC | Potential REVIEW reduction | REVIEW same code | REVIEW different code | REVIEW unclassified | Already CLEAN |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${pairRows.join("\n")}\n\nThe NCOD pair has zero qualifying candidates; its full subtype must not be flattened to base LMDR. OS/R has zero potential REVIEW reduction: all four candidate addresses were already CLEAN and would receive a different proposed primary code.\n\n## Conditional approval-scope ceilings\n\nThese are alternatives, not additive. None is approved.\n\n| Possible future scope | Candidate parcels | Candidate addresses | Potential REVIEW reduction | Existing REVIEW code becomes trusted | REVIEW code changes | REVIEW unclassified | Already CLEAN |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${scopeRows.join("\n")}\n\nThe full ceiling of 2,178 REVIEW addresses consists of 1,976 already-matching but still-REVIEW addresses, 201 different-code addresses and one unclassified address. The 329 CLEAN candidates are excluded from that reduction.\n\nThe identified-holds scenario omits only R001-14, R001-17 and R001-21: 9 REVIEW addresses plus 1 CLEAN address. Its 2,169 REVIEW ceiling is **not a recommended approval scope**; deleting those examples does not validate all other parcels or pairs. All original quality exclusions remain in every scope.\n\n## Recommendation and targeted confirmation\n\nDo not accept the universal rule now. Keep CLR-Z-001 provisional, pursue separate district-pair approvals, and use the LMDR/P pair as the first potential scope after explicit confirmation of the three independent eligible LMDR examples R001-05, R001-15 and R001-19. The conditional LMDR ceiling is 256 REVIEW addresses (217 already-matching, 39 different-code). Retain R001-26's gap/meaningful strip and R001-29's true split as exceptions; seek staff/map interpretation for genuine P-designated portions rather than inferring they disappear.\n\nMDR/P, HDR/P and LDR/P can share a confirmation protocol but require separate decisions; request unambiguous primary interpretations for their existing independent examples. The residential bundle excluding MHDR has a conditional 1,150 REVIEW ceiling, not approval. Do not count samples or controls as an adequate citywide statistical guarantee.\n\nDefer MHDR/P and D/P until park primary applicability is clarified (R001-14 and R001-21). OS/R/P also needs park-context confirmation and offers no REVIEW recovery here. For US19/P, clarify R001-17 marina context and the excluded R001-28 regional-center / R001-30 marina cases before proposing pair-wide acceptance. Independently confirm C/P, O/P, I/P and T/P applicability; preserve water/marina context and P restrictions. This needs human map/staff QC, not a topology engine or new geometry features.\n\n## Rule 002 priorities (no implementation)\n\n1. LMDR + OS/R, **without P or additional codes**, is the next candidate class: the historical gold set already contains ten confirmed LMDR examples. First freeze its complete citywide population and representative independent QC; do not infer a universal percentage tolerance from those ten.\n2. LMDR + MDR and LMDR + C follow only with explicit true-split safeguards: historical gold contains genuine splits and staff uncertainty. Dominant area alone is insufficient.\n3. Three-or-more-code intersections remain REVIEW and lower priority. Do not turn them into single districts using this P rule.\n\n## Evidence limitations and preservation\n\n${report.caveats.map(c=>`- ${c}`).join("\n")}\n\nThe exact notes and identities are versioned in ../zoning-gold/rule001-qc-observations.json; the historical 25 gold records are preserved and indexed to this additional session. Inspection dates were not supplied: October 12 is the recording date. The original QC packet and provisional dataset remain frozen; no new candidate regeneration or approval is part of this assessment.\n`;
}

export async function run(input,output){
  const obs=await json(path.join(ROOT,"research/gis/zoning-gold/rule001-qc-observations.json"));
  const packetBytes=await readFile(path.join(ROOT,obs.sourceQcPacket.path));
  assert.equal(sha(packetBytes),obs.sourceQcPacket.sha256);
  const packet=JSON.parse(packetBytes);
  assert.equal(obs.records.length,30);
  for(const r of obs.records){
    const q=packet.find(q=>q.caseId===r.caseId);assert.ok(q);
    assert.equal(r.address,q.address);assert.equal(r.parcelId,q.parcelId);
    assert.deepEqual(r.originalDiagnosticFlags,q.diagnosticFlags);assert.deepEqual(r.originalIntersections,q.originalIntersections);
    assert.equal(r.frozenProposal,q.proposedPrimaryGuidanceZoning);assert.equal(r.frozenDecisionStatus,q.decisionStatus);
  }
  const checks=await json(path.join(input,"output-checksums.json"));
  for(const name of ["changed-record-audit.jsonl","source-verification.json","summary.json"]){assert.equal(sha(await readFile(path.join(input,name))),checks[name].sha256);}
  const auditBytes=await readFile(path.join(input,"changed-record-audit.jsonl"));
  const audit=auditBytes.toString().trim().split("\n").map(JSON.parse);
  const source=await json(path.join(input,"source-verification.json"));
  const manifest=await json(path.join(ROOT,"scripts/gis/clearwater-rule001-source.json"));
  assert.equal(source.archiveSha256,manifest.archiveSha256);assert.deepEqual(source.files,manifest.files);
  assert.equal(audit.length,2507);assert.equal(new Set(audit.map(r=>r.sourceAddressIdentifier)).size,2507);
  const report=assess(obs.records,audit);
  assert.equal(report.scopes.all_qualifying_pairs.potentialReviewReduction,2178);
  assert.equal(report.scopes.all_qualifying_pairs.candidateParcels,1841);
  assert.equal(report.scopes.all_qualifying_pairs.originallyCleanAddresses,329);
  report.provenance={snapshotId:manifest.snapshotId,sourceAuditSha256:sha(auditBytes),observationsSha256:sha(await readFile(path.join(ROOT,"research/gis/zoning-gold/rule001-qc-observations.json"))),recordedOn:obs.recordedOn};
  await mkdir(output,{recursive:true});
  await writeFile(path.join(output,"assessment.json"),JSON.stringify(report,null,2)+"\n");
  await writeFile(path.join(output,"assessment.md"),render(report));
  console.log(JSON.stringify({categoryCounts:report.categoryCounts,independentNewParcels:report.independentNewParcels,eligibleQc:report.eligibleQc,scopes:report.scopes},null,2));
  return report;
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
  assert.equal(process.argv.length,4,"Usage: node scripts/gis/assess-clearwater-rule001-qc.mjs <frozen-output-directory> <small-assessment-output-directory>");
  await run(process.argv[2],process.argv[3]);
}
