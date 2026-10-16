#!/usr/bin/env node
/** Independent serialized-output checks: originals, Rule 001, pending Rule 002 and hashes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { addProvisionalLayer, classify, sampleQc } from './clearwater-rule002-policy.mjs';
import { normalizeReviewSession } from './clearwater-rule001-policy.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function digest(file){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(file)){h.update(b);bytes+=b.length;}return {sha256:h.digest('hex'),bytes};}
export function verifyCombinedRecord(derived,baseline,original,parcel){
  const {researchRule002,...prior}=derived;assert.deepEqual(prior,baseline,'Rule 001/source record changed');
  const {researchRule001,approvedPrimaryGuidance,...frozen}=prior;assert.deepEqual(frozen,original,'Frozen original changed');
  assert.deepEqual(researchRule002,addProvisionalLayer(baseline,parcel).researchRule002,'Rule 002 serialized contract');
  assert.equal(researchRule002.approvalStatus,'NOT_APPROVED');assert.equal(researchRule002.productionEligible,false);
}
export async function verify(input,approvedDir,output){
  const manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json'));
  for(const [name,v] of Object.entries(manifest.files))assert.deepEqual(await digest(path.join(input,name)),{sha256:v.sha256,bytes:v.bytes},`Frozen source ${name}`);
  const checks=await json(path.join(output,'output-checksums.json'));
  for(const name of ['clearwater-combined-address-lookup.jsonl','rule002-incremental-audit.jsonl','audit.json','lmdr-osr-parcel-inventory.json','qc-batch.json','gold-regression.json','supplemental-intersections.json','source-verification.json','report.md','qc-reviewer.md'])assert.ok(checks[name],`Required ${name}`);
  for(const [name,v] of Object.entries(checks)){assert.equal(path.basename(name),name);assert.deepEqual(await digest(path.join(output,name)),v,`Output ${name}`);}
  const provenance=await json(path.join(output,'source-verification.json'));
  assert.equal(provenance.archiveSha256,manifest.archiveSha256);assert.deepEqual(provenance.files,manifest.files);
  for(const [field,name] of [['processorSha256','clearwater-rule002.mjs'],['policySha256','clearwater-rule002-policy.mjs'],['measurementAlgorithmSha256','clearwater-rule002-intersections.mjs']])assert.equal(provenance[field],(await digest(path.join(ROOT,'scripts/gis',name))).sha256);
  const gold=await json(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json'));assert.equal(provenance.goldSha256,(await digest(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json'))).sha256);
  const reviews=[...gold.records];for(const e of gold.additionalReviewDatasets){const f=path.join(ROOT,'research/gis/zoning-gold',e.path);assert.equal((await digest(f)).sha256,e.sha256);reviews.push(...normalizeReviewSession((await json(f)).records));}
  const originals=await json(path.join(input,'property-profiles.json'));
  const byParcel=new Map();for(const p of originals){const id=String(p.parcelIdentifier);if(!byParcel.has(id))byParcel.set(id,[]);byParcel.get(id).push(p);}
  const population=await json(path.join(output,'lmdr-osr-parcel-inventory.json'));
  const inventory=new Map(population.map(r=>[r.parcelId,r]));assert.equal(inventory.size,population.length);
  const counts=new Map();for(const f of (await json(path.join(input,'parcels.geojson'))).features){const id=String(f.properties.PARCELID??f.properties.STRAP);counts.set(id,(counts.get(id)??0)+1);}
  for(const r of population)assert.deepEqual(r.decision,classify(r.evidence,byParcel.get(r.parcelId)??[],reviews.filter(g=>g.parcelId===r.parcelId),counts.get(r.parcelId)>1),`Policy ${r.parcelId}`);
  const baseline=createInterface({input:createReadStream(path.join(approvedDir,'clearwater-approved-address-lookup.jsonl')),crlfDelay:Infinity})[Symbol.asyncIterator]();
  const derived=createInterface({input:createReadStream(path.join(output,'clearwater-combined-address-lookup.jsonl')),crlfDelay:Infinity});
  let n=0,approved=0,potential=0,rule002Proposals=0,prominent=0,notProminent=0;const ids=new Set();
  for await(const line of derived){
    const next=await baseline.next();assert.equal(next.done,false);const r=JSON.parse(line),b=JSON.parse(next.value);
    verifyCombinedRecord(r,b,originals[n],inventory.get(String(r.parcelIdentifier)));
    assert.ok(!ids.has(r.sourceAddressIdentifier));ids.add(r.sourceAddressIdentifier);n++;
    if(r.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED'){approved++;assert.equal(r.researchRule002.potentialIncrementalReviewRecovery,false);if(r.approvedPrimaryGuidance.preservationNoticeRecommendation==='RECOMMENDED_PHYSICAL_PROJECT_GUIDES')prominent++;else notProminent++;}
    if(r.researchRule002.potentialIncrementalReviewRecovery)potential++;
    if(r.researchRule002.proposedPrimaryGuidanceZoning)rule002Proposals++;
  }
  assert.equal((await baseline.next()).done,true);assert.equal(n,63430);assert.equal(approved,1967);assert.equal(prominent,762);assert.equal(notProminent,1205);
  const audit=await json(path.join(output,'audit.json'));
  assert.equal(audit.allAddresses,n);assert.equal(audit.rule001ApprovedPreserved,approved);assert.equal(audit.potentialIncrementalReviewRecovery,potential);assert.equal(audit.qualifying.addresses,rule002Proposals);
  assert.equal(audit.rule002NewApprovals,0);assert.equal(audit.rule001FieldsChanged,0);assert.equal(audit.originalZoningCodesChanged,0);assert.equal(audit.originalSourceQaStatusesChanged,0);
  const qc=await json(path.join(output,'qc-batch.json'));assert.deepEqual(qc,sampleQc(population.filter(r=>r.decision.eligible),reviews,10));
  assert.ok(qc.length<=10&&qc.length>=8);assert.ok(qc.every(q=>q.humanReview.result===null&&!reviews.some(g=>g.parcelId===q.parcelId)));
  const regression=await json(path.join(output,'gold-regression.json'));assert.equal(regression.length,10);assert.ok(regression.every(g=>g.agreement));
  console.log(`Verified ${n} serialized original profiles, ${approved} unchanged Rule 001 approvals (${prominent}/${notProminent} notices), ${rule002Proposals} provisional Rule 002 records and ${potential} net potential REVIEW recoveries; all hashes, human exclusions and ${qc.length} independent pending QC cases pass.`);
  return {addresses:n,approvedRule001:approved,provisionalRule002:rule002Proposals,potentialIncrementalReviewRecovery:potential};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){if(process.argv.length!==5)throw new Error('Usage: node scripts/gis/verify-rule002-output.mjs <frozen-source> <approved-rule001-output> <rule002-output>');await verify(...process.argv.slice(2));}
