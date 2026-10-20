#!/usr/bin/env node
/** Read-only unsupported-code evidence. No normalization or guidance assignments. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import RBush from 'rbush';
import {verifySource} from './clearwater-rule001.mjs';
import {indexItem,measureOsrParcel} from './clearwater-rule002-intersections.mjs';
import {loadHumanEvidence} from './clearwater-rule002.mjs';
import {normalizeReviewSession} from './clearwater-rule001-policy.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function digest(p){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(p)){h.update(b);bytes+=b.length;}return {sha256:h.digest('hex'),bytes};}
export async function run(source,approved,archive,out){
 [source,approved,archive,out]=[source,approved,archive,out].map(p=>path.resolve(p));assert.ok(![source,approved].some(p=>out===p||out.startsWith(p+path.sep)));try{await access(out);throw new Error('Fresh output required');}catch(e){if(e.code!=='ENOENT')throw e;}
 const manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json'));assert.equal((await digest(archive)).sha256,manifest.archiveSha256);
 const gold=await json(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json'));const verified=await verifySource(source,manifest,gold);
 for(const [n,v] of Object.entries(await json(path.join(approved,'output-checksums.json'))))assert.deepEqual(await digest(path.join(approved,n)),v,n);
 assert.equal((await digest(path.join(approved,'clearwater-approved-address-lookup.jsonl'))).sha256,'a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739','Latest validated Rule004 baseline');
 const reviews=[...gold.records];for(const x of gold.additionalReviewDatasets)reviews.push(...normalizeReviewSession((await json(path.join(ROOT,'research/gis/zoning-gold',x.path))).records));reviews.push(...(await loadHumanEvidence()).reviews);
 const unsupported=[],counts={};let total=0,review=0,remaining=0;
 for await(const line of createInterface({input:createReadStream(path.join(approved,'clearwater-approved-address-lookup.jsonl')),crlfDelay:Infinity})){
  const r=JSON.parse(line),o=verified.profiles[total++];const {approvedPrimaryGuidance,researchRule001,researchRule002,researchRule003,...raw}=r;assert.deepEqual(raw,o);
  review+=+(r.status==='review');if(approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED')counts[approvedPrimaryGuidance.ruleId]=(counts[approvedPrimaryGuidance.ruleId]??0)+1;
  else if(r.status==='review'){remaining++;if(r.issues.includes('unsupported_zoning_code'))unsupported.push(r);}
 }
 assert.equal(total,63430);assert.equal(review,20338);assert.equal(remaining,17014);assert.deepEqual(counts,{'CLR-Z-001':1967,'CLR-Z-002':262,'CLR-Z-003':731,'CLR-Z-004':364});assert.equal(unsupported.length,2832);
 const parcels=verified.layers.parcels.features,zoning=verified.layers.zoning.features,diagnostics=new Map(verified.diagnostic.parcels.map(d=>[d.parcelIdentifier,d]));
 const pmap=new Map();for(const p of parcels){const id=String(p.properties.PARCELID);if(!pmap.has(id))pmap.set(id,[]);pmap.get(id).push(p);}
 const tree=new RBush();tree.load(zoning.map(indexItem));const measurements=[],cache=new Map();let supplemented=0,reused=0;
 for(const id of [...new Set(unsupported.map(r=>r.parcelIdentifier))].sort()){
  if(diagnostics.has(id)){measurements.push({...diagnostics.get(id),investigationMethod:'UNCHANGED_FROZEN_DIAGNOSTIC',sourceParcelFeatureCount:pmap.get(id)?.length??0});reused++;continue;}
  const ps=pmap.get(id)??[];assert.ok(ps.length);const p=ps[0],key=JSON.stringify(p.geometry);let d=cache.get(key);
  if(!d){d=measureOsrParcel(p,tree.search(indexItem(p)));cache.set(key,d);}
  measurements.push({...d,parcelIdentifier:id,investigationMethod:'EXISTING_TURF_INTERSECTION_HELPER_NO_CODE_FILTER',sourceParcelFeatureCount:ps.length});supplemented++;
 }
 await mkdir(out,{recursive:true});const write=(n,v)=>writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n');
 await write('unsupported-profiles.json',unsupported);await write('parcel-measurements.json',measurements);await write('human-evidence.json',reviews);
 await write('verification.json',{sourceSnapshotId:manifest.snapshotId,archive:await digest(archive),sourceVerification:verified.verification,counts:verified.counts,approvedLookup:await digest(path.join(approved,'clearwater-approved-address-lookup.jsonl')),allProfiles:total,originalReview:review,remainingReview:remaining,approvedCounts:counts,unsupportedAddresses:unsupported.length,unsupportedParcelIds:measurements.length,reusedFrozenDiagnostic:reused,supplementedMissingDiagnostic:supplemented,uniqueSupplementalRawGeometryComputations:cache.size,originalFieldsChanged:0,newApprovals:0,codeNormalizationPerformed:false,script:await digest(fileURLToPath(import.meta.url))});
 const checks={};for(const name of ['unsupported-profiles.json','parcel-measurements.json','human-evidence.json','verification.json'])checks[name]=await digest(path.join(out,name));await write('output-checksums.json',checks);
 console.log(JSON.stringify({addresses:unsupported.length,parcels:measurements.length,reused,supplemented,distinctSupplementalComputations:cache.size}));
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)await run(...process.argv.slice(2));
