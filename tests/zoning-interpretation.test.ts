import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import features from "./fixtures/clearwater-ncod-source-features.json";
import { getClearwaterZoningRegistry, resolveExactZoningMapping, interpretSourceZoning, validateZoningInterpretation, validateZoningRegistry, validateInterpretationRegistryCompatibility, zoningEvidenceHash, canonicalZoningJson } from "../lib/properties/zoning-interpretation";
import type { SourceFeature, SourceMappingContext } from "../lib/properties/zoning-interpretation";
const registry = getClearwaterZoningRegistry();
const context = (index = 0): SourceMappingContext => {
 const e = registry.entries[index];
 return { jurisdiction: registry.jurisdiction, snapshotId: registry.snapshotId, registryVersion: registry.registryVersion, archiveSha256: registry.archiveSha256, zoningFileSha256: registry.zoningFileSha256, originalSourceZoning: e.originalSourceCode, feature: structuredClone(features.find(f => f.properties.OBJECTID === e.sourcePolygons[0].OBJECTID)) as SourceFeature };
};
const refs = { spatialEvidenceRef: "existing-geometry", sourceQaRef: "original-profile", holds: [{ kind: "human" as const, code: "retain_hold", evidenceRefs: ["review#1"] }] };
const document = () => interpretSourceZoning(context(), refs);
for (let i = 0; i < 8; i++) test(`exact mapping ${registry.entries[i].originalSourceCode}`, () => {
 const ctx = context(i), before = structuredClone(ctx), r = resolveExactZoningMapping(ctx);
 assert.equal(r.state, "identified"); if (r.state !== "identified") throw Error();
 assert.equal(r.entry.baseCode, registry.entries[i].baseCode); assert.deepEqual(r.entry.overlay, registry.entries[i].overlay);
 const d = interpretSourceZoning(ctx, refs); validateZoningInterpretation(d);
 assert.equal(d.originalSourceZoning, ctx.originalSourceZoning); assert.equal(d.overlays.length, r.entry.overlay ? 1 : 0);
 assert.equal(d.overlayInventory.state, "unknown"); assert.equal(d.projectReadiness.fence.designation, "unresolved");
 assert.deepEqual(ctx, before); assert.deepEqual(d.holds, refs.holds);
 if (r.entry.overlay) assert.equal(d.overlays[0].applicability, "unknown");
 else { assert.equal(r.entry.kind, "district"); assert.equal(d.base.state, "identified"); assert.equal(ctx.originalSourceZoning, "OS/R"); }
});
test("all registry polygon IDs unique and citations/evidence present", () => {
 const ids=registry.entries.flatMap(e=>e.sourcePolygons.map(p=>p.OBJECTID)); assert.equal(new Set(ids).size,ids.length);
 for(const e of registry.entries) { assert.ok(e.citationIds.length);for(const p of e.sourcePolygons)assert.match(p.featureSha256,/^[a-f0-9]{64}$/); }
});
for (const key of ["jurisdiction", "snapshotId", "registryVersion", "archiveSha256", "zoningFileSha256"] as const) test(`reject wrong ${key}`, () => {
 const c=context();c[key]="wrong";assert.equal(resolveExactZoningMapping(c).state,"unsupported");assert.throws(()=>interpretSourceZoning(c,refs));
});
for (const raw of ["LMDR", "lmdr-ncod coachman r", "LMDR-NCOD Coachman R ", "LMDR-NCOD Unknown"]) test(`no alias: ${raw}`,()=>{
 const c=context();c.originalSourceZoning=raw;assert.equal(resolveExactZoningMapping(c).state,"unsupported");
});
for (const key of ["OBJECTID","ZONING","ZONING_DESC","SPECIAL"]) test(`reject altered ${key}`,()=>{
 const c=context();c.feature.properties[key]="changed";assert.equal(resolveExactZoningMapping(c).state,"conflicting");
});
test("reject changed geometry and extra feature attribute",()=>{
 for(const mutation of [(c:SourceMappingContext)=>c.feature.geometry=null,(c:SourceMappingContext)=>c.feature.properties.extra="changed"]){const c=context();mutation(c);assert.equal(resolveExactZoningMapping(c).state,"conflicting");}
});
test("reject contradictory or modified registry despite matching caller version",()=>{
 const r=structuredClone(registry);r.entries[0].baseCode="LMDR";assert.throws(()=>validateZoningRegistry(r));assert.throws(()=>resolveExactZoningMapping(context(),r));
 const r2=structuredClone(registry);r2.entries.push(r2.entries[0]);assert.throws(()=>validateZoningRegistry(r2));
});
test("unknown is distinct from explicit absence; absent requires separate evidence",()=>{
 const d=document(); assert.equal(d.overlays[0].applicability,"unknown");d.overlays[0].applicability="absent";assert.throws(()=>validateZoningInterpretation(d));
 d.overlays[0].applicabilityEvidence={refs:["separate-reviewed-absence"],sha256:"a".repeat(64)};validateZoningInterpretation(d);
 d.overlays=[];validateZoningInterpretation(d);assert.equal(d.overlayInventory.state,"unknown");
});
test("multiple overlays and conflicting base are retained without selecting a winner",()=>{
 const d=document();d.overlays.push({...structuredClone(d.overlays[0]),code:"SECOND",name:"Separate overlay",type:"OTHER"});
 d.base={state:"conflicting",candidates:["LMDR","HDR"],evidence:d.base.evidence};d.overlayInventory.state="conflicting";validateZoningInterpretation(d);
 assert.equal(d.projectReadiness.fence.designation,"unresolved");d.overlays.push(structuredClone(d.overlays[0]));assert.throws(()=>validateZoningInterpretation(d));
});
test("unknown base, incomplete inventory and project-specific ambiguous readiness",()=>{
 const d=document();d.base={state:"unknown",evidence:d.base.evidence};d.projectReadiness.shed={designation:"ambiguous",reasons:["unsupported_overlay_project"]};validateZoningInterpretation(d);
 d.overlayInventory.state="complete_for_source";validateZoningInterpretation(d);assert.equal(d.overlayInventory.legalApplicabilityConfirmed,false);
});
test("verified applicability needs verified identity and distinct evidence",()=>{
 const d=document();d.overlays[0].applicability="verified";assert.throws(()=>validateZoningInterpretation(d));d.overlays[0].applicabilityEvidence={refs:["legal-review"],sha256:"b".repeat(64)};validateZoningInterpretation(d);d.overlays[0].mappingState="unknown";assert.throws(()=>validateZoningInterpretation(d));
});
test("canonical hash is deterministic under object order; arrays retain order",()=>{
 assert.equal(zoningEvidenceHash({b:2,a:1}),zoningEvidenceHash({a:1,b:2}));assert.notEqual(zoningEvidenceHash([1,2]),zoningEvidenceHash([2,1]));
 assert.deepEqual(document(),document());for(const x of [undefined,NaN,Infinity,new Date(),{a:undefined}])assert.throws(()=>canonicalZoningJson(x));
});
test("defensive copies prevent caller mutation of registry, evidence and holds",()=>{
 const r=getClearwaterZoningRegistry();r.entries[0].baseCode="WRONG";assert.notEqual(getClearwaterZoningRegistry().entries[0].baseCode,"WRONG");
 const d=document();d.holds[0].code="changed";d.overlays[0].provisionRefs.push("changed");assert.equal(refs.holds[0].code,"retain_hold");assert.deepEqual(document().overlays[0].provisionRefs,registry.entries[0].citationIds);
});
test("strict structure rejects approvals, facts, ready states, missing and malformed evidence",()=>{
 for(const [key,value] of [["evaluatorFacts",{}],["approvedPrimaryGuidance",{}],["guidanceReady",true]])assert.throws(()=>validateZoningInterpretation({...document(),[key as string]:value}));
 const d=document() as unknown as Record<string,unknown>;d.projectReadiness={fence:{designation:"GUIDANCE_READY_APPROVED",reasons:["wrong"]}};assert.throws(()=>validateZoningInterpretation(d));
 const bad=document();bad.sourceIdentity.mappingSha256="bad";assert.throws(()=>validateZoningInterpretation(bad));
 const bad2=document();bad2.base.evidence.refs=[];assert.throws(()=>validateZoningInterpretation(bad2));
 const serialized=JSON.stringify(document());assert.ok(!serialized.includes('"evaluatorFacts"'));assert.ok(!serialized.includes('"approvalId"'));assert.ok(!serialized.includes('GUIDANCE_READY'));
});

