#!/usr/bin/env node
/** Frozen snapshot -> freshly approved Rule 001 -> provisional Rule 002, offline only. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import RBush from 'rbush';
import { normalizeZoning as norm } from './clearwater-pilot.mjs';
import { verifySource } from './clearwater-rule001.mjs';
import { normalizeReviewSession } from './clearwater-rule001-policy.mjs';
import { approveRecord, validateApproval } from './export-clearwater-approved-rule001.mjs';
import { indexItem } from './clearwater-rule002-intersections.mjs';
import { RULE_ID, RULE_VERSION, classify, addProvisionalLayer, confirmedPairGold, NOTICE_THRESHOLD_PERCENT, validateHumanEvidence, analyzePresentation, progressQc } from './clearwater-rule002-policy.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
export async function loadHumanEvidence(){
  const configPath=path.join(ROOT,'research/gis/rule002-presentation-policy.json');
  const config=await json(configPath);
  assert.equal(config.ruleId,RULE_ID);assert.equal(config.ruleVersion,RULE_VERSION);assert.equal(config.approvalStatus,'NOT_APPROVED');
  assert.equal(config.noticeProminentWhenOsrPercentGreaterThan,NOTICE_THRESHOLD_PERCENT);assert.deepEqual(config.comparisonThresholds,[2,3,5]);
  assert.equal(config.presentationOnly,true);assert.equal(config.noticeThresholdIsLegalExemption,false);assert.equal(config.noticeThresholdChangesPrimaryEligibility,false);
  assert.equal(config.retainAllMappedDistrictsAndEvidence,true);assert.equal(config.rule001PreservationThresholdUnchanged,2);
  assert.equal(config.humanEvidence.path,'research/gis/rule002-qc-observations.json');
  const b=await readFile(path.join(ROOT,config.humanEvidence.path));assert.equal(hash(b),config.humanEvidence.sha256,'Registered Rule 002 human evidence');
  const session=JSON.parse(b);assert.equal(session.sourceQcPacket.path,'research/gis/rule002-qc-initial.json');
  const packetBytes=await readFile(path.join(ROOT,session.sourceQcPacket.path));assert.equal(hash(packetBytes),session.sourceQcPacket.sha256,'Frozen original Rule 002 QC identities');
  const packet=JSON.parse(packetBytes),reviews=validateHumanEvidence(session,packet);
  return {config,session,packet,reviews,hashes:{presentationPolicySha256:hash(await readFile(configPath)),journalSha256:hash(b),initialPacketSha256:hash(packetBytes)}};
}
export async function writeJsonl(file,rows){
  const stream=createWriteStream(file,{flags:'wx'});
  const done=finished(stream);done.catch(()=>{});
  try{for(const row of rows)if(!stream.write(JSON.stringify(row)+'\n'))await once(stream,'drain');stream.end();await done;}
  catch(e){stream.destroy();throw e;}
}
export function renderQc(qc){return `# Rule 002 — completed evidence and limited follow-up\n\nFive completed observations below are evidence, not requests for repeat inspection. Only records marked newInspectionRequested require inspection. Reply with primary starting guidance, meaningful secondary OS/R, TRUE SPLIT preventing confident primary guidance, or UNCLEAR, with notes. No final approval is inferred.\n\n${qc.map(q=>`## ${q.caseId} — ${q.address}\n\n- Parcel: ${q.parcelId}\n- Coverage: ${q.originalIntersections.map(e=>`${e.normalizedZoningCode.toUpperCase()} ${e.percentOfParcel}%`).join('; ')}\n- Original codes/QA: ${q.originalProfiles.map(p=>`${p.address}: ${p.zoningCode??'unclassified'} / ${p.status}`).join('; ')}\n- Diagnostic flags: ${q.diagnosticFlags.join(', ')||'none'}\n- Purpose: ${q.reviewPurpose}\n- New inspection requested: ${q.newInspectionRequested}\n- Human outcome: ${q.humanReview.reviewStatus}\n${q.humanReview.observationVerbatim?`- Exact observation: ${q.humanReview.observationVerbatim}\n- Secondary relevance: ${q.humanReview.secondaryOsrRelevance}\n`:''}`).join('\n')}`;}
export function renderReport(a,qc){return `# Clearwater Rule 002 — LMDR + OS/R candidate\n\n**NOT APPROVED.** Snapshot ${a.sourceSnapshotId}. Source -> regenerated approved Rule 001 -> provisional Rule 002. No original code, source GIS QA, approved Rule 001 field, Guide, UX or Supabase changes.\n\n## Proposed interpretation and exceptions\n\nExactly two positive-area districts, LMDR and OS/R, can receive proposed LMDR primary guidance after existing quality and human-review safeguards. Retain OS/R, every original intersection, exact six-decimal diagnostic percentages, zoning feature IDs/indices and source hashes. No area-dominance cutoff. No legal exemption. Any P or other district, invalid/missing geometry, source error, coverage outside 99.9–100.1%, repeated/overlapping polygons, unrelated profile/jurisdiction issue, duplicate identity, true split, uncertainty or contradictory review blocks a proposal. Parcel/profile failures conservatively exclude all addresses on that parcel.\n\n## Verified population and mutually exclusive address counts\n\n| Measure | Parcels | Addresses |\n|---|---:|---:|\n| Exact LMDR + OS/R pair | ${a.population.parcels} | ${a.population.addresses} |\n| Qualifying candidate | ${a.qualifying.parcels} | ${a.qualifying.addresses} |\n| Exact pair excluded | ${a.excluded.parcels} | ${a.excluded.addresses} |\n| LMDR + OS/R with additional districts (excluded separately) | ${a.additionalDistricts.parcels} | ${a.additionalDistricts.addresses} |\n\nExact-pair source QA: ${a.population.cleanAddresses} CLEAN / ${a.population.reviewAddresses} REVIEW. Across the entire exact-pair population, ${a.populationCodeAgreement.sameLMDR} existing primaries already match LMDR, ${a.populationCodeAgreement.differentCode} require a different code, and ${a.populationCodeAgreement.unclassified} are unclassified. Existing code distribution: ${JSON.stringify(a.populationExistingPrimaryCodes)}. Different-code records outside the qualifying set remain excluded, not code-change proposals. Eligible categories below are mutually exclusive; CLEAN rows never count as REVIEW recovery.\n\n| Original QA / existing primary | Addresses |\n|---|---:|\n| REVIEW already LMDR | ${a.addressCategories.reviewSameCode} |\n| REVIEW different code | ${a.addressCategories.reviewChangedCode} |\n| REVIEW unclassified | ${a.addressCategories.reviewUnclassified} |\n| CLEAN already LMDR | ${a.addressCategories.cleanSameCode} |\n| CLEAN different code | ${a.addressCategories.cleanChangedCode} |\n| CLEAN unclassified | ${a.addressCategories.cleanUnclassified} |\n\n**Potential net incremental REVIEW recovery: ${a.potentialIncrementalReviewRecovery}. Actual newly approved Rule 002 records: 0.** Already approved Rule 001 overlap: ${a.rule001OverlapAddresses}. Combined currently approved guidance: ${a.rule001ApprovedPreserved}; combined potential after separate Rule 002 approval: ${a.combinedPotentialApprovedGuidance}. Total citywide addresses: ${a.allAddresses}. REVIEW still unresolved if every qualifying Rule 002 proposal were separately approved: ${a.remainingReviewAfterHypotheticalApproval}. No approval is implied by these hypothetical totals.\n\n## Exclusions\n\n${Object.entries(a.exclusionReasons).map(([k,v])=>`- ${k}: ${v.parcels} parcels / ${v.addresses} addresses`).join('\n')||'No exact-pair quality exclusions.'}\n\nReason counts can overlap. exclusionCombinations in audit.json partitions the excluded population without double counting. Additional-district cases, including ${a.additionalDistricts.withPreservationParcels} with P, are separate from the exact-pair denominator; they never receive Rule 002 proposals.\n\n## Human evidence and limits\n\nExisting confirmed LMDR/OS/R gold cases: ${a.goldRegressionCases}; supported eligible predictions: ${a.goldAgreements}; interpretation contradictions: ${a.goldContradictions}; gold quality exclusions: ${a.goldQualityExclusions}. ${a.goldQualityExclusionControls.map(g=>`${g.caseId}, ${g.address}, remains excluded for ${g.flags.join(", ")} despite its confirmed LMDR human label.`).join(" ")} Prior evidence is mostly LMDR-dominant and does not establish that large OS/R shares are harmless. ${a.qcHumanInspectionsCompleted} new owner-reported inspections support LMDR primary starting guidance. R002-01 and R002-02 retain substantively meaningful secondary OS/R, including the reported waterfront strip; R002-03–05 report negligible overlaps without legal exemption. Exact observations and frozen packet identities are preserved separately. ${a.qcNewIndependentParcels} additional targeted inspections are requested; the other five unreviewed initial examples are archived, not another mandatory batch. No repeated inspection of gold cases is requested. Qualifying OS/R coverage ranges from ${a.qualifyingOsrCoverageRange.minimum}% to ${a.qualifyingOsrCoverageRange.maximum}%. There are ${a.addressCategories.reviewChangedCode+a.addressCategories.reviewUnclassified+a.addressCategories.cleanChangedCode+a.addressCategories.cleanUnclassified} qualifying changed/new-code records; no such QC case is fabricated when that count is zero.\n\n## OS/R contextual notice recommendation (proposed; final scope unapproved)\n\nProposed policy: OS/R <=3% has no prominent notice; OS/R >3% recommends the contextual notice for relevant physical-project Guides. Always retain both mapped districts, exact percentages, feature evidence and viewer access. The threshold changes presentation only, never primary eligibility, legal applicability or source QA. Meaningful secondary OS/R may coexist with confident LMDR starting guidance; legally applicable split zoning is not erased. Known splits preventing confident primary guidance remain excluded. Rule 001 retains its separate strict >2% P prominence policy without modification. No UI is implemented.\n\n“Part of this parcel is mapped Open Space/Recreation (OS/R). Check the mapped district at your project location and confirm applicable requirements with Clearwater before proceeding.”\n\n| OS/R threshold (strict >) | Prominent parcels / addresses | No prominent notice addresses | Potential incremental REVIEW recovery |\n|---|---:|---:|---:|\n${Object.values(a.presentation.options).map(o=>`| ${o.thresholdPercent}% | ${o.prominent.parcels} / ${o.prominent.addresses} | ${o.notProminent.addresses} | ${o.potentialReviewRecovery} |`).join('\n')}\n\nThe >3% to <=17.5% range contains ${a.presentation.rangeStudy.qualifying.parcels} qualifying parcel / ${a.presentation.rangeStudy.qualifying.addresses} address and ${a.presentation.rangeStudy.excluded.parcels} excluded parcels / ${a.presentation.rangeStudy.excluded.addresses} addresses. Of the qualifying range, ${a.presentation.rangeStudy.qualifyingAlreadyReviewed.addresses} address is already human-reviewed and ${a.presentation.rangeStudy.qualifyingUnreviewed.addresses} are unreviewed. ${a.presentation.rangeStudy.supportingReviews.map(r=>`${r.caseId} remains existing evidence; no repeat inspection is requested.`).join(" ")} Only unreviewed qualifying range parcels could require targeted inspection; quality exclusions are not reopened. See qc-reviewer.md. This is a presentation proposal, not final Rule 002 approval.\n\n## Audit and reproduction\n\n${a.originalZoningCodesChanged} original zoning changes; ${a.originalSourceQaStatusesChanged} original QA changes; ${a.rule001FieldsChanged} changed Rule 001 evidence/approval objects. Rule 001 prominent/non-prominent notices remain ${a.rule001NoticeProminent}/${a.rule001NoticeNotProminent}. Original profiles and source references are deeply compared with all ${a.allAddresses} frozen originals. Supplemental intersections screen only address-linked parcel boxes intersecting both LMDR and OS/R source boxes; existing frozen diagnostics are reused. ${a.screening.missingDiagnosticParcelsMeasured} missing diagnostics were measured; ${a.screening.measurementErrorParcels} supplemental parcels have measurement errors and remain in the evidence inventory. The numerical positive-area floor is the existing >0.000001 m² diagnostic convention, not a policy cutoff. Geometry validity is the existing Turf diagnostic, not a new topology guarantee.\n\nOnly address-linked parcels have authoritative Clearwater membership; neighboring/unaddressed raw parcels are outside the city address denominator. ${a.screening.unlinkedRawBboxParcels} such raw parcels passed the bounding-box screen, without being asserted to be Clearwater or positive-area pairs. Complete exact-pair and additional-district evidence, per-address incremental audit, lookup and hashes are downloadable workflow artifacts. Large GIS outputs are never committed. Five unavailable Batch 5A reviews are not inferred or used.\n\nRun the dedicated clearwater-rule002 workflow, which downloads the permanent release directly, validates its pinned archive hash, regenerates Rule 001 and its approved export, then runs Rule 002 into a new directory. Optional local Rule 002 measurement reuse requires identical source hashes, algorithm hash and exhaustive screened IDs, and contains no prior classifications. **Await explicit final bounded-scope authorization; do not promote or merge Rule 002.**\n`;}
export async function run(input,approvedDir,output,measurementsFile=null){
  input=path.resolve(input);approvedDir=path.resolve(approvedDir);output=path.resolve(output);
  assert.ok(![input,approvedDir].some(p=>output===p||output.startsWith(p+path.sep)),'Separate new output required');
  try{await access(output);throw new Error('Refusing to overwrite existing output');}catch(e){if(e.code!=='ENOENT')throw e;}
  const manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json'));
  const gold=await json(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json'));
  const config=await json(path.join(ROOT,'research/gis/rule001-approval.same-code-v1.json'));
  validateApproval(config,manifest);
  const reviews=[...gold.records];const reviewHashes=[];
  for(const e of gold.additionalReviewDatasets){
    const b=await readFile(path.join(ROOT,'research/gis/zoning-gold',e.path));assert.equal(hash(b),e.sha256);
    const session=JSON.parse(b);assert.equal(hash(await readFile(path.join(ROOT,session.sourceQcPacket.path))),session.sourceQcPacket.sha256);
    reviews.push(...normalizeReviewSession(session.records));reviewHashes.push(e);
  }
  const human=await loadHumanEvidence();
  assert.equal(human.session.sourceSnapshotIdentifier,manifest.snapshotId);
  const eligibilityReviews=[...reviews,...human.reviews];
  const source=await verifySource(input,manifest,gold);
  console.log('Verified immutable source metadata, all file hashes and full-city counts.');
  const byParcel=new Map();for(const p of source.profiles){const id=String(p.parcelIdentifier);if(!byParcel.has(id))byParcel.set(id,[]);byParcel.get(id).push(p);}
  const evidence=new Map(source.diagnostic.parcels.map(d=>[d.parcelIdentifier,{...d,evidenceMethod:'verified_frozen_diagnostic'}]));
  const trees=['lmdr','os/r'].map(code=>{const tree=new RBush();tree.load(source.layers.zoning.features.filter(f=>norm(f.properties.ZONING)===code).map(indexItem));return tree;});
  const ids=new Set(),seen=new Set(),duplicates=new Set();let unlinkedRawBboxParcels=0;
  for(const p of source.layers.parcels.features){
    const id=String(p.properties.PARCELID??p.properties.STRAP);if(seen.has(id))duplicates.add(id);seen.add(id);
    if(!trees.every(t=>t.collides(indexItem(p))))continue;
    if(!byParcel.has(id)){unlinkedRawBboxParcels++;continue;}
    if(!evidence.has(id))ids.add(id);
  }
  const header={sourceFileHashes:manifest.files,algorithmSha256:hash(await readFile(path.join(ROOT,'scripts/gis/clearwater-rule002-intersections.mjs'))),screenedParcelIds:[...ids].sort()};
  let supplemental=[];
  if(measurementsFile){
    const cached=await json(measurementsFile);
    for(const [k,v] of Object.entries(header))assert.deepEqual(cached[k],v,`Cached measurements ${k}`);
    assert.equal(cached.parcels.length,ids.size);assert.deepEqual(cached.parcels.map(d=>d.parcelIdentifier).sort(),[...ids].sort());supplemental=cached.parcels;
  }else{
    const count=Math.min(4,availableParallelism()),shards=Array.from({length:count},()=>[]);
    [...ids].sort().forEach((id,i)=>shards[i%count].push(id));
    console.log(`Measuring ${ids.size} missing address-linked LMDR/OSR bounding-box diagnostics on ${count} workers.`);
    await Promise.all(shards.map((ids,i)=>new Promise((resolve,reject)=>{
      const w=new Worker(new URL('./clearwater-rule002-intersections.mjs',import.meta.url),{workerData:{input,ids}});
      w.on('message',m=>{if(m.results){supplemental.push(...m.results);resolve();}else console.log(`worker ${i+1}: ${m.progress}/${m.total}`);});
      w.on('error',reject);w.on('exit',code=>{if(code)reject(new Error(`Measurement worker exited ${code}`));});
    })));
    assert.deepEqual([...new Set(supplemental.map(d=>d.parcelIdentifier))].sort(),[...ids].sort());
  }
  // Checkpoint numerical evidence only, so a later validation failure need not repeat geometry.
  await mkdir(output,{recursive:true});
  await writeFile(path.join(output,'supplemental-intersections.json'),JSON.stringify({...header,parcels:supplemental.sort((a,b)=>a.parcelIdentifier.localeCompare(b.parcelIdentifier))},null,2)+'\n');
  for(const d of supplemental)if(!evidence.has(d.parcelIdentifier))evidence.set(d.parcelIdentifier,d);
  const population=[...evidence.values()].filter(d=>byParcel.has(d.parcelIdentifier)&&['lmdr','os/r'].every(c=>d.zoningCodeCoverage.some(e=>e.normalizedZoningCode===c))).map(d=>{
    const profiles=byParcel.get(d.parcelIdentifier);
    return {parcelId:d.parcelIdentifier,sourceSnapshotIdentifier:manifest.snapshotId,evidence:d,
      addresses:profiles.slice().sort((a,b)=>a.displayAddress.localeCompare(b.displayAddress)||a.sourceAddressIdentifier-b.sourceAddressIdentifier).map(p=>({address:p.displayAddress,coordinates:p.addressCoordinates})),
      originalProfiles:profiles.map(p=>({address:p.displayAddress,sourceAddressIdentifier:p.sourceAddressIdentifier,zoningCode:p.zoningCode,status:p.status,issues:p.issues})),
      decision:classify(d,profiles,eligibilityReviews.filter(g=>g.parcelId===d.parcelIdentifier),duplicates.has(d.parcelIdentifier))};
  }).sort((a,b)=>a.parcelId.localeCompare(b.parcelId));
  const exact=population.filter(r=>r.decision.structuralMatch),qualifying=exact.filter(r=>r.decision.eligible),excluded=exact.filter(r=>!r.decision.eligible),additional=population.filter(r=>!r.decision.structuralMatch);
  const qc=progressQc(population,human.session,human.packet,reviews);
  const targeted=qc.filter(q=>q.newInspectionRequested);
  assert.ok(targeted.length<=3);assert.equal(new Set(qc.map(q=>q.parcelId)).size,qc.length);
  const presentation=analyzePresentation(population,eligibilityReviews);
  const humanRegression=human.session.records.map(o=>{
    const r=population.find(r=>r.parcelId===o.parcelId);assert.ok(r);assert.equal(r.decision.osrCoveragePercent,o.osrCoveragePercent);
    assert.equal(r.decision.eligible,true,'Supported primary QC must still pass source safeguards');
    assert.equal(r.decision.secondaryOsrRelevance,o.humanReview.secondaryOsrRelevance);
    return {caseId:o.caseId,parcelId:o.parcelId,address:o.address,observationVerbatim:o.humanReview.observationVerbatim,
      primaryGuidanceSupported:true,secondaryOsrRelevance:r.decision.secondaryOsrRelevance,substantiveSecondaryOsr:r.decision.substantiveSecondaryOsr,
      allMappedDistrictsRetained:true,osrCoveragePercent:r.decision.osrCoveragePercent,notice:r.decision.proposedNoticeVisibility,approvalStatus:'NOT_APPROVED'};
  });
  const checks=await json(path.join(approvedDir,'output-checksums.json'));
  for(const name of ['clearwater-approved-address-lookup.jsonl','approval-audit.json','approval-config.json','final-focused-qc.json','source-verification.json']){
    const b=await readFile(path.join(approvedDir,name));assert.equal(b.length,checks[name].bytes);assert.equal(hash(b),checks[name].sha256,`Approved Rule 001 integrity ${name}`);
  }
  const priorAudit=await json(path.join(approvedDir,'approval-audit.json'));
  assert.equal(priorAudit.sourceArchiveSha256,manifest.archiveSha256);assert.equal(priorAudit.approvalConfigSha256,hash(await readFile(path.join(ROOT,'research/gis/rule001-approval.same-code-v1.json'))));
  assert.equal(priorAudit.exporterSha256,hash(await readFile(path.join(ROOT,'scripts/gis/export-clearwater-approved-rule001.mjs'))));
  const rows=(await readFile(path.join(approvedDir,'clearwater-approved-address-lookup.jsonl'),'utf8')).trimEnd().split('\n').map(JSON.parse);
  assert.equal(rows.length,source.profiles.length);
  const blocked=new Set(reviews.filter(g=>['human_true_split','human_staff_review','human_primary_applicability_unclear'].includes(g.humanReview.reviewStatus)).map(g=>g.parcelId));
  const inventory=new Map(population.map(r=>[r.parcelId,r]));const incremental=[];const categories={reviewSameCode:0,reviewChangedCode:0,reviewUnclassified:0,cleanSameCode:0,cleanChangedCode:0,cleanUnclassified:0};
  let approvedCount=0,prominent=0,notProminent=0,overlap=0;
  const combined=rows.map((r,i)=>{
    const {researchRule001,approvedPrimaryGuidance,...original}=r;assert.deepEqual(original,source.profiles[i],`Immutable source address ${i}`);
    assert.deepEqual(approvedPrimaryGuidance,approveRecord(r,config,blocked).approvedPrimaryGuidance,`Approved Rule 001 contract ${i}`);
    if(approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED'){
      approvedCount++;if(approvedPrimaryGuidance.preservationNoticeRecommendation==='RECOMMENDED_PHYSICAL_PROJECT_GUIDES')prominent++;else notProminent++;
    }
    const parcel=inventory.get(String(r.parcelIdentifier));
    const out=addProvisionalLayer(r,parcel);
    assert.equal(out.researchRule001,researchRule001);assert.equal(out.approvedPrimaryGuidance,approvedPrimaryGuidance);
    if(parcel?.decision.eligible){
      const prefix=r.status==='review'?'review':'clean',kind=!r.zoningCode?'Unclassified':norm(r.zoningCode)==='lmdr'?'SameCode':'ChangedCode';categories[prefix+kind]++;
      if(approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED')overlap++;
    }
    if(parcel)incremental.push({sourceAddressIdentifier:r.sourceAddressIdentifier,parcelId:r.parcelIdentifier,address:r.displayAddress,originalZoningCode:r.zoningCode,originalSourceQaStatus:r.status,
      rule001Approved:approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED',...out.researchRule002});
    return out;
  });
  assert.equal(new Set(combined.map(r=>r.sourceAddressIdentifier)).size,63430);
  assert.equal(approvedCount,1967);assert.equal(prominent,762);assert.equal(notProminent,1205);assert.equal(overlap,0);
  const metrics=rs=>({parcels:rs.length,addresses:sum(rs,r=>r.originalProfiles.length),cleanAddresses:sum(rs,r=>r.originalProfiles.filter(p=>p.status==='clean').length),reviewAddresses:sum(rs,r=>r.originalProfiles.filter(p=>p.status==='review').length)});
  const reasons={},combinations={};for(const r of excluded){for(const k of r.decision.flags){const m=reasons[k]??={parcels:0,addresses:0};m.parcels++;m.addresses+=r.originalProfiles.length;}const k=r.decision.flags.slice().sort().join(' + '),m=combinations[k]??={parcels:0,addresses:0};m.parcels++;m.addresses+=r.originalProfiles.length;}
  const goldCases=confirmedPairGold(gold.records);
  assert.equal(goldCases.length,10);
  const regression=goldCases.map(g=>{const r=inventory.get(g.parcelId);assert.ok(r,`Gold parcel ${g.caseNumber}`);assert.equal(g.humanReview.reviewStatus,'human_confirmed');
    return {caseId:g.caseNumber,parcelId:g.parcelId,address:g.address,humanReview:g.humanReview,structuralMatch:r.decision.structuralMatch,eligible:r.decision.eligible,flags:r.decision.flags,
      proposedPrimary:r.decision.proposedPrimaryGuidanceZoning,agreement:norm(g.humanReview.result.replace(/^CONFIRMED:\s*/,''))==='lmdr',originalIntersections:r.evidence.zoningCodeCoverage};});
  const potential=categories.reviewSameCode+categories.reviewChangedCode+categories.reviewUnclassified-overlap;
  const populationExistingPrimaryCodes={},populationCodeAgreement={sameLMDR:0,differentCode:0,unclassified:0};
  for(const r of exact)for(const p of r.originalProfiles){const code=p.zoningCode??'<unclassified>';populationExistingPrimaryCodes[code]=(populationExistingPrimaryCodes[code]??0)+1;populationCodeAgreement[!p.zoningCode?'unclassified':norm(p.zoningCode)==='lmdr'?'sameLMDR':'differentCode']++;}
  const audit={ruleId:RULE_ID,ruleVersion:RULE_VERSION,approvalStatus:'NOT_APPROVED',sourceSnapshotId:manifest.snapshotId,sourceArchiveSha256:manifest.archiveSha256,
    allAddresses:combined.length,population:metrics(exact),qualifying:metrics(qualifying),excluded:metrics(excluded),
    additionalDistricts:{...metrics(additional),withPreservationParcels:additional.filter(r=>r.evidence.zoningCodeCoverage.some(e=>e.normalizedZoningCode==='p')).length},
    addressCategories:categories,populationExistingPrimaryCodes,populationCodeAgreement,exclusionReasons:reasons,exclusionCombinations:combinations,
    goldRegressionCases:regression.length,goldAgreements:regression.filter(g=>g.agreement&&g.eligible).length,goldContradictions:regression.filter(g=>!g.agreement).length,goldQualityExclusions:regression.filter(g=>!g.eligible).length,
    goldQualityExclusionControls:regression.filter(g=>!g.eligible).map(g=>({caseId:g.caseId,address:g.address,parcelId:g.parcelId,flags:g.flags})),
    qualifyingOsrCoverageRange:{minimum:Math.min(...qualifying.map(r=>r.decision.osrCoveragePercent)),maximum:Math.max(...qualifying.map(r=>r.decision.osrCoveragePercent))},
    potentialIncrementalReviewRecovery:potential,rule001OverlapAddresses:overlap,rule001ApprovedPreserved:approvedCount,combinedPotentialApprovedGuidance:approvedCount+potential,
    remainingReviewAfterHypotheticalApproval:source.counts.review-approvedCount-potential,rule002NewApprovals:0,
    originalZoningCodesChanged:combined.filter((r,i)=>r.zoningCode!==source.profiles[i].zoningCode).length,
    originalSourceQaStatusesChanged:combined.filter((r,i)=>r.status!==source.profiles[i].status).length,
    rule001FieldsChanged:combined.filter((r,i)=>r.researchRule001!==rows[i].researchRule001||r.approvedPrimaryGuidance!==rows[i].approvedPrimaryGuidance).length,
    rule001NoticeProminent:prominent,rule001NoticeNotProminent:notProminent,
    screening:{frozenDiagnostics:source.diagnostic.parcels.length,missingDiagnosticParcelsMeasured:ids.size,supplementalPositiveOsrParcels:supplemental.filter(d=>d.zoningCodeCoverage.some(e=>e.normalizedZoningCode==='os/r')).length,
      measurementErrorParcels:supplemental.filter(d=>d.sourceErrors.length).length,unlinkedRawBboxParcels},
    qcNewIndependentParcels:targeted.length,qcHumanInspectionsCompleted:humanRegression.length,presentation,supabaseChanged:false,productionGuidesChanged:false,residentUxChanged:false};
  assert.equal(audit.population.parcels,audit.qualifying.parcels+audit.excluded.parcels);assert.equal(audit.population.addresses,audit.qualifying.addresses+audit.excluded.addresses);
  assert.equal(Object.values(categories).reduce((s,n)=>s+n,0),audit.qualifying.addresses);assert.equal(audit.goldContradictions,0);
  await mkdir(output,{recursive:true});const writeJson=(name,v)=>writeFile(path.join(output,name),JSON.stringify(v,null,2)+'\n');
  await writeJsonl(path.join(output,'clearwater-combined-address-lookup.jsonl'),combined);
  await writeJsonl(path.join(output,'rule002-incremental-audit.jsonl'),incremental);
  await writeJson('audit.json',audit);await writeJson('lmdr-osr-parcel-inventory.json',population);await writeJson('qc-batch.json',qc);await writeJson('gold-regression.json',regression);
  await writeJson('presentation-analysis.json',presentation);await writeJson('human-review-regression.json',humanRegression);
  await writeJson('human-qc-observations.json',human.session);await writeJson('presentation-policy.json',human.config);await writeJson('initial-qc-packet.json',human.packet);
  await writeJson('supplemental-intersections.json',{...header,parcels:supplemental.sort((a,b)=>a.parcelIdentifier.localeCompare(b.parcelIdentifier))});
  await writeJson('source-verification.json',{...manifest,filesVerified:source.verification,reviewDatasetHashes:reviewHashes,
    processorSha256:hash(await readFile(fileURLToPath(import.meta.url))),policySha256:hash(await readFile(path.join(ROOT,'scripts/gis/clearwater-rule002-policy.mjs'))),
    measurementAlgorithmSha256:header.algorithmSha256,goldSha256:hash(await readFile(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json'))),
    rule002HumanEvidence:human.hashes,rule001InputChecksums:checks,rule001ApprovalAudit:priorAudit});
  await writeFile(path.join(output,'qc-reviewer.md'),renderQc(qc));await writeFile(path.join(output,'report.md'),renderReport(audit,qc));
  const hashes={};for(const name of (await readdir(output)).sort()){const b=await readFile(path.join(output,name));hashes[name]={bytes:b.length,sha256:hash(b)};}
  await writeJson('output-checksums.json',hashes);console.log(JSON.stringify(audit,null,2));return audit;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  if(![5,6].includes(process.argv.length))throw new Error('Usage: node scripts/gis/clearwater-rule002.mjs <frozen-source> <fresh-approved-rule001-output> <NEW-output> [verified-measurements]');
  await run(...process.argv.slice(2));
}
