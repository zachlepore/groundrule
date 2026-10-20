#!/usr/bin/env node
/** Rejoin original inputs, validate every typed document/hash and recompute complete census. */
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadInputs,lines,json,digest,census,stageA,interpretAddress,ROOT} from './interpret-clearwater-zoning.mjs';
export async function verify(source,approved,archive,output){
 const input=await loadInputs(source,approved,archive),checks=await json(path.join(output,'checksums.json'));
 assert.deepEqual(Object.keys(checks).sort(),['interpreted-addresses.jsonl','parcel-evidence.json','census.json','exceptions.json','secondary-ncod.json','human-evidence.json','mapping-registry.json','provenance.json','report.md'].sort());
 for(const [name,expected] of Object.entries(checks))assert.deepEqual(await digest(path.join(output,name)),expected,`Output checksum: ${name}`);
 const temporary=await mkdtemp(path.join(tmpdir(),'ncod-verify-'));
 try {await promisify(execFile)('python3',[path.join(ROOT,'scripts/gis/measure-clearwater-zoning-interpretation.py'),source,path.join(temporary,'geometry.json')],{maxBuffer:1048576});assert.deepEqual(await json(path.join(temporary,'geometry.json')),await json(path.join(output,'parcel-evidence.json')),'Source geometry census changed');} finally {await rm(temporary,{recursive:true,force:true});}
 const geometry=await json(path.join(output,'parcel-evidence.json')),parcels=new Map(),human=new Map(),addressLinks=new Map(geometry.addresses.map(a=>[a.addressId,a]));
 for(const p of geometry.parcels){const xs=parcels.get(p.parcelId)??[];xs.push(p);parcels.set(p.parcelId,xs);}
 for(const h of input.human){const xs=human.get(h.parcelId)??[];xs.push(h);human.set(h.parcelId,xs);}
 const originals=new Map(input.rows.map(r=>[r.sourceAddressIdentifier,r])),rows=[],seen=new Set();let previous=-Infinity;
 for await(const row of lines(path.join(output,'interpreted-addresses.jsonl'))){
  assert.ok(!seen.has(row.addressId));seen.add(row.addressId);assert.ok(row.addressId>previous);previous=row.addressId;
  const original=originals.get(row.addressId);assert.ok(original);assert.equal(row.parcelId,original.parcelIdentifier);
  stageA.validateZoningInterpretation(row.interpretation);
  assert.equal(row.originalProfileSha256,stageA.zoningEvidenceHash(original));assert.equal(row.priorApprovalSha256,stageA.zoningEvidenceHash(original.approvedPrimaryGuidance));
  assert.equal(row.interpretation.originalSourceZoning,original.zoningCode??null);
  assert.deepEqual(row.originalSourceQa,{status:original.status,issues:original.issues});
  assert.ok(row.interpretation.overlays.every(o=>o.applicability==='unknown'&&o.applicabilityEvidence===null));assert.equal(row.interpretation.overlayInventory.legalApplicabilityConfirmed,false);
  assert.equal(row.interpretation.projectReadiness.fence.designation,'unresolved');
  assert.ok(!('evaluatorFacts' in row)&&!('approvedPrimaryGuidance' in row));
  const expected=interpretAddress(original,parcels.get(String(original.parcelIdentifier))??[],input.identities,input.registry,human.get(String(original.parcelIdentifier))??[],addressLinks.get(original.sourceAddressIdentifier));assert.deepEqual(row,expected);
  rows.push(row);
 }
 assert.equal(rows.length,input.rows.length);assert.deepEqual(census(rows),await json(path.join(output,'census.json')));
 assert.deepEqual(await json(path.join(output,'mapping-registry.json')),input.registry);
 assert.deepEqual(await json(path.join(output,'human-evidence.json')),input.human);
 assert.deepEqual(await json(path.join(output,'exceptions.json')),rows.filter(r=>r.interpretation.holds.length).map(r=>({addressId:r.addressId,displayAddress:r.displayAddress,parcelId:r.parcelId,holds:r.interpretation.holds})));
 assert.deepEqual(await json(path.join(output,'secondary-ncod.json')),rows.filter(r=>r.ncodContacts.some(f=>f.relation==='secondary')).map(r=>({addressId:r.addressId,displayAddress:r.displayAddress,parcelId:r.parcelId,sourcePrimary:r.interpretation.originalSourceZoning,contacts:r.ncodContacts,base:r.interpretation.base,holds:r.interpretation.holds})));
 const audit=census(rows);assert.equal(audit.unexpectedApprovedNcod,0);assert.equal(Object.values(audit.unsupportedSourcePrimary).reduce((a,b)=>a+b,0),2832);
 // Exact source-primary reconciliation against independently committed Rule 005 research.
 const codes=(await readFile(path.join(ROOT,'research/gis/rule005-investigation/source-code-summary.csv'),'utf8')).trim().split('\n').slice(1);
 for(const line of codes){const [code,count,parcelCount,footprintCount]=line.split(',');assert.equal(audit.unsupportedSourcePrimary[code],Number(count),`Historical population: ${code}`);assert.deepEqual(audit.unsupportedSourcePrimaryGroups[code],{addresses:Number(count),parcels:Number(parcelCount),footprints:Number(footprintCount)},`Historical groups: ${code}`);}
 const provenance=await json(path.join(output,'provenance.json'));assert.equal(provenance.baselineLookup.sha256,'a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739');
 for(const [file,expected]of Object.entries(provenance.scripts))assert.deepEqual(await digest(path.join(ROOT,file)),expected,`Implementation changed: ${file}`);
 return {status:'PASS',profiles:rows.length,unchangedPriorApprovals:Object.values(audit.priorApprovals).reduce((a,b)=>a+b,0),unchangedUnapprovedReview:audit.unapprovedReview,originalZoningOrQaChanges:0,newApprovals:0,newEvaluatorFacts:0,unexpectedApprovedNcod:audit.unexpectedApprovedNcod,sourcePrimaryResearchReconciled:true,allDocumentsRecomputed:true};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)console.log(JSON.stringify(await verify(...process.argv.slice(2)),null,2));