test("interpretation compatibility rejects modified source identity, base and overlay",()=>{
 for(const mutate of [
  (d:ReturnType<typeof document>)=>{d.interpretationVersion="wrong";},
  (d:ReturnType<typeof document>)=>{d.sourceIdentity.mappingSha256="a".repeat(64);},
  (d:ReturnType<typeof document>)=>{d.jurisdiction="wrong";},
  (d:ReturnType<typeof document>)=>{d.base={state:"identified",code:"HDR",evidence:d.base.evidence};},
  (d:ReturnType<typeof document>)=>{d.overlays=[];}
 ]){const d=document();mutate(d);assert.throws(()=>validateInterpretationRegistryCompatibility(d));}
 validateInterpretationRegistryCompatibility(document());assert.throws(()=>canonicalZoningJson(new Array(2)));
});

test("registry matches independently researched identities and citation evidence",()=>{
 const expected:Record<string,[string,string|null]>={
  "HDR-NCOD Island Est":["HDR","IENCOD"],"LMDR-NCOD Island Est":["LMDR","IENCOD"],
  "MHDR-NCOD Island Est":["MHDR","IENCOD"],"MDR-NCOD Island Est":["MDR","IENCOD"],
  "I-NCOD Island Est":["I","IENCOD"],"LMDR-NCOD Coachman R":["LMDR","CRNCOD"],
  "LDR-NCOD Coachman R":["LDR","CRNCOD"],"OS/R":["OSR",null]
 };
 assert.equal(registry.entries.length,8);
 for(const e of registry.entries)assert.deepEqual([e.baseCode,e.overlay?.code??null],expected[e.originalSourceCode]);
 const bytes=readFileSync(new URL("../research/gis/rule005-regulatory-evidence.v1.json",import.meta.url));
 assert.equal(createHash("sha256").update(bytes).digest("hex"),registry.regulatoryEvidenceSha256);
 const research=JSON.parse(bytes.toString());
 for(const e of registry.entries){const source=research.exactCodeEvidenceCrosswalk.find((x:{exactSourceCode:string})=>x.exactSourceCode===e.originalSourceCode);assert.ok(source);
  assert.deepEqual(e.citationIds,[source.codeCitationId]);assert.equal(e.baseCode,source.sourceDescribedBaseDistrict);
  assert.deepEqual(e.sourcePolygons.map(({featureSha256,...attrs})=>{assert.match(featureSha256,/^[a-f0-9]{64}$/);return attrs;}),source.sourcePolygons);
 }
});
