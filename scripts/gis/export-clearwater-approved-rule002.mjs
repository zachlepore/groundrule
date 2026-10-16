#!/usr/bin/env node
/** Explicitly bounded Rule 002 offline approval, layered over unchanged Rule 001. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access, readdir, copyFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeZoning as norm } from './clearwater-pilot.mjs';
import { verify as verifyCandidate } from './verify-rule002-output.mjs';
import { writeJsonl, loadHumanEvidence } from './clearwater-rule002.mjs';
import { normalizeReviewSession } from './clearwater-rule001-policy.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function digest(file){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(file)){h.update(b);bytes+=b.length;}return {sha256:h.digest('hex'),bytes};}
async function* lines(file){for await(const line of createInterface({input:createReadStream(file),crlfDelay:Infinity}))yield JSON.parse(line);}
export function validateApproval(config,manifest){
  assert.equal(config.schemaVersion,1);assert.equal(config.ruleId,'CLR-Z-002');assert.equal(config.approvalId,'CLR-Z-002-SAME-CODE-2026-10-16');
  assert.equal(config.ruleVersion,'1.1.0-approved-static');assert.equal(config.candidateRuleVersion,'1.1.0-provisional');
  assert.equal(config.decision,'APPROVED_FOR_OFFLINE_STATIC_EXPORT_ONLY');assert.ok(config.authorization);assert.equal(config.basisCommit,'ef31c8fb18a22cb52f658a05141223f95627b64d');
  assert.equal(config.sourceSnapshotId,manifest.snapshotId);assert.equal(config.sourceArchiveSha256,manifest.archiveSha256);
  assert.equal(config.scope.originalQaStatus,'review');assert.equal(config.scope.existingPrimaryCode,'LMDR');assert.deepEqual(config.scope.exactPositiveAreaDistricts,['LMDR','OS/R']);
  for(const k of ['requirePreviousProvisionalEligibility','retainAllExistingQualityAndHumanExclusions','preserveAllRule001Approvals','doNotChangeOriginalPrimaryCode','doNotChangeSourceQa'])assert.equal(config.scope[k],true,k);
  const p=config.presentation;assert.equal(p.osrNoticeProminentWhenPercentGreaterThan,3);assert.equal(p.presentationOnly,true);assert.equal(p.noticeThresholdIsLegalExemption,false);assert.equal(p.impliesExclusivelyLmdr,false);
  for(const k of ['secondaryMappedOsrMustBeRetained','retainMappedEvidenceAndViewerAccess','preserveMeaningfulSecondaryOsr'])assert.equal(p[k],true,k);
  assert.equal(p.noticeText,'Part of this parcel is mapped Open Space/Recreation (OS/R). Check the mapped district at your project location and confirm applicable requirements with Clearwater before proceeding.');
  const expected={allAddresses:63430,originalClean:43092,originalReview:20338,rule001Approved:1967,rule002Approved:262,totalApproved:2229,stillReview:18109,rule002NoticeProminent:4,rule002NoticeNotProminent:258,rule001NoticeProminent:762,rule001NoticeNotProminent:1205,exactPairExcludedAddresses:94,additionalDistrictExcludedAddresses:173,substantiveSecondaryOsrApproved:2,changedPrimaryCodes:0,changedSourceQaStatuses:0,duplicateApprovals:0};
  assert.deepEqual(config.expected,expected,'Approved bounded reconciliation');assert.ok(Object.keys(config.basisFileSha256).length>=16);
}
export function approveRecord(row,config,blocked=new Set()){
  const r=row.researchRule002;
  assert.ok(r);assert.equal(r.sourceSnapshotIdentifier,config.sourceSnapshotId);assert.equal(r.existingPrimaryZoning,row.zoningCode);assert.equal(r.originalSourceQaStatus,row.status);
  const prior=row.approvedPrimaryGuidance;
  if(prior.status==='GUIDANCE_READY_APPROVED'){
    assert.equal(prior.ruleId,'CLR-Z-001','Unexpected prior approval');
    assert.equal(r.potentialIncrementalReviewRecovery,false,'Rule overlap');assert.equal(r.proposedPrimaryGuidanceZoning,null,'Rule overlap');return row;
  }
  const zones=r.originalZoningIntersections??[],codes=zones.map(z=>norm(z.normalizedZoningCode));
  const total=zones.reduce((s,z)=>s+z.percentOfParcel,0);
  const valid=zones.length===2&&new Set(codes).size===2&&codes.includes('lmdr')&&codes.includes('os/r')&&zones.every(z=>Number.isFinite(z.percentOfParcel)&&z.percentOfParcel>0&&z.percentOfParcel<=100.1&&!z.repeatedPolygons&&!z.overlappingPolygons)&&total>=99.9&&total<=100.1;
  const allowed=row.status==='review'&&norm(row.zoningCode)==='lmdr'&&!blocked.has(String(row.parcelIdentifier))&&
    row.issues.every(i=>i==='parcel_ambiguous_zoning')&&r.ruleId===config.ruleId&&r.ruleVersion===config.candidateRuleVersion&&
    r.decisionStatus==='PENDING_QC'&&r.approvalStatus==='NOT_APPROVED'&&r.productionEligible===false&&r.potentialIncrementalReviewRecovery===true&&
    r.proposedPrimaryGuidanceZoning==='LMDR'&&r.retainedSecondaryDistrict==='OS/R'&&r.flags.length===0&&valid;
  if(!allowed)return row;
  assert.equal(r.noticeThresholdPercent,3);assert.equal(r.doesNotEraseMappedSplitZoning,true);assert.ok(r.officialViewerAccess?.mapViewerUrl);
  const osr=zones.find(z=>norm(z.normalizedZoningCode)==='os/r').percentOfParcel;assert.equal(osr,r.osrCoveragePercent);
  const notice=osr>3?'RECOMMENDED_PHYSICAL_PROJECT_GUIDES':'NOT_PROMINENT_IN_ORDINARY_GUIDES';assert.equal(r.proposedNoticeVisibility,notice);
  return {...row,approvedPrimaryGuidance:{...prior,status:'GUIDANCE_READY_APPROVED',primaryZoning:row.zoningCode,ruleId:config.ruleId,ruleVersion:config.ruleVersion,approvalId:config.approvalId,
    disposition:'APPROVED_RULE002_SAME_CODE_REVIEW',stillRequiresReview:false,
    mappedZoningIntersections:r.originalZoningIntersections,mappedOsrPercent:osr,sourceMappedDistricts:['LMDR','OS/R'],retainedSecondaryDistrict:'OS/R',
    osrNoticeRecommendation:notice,noticeThresholdPercent:3,noticeThresholdMeaning:'PRESENTATION_ONLY_NOT_ELIGIBILITY_OR_ZONING_APPLICABILITY',
    osrNoticeText:config.presentation.noticeText,secondaryOsrRelevance:r.secondaryOsrRelevance,substantiveSecondaryOsr:r.substantiveSecondaryOsr,
    humanReviewReferences:r.humanReviewReferences,officialViewerAccess:r.officialViewerAccess,doesNotEraseMappedSplitZoning:true,exclusiveZoningClassification:false,legalZoningDetermination:false}};
}
/** Rank existing evidence only; no proposed zoning assignments or new resolver. */
export function rankRemaining(rows,diagnostics,reviews){
  const byParcel=new Map(diagnostics.map(d=>[d.parcelIdentifier,d])),groups=new Map();let withoutDiagnostic=0;
  const remaining=rows.filter(r=>r.status==='review'&&r.approvedPrimaryGuidance.status!=='GUIDANCE_READY_APPROVED');
  for(const r of remaining){
    const d=byParcel.get(String(r.parcelIdentifier));if(!d){withoutDiagnostic++;continue;}
    const codes=[...new Set(d.zoningCodeCoverage.map(z=>z.normalizedZoningCode))].sort(),key=codes.join(' + ');
    const g=groups.get(key)??{combination:key,remainingReviewAddresses:0,parcelIds:new Set(),sourceQualityPassingAddresses:0,humanExceptionParcelIds:new Set(),confirmedPrimaryParcelIds:new Set()};groups.set(key,g);
    g.remainingReviewAddresses++;g.parcelIds.add(String(r.parcelIdentifier));
    const observed=reviews.filter(o=>o.parcelId===String(r.parcelIdentifier));
    if(observed.some(o=>['human_true_split','human_staff_review','human_primary_applicability_unclear'].includes(o.humanReview.reviewStatus)))g.humanExceptionParcelIds.add(String(r.parcelIdentifier));
    if(observed.some(o=>o.humanReview.reviewStatus==='human_confirmed'))g.confirmedPrimaryParcelIds.add(String(r.parcelIdentifier));
    // Existing source diagnostic flags only; this is not primary-guidance eligibility.
    if(d.parcelFound&&d.parcelGeometryValid&&d.parcelAreaSquareMeters>0&&!d.sourceErrors?.length&&!d.hasInvalidZoningGeometry&&!d.hasRepeatedNormalizedCode&&!d.hasOverlappingSameCodePolygons&&
      d.totalZoningCoveragePercent>=99.9&&d.totalZoningCoveragePercent<=100.1&&d.zoningCodeCoverage.every(z=>Number.isFinite(z.percentOfParcel)&&z.percentOfParcel>0&&z.percentOfParcel<=100.1)&&r.issues.every(i=>i==='parcel_ambiguous_zoning'))g.sourceQualityPassingAddresses++;
  }
  const ranking=[...groups.values()].map(({parcelIds,humanExceptionParcelIds,confirmedPrimaryParcelIds,...g})=>({...g,remainingParcels:parcelIds.size,knownHumanExceptionParcels:humanExceptionParcelIds.size,confirmedPrimaryParcels:confirmedPrimaryParcelIds.size})).sort((a,b)=>b.remainingReviewAddresses-a.remainingReviewAddresses||a.combination.localeCompare(b.combination));
  assert.equal(ranking.reduce((s,g)=>s+g.remainingReviewAddresses,0)+withoutDiagnostic,remaining.length);
  return {remainingReviewAddresses:remaining.length,withoutAmbiguousZoningDiagnostic:withoutDiagnostic,ranking,note:'Descriptive counts from verified existing diagnostics only. Quality-passing counts are not rule eligibility or legal determinations. No next rule is approved or implemented.'};
}
export async function exportApproved(sourceDir,rule001Dir,candidateDir,outputDir){
  sourceDir=path.resolve(sourceDir);rule001Dir=path.resolve(rule001Dir);candidateDir=path.resolve(candidateDir);outputDir=path.resolve(outputDir);
  assert.ok(![sourceDir,rule001Dir,candidateDir].some(p=>outputDir===p||outputDir.startsWith(p+path.sep)),'Separate new approved output required');
  try{await access(outputDir);throw new Error('Refusing to overwrite approved output');}catch(e){if(e.code!=='ENOENT')throw e;}
  const configPath=path.join(ROOT,'research/gis/rule002-approval.same-code-v1.json'),config=await json(configPath),manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json'));
  validateApproval(config,manifest);
  for(const [name,expected] of Object.entries(config.basisFileSha256)){assert.equal((await digest(path.join(ROOT,name))).sha256,expected,`Approved evidence ${name}`);}
  await verifyCandidate(sourceDir,rule001Dir,candidateDir);
  const gold=await json(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json')),reviews=[...gold.records];
  for(const e of gold.additionalReviewDatasets)reviews.push(...normalizeReviewSession((await json(path.join(ROOT,'research/gis/zoning-gold',e.path))).records));
  const human=await loadHumanEvidence();reviews.push(...human.reviews);
  const blocked=new Set(reviews.filter(r=>['human_true_split','human_staff_review','human_primary_applicability_unclear'].includes(r.humanReview.reviewStatus)).map(r=>r.parcelId));
  const rows=[];for await(const r of lines(path.join(candidateDir,'clearwater-combined-address-lookup.jsonl')))rows.push(r);
  const originals=await json(path.join(sourceDir,'property-profiles.json'));
  const population=await json(path.join(candidateDir,'lmdr-osr-parcel-inventory.json'));
  const transformed=rows.map(r=>approveRecord(r,config,blocked));
  const r1=transformed.filter(r=>r.approvedPrimaryGuidance.ruleId==='CLR-Z-001'&&r.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED');
  const r2=transformed.filter(r=>r.approvedPrimaryGuidance.ruleId==='CLR-Z-002'&&r.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED');
  const exactExcluded=new Set(population.filter(p=>p.decision.structuralMatch&&!p.decision.eligible).map(p=>p.parcelId));
  const multi=new Set(population.filter(p=>!p.decision.structuralMatch).map(p=>p.parcelId));
  const audit={approvalId:config.approvalId,sourceSnapshotId:config.sourceSnapshotId,sourceArchiveSha256:config.sourceArchiveSha256,
    allAddresses:transformed.length,originalClean:transformed.filter(r=>r.status==='clean').length,originalReview:transformed.filter(r=>r.status==='review').length,
    rule001Approved:r1.length,rule002Approved:r2.length,totalApproved:r1.length+r2.length,
    stillReview:transformed.filter(r=>r.status==='review'&&r.approvedPrimaryGuidance.status!=='GUIDANCE_READY_APPROVED').length,
    rule002NoticeProminent:r2.filter(r=>r.approvedPrimaryGuidance.osrNoticeRecommendation==='RECOMMENDED_PHYSICAL_PROJECT_GUIDES').length,
    rule002NoticeNotProminent:r2.filter(r=>r.approvedPrimaryGuidance.osrNoticeRecommendation==='NOT_PROMINENT_IN_ORDINARY_GUIDES').length,
    rule001NoticeProminent:r1.filter(r=>r.approvedPrimaryGuidance.preservationNoticeRecommendation==='RECOMMENDED_PHYSICAL_PROJECT_GUIDES').length,
    rule001NoticeNotProminent:r1.filter(r=>r.approvedPrimaryGuidance.preservationNoticeRecommendation==='NOT_PROMINENT_IN_ORDINARY_GUIDES').length,
    exactPairExcludedAddresses:transformed.filter(r=>exactExcluded.has(String(r.parcelIdentifier))).length,
    additionalDistrictExcludedAddresses:transformed.filter(r=>multi.has(String(r.parcelIdentifier))).length,
    substantiveSecondaryOsrApproved:r2.filter(r=>r.approvedPrimaryGuidance.substantiveSecondaryOsr===true).length,
    changedPrimaryCodes:transformed.filter((r,i)=>r.zoningCode!==originals[i].zoningCode).length,
    changedSourceQaStatuses:transformed.filter((r,i)=>r.status!==originals[i].status).length,
    duplicateApprovals:r2.filter(r=>rows.find(o=>o.sourceAddressIdentifier===r.sourceAddressIdentifier).approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED').length,
    exactExcludedRule002Approvals:r2.filter(r=>exactExcluded.has(String(r.parcelIdentifier))).length,
    multiDistrictRule002Approvals:r2.filter(r=>multi.has(String(r.parcelIdentifier))).length,
    humanExceptionRule002Approvals:r2.filter(r=>blocked.has(String(r.parcelIdentifier))).length,
    rule001ApprovalFieldsChanged:transformed.filter((r,i)=>rows[i].approvedPrimaryGuidance.ruleId==='CLR-Z-001'&&JSON.stringify(r.approvedPrimaryGuidance)!==JSON.stringify(rows[i].approvedPrimaryGuidance)).length,
    researchEvidenceChanged:transformed.filter((r,i)=>r.researchRule001!==rows[i].researchRule001||r.researchRule002!==rows[i].researchRule002).length,
    originalCleanNewlyApproved:r2.filter(r=>r.status!=='review').length,
    rule001PendingChangedCode:transformed.filter(r=>r.approvedPrimaryGuidance.disposition==='PENDING_CHANGED_OR_NEW_CODE_SCOPE'&&r.zoningCode).length,
    rule001PendingUnclassified:transformed.filter(r=>r.approvedPrimaryGuidance.disposition==='PENDING_CHANGED_OR_NEW_CODE_SCOPE'&&!r.zoningCode).length,
    supabaseChanged:false,productionGuidesChanged:false,residentUxChanged:false};
  for(const [k,v] of Object.entries(config.expected))assert.equal(audit[k],v,k);
  for(const k of ['exactExcludedRule002Approvals','multiDistrictRule002Approvals','humanExceptionRule002Approvals','rule001ApprovalFieldsChanged','researchEvidenceChanged','originalCleanNewlyApproved'])assert.equal(audit[k],0,k);
  assert.equal(audit.rule001PendingChangedCode,201);assert.equal(audit.rule001PendingUnclassified,1);
  const diagnostics=(await json(path.join(sourceDir,'zoning-diagnostic/zoning-diagnostic.json'))).parcels;
  const remaining=rankRemaining(transformed,diagnostics,reviews);
  await mkdir(outputDir,{recursive:true});
  const lookup=path.join(outputDir,'clearwater-approved-address-lookup.jsonl');await writeJsonl(lookup,transformed);
  // Read back every serialized row against its immutable original and complete provisional record.
  let n=0;const ids=new Set();for await(const r of lines(lookup)){
    const {approvedPrimaryGuidance,researchRule001,researchRule002,...original}=r;assert.deepEqual(original,originals[n],`Original ${n}`);
    assert.deepEqual(r,approveRecord(rows[n],config,blocked),`Serialized approved record ${n}`);assert.ok(!ids.has(r.sourceAddressIdentifier));ids.add(r.sourceAddressIdentifier);n++;
  }
  assert.equal(n,63430);
  audit.lookup=await digest(lookup);audit.approvalConfigSha256=(await digest(configPath)).sha256;audit.exporterSha256=(await digest(fileURLToPath(import.meta.url))).sha256;
  const writeJson=(name,v)=>writeFile(path.join(outputDir,name),JSON.stringify(v,null,2)+'\n');
  await writeJson('approval-audit.json',audit);await writeJson('rule002-approval-config.json',config);await writeJson('remaining-review-population.json',remaining);
  await copyFile(path.join(ROOT,'research/gis/rule001-approval.same-code-v1.json'),path.join(outputDir,'rule001-approval-config.json'));
  for(const name of await readdir(candidateDir)){
    if(['clearwater-combined-address-lookup.jsonl','output-checksums.json'].includes(name))continue;
    const target=['audit.json','report.md','source-verification.json'].includes(name)?`candidate-${name}`:name;
    await copyFile(path.join(candidateDir,name),path.join(outputDir,target));
  }
  await copyFile(path.join(rule001Dir,'p-parcel-inventory.json'),path.join(outputDir,'p-parcel-inventory.json'));
  await writeJson('source-verification.json',{...manifest,approvalConfigSha256:audit.approvalConfigSha256,exporterSha256:audit.exporterSha256,basisCommit:config.basisCommit,basisFileSha256:config.basisFileSha256,
    rule001ApprovalAudit:await json(path.join(rule001Dir,'approval-audit.json')),candidateChecksums:await json(path.join(candidateDir,'output-checksums.json'))});
  await writeFile(path.join(outputDir,'report.md'),`# Approved offline Rule 001 + Rule 002 static lookup\n\n${audit.allAddresses} original profiles. ${audit.totalApproved} approved primary-guidance records: ${audit.rule001Approved} unchanged Rule 001 + ${audit.rule002Approved} Rule 002, zero overlap. Original CLEAN ${audit.originalClean}, original REVIEW ${audit.originalReview}; remaining unresolved REVIEW ${audit.stillReview}. Original zoning and source QA changes: 0.\n\nRule 002: LMDR starting guidance with OS/R always retained; ${audit.rule002NoticeProminent} prominent / ${audit.rule002NoticeNotProminent} non-prominent notices, strict >3%. Presentation only, never a legal exemption or exclusive LMDR zoning. R002-01/02 remain substantive mapped secondary OS/R. All 94 exact-pair and 173 additional-district excluded addresses remain unapproved by Rule 002. Existing human exceptions stay excluded.\n\nRule 001's 1,967 approvals and strict >2% P policy remain unchanged (${audit.rule001NoticeProminent}/${audit.rule001NoticeNotProminent} notices). Its 201 changed-code and one unclassified proposal remain pending. Research objects preserve the preapproval evidence verbatim; approvedPrimaryGuidance is the approved offline authority. No Supabase, Guide, resident UX or source classification changes.\n\nComplete evidence, config, provenance and hashes accompany the lookup. No additional manual QC was performed. See remaining-review-population.json for descriptive ranking of the verified remaining REVIEW population; no next rule is assigned or approved.\n`);
  const checks={};for(const name of (await readdir(outputDir)).sort())checks[name]=await digest(path.join(outputDir,name));await writeJson('output-checksums.json',checks);
  for(const [name,v] of Object.entries(checks))assert.deepEqual(await digest(path.join(outputDir,name)),v);
  console.log(JSON.stringify(audit,null,2));console.log('Leading remaining classes:',JSON.stringify(remaining.ranking.slice(0,8)));return audit;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){if(process.argv.length!==6)throw new Error('Usage: node scripts/gis/export-clearwater-approved-rule002.mjs <verified-source> <fresh-approved-rule001> <fresh-rule002-candidate> <NEW-approved-output>');await exportApproved(...process.argv.slice(2));}
