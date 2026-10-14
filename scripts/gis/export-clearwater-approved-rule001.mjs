#!/usr/bin/env node
/** Bounded offline export of the explicitly approved Rule 001 same-code REVIEW scope. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const sha256=s=>createHash("sha256").update(s).digest("hex");
const norm=s=>String(s??"").toLowerCase().replace(/[\\s_-]+/g,"");
export function approveRecord(row,config) {
  const r=row.researchRule001;
  assert.ok(r && r.sourceSnapshotIdentifier===config.sourceSnapshotId,"Source snapshot mismatch");
  assert.equal(r.existingPrimaryZoning,row.zoningCode,"Original zoning must be preserved");
  assert.equal(r.sourceGisQualityStatus,row.status,"Original GIS QA must be preserved");
  const sameCode = !!row.zoningCode && norm(row.zoningCode)===norm(r.proposedPrimaryGuidanceZoning);
  const allowed = row.status==="review" && sameCode &&
    r.decisionStatus==="PENDING_QC" && r.ruleId===config.ruleId &&
    r.residentGuidanceEligibility==="PROVISIONAL_ELIGIBLE_AFTER_EXPLICIT_APPROVAL" &&
    r.approvalStatus==="NOT_APPROVED" && r.productionEligible===false &&
    Array.isArray(r.flags) && r.flags.length===0 &&
    Array.isArray(r.originalZoningIntersections) && r.originalZoningIntersections.length===2 &&
    r.originalZoningIntersections.some(x=>norm(x.normalizedZoningCode??x.code)==="p") &&
    r.originalZoningIntersections.filter(x=>norm(x.normalizedZoningCode??x.code)!=="p").length===1 &&
    r.retainedSecondaryPreservation==="P" && r.preservationDetailsRetained===true;
  const p=Number(r.pCoveragePercent);
  if(allowed){
    assert.ok(Number.isFinite(p)&&p>0&&p<=100.1);
    assert.equal(r.proposedNoticeVisibility,p>config.presentation.preservationNoticeProminentWhenPercentGreaterThan?
      "RECOMMENDED_PHYSICAL_PROJECT_GUIDES":"NOT_PROMINENT_IN_ORDINARY_GUIDES");
  }
  const {researchRule001,...original}=row;
  return { ...original,
    approvedPrimaryGuidance:{
      status:allowed?"GUIDANCE_READY_APPROVED":"NO_NEW_APPROVAL",
      primaryZoning:allowed?row.zoningCode:null,
      ruleId:allowed?config.ruleId:null,
      approvalId:allowed?config.approvalId:null,
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
export async function exportApproved(provisionalDir,outputDir){
  const config=JSON.parse(await readFile(path.join(ROOT,"research/gis/rule001-approval.same-code-v1.json"),"utf8"));
  assert.equal(config.decision,"APPROVED_FOR_OFFLINE_STATIC_EXPORT_ONLY");
  const raw=await readFile(path.join(provisionalDir,"citywide-provisional.jsonl"),"utf8");
  const rows=raw.trimEnd().split("\n").map(JSON.parse);
  assert.equal(rows.length,config.expected.allAddresses,"Unexpected source address count");
  const summary=JSON.parse(await readFile(path.join(provisionalDir,"summary.json"),"utf8"));
  assert.equal(summary.snapshotId,config.sourceSnapshotId);
  assert.equal(summary.candidateAddressCategories.reviewAlreadyMatched,config.expected.newlyApprovedSameCodeReview);
  assert.equal(summary.candidateAddressCategories.reviewDifferentCode,201);
  assert.equal(summary.candidateAddressCategories.reviewPreviouslyUnclassified,1);
  const transformed=rows.map(x=>approveRecord(x,config));
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
    changedOrUnclassifiedScopeApproved:0,
    supabaseChanged:false,
    productionGuidesChanged:false
  };
  for(const [k,v] of Object.entries({originalClean:config.expected.originalClean,originalReview:config.expected.originalReview,newlyApprovedGuidance:config.expected.newlyApprovedSameCodeReview,originalReviewStillRequiringReview:config.expected.stillReview,originalZoningCodesChanged:0})){
    assert.equal(stats[k],v,k+" reconciliation");
  }
  assert.equal(stats.approvedPNoticeRecommended+stats.approvedPNoticeNotProminent,approved.length);
  assert.equal(new Set(transformed.map(x=>x.sourceAddressIdentifier)).size,transformed.length);
  await mkdir(outputDir,{recursive:true});
  const file=path.join(outputDir,"clearwater-approved-address-lookup.jsonl");
  const payload=transformed.map(x=>JSON.stringify(x)).join("\n")+"\n";
  await writeFile(file,payload);
  stats.outputSha256=sha256(payload);
  stats.outputBytes=Buffer.byteLength(payload);
  await writeFile(path.join(outputDir,"approval-audit.json"),JSON.stringify(stats,null,2)+"\n");
  await writeFile(path.join(outputDir,"approved-records-qc.jsonl"),approved.map(x=>JSON.stringify({sourceAddressIdentifier:x.sourceAddressIdentifier,address:x.displayAddress,parcelId:x.parcelIdentifier,primary:x.approvedPrimaryGuidance.primaryZoning,pCoveragePercent:x.approvedPrimaryGuidance.mappedPreservationPercent,notice:x.approvedPrimaryGuidance.preservationNoticeRecommendation})).join("\n")+"\n");
  console.log(JSON.stringify(stats,null,2));
  return stats;
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href){
  if(process.argv.length!==4)throw new Error("Usage: node scripts/gis/export-clearwater-approved-rule001.mjs <provisional-output-dir> <NEW-approved-output-dir>");
  await exportApproved(process.argv[2],process.argv[3]);
}
