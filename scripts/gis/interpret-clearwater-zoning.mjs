#!/usr/bin/env node
/** Additive offline NCOD source interpretation. No facts, approvals or source mutation. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';
import {verifySource} from './clearwater-rule001.mjs';
import {loadHumanEvidence} from './clearwater-rule002.mjs';
import {normalizeReviewSession} from './clearwater-rule001-policy.mjs';
import {allowedZoning} from './clearwater-pilot.mjs';
export const stageA=await tsImport('../../lib/properties/zoning-interpretation.ts',import.meta.url);
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const BASELINE_SHA='a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739';
export const json=async p=>JSON.parse(await readFile(p,'utf8'));
export async function digest(p){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(p)){h.update(b);bytes+=b.length;}return {sha256:h.digest('hex'),bytes};}
export async function* lines(p){for await(const l of createInterface({input:createReadStream(p),crlfDelay:Infinity}))if(l)yield JSON.parse(l);}
export function contextFor(feature,registry){return {jurisdiction:registry.jurisdiction,snapshotId:registry.snapshotId,registryVersion:registry.registryVersion,archiveSha256:registry.archiveSha256,zoningFileSha256:registry.zoningFileSha256,originalSourceZoning:feature.properties.ZONING,feature};}
export function interpretAddress(row,parcelEvidence,identities,registry,human=[],addressLink=null){
 const refs=[`property-profiles.json#${row.sourceAddressIdentifier}`],observed=parcelEvidence.flatMap(p=>p.features),positive=observed.filter(f=>f.contact==='positive_area'),uncertain=observed.filter(f=>f.contact==='uncertain');
 const allCodes=[...new Set(positive.map(f=>f.rawZoningCode))].sort(),primary=row.zoningCode;
 const primaryIdentity=identities.get(row.zoningSourceIdentifier);
 const overlayGroups=new Map(),holds=row.issues.map(code=>({kind:'source_qc',code,evidenceRefs:refs}));
 for(const h of human.filter(h=>['human_true_split','human_staff_review','human_primary_applicability_unclear','human_primary_candidate'].includes(h.humanReview?.reviewStatus)))holds.push({kind:'human',code:h.humanReview?.reviewStatus??'registered_review',evidenceRefs:[`human-evidence.json#${h.caseId??h.caseNumber??h.parcelId}`]});
 const addHold=code=>holds.push({kind:'interpretation',code,evidenceRefs:refs});
 if(addressLink?.addressInsideLinkedParcel===false)addHold('address_point_outside_linked_parcel');
 if(addressLink?.addressInsideLinkedParcel===null)addHold('address_link_not_verified');
 if(observed.some(f=>!f.geometryValid))addHold('invalid_source_zoning_geometry');
 if(!parcelEvidence.length)addHold('missing_parcel_link');
 if(parcelEvidence.length>1)addHold('nonunique_parcel_identity');
 if(parcelEvidence.some(p=>!p.parcelGeometryValid||p.errors.length))addHold('invalid_or_incomplete_geometry');
 if(uncertain.length)addHold('unmeasurable_zoning_intersection');
 for(const f of observed){
  const identity=identities.get(f.sourceIdentifier);
  if(identity?.state==='identified'&&identity.entry.overlay){const o=identity.entry.overlay;const group=overlayGroups.get(o.code)??{...o,refs:[],citations:new Set(),uncertain:false};group.refs.push(`zoning.geojson#OBJECTID=${f.sourceIdentifier}`);identity.entry.citationIds.forEach(c=>group.citations.add(c));group.uncertain ||= f.contact==='uncertain';overlayGroups.set(o.code,group);}
  else if(identity?.state==='conflicting')addHold('conflicting_source_mapping');
 }
 // Include an explicitly mapped primary identity even when geometry disagrees, flagging the disagreement.
 if(primaryIdentity?.state==='identified'&&primaryIdentity.entry.overlay&&!overlayGroups.has(primaryIdentity.entry.overlay.code)){
  const o=primaryIdentity.entry.overlay;overlayGroups.set(o.code,{...o,refs:[`zoning.geojson#OBJECTID=${row.zoningSourceIdentifier}`],citations:new Set(primaryIdentity.entry.citationIds),uncertain:true});addHold('primary_overlay_not_confirmed_by_area');
 }
 const codesToBases=code=>{
  const exact=registry.entries.find(e=>e.originalSourceCode===code);if(exact)return exact.baseCode;
  if(code==='US 19')return 'US19'; // Explicit frozen ordinary district spelling; not NCOD normalization.
  // Ordinary codes use the pre-existing supported district registry only, never a composite parser.
  return typeof code==='string'&&[...allowedZoning].map(c=>c.toUpperCase()).includes(code)?code:null;
 };
 const bases=[...new Set(allCodes.map(codesToBases).filter(Boolean))].sort();
 const primaryBase=codesToBases(primary);
 if(primaryBase&&!bases.includes(primaryBase))bases.push(primaryBase);bases.sort();
 const ev={refs,sha256:stageA.zoningEvidenceHash({row,parcelEvidence})};
 const base=bases.length>1?{state:'conflicting',candidates:bases,evidence:ev}:bases.length===1?{state:'identified',code:bases[0],evidence:ev}:{state:'unknown',evidence:ev};
 if(bases.length>1)addHold('multiple_source_base_districts');
 if(allCodes.some(c=>!codesToBases(c)))addHold('unsupported_source_district');
 const overlays=[...overlayGroups.values()].sort((a,b)=>a.code.localeCompare(b.code)).map(o=>({type:o.type,code:o.code,name:o.name,mappingState:'source_verified',applicability:'unknown',evidence:{refs:[...new Set(o.refs)].sort(),sha256:stageA.zoningEvidenceHash(o.refs.slice().sort())},applicabilityEvidence:null,provisionRefs:[...o.citations].sort()}));
 const incomplete=!parcelEvidence.length||parcelEvidence.length>1||parcelEvidence.some(p=>!p.parcelGeometryValid||p.errors.length)||uncertain.length>0||observed.some(f=>!f.geometryValid)||holds.some(h=>['conflicting_source_mapping','primary_overlay_not_confirmed_by_area','unsupported_source_district'].includes(h.code));
 const d={schemaVersion:1,interpretationVersion:registry.registryVersion,jurisdiction:row.normalizedJurisdiction??'unknown',sourceIdentity:{snapshotId:registry.snapshotId,archiveSha256:registry.archiveSha256,zoningFileSha256:registry.zoningFileSha256,profileEvidenceSha256:stageA.zoningEvidenceHash(row),mappingSha256:stageA.zoningEvidenceHash(registry)},originalSourceZoning:primary??null,base,overlayInventory:{state:incomplete?'unknown':'complete_for_source',scope:'NCOD_in_frozen_Clearwater_zoning_layer_all_linked_parcel_features',legalApplicabilityConfirmed:false,evidence:ev},overlays,spatialEvidenceRef:`parcel-evidence.json#${row.parcelIdentifier}`,sourceQaRef:`property-profiles.json#${row.sourceAddressIdentifier}`,holds,projectReadiness:{fence:{designation:'unresolved',reasons:['offline_identity_only','no_new_guidance_authorization','legal_applicability_not_confirmed']}}};
 stageA.validateZoningInterpretation(d);
 return {schemaVersion:1,addressId:row.sourceAddressIdentifier,displayAddress:row.displayAddress??null,parcelId:row.parcelIdentifier,originalProfileSha256:stageA.zoningEvidenceHash(row),priorApprovalSha256:stageA.zoningEvidenceHash(row.approvedPrimaryGuidance),originalSourceQa:{status:row.status,issues:row.issues},existingApproval:{status:row.approvedPrimaryGuidance.status,ruleId:row.approvedPrimaryGuidance.ruleId??null},interpretation:d,sourceMappedCodes:allCodes,addressLink,footprintSha256:[...new Set(parcelEvidence.map(p=>p.footprintSha256))].sort(),ncodContacts:observed.filter(f=>identities.get(f.sourceIdentifier)?.entry?.overlay).map(f=>({...f,overlayCode:identities.get(f.sourceIdentifier).entry.overlay.code,overlayBaseCode:identities.get(f.sourceIdentifier).entry.baseCode,relation:f.rawZoningCode===primary?'primary':'secondary'}))};
}
export async function loadInputs(source,approved,archive){
 const manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json')),registry=stageA.getClearwaterZoningRegistry();
 assert.equal((await digest(archive)).sha256,manifest.archiveSha256);assert.equal(manifest.snapshotId,registry.snapshotId);assert.equal(manifest.files['zoning.geojson'].sha256,registry.zoningFileSha256);
 const gold=await json(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json')),verified=await verifySource(source,manifest,gold);
 assert.equal((await digest(path.join(ROOT,'research/gis/rule005-regulatory-evidence.v1.json'))).sha256,registry.regulatoryEvidenceSha256);
 const approvedChecks=await json(path.join(approved,'output-checksums.json'));assert.equal(Object.keys(approvedChecks).length,61);
 for(const [name,v] of Object.entries(approvedChecks))assert.deepEqual(await digest(path.join(approved,name)),v);
 assert.equal((await digest(path.join(approved,'clearwater-approved-address-lookup.jsonl'))).sha256,BASELINE_SHA);
 const rows=[];for await(const r of lines(path.join(approved,'clearwater-approved-address-lookup.jsonl')))rows.push(r);
 assert.equal(rows.length,verified.profiles.length);for(let i=0;i<rows.length;i++){const {approvedPrimaryGuidance,researchRule001,researchRule002,researchRule003,...original}=rows[i];assert.deepEqual(original,verified.profiles[i]);}
 const identities=new Map();for(const feature of verified.layers.zoning.features){const result=stageA.resolveExactZoningMapping(contextFor(feature,registry));identities.set(feature.properties.OBJECTID,result);if(registry.entries.some(e=>e.originalSourceCode===feature.properties.ZONING))assert.equal(result.state,'identified','Registered source mapping changed');}
 let human=[...gold.records];for(const x of gold.additionalReviewDatasets)human.push(...normalizeReviewSession((await json(path.join(ROOT,'research/gis/zoning-gold',x.path))).records));human.push(...(await loadHumanEvidence()).reviews);
 return {manifest,registry,verified,rows,identities,human};
}
export function census(rows){
 const approvals={},unsupported={},overlays={},exceptions={},sourceBaseCensus={},subtypes={},unsupportedGroups={};let review=0,unexpected=0;
 for(const r of rows){const a=r.existingApproval;if(a.status==='GUIDANCE_READY_APPROVED'){approvals[a.ruleId]=(approvals[a.ruleId]??0)+1;if(r.ncodContacts.length||r.interpretation.overlays.length)unexpected++;}else if(r.originalSourceQa.status==='review')review++;
  if(r.originalSourceQa.issues.includes('unsupported_zoning_code')){const code=r.interpretation.originalSourceZoning;unsupported[code]=(unsupported[code]??0)+1;const b=unsupportedGroups[code]??{addresses:new Set(),parcels:new Set(),footprints:new Set()};b.addresses.add(r.addressId);if(r.parcelId!==null)b.parcels.add(r.parcelId);r.footprintSha256.forEach(x=>b.footprints.add(x));unsupportedGroups[code]=b;}
  for(const o of r.interpretation.overlays){const key=`${o.code}|${r.interpretation.base.state==='identified'?r.interpretation.base.code:r.interpretation.base.state}`;const bucket=overlays[key]??{addresses:0,parcelIds:new Set(),geometryGroups:new Set(),primary:0,secondaryOnly:0,boundaryContactAddresses:0};bucket.addresses++;if(r.parcelId!==null)bucket.parcelIds.add(r.parcelId);r.footprintSha256.forEach(x=>bucket.geometryGroups.add(x));if(r.ncodContacts.some(f=>f.overlayCode===o.code&&f.relation==='primary'&&f.contact==='positive_area'))bucket.primary++;else bucket.secondaryOnly++;if(r.ncodContacts.some(f=>f.overlayCode===o.code&&f.contact==='boundary_only'))bucket.boundaryContactAddresses++;overlays[key]=bucket;}
  for(const code of new Set(r.ncodContacts.map(c=>c.overlayCode))){const b=subtypes[code]??{addresses:new Set(),parcels:new Set(),footprints:new Set(),primary:new Set(),secondary:new Set()};b.addresses.add(r.addressId);if(r.parcelId!==null)b.parcels.add(r.parcelId);r.footprintSha256.forEach(x=>b.footprints.add(x));r.ncodContacts.filter(c=>c.overlayCode===code&&c.contact==='positive_area').forEach(c=>b[c.relation].add(r.addressId));subtypes[code]=b;}
  for(const key of new Set(r.ncodContacts.map(c=>`${c.overlayCode}|${c.overlayBaseCode}`))){const b=sourceBaseCensus[key]??{addresses:new Set(),parcels:new Set(),footprints:new Set()};b.addresses.add(r.addressId);if(r.parcelId!==null)b.parcels.add(r.parcelId);r.footprintSha256.forEach(x=>b.footprints.add(x));sourceBaseCensus[key]=b;}
  for(const h of r.interpretation.holds)exceptions[h.code]=(exceptions[h.code]??0)+1;
 }
 const sizes=table=>Object.fromEntries(Object.entries(table).sort().map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([field,ids])=>[field,ids.size]))]));
 return {unsupportedSourcePrimaryGroups:sizes(unsupportedGroups),ncodSubtypeTotals:sizes(subtypes),ncodSourceBaseCensus:sizes(sourceBaseCensus),profiles:rows.length,priorApprovals:approvals,unapprovedReview:review,unexpectedApprovedNcod:unexpected,unsupportedSourcePrimary:unsupported,overlayCensus:Object.fromEntries(Object.entries(overlays).sort().map(([k,v])=>[k,{...v,parcelIds:v.parcelIds.size,geometryGroups:v.geometryGroups.size}])),exceptionOccurrences:exceptions,overlayAddresses:rows.filter(r=>r.interpretation.overlays.length).length,ncodContactAddresses:rows.filter(r=>r.ncodContacts.length).length,primaryPositiveNcodAddresses:rows.filter(r=>r.ncodContacts.some(f=>f.relation==='primary'&&f.contact==='positive_area')).length,secondaryPositiveNcodAddresses:rows.filter(r=>r.ncodContacts.some(f=>f.relation==='secondary'&&f.contact==='positive_area')).length,secondaryOnlyPositiveNcodAddresses:rows.filter(r=>r.ncodContacts.some(f=>f.relation==='secondary'&&f.contact==='positive_area')&&!r.ncodContacts.some(f=>f.relation==='primary'&&f.contact==='positive_area')).length,boundaryOnlyNcodAddresses:rows.filter(r=>r.ncodContacts.some(f=>f.contact==='boundary_only')).length,multipleOverlayAddresses:rows.filter(r=>r.interpretation.overlays.length>1).length,baseConflicts:rows.filter(r=>r.interpretation.base.state==='conflicting').length,inventoryIncomplete:rows.filter(r=>r.interpretation.overlayInventory.state!=='complete_for_source').length,newApprovals:0,newEvaluatorFacts:0};
}
export async function run(source,approved,archive,out){
 [source,approved,archive,out]=[source,approved,archive,out].map(p=>path.resolve(p));assert.ok(![source,approved].some(p=>out===p||out.startsWith(p+path.sep)));try{await access(out);throw Error('Fresh output required');}catch(e){if(e.code!=='ENOENT')throw e;}
 const inputs=await loadInputs(source,approved,archive);await mkdir(out,{recursive:true});
 await promisify(execFile)('python3',[path.join(ROOT,'scripts/gis/measure-clearwater-zoning-interpretation.py'),source,path.join(out,'parcel-evidence.json')],{maxBuffer:1048576});
 const geometry=await json(path.join(out,'parcel-evidence.json')),byParcel=new Map(),human=new Map(),addressLinks=new Map(geometry.addresses.map(a=>[a.addressId,a]));for(const p of geometry.parcels){const xs=byParcel.get(p.parcelId)??[];xs.push(p);byParcel.set(p.parcelId,xs);}for(const h of inputs.human){const xs=human.get(h.parcelId)??[];xs.push(h);human.set(h.parcelId,xs);}
 const result=inputs.rows.map(r=>interpretAddress(r,byParcel.get(String(r.parcelIdentifier))??[],inputs.identities,inputs.registry,human.get(String(r.parcelIdentifier))??[],addressLinks.get(r.sourceAddressIdentifier))).sort((a,b)=>a.addressId-b.addressId);
 const audit=census(result);assert.equal(audit.profiles,63430);assert.deepEqual(audit.priorApprovals,{'CLR-Z-002':262,'CLR-Z-001':1967,'CLR-Z-004':364,'CLR-Z-003':731});assert.equal(audit.unapprovedReview,17014);assert.equal(audit.unexpectedApprovedNcod,0);
 const write=(name,v)=>writeFile(path.join(out,name),JSON.stringify(v,null,2)+'\n');
 await writeFile(path.join(out,'interpreted-addresses.jsonl'),result.map(r=>JSON.stringify(r)).join('\n')+'\n');
 await write('census.json',audit);await write('exceptions.json',result.filter(r=>r.interpretation.holds.length).map(r=>({addressId:r.addressId,displayAddress:r.displayAddress,parcelId:r.parcelId,holds:r.interpretation.holds})));
 await write('secondary-ncod.json',result.filter(r=>r.ncodContacts.some(f=>f.relation==='secondary')).map(r=>({addressId:r.addressId,displayAddress:r.displayAddress,parcelId:r.parcelId,sourcePrimary:r.interpretation.originalSourceZoning,contacts:r.ncodContacts,base:r.interpretation.base,holds:r.interpretation.holds})));
 await write('human-evidence.json',inputs.human);await write('mapping-registry.json',inputs.registry);
 const provenance={sourceReleaseUrl:inputs.manifest.releaseAssetUrl,schemaVersion:1,stage:'B_OFFLINE_IDENTITY_ONLY',snapshotId:inputs.manifest.snapshotId,archive:await digest(archive),baselineLookup:await digest(path.join(approved,'clearwater-approved-address-lookup.jsonl')),mappingHash:stageA.zoningEvidenceHash(inputs.registry),sourceFiles:inputs.verified.verification,geometryMethod:geometry.method,geometryHashMethod:'SHA256 normalized Shapely WKB; representation proxy, not legal ownership',scripts:{}};
 for(const name of ['scripts/gis/interpret-clearwater-zoning.mjs','scripts/gis/verify-clearwater-zoning-interpretation.mjs','scripts/gis/measure-clearwater-zoning-interpretation.py','lib/properties/zoning-interpretation.ts','lib/properties/types.ts'])provenance.scripts[name]=await digest(path.join(ROOT,name));
 await write('provenance.json',provenance);
 await writeFile(path.join(out,'report.md'),`# NCOD Stage B offline interpretation\n\n${audit.profiles} profiles; ${Object.values(audit.priorApprovals).reduce((a,b)=>a+b,0)} prior approvals unchanged; ${audit.unapprovedReview} unapproved REVIEW unchanged.\n\nSource identity only. All legal overlay applicability and new project readiness remain unresolved; no facts or approvals emitted. Planar supplemental percentages do not replace frozen diagnostics or legal boundaries.\n\n\`\`\`json\n${JSON.stringify(audit,null,2)}\n\`\`\`\n`);
 const checks={};for(const name of ['interpreted-addresses.jsonl','parcel-evidence.json','census.json','exceptions.json','secondary-ncod.json','human-evidence.json','mapping-registry.json','provenance.json','report.md'])checks[name]=await digest(path.join(out,name));await write('checksums.json',checks);console.log(JSON.stringify(audit));return audit;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)await run(...process.argv.slice(2));
