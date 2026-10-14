#!/usr/bin/env node
/** Bounded offline export of the explicitly approved Rule 001 same-code REVIEW scope. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { allowedZoning, normalizeZoning } from "./clearwater-pilot.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const sha256=s=>createHash("sha256").update(s).digest("hex");
const norm=normalizeZoning;
export function validateApproval(config,manifest){
  assert.equal(config.schemaVersion,1);assert.ok(config.approvalId);assert.match(config.basisCommit,/^[0-9a-f]{40}$/);
  assert.equal(config.decision,"APPROVED_FOR_OFFLINE_STATIC_EXPORT_ONLY");
  assert.equal(config.ruleId,"CLR-Z-001");assert.equal(config.ruleVersion,"2.0.0-provisional");
  assert.equal(config.sourceSnapshotId,manifest.snapshotId);assert.equal(config.sourceArchiveSha256,manifest.archiveSha256);
  assert.equal(config.scope.originalQaStatus,"review");
  for(const k of ["proposedNonPDistrictMustMatchExistingPrimary","exactlyPreservationPlusOneSupportedDistrict","requirePreviousProvisionalEligibility","retainAllExistingQualityAndHumanExclusions","doNotChangeOriginalPrimaryCode"])assert.equal(config.scope[k],true,k);
  assert.equal(config.presentation.preservationNoticeProminentWhenPercentGreaterThan,2);
  assert.equal(config.presentation.noticeThresholdIsLegalExemption,false);
  assert.equal(config.presentation.secondaryPreservationMustBeRetained,true);
  assert.equal(config.approvedGuidanceNotEquivalentToOfficialZoningDetermination,true);
  const expected={allAddresses:63430,originalClean:43092,originalReview:20338,newlyApprovedSameCodeReview:1967,stillReview:18371,changedPrimaryCodes:0,pendingChangedCodeReview:201,pendingUnclassifiedReview:1,approvedNoticeProminent:762,approvedNoticeNotProminent:1205};
  for(const [k,v] of Object.entries(expected))assert.equal(config.expected[k],v,`Bounded approval ${k}`);
}
export function approveRecord(row,config,blockedParcels=new Set()) {
  const r=row.researchRule001;
  assert.ok(r && r.sourceSnapshotIdentifier===config.sourceSnapshotId,"Source snapshot mismatch");
  assert.equal(r.existingPrimaryZoning,row.zoningCode,"Original zoning must be preserved");
  assert.equal(r.sourceGisQualityStatus,row.status,"Original GIS QA must be preserved");
  const sameCode = !!row.zoningCode && norm(row.zoningCode)===norm(r.proposedPrimaryGuidanceZoning);
  const zones=r.originalZoningIntersections??[];
  const codes=zones.map(x=>norm(x.code));
  const other=codes.filter(x=>x!=="p");
  const validCoverage=zones.every(x=>Number.isFinite(x.percentOfParcel)&&x.percentOfParcel>0&&x.percentOfParcel<=100.1&&!x.repeatedPolygons&&!x.overlappingPolygons)&&
    zones.reduce((s,x)=>s+x.percentOfParcel,0)>=99.9&&zones.reduce((s,x)=>s+x.percentOfParcel,0)<=100.1;
  const allowed = row.status==="review" && sameCode &&
    !blockedParcels.has(row.parcelIdentifier)&&r.ruleVersion===config.ruleVersion&&
    row.issues.every(x=>x==="parcel_ambiguous_zoning")&&
    r.decisionStatus==="PENDING_QC" && r.ruleId===config.ruleId &&
    r.residentGuidanceEligibility==="PROVISIONAL_ELIGIBLE_AFTER_EXPLICIT_APPROVAL" &&
    r.approvalStatus==="NOT_APPROVED" && r.productionEligible===false &&
    Array.isArray(r.flags) && r.flags.length===0 &&
    Array.isArray(r.originalZoningIntersections) && r.originalZoningIntersections.length===2 &&
    new Set(codes).size===2&&codes.includes("p")&&other.length===1&&
    (allowedZoning.has(other[0])||other[0]==="os/r")&&other[0]===norm(r.proposedPrimaryGuidanceZoning)&&validCoverage&&
    zones.every(x=>norm(x.normalizedZoningCode)===norm(x.code))&&
    r.retainedSecondaryPreservation==="P" && r.preservationDetailsRetained===true;
  const p=r.pCoveragePercent;
  if(allowed){
    assert.ok(Number.isFinite(p)&&p>0&&p<=100.1);
    assert.equal(p,zones.find(x=>norm(x.code)==="p").percentOfParcel,"Exact mapped P coverage");
    assert.equal(r.proposedNoticeVisibility,p>config.presentation.preservationNoticeProminentWhenPercentGreaterThan?
      "RECOMMENDED_PHYSICAL_PROJECT_GUIDES":"NOT_PROMINENT_IN_ORDINARY_GUIDES");
  }
  const pending=row.status==="review"&&!sameCode&&r.proposedPrimaryGuidanceZoning&&r.decisionStatus==="PENDING_QC"&&r.flags.length===0;
  return { ...row,
    approvedPrimaryGuidance:{
      status:allowed?"GUIDANCE_READY_APPROVED":"NO_NEW_APPROVAL",
      primaryZoning:allowed?row.zoningCode:null,
      ruleId:allowed?config.ruleId:null,
      approvalId:allowed?config.approvalId:null,
      ruleVersion:config.ruleVersion,
      disposition:allowed?"APPROVED_SAME_CODE_REVIEW":pending?"PENDING_CHANGED_OR_NEW_CODE_SCOPE":row.status==="clean"?"EXISTING_SOURCE_CLEAN_NO_NEW_APPROVAL":"EXCLUDED_OR_UNRESOLVED",
      sourceSnapshotId:config.sourceSnapshotId,
      originalSourceQaStatus:row.status,
      originalZoningCode:row.zoningCode,
      mappedPreservationPercent:r.pCoveragePercent??null,
      mappedZoningIntersections:r.originalZoningIntersections??null,
      preservationNoticeRecommendation:allowed?r.proposedNoticeVisibility:null,
      retainedSecondaryPreservation:allowed?"P":null,
      stillRequiresReview:row.status==="review"&&!allowed,
      existingSourceClean:row.status==="clean",
      legalZoningDetermination:false
    }
  };
}
export async function exportApproved(provisionalDir,outputDir,sourceDir){
  assert.ok(sourceDir,"Verified immutable source directory is required");
  provisionalDir=path.resolve(provisionalDir);outputDir=path.resolve(outputDir);sourceDir=path.resolve(sourceDir);
  assert.ok(![sourceDir,provisionalDir].some(p=>outputDir===p||outputDir.startsWith(p+path.sep)),"Export must be separate from source/provisional outputs");
  try{await access(outputDir);throw new Error("Refusing to overwrite approved output directory");}catch(e){if(e.code!=="ENOENT")throw e;}
  const config=JSON.parse(await readFile(path.join(ROOT,"research/gis/rule001-approval.same-code-v1.json"),"utf8"));
  const manifest=JSON.parse(await readFile(path.join(ROOT,"scripts/gis/clearwater-rule001-source.json"),"utf8"));
  validateApproval(config,manifest);
  for(const [name,s] of Object.entries(manifest.files)){
    const b=await readFile(path.join(sourceDir,name));assert.equal(b.length,s.bytes);assert.equal(sha256(b),s.sha256,`Frozen source ${name}`);
  }
  const checks=JSON.parse(await readFile(path.join(provisionalDir,"output-checksums.json"),"utf8"));
  for(const name of ["citywide-provisional.jsonl","summary.json","source-verification.json","policy-analysis.json","human-review-regression.json","p-parcel-inventory.json"]){
    assert.ok(checks[name]);assert.equal(sha256(await readFile(path.join(provisionalDir,name))),checks[name].sha256,`Provisional integrity ${name}`);
  }
  const provenance=JSON.parse(await readFile(path.join(provisionalDir,"source-verification.json"),"utf8"));
  assert.equal(provenance.archiveSha256,config.sourceArchiveSha256);assert.deepEqual(provenance.files,manifest.files);
  assert.equal(provenance.processorSha256,sha256(await readFile(path.join(ROOT,"scripts/gis/clearwater-rule001.mjs"))));
  assert.equal(provenance.policySha256,sha256(await readFile(path.join(ROOT,"scripts/gis/clearwater-rule001-policy.mjs"))));
  const gold=JSON.parse(await readFile(path.join(ROOT,"research/gis/zoning-gold/reference-dataset.json"),"utf8"));
  const blocked=new Set(gold.records.filter(g=>["human_true_split","human_staff_review"].includes(g.humanReview.reviewStatus)).map(g=>g.parcelId));
  for(const entry of gold.additionalReviewDatasets){
    const b=await readFile(path.join(ROOT,"research/gis/zoning-gold",entry.path));assert.equal(sha256(b),entry.sha256);
    for(const o of JSON.parse(b).records)if(["TRUE_SPLIT","UNCLEAR"].includes(o.humanReview.category))blocked.add(o.parcelId);
  }
  const focused=JSON.parse(await readFile(path.join(ROOT,"research/gis/rule001-final-focused-qc.json"),"utf8"));
  const packet=JSON.parse(await readFile(path.join(ROOT,"research/gis/rule001-policy-v2-results/qc-batch.json"),"utf8"));
  assert.equal(focused.observations.length,7);assert.equal(new Set(focused.observations.map(o=>o.caseId)).size,7);
  for(const o of focused.observations){
    const q=packet.find(q=>q.caseId===o.caseId);assert.ok(q?.newInspectionRequested);
    assert.equal(o.parcelId,q.parcelId);assert.equal(o.address,q.address);assert.equal(norm(o.primaryGuidanceCandidate),norm(q.proposal));
    assert.ok(["SUPPORTS_PRIMARY_GUIDANCE","SUPPORTS_DIFFERENT_CODE_OUT_OF_APPROVED_SCOPE"].includes(o.result));
    const changes=q.originalProfiles.some(p=>p.originalStatus==="review"&&norm(p.originalZoning)!==norm(q.proposal));
    assert.equal(o.result,changes?"SUPPORTS_DIFFERENT_CODE_OUT_OF_APPROVED_SCOPE":"SUPPORTS_PRIMARY_GUIDANCE");
  }
  const raw=await readFile(path.join(provisionalDir,"citywide-provisional.jsonl"),"utf8");
  const rows=raw.trimEnd().split("\n").map(JSON.parse);
  const originals=JSON.parse(await readFile(path.join(sourceDir,"property-profiles.json"),"utf8"));
  assert.equal(originals.length,config.expected.allAddresses);
  for(let i=0;i<rows.length;i++){const {researchRule001,...original}=rows[i];assert.ok(researchRule001);assert.deepEqual(original,originals[i],`Immutable original profile ${i}`);}
  assert.equal(rows.length,config.expected.allAddresses,"Unexpected source address count");
  const summary=JSON.parse(await readFile(path.join(provisionalDir,"summary.json"),"utf8"));
  assert.equal(summary.snapshotId,config.sourceSnapshotId);
  assert.equal(summary.candidateAddressCategories.reviewAlreadyMatched,config.expected.newlyApprovedSameCodeReview);
  assert.equal(summary.candidateAddressCategories.reviewDifferentCode,201);
  assert.equal(summary.candidateAddressCategories.reviewPreviouslyUnclassified,1);
  const transformed=rows.map(x=>approveRecord(x,config,blocked));
  const approved=transformed.filter(x=>x.approvedPrimaryGuidance.status==="GUIDANCE_READY_APPROVED");
  const stats={
    approvalId:config.approvalId,sourceSnapshotId:config.sourceSnapshotId,
    addresses:transformed.length,
    originalClean:rows.filter(x=>x.status==="clean").length,
    originalReview:rows.filter(x=>x.status==="review").length,
    newlyApprovedGuidance:approved.length,
    originalReviewStillRequiringReview:transformed.filter(x=>x.approvedPrimaryGuidance.stillRequiresReview).length,
    originalZoningCodesChanged:transformed.filter((x,i)=>x.zoningCode!==rows[i].zoningCode).length,
    approvedPNoticeRecommended:approved.filter(x=>x.approvedPrimaryGuidance.preservationNoticeRecommendation==="RECOMMENDED_PHYSICAL_PROJECT_GUIDES").length,
    approvedPNoticeNotProminent:approved.filter(x=>x.approvedPrimaryGuidance.preservationNoticeRecommendation==="NOT_PROMINENT_IN_ORDINARY_GUIDES").length,
    changedOrUnclassifiedScopeApproved:approved.filter(x=>!x.zoningCode||norm(x.zoningCode)!==norm(x.researchRule001.proposedPrimaryGuidanceZoning)).length,
    pendingChangedCodeReview:transformed.filter(x=>x.approvedPrimaryGuidance.disposition==="PENDING_CHANGED_OR_NEW_CODE_SCOPE"&&x.zoningCode).length,
    pendingUnclassifiedReview:transformed.filter(x=>x.approvedPrimaryGuidance.disposition==="PENDING_CHANGED_OR_NEW_CODE_SCOPE"&&!x.zoningCode).length,
    originalSourceQaStatusesChanged:transformed.filter((x,i)=>x.status!==originals[i].status).length,
    knownHumanExclusionAddressesApproved:approved.filter(x=>blocked.has(x.parcelIdentifier)).length,
    allProvisionalEvidenceRetained:transformed.every((x,i)=>JSON.stringify(x.researchRule001)===JSON.stringify(rows[i].researchRule001)),
    supabaseChanged:false,
    productionGuidesChanged:false
  };
  for(const [k,v] of Object.entries({originalClean:config.expected.originalClean,originalReview:config.expected.originalReview,newlyApprovedGuidance:config.expected.newlyApprovedSameCodeReview,originalReviewStillRequiringReview:config.expected.stillReview,originalZoningCodesChanged:0})){
    assert.equal(stats[k],v,k+" reconciliation");
  }
  assert.equal(stats.approvedPNoticeRecommended+stats.approvedPNoticeNotProminent,approved.length);
  for(const [k,v] of Object.entries({pendingChangedCodeReview:201,pendingUnclassifiedReview:1,changedOrUnclassifiedScopeApproved:0,originalSourceQaStatusesChanged:0,knownHumanExclusionAddressesApproved:0,approvedPNoticeRecommended:762,approvedPNoticeNotProminent:1205}))assert.equal(stats[k],v,k);
  assert.equal(stats.allProvisionalEvidenceRetained,true);
  assert.equal(new Set(transformed.map(x=>x.sourceAddressIdentifier)).size,transformed.length);
  await mkdir(outputDir,{recursive:true});
  const file=path.join(outputDir,"clearwater-approved-address-lookup.jsonl");
  const payload=transformed.map(x=>JSON.stringify(x)).join("\n")+"\n";
  await writeFile(file,payload);
  stats.outputSha256=sha256(payload);
  stats.outputBytes=Buffer.byteLength(payload);
  stats.sourceArchiveSha256=config.sourceArchiveSha256;stats.ruleVersion=config.ruleVersion;
  stats.approvalConfigSha256=sha256(await readFile(path.join(ROOT,"research/gis/rule001-approval.same-code-v1.json")));
  stats.finalFocusedQcSha256=sha256(await readFile(path.join(ROOT,"research/gis/rule001-final-focused-qc.json")));
  stats.exporterSha256=sha256(await readFile(fileURLToPath(import.meta.url)));
  await writeFile(path.join(outputDir,"approval-audit.json"),JSON.stringify(stats,null,2)+"\n");
  await writeFile(path.join(outputDir,"approved-records-qc.jsonl"),approved.map(x=>JSON.stringify({sourceAddressIdentifier:x.sourceAddressIdentifier,address:x.displayAddress,parcelId:x.parcelIdentifier,primary:x.approvedPrimaryGuidance.primaryZoning,pCoveragePercent:x.approvedPrimaryGuidance.mappedPreservationPercent,notice:x.approvedPrimaryGuidance.preservationNoticeRecommendation})).join("\n")+"\n");
  await writeFile(path.join(outputDir,"approval-config.json"),JSON.stringify(config,null,2)+"\n");
  await writeFile(path.join(outputDir,"final-focused-qc.json"),JSON.stringify(focused,null,2)+"\n");
  await writeFile(path.join(outputDir,"source-verification.json"),JSON.stringify(provenance,null,2)+"\n");
  for(const name of ["p-parcel-inventory.json","human-review-regression.json","policy-analysis.json"])await writeFile(path.join(outputDir,name),await readFile(path.join(provisionalDir,name)));
  const outputHashes={};for(const name of ["clearwater-approved-address-lookup.jsonl","approval-audit.json","approved-records-qc.jsonl","approval-config.json","final-focused-qc.json","source-verification.json","p-parcel-inventory.json","human-review-regression.json","policy-analysis.json"]){const b=await readFile(path.join(outputDir,name));outputHashes[name]={bytes:b.length,sha256:sha256(b)};}
  await writeFile(path.join(outputDir,"output-checksums.json"),JSON.stringify(outputHashes,null,2)+"\n");
  console.log(JSON.stringify(stats,null,2));
  return stats;
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
  if(process.argv.length!==5)throw new Error("Usage: node scripts/gis/export-clearwater-approved-rule001.mjs <provisional-output-dir> <NEW-approved-output-dir> <verified-source-dir>");
  await exportApproved(process.argv[2],process.argv[3],process.argv[4]);
}
