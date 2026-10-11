#!/usr/bin/env node
/** Full-output conservation and audit check; does not rerun expensive intersections. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const [input,output]=process.argv.slice(2);
assert.ok(input && output,"Usage: node scripts/gis/verify-rule001-output.mjs <source> <output>");
const read=async(dir,name)=>JSON.parse(await readFile(path.join(dir,name),"utf8"));
const manifest=await read(output,"source-verification.json");
const hash=b=>createHash("sha256").update(b).digest("hex");
for(const [name,s] of Object.entries(manifest.files))assert.equal(hash(await readFile(path.join(input,name))),s.sha256,`source changed: ${name}`);
const checksums=await read(output,"output-checksums.json");
for(const [name,s] of Object.entries(checksums))assert.equal(hash(await readFile(path.join(output,name))),s.sha256,`output integrity: ${name}`);
const original=await read(input,"property-profiles.json");
const derived=(await readFile(path.join(output,"citywide-provisional.jsonl"),"utf8")).trim().split("\n").map(JSON.parse);
const auditText=(await readFile(path.join(output,"changed-record-audit.jsonl"),"utf8")).trim();
const audit=auditText?auditText.split("\n").map(JSON.parse):[];
const summary=await read(output,"summary.json");
assert.equal(derived.length,63430);assert.equal(derived.length,original.length);
for(let i=0;i<original.length;i++){
  const {researchRule001,...retained}=derived[i];
  assert.deepEqual(retained,original[i],`original profile ${i} must be preserved exactly`);
  assert.equal(researchRule001.productionEligible,false);
  if(researchRule001.proposedPrimaryGuidanceZoning){
    assert.equal(researchRule001.decisionStatus,"PENDING_QC");
    assert.equal(researchRule001.ruleId,"CLR-Z-001");
    assert.equal(researchRule001.originalZoningIntersections.length,2);
    assert.ok(researchRule001.originalZoningIntersections.some(e=>e.normalizedZoningCode==="p"));
    assert.equal(researchRule001.flags.length,0);
  }
}
const proposed=derived.filter(r=>r.researchRule001.proposedPrimaryGuidanceZoning);
const delta={previouslyUnclassified:0,sameAsOriginalZoning:0,differentFromOriginalZoning:0};
for(const p of proposed){
  const normalize=s=>String(s).trim().toLowerCase().replace(/[\s_-]+/g,"");
  if(!p.zoningCode)delta.previouslyUnclassified++;
  else if(normalize(p.zoningCode)===normalize(p.researchRule001.proposedPrimaryGuidanceZoning))delta.sameAsOriginalZoning++;
  else delta.differentFromOriginalZoning++;
}
const categories={reviewAlreadyMatched:0,reviewDifferentCode:0,reviewPreviouslyUnclassified:0,
  cleanAlreadyMatched:0,cleanDifferentCode:0,cleanPreviouslyUnclassified:0};
for(const r of audit){
  const normalize=s=>String(s).trim().toLowerCase().replace(/[\s_-]+/g,"");
  const prefix=r.originalStatus === "review" ? "review" : "clean";
  const kind=!r.originalZoningCode ? "PreviouslyUnclassified" : normalize(r.originalZoningCode)===normalize(r.proposedPrimaryGuidanceZoning) ? "AlreadyMatched" : "DifferentCode";
  categories[prefix+kind]++;
}
assert.deepEqual(summary.candidateAddressCategories,categories,"Report categories must reconcile with address-level audit");
assert.equal(Object.values(categories).reduce((s,n)=>s+n,0),audit.length);
assert.equal(categories.reviewAlreadyMatched+categories.reviewDifferentCode+categories.reviewPreviouslyUnclassified,summary.originallyReviewCandidates);
assert.equal(categories.cleanAlreadyMatched+categories.cleanDifferentCode+categories.cleanPreviouslyUnclassified,summary.originallyCleanCandidates);
assert.equal(audit.length,proposed.length);assert.equal(audit.length,summary.candidateAddresses);
assert.equal(new Set(audit.map(r=>r.sourceAddressIdentifier)).size,audit.length);
const auditMap=new Map(audit.map(r=>[r.sourceAddressIdentifier,r]));
for(const p of proposed){const a=auditMap.get(p.sourceAddressIdentifier);assert.equal(a.parcelId,p.parcelIdentifier);assert.equal(a.proposedPrimaryGuidanceZoning,p.researchRule001.proposedPrimaryGuidanceZoning);}
const qc=await read(output,"qc-batch.json");assert.equal(qc.length,30);assert.equal(new Set(qc.map(c=>c.parcelId)).size,30);
assert.ok(qc.every(c=>c.humanReview.result===null && c.humanReview.reviewDate===null));
const reviewer=await readFile(path.join(output,"qc-reviewer.md"),"utf8");assert.ok(!reviewer.includes("Research proposal:"));
console.log(`Verified ${derived.length} unchanged original profiles, ${proposed.length} audited proposals, 30 unlabelled QC cases, all source and output hashes.`);
console.log("Candidate comparison to original zoning values:",JSON.stringify(delta));
