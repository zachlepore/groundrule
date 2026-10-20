import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretAddress,census,stageA,contextFor} from '../scripts/gis/interpret-clearwater-zoning.mjs';
import {readFile} from 'node:fs/promises';
const registry=stageA.getClearwaterZoningRegistry();
const fixtures=JSON.parse(await readFile(new URL('./fixtures/clearwater-ncod-source-features.json',import.meta.url)));
const identities=new Map(fixtures.map(f=>[f.properties.OBJECTID,stageA.resolveExactZoningMapping(contextFor(f,registry))]));
const cr=fixtures.find(f=>f.properties.ZONING==='LMDR-NCOD Coachman R');
const ie=fixtures.find(f=>f.properties.ZONING==='HDR-NCOD Island Est');
const row=(overrides={})=>({sourceAddressIdentifier:1,parcelIdentifier:'unit-1',zoningCode:'LMDR',zoningSourceIdentifier:100,normalizedJurisdiction:'clearwater',status:'review',issues:['parcel_ambiguous_zoning'],approvedPrimaryGuidance:{status:'NO_NEW_APPROVAL'},...overrides});
const feature=(f,contact='positive_area')=>({sourceIdentifier:f.properties.OBJECTID,rawZoningCode:f.properties.ZONING,geometryValid:true,contact,percentOfParcelPlanar:1});
const parcel=(features)=>[{parcelId:'unit-1',footprintSha256:'a'.repeat(64),parcelGeometryValid:true,features,errors:[]}];
test('secondary NCOD is identified even when primary ordinary LMDR',()=>{
 const r=interpretAddress(row(),parcel([feature(cr)]),identities,registry);assert.equal(r.interpretation.overlays[0].code,'CRNCOD');assert.equal(r.ncodContacts[0].relation,'secondary');assert.equal(r.interpretation.overlays[0].applicability,'unknown');assert.equal(r.interpretation.originalSourceZoning,'LMDR');
});
test('boundary contact is retained separately from positive area and legal applicability',()=>{
 const r=interpretAddress(row(),parcel([feature(cr,'boundary_only')]),identities,registry);assert.equal(r.ncodContacts[0].contact,'boundary_only');assert.equal(r.interpretation.overlays[0].applicability,'unknown');assert.equal(census([r]).secondaryPositiveNcodAddresses,0);
});
test('multiple overlays and base conflicts remain unresolved',()=>{
 const r=interpretAddress(row(),parcel([feature(cr),feature(ie)]),identities,registry);assert.equal(r.interpretation.overlays.length,2);assert.deepEqual(r.interpretation.base.candidates,['HDR','LMDR']);assert.equal(r.interpretation.base.state,'conflicting');assert.equal(r.interpretation.projectReadiness.fence.designation,'unresolved');
});
test('missing parcel links and null source classification remain unknown',()=>{
 const r=interpretAddress(row({zoningCode:null,parcelIdentifier:null}),[],identities,registry);assert.equal(r.interpretation.base.state,'unknown');assert.equal(r.interpretation.originalSourceZoning,null);assert.equal(r.interpretation.overlayInventory.state,'unknown');assert.ok(r.interpretation.holds.some(h=>h.code==='missing_parcel_link'));
});
test('condominium footprints preserve unit/address and source evidence hashes',()=>{
 const p=parcel([feature(cr)]),a=interpretAddress(row(),p,identities,registry),b=interpretAddress(row({sourceAddressIdentifier:2,parcelIdentifier:'unit-2'}),p,identities,registry);
 assert.notEqual(a.addressId,b.addressId);assert.notEqual(a.parcelId,b.parcelId);assert.deepEqual(a.footprintSha256,b.footprintSha256);assert.notEqual(a.originalProfileSha256,b.originalProfileSha256);
});
test('human holds and original QA retained without input mutation',()=>{
 const original=row({issues:['unsupported_zoning_code','parcel_ambiguous_zoning']});const before=structuredClone(original);
 const r=interpretAddress(original,parcel([feature(cr)]),identities,registry,[{parcelId:'unit-1',caseId:'case-1',humanReview:{reviewStatus:'human_staff_review'}}]);
 assert.deepEqual(original,before);assert.deepEqual(r.originalSourceQa.issues,original.issues);assert.ok(r.interpretation.holds.some(h=>h.kind==='human'&&h.code==='human_staff_review'));
});
test('invalid or unmeasurable geometry does not certify complete inventory',()=>{
 const p=parcel([feature(cr,'uncertain')]);p[0].errors=['intersection_error'];p[0].parcelGeometryValid=false;
 const r=interpretAddress(row(),p,identities,registry);assert.equal(r.interpretation.overlayInventory.state,'unknown');assert.ok(r.interpretation.holds.some(h=>h.code==='unmeasurable_zoning_intersection'));
});
test('unknown composite is not converted by prefix or suffix parsing',()=>{
 const r=interpretAddress(row({zoningCode:'LMDR-NCOD NEW'}),parcel([{rawZoningCode:'LMDR-NCOD NEW',sourceIdentifier:999,contact:'positive_area',geometryValid:true}]),identities,registry);assert.equal(r.interpretation.base.state,'unknown');assert.equal(r.interpretation.overlayInventory.state,'unknown');assert.ok(r.interpretation.holds.some(h=>h.code==='unsupported_source_district'));
});
test('no approvals, trusted facts or legal findings are produced',()=>{
 const r=interpretAddress(row({approvedPrimaryGuidance:{status:'GUIDANCE_READY_APPROVED',ruleId:'CLR-Z-001',notice:'KEEP'}}),parcel([]),identities,registry);assert.equal(r.existingApproval.status,'GUIDANCE_READY_APPROVED');assert.equal(r.priorApprovalSha256,stageA.zoningEvidenceHash({status:'GUIDANCE_READY_APPROVED',ruleId:'CLR-Z-001',notice:'KEEP'}));assert.ok(!('evaluatorFacts' in r));assert.ok(!('approvedPrimaryGuidance'in r));assert.equal(r.interpretation.overlayInventory.legalApplicabilityConfirmed,false);
});
test('empty overlay inventory never asserts no legal overlay',()=>{
 const r=interpretAddress(row(),parcel([]),identities,registry);assert.deepEqual(r.interpretation.overlays,[]);assert.equal(r.interpretation.overlayInventory.legalApplicabilityConfirmed,false);assert.equal(r.interpretation.projectReadiness.fence.designation,'unresolved');
});
test('source and mapping mismatches rejected before interpretation',()=>{
 for(const key of ['snapshotId','jurisdiction','registryVersion','zoningFileSha256']){const c=contextFor(cr,registry);c[key]='wrong';assert.equal(stageA.resolveExactZoningMapping(c).state,'unsupported');}
 const modified=structuredClone(registry);modified.entries[0].baseCode='HDR';assert.throws(()=>stageA.validateZoningRegistry(modified));
});
test('deterministic same input metadata and census; approval overlap is explicit',()=>{
 const r=row(),p=parcel([feature(cr)]);assert.deepEqual(interpretAddress(r,p,identities,registry),interpretAddress(r,p,identities,registry));
 const approved=interpretAddress(row({approvedPrimaryGuidance:{status:'GUIDANCE_READY_APPROVED',ruleId:'CLR-Z-001'}}),p,identities,registry);assert.equal(census([approved]).unexpectedApprovedNcod,1);
});
test('address-level link holds remain distinct on shared footprints',()=>{
 const p=parcel([feature(cr)]),r=interpretAddress(row(),p,identities,registry,[],{addressId:1,addressInsideLinkedParcel:false});
 assert.ok(r.interpretation.holds.some(h=>h.code==='address_point_outside_linked_parcel'));
 const other=interpretAddress(row({sourceAddressIdentifier:2}),p,identities,registry,[],{addressId:2,addressInsideLinkedParcel:true});
 assert.ok(!other.interpretation.holds.some(h=>h.code==='address_point_outside_linked_parcel'));
});
test('input verification rejects a mismatched archive before source processing',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const {loadInputs}=await import('../scripts/gis/interpret-clearwater-zoning.mjs');const dir=await mkdtemp(path.join(tmpdir(),'ncod-bad-source-'));
 try{await writeFile(path.join(dir,'source.zip'),'not the source release');await assert.rejects(loadInputs(dir,dir,path.join(dir,'source.zip')));}finally{await rm(dir,{recursive:true,force:true});}
});
