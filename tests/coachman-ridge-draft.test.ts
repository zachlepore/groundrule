import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildBaseDraft, buildCoachmanDraft, bundleDocument, evaluateDraft, sha256, verifyEvidence } from "../scripts/rules/coachman-ridge";
import { getClearwaterZoningRegistry } from "../lib/properties/zoning-interpretation";
import { evaluateLoadedRuleSet } from "../lib/rules/evaluate";
import { buildClearwaterFenceGuide } from "../lib/guides/fence";
import type { EvaluationResult, Facts } from "../lib/rules/types";
const draft = buildCoachmanDraft();
const base = buildBaseDraft();
export const ordinary: Facts = {
  "property.zoning_district": "lmdr", "property.overlay.crncod.applicability": "absent",
  "project.structure_type": "fence", "project.location_zone": "front", "project.is_chain_link": false,
  "project.material": "wood", "project.height": 4, "project.is_opaque": false, "project.is_wire_fence": false,
  "fence.between_front_building_and_property_line": true, "fence.between_side_building_and_street_property_line": false,
  "property.is_water_adjacent": false, "property.is_recreational_facility": false, "property.is_public_landbank": false,
  "property.has_principal_structure": true, "property.is_vacant_lot": false,
  "property.is_residential_subdivision_perimeter": false, "project.landscape_strip_waived": false,
};
const cr = (more: Facts = {}): Facts => ({ ...ordinary, "property.overlay.crncod.applicability": "verified", ...more });
export const rows = (r: EvaluationResult) => [...r.matchedRules, ...r.notMatchedRules, ...r.unknownRules, ...r.reviewRequiredRules].sort((a,b) => a.key.localeCompare(b.key));
const get = (r: EvaluationResult, key: string) => { const row = rows(r).find(r => r.key === key); assert.ok(row, key); return row; };
const evaluate = (facts: Facts) => evaluateDraft(draft, facts);

test("source bytes, excerpts, lifecycle, SQL snapshot and draft schema states verify", () => {
  verifyEvidence(); execFileSync("python3", ["scripts/rules/extract-coachman-baseline.py", "--check"]);
  const doc = bundleDocument(); assert.equal(doc.metadata.active, false); assert.equal(doc.metadata.currentLawVerified, false);
  assert.equal(doc.schemaMapping.ruleVersions.lifecycleStatus, "withdrawn"); assert.equal(doc.schemaMapping.ruleVersions.researchStatus, "draft");
  assert.equal(doc.schemaMapping.rules.activeVersionId, null); assert.equal(doc.metadata.legalEffectiveFrom, null);
});
test("repeat builds serialize identically without timestamps or random IDs", () => assert.equal(sha256(JSON.stringify(bundleDocument())), sha256(JSON.stringify(bundleDocument()))));
test("ordinary LMDR effective generic results, citations and Guide are unchanged", () => {
  const before = evaluateDraft(base, ordinary), after = evaluate(ordinary);
  const effective = (r: ReturnType<typeof rows>[number]) => { const { relationships: _edges, ...rest } = r; void _edges; return rest; };
  assert.deepEqual(rows(after).filter(r => !r.key.startsWith("crncod.")).map(effective), rows(before).map(effective));
  assert.deepEqual(buildClearwaterFenceGuide(after, ordinary), buildClearwaterFenceGuide(before, ordinary));
});
test("verified LMDR interval prohibits and suppresses the raw TRUE generic maximum", () => {
  const result = evaluate(cr()); const generic = get(result, "height.front_baseline");
  assert.equal(generic.rawStatus, "MATCHED"); assert.equal(generic.truth, "TRUE"); assert.equal(generic.resolution?.state, "suppressed"); assert.deepEqual(generic.outcomes, []);
  assert.ok(generic.rawOutcomes?.length); assert.equal(get(result, "crncod.lmdr_interval_prohibition").status, "MATCHED");
  assert.ok(generic.resolution?.citations.some(c => c.sectionIdentifier === "2-1601.J.2.b"));
});
for (const material of ["chain_link", "vinyl_coated_chain_link"]) test(`${material} prohibited; generic coated and uncoated height pathways withheld`, () => {
  const r = evaluate(cr({ "project.material": "chain_link", "project.is_chain_link": true, "project.location_zone": "rear", "project.vinyl_color": material === "chain_link" ? "none" : "green", "fence.between_front_building_and_property_line": false }));
  assert.equal(get(r, "crncod.chain_link_prohibition").status, "MATCHED");
  assert.equal(get(r, material === "chain_link" ? "chain_link.side_rear_base_height" : "chain_link.side_rear_vinyl_height").resolution?.state, "suppressed");
});
test("vinyl color never provides an exception to CR chain-link prohibition", () => {
  for (const color of ["green", "black", "white"]) assert.equal(get(evaluate(cr({"project.is_chain_link":true,"project.material":"chain_link","project.vinyl_color":color})), "crncod.chain_link_prohibition").status,"MATCHED");
});
test("LMDR street-side interval overrides an otherwise TRUE ordinary side maximum", () => {
  const r=evaluate(cr({"project.location_zone":"side","fence.between_front_building_and_property_line":false,"fence.between_side_building_and_street_property_line":true}));
  assert.equal(get(r,"height.side_rear_baseline").rawStatus,"MATCHED"); assert.equal(get(r,"height.side_rear_baseline").resolution?.state,"suppressed");
  assert.equal(get(r,"crncod.lmdr_interval_prohibition").status,"MATCHED");
});
test("LDR is distinct: three feet/nonopaque plus discretionary compatibility, never LMDR prohibition",()=>{
  const r=evaluate(cr({"property.zoning_district":"ldr","project.height":3}));
  assert.equal(get(r,"crncod.lmdr_interval_prohibition").status,"NOT_MATCHED");
  assert.equal(get(r,"crncod.ldr_interval_height").outcomes[0].parameters.value,3);
  assert.equal(get(r,"crncod.ldr_interval_opacity").outcomes[0].parameters.value,false);
  assert.equal(get(r,"crncod.ldr_compatibility_review").status,"REVIEW_REQUIRED");
  assert.equal(get(r,"crncod.ldr_pathway_assessment").status,"UNKNOWN");
  assert.ok(r.missingInputs.some(i=>i.key==="project.crncod_architectural_compatibility_confirmed" && !i.userInputAllowed));
});
test("even completed LDR compatibility does not become automatic permission",()=>{
  const r=evaluate(cr({"property.zoning_district":"ldr","project.height":3,"project.crncod_architectural_compatibility_confirmed":true}));
  assert.equal(get(r,"crncod.ldr_pathway_assessment").status,"REVIEW_REQUIRED");
  assert.equal(get(r,"height.front_baseline").outcomes.length,0);
});
test("LDR over-height or opaque proposals fail the conditional pathway",()=>{
  for(const more of [{"project.height":3.0001},{"project.is_opaque":true}]) {
    const r=evaluate(cr({"property.zoning_district":"ldr","project.crncod_architectural_compatibility_confirmed":true,...more}));
    assert.equal(get(r,"crncod.ldr_pathway_assessment").status,"NOT_MATCHED");
    assert.equal(get(r,"crncod.ldr_compatibility_review").status,"REVIEW_REQUIRED");
  }
});
test("missing LDR height/opacity remains UNKNOWN and asks the necessary question",()=>{
  for (const key of ["project.height","project.is_opaque"]) {const f=cr({"property.zoning_district":"ldr","project.height":3});delete f[key];const r=evaluate(f);assert.equal(get(r,"crncod.ldr_pathway_assessment").status,"UNKNOWN");assert.ok(r.missingInputs.some(i=>i.key===key));}
});
test("non-street side/rear retains Division 8 height and independent duties",()=>{
  const r=evaluate(cr({"project.location_zone":"rear","fence.between_front_building_and_property_line":false,"fence.between_side_building_and_street_property_line":false}));
  assert.equal(get(r,"height.side_rear_baseline").status,"MATCHED");assert.equal(get(r,"height.side_rear_baseline").outcomes[0].parameters.value,6);
  assert.equal(get(r,"crncod.side_rear_general").status,"MATCHED");
});
for(const state of [undefined,"unknown","conflicting"]) test(`overlay ${state} leaves generic permission pending, never treats missing/conflict as absence`,()=>{
  const r=evaluate({...ordinary,"property.overlay.crncod.applicability":state});
  assert.equal(get(r,"height.front_baseline").resolution?.state,"pending");assert.equal(get(r,"height.front_baseline").outcomes.length,0);
});
test("GIS composite source identity alone is not legal overlay applicability",()=>{
  const f: Facts={...ordinary,"property.source_zoning":"LMDR-NCOD Coachman R"};delete f["property.overlay.crncod.applicability"];
  assert.equal(get(evaluate(f),"height.front_baseline").resolution?.state,"pending");
});
test("missing both building-line positions withholds generic maximum and prompts",()=>{
  const f=cr();delete f["fence.between_front_building_and_property_line"];delete f["fence.between_side_building_and_street_property_line"];
  const r=evaluate(f); assert.equal(get(r,"height.front_baseline").resolution?.state,"pending");assert.ok(r.missingInputs.some(i=>i.key.startsWith("fence.between_")));
});
test("a known prohibited front interval is decisive despite an unknown side interval",()=>{
  const f=cr();delete f["fence.between_side_building_and_street_property_line"];assert.equal(get(evaluate(f),"crncod.lmdr_interval_prohibition").status,"MATCHED");
});
test("another base district leaves ordinary rules unchanged and does not grant CR readiness",()=>{
  const f=cr({"property.zoning_district":"mdr"});const r=evaluate(f);assert.equal(get(r,"height.front_baseline").status,"MATCHED");assert.equal(get(r,"crncod.lmdr_interval_prohibition").status,"NOT_MATCHED");
});
test("wire requirement cannot recommend chain-link as a CR compliance workaround",()=>{
  const r=evaluate(cr({"project.is_wire_fence":true}));assert.equal(get(r,"material.wire_chain_link_required").resolution?.state,"suppressed");
});
test("public-landbank mixed outcomes are atomic; prohibition withdraws permission and exemption",()=>{
  const r=evaluate(cr({"project.is_chain_link":true,"project.material":"chain_link","property.is_public_landbank":true}));
  for(const n of [1,2,3])assert.equal(get(r,`chain_link.public_landbank.atomic_${n}`).resolution?.state,"suppressed");
});
test("recreation exemption cannot undo the overlay material ban",()=>{
  const r=evaluate(cr({"project.is_chain_link":true,"project.material":"chain_link","property.is_recreational_facility":true}));assert.equal(get(r,"chain_link.recreation_exemption").resolution?.state,"suppressed");assert.equal(get(r,"crncod.chain_link_prohibition").status,"MATCHED");
});
test("atomic subdivision override preserves independent approved-plan review",()=>{
  const r=evaluate(cr({"property.is_residential_subdivision_perimeter":true}));assert.equal(get(r,"subdivision.perimeter_height.atomic_1").resolution?.state,"suppressed");assert.notEqual(get(r,"subdivision.perimeter_height.atomic_2").resolution?.state,"suppressed");assert.ok(get(r,"subdivision.perimeter_height.atomic_2").outcomes.length);
});
test("independent access, visibility and material constraints are never blanket-suppressed",()=>{
  const r=evaluate(cr({"project.material":"sheet_metal","project.intersects_prohibited_access_area":true,"project.city_engineer_authorized":false}));assert.equal(get(r,"material.metal_prohibition").status,"MATCHED");assert.notEqual(get(r,"access.prohibited_area").resolution?.state,"suppressed");
});
test("source checksum, edition and endpoint version mismatches fail closed",()=>{
  for(const mutation of [(s:typeof draft)=>{s.relationships[6].sourceProvisionChecksum="0".repeat(64);},(s:typeof draft)=>{s.relationships[6].metadata.sourceEditionLabel="wrong";},(s:typeof draft)=>{s.relationships[6].metadata.toVersionNumber=2;}]){const s=structuredClone(draft);mutation(s);assert.throws(()=>evaluateDraft(s,cr()));}
});
test("missing endpoint, cycles and duplicate relationships fail closed",()=>{
  for(const mutation of [(s:typeof draft)=>{s.relationships[6].toRuleKey="missing";},(s:typeof draft)=>{s.relationships.push({...s.relationships[6],fromRuleKey:s.relationships[6].toRuleKey,toRuleKey:s.relationships[6].fromRuleKey});},(s:typeof draft)=>{s.relationships.push(structuredClone(s.relationships[6]));}]){const s=structuredClone(draft);mutation(s);assert.throws(()=>evaluateDraft(s,cr()));}
});
test("competing regulatory controllers are rejected rather than ordered",()=>{
  const s=structuredClone(draft);s.relationships.push({...s.relationships[6],fromRuleKey:"crncod.lmdr_interval_prohibition"});assert.throws(()=>evaluateDraft(s,cr()),/multiple unresolved or active controllers/);
});
test("reversing rules, relationships and facts retains identical effective outcomes",()=>{
  const s=structuredClone(draft);s.rules.reverse();s.relationships.reverse();assert.deepEqual(evaluateDraft(s,Object.fromEntries(Object.entries(cr()).reverse())),evaluate(cr()));
});
test("declared source citations and generic raw outcomes survive suppression",()=>{
  const r=evaluate(cr()), generic=get(r,"height.front_baseline");assert.equal(generic.citations[0].sectionIdentifier,"3-804");assert.equal(generic.rawOutcomes?.[0].parameters.value,4);assert.ok(generic.resolution?.citations.some(c=>c.sectionIdentifier==="3-803.A"));
});
test("contradictory material facts are not accepted by offline scenario adapter",()=>assert.throws(()=>evaluate(cr({"project.material":"chain_link","project.is_chain_link":false})),/Contradictory/));
test("draft evaluation does not mutate facts or bundle",()=>{const f=cr(),s=JSON.stringify(draft),before=JSON.stringify(f);evaluate(f);assert.equal(JSON.stringify(draft),s);assert.equal(JSON.stringify(f),before);});
test("fixed frozen baseline identities and approved lookup stay pinned",()=>{
  const document=bundleDocument();assert.equal(document.metadata.baselineLookupSha256,"a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739");
  assert.equal(getClearwaterZoningRegistry().schemaVersion, 1); // Validator enforces the Stage A canonical registry pin.
});
test("core engine consumes draft directly with existing three-valued relationships",()=>{
  assert.deepEqual(evaluateLoadedRuleSet(draft,{jurisdiction:"clearwater-fl",projectType:"fence",asOfDate:"2026-10-21",facts:cr()}),evaluate(cr()));
});
test("matching forged edge pins cannot substitute a different provision hash",()=>{const s=structuredClone(draft);s.relationships[6].sourceProvisionChecksum="f".repeat(64);s.relationships[6].metadata.sourceProvisionChecksum="f".repeat(64);assert.throws(()=>evaluateDraft(s,cr()),/Source-version/);});
test("altered overlay rule excerpts fail publication validation",()=>{const s=structuredClone(draft);s.rules.find(r=>r.key==="crncod.chain_link_prohibition")!.citations[0].excerpt="different law";assert.throws(()=>evaluateDraft(s,cr()),/source citation mismatch/);});
for(const more of [{"project.location_zone":"rear","fence.between_front_building_and_property_line":false},{"project.location_zone":"rear","project.is_chain_link":true,"project.material":"chain_link","project.vinyl_color":"green","fence.between_front_building_and_property_line":false},{"property.is_water_adjacent":true,"project.in_waterfront_protected_area":true}])test(`ordinary no-overlay fixture preserved: ${JSON.stringify(more)}`,()=>{const f={...ordinary,...more};const before=evaluateDraft(base,f),after=evaluate(f);const project=(r:ReturnType<typeof rows>[number])=>({key:r.key,status:r.status,truth:r.truth,outcomes:r.outcomes,citations:r.citations,resolution:r.resolution});assert.deepEqual(rows(after).filter(r=>!r.key.startsWith("crncod.")).map(project),rows(before).map(project));assert.deepEqual(buildClearwaterFenceGuide(after,f),buildClearwaterFenceGuide(before,f));});
test("attached-dwelling general height cannot imply an overlay interval exception",()=>{const r=evaluate(cr({"property.is_attached_dwelling_lot":true,"project.uniform_boundary_exception_approved":false}));assert.equal(get(r,"height.attached_dwelling").rawStatus,"REVIEW_REQUIRED");assert.equal(get(r,"height.attached_dwelling").resolution?.state,"suppressed");});
