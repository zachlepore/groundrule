/** Offline draft content only. No runtime imports, database client or publication path. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import baseline from "../../research/rules/coachman-ridge-v1/base-seed.json";
import evidence from "../../research/rules/coachman-ridge-v1/evidence.json";
import { getClearwaterZoningRegistry, zoningEvidenceHash } from "../../lib/properties/zoning-interpretation";
import { conditionFactKeys } from "../../lib/rules/condition";
import { evaluateLoadedRuleSet } from "../../lib/rules/evaluate";
import { validatePrecedence } from "../../lib/rules/precedence";
import type { Citation, Condition, Facts, LoadedRule, LoadedRuleSet, Outcome, RuleInput, RuleRelationship } from "../../lib/rules/types";

export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const root = resolve(import.meta.dirname, "../..");
const eq = (fact: string, value: string): Condition => ({ fact, op: "eq", value });
const yes = (fact: string): Condition => ({ fact, op: "is_true" });
const all = (...conditions: Condition[]): Condition => ({ all: conditions });
const any = (...conditions: Condition[]): Condition => ({ any: conditions });
const applicable = all(eq("property.overlay.crncod.applicability", "verified"), { fact: "property.zoning_district", op: "in", values: ["ldr", "lmdr"] });
const interval = any(yes("fence.between_front_building_and_property_line"), yes("fence.between_side_building_and_street_property_line"));
const chain = any(yes("project.is_chain_link"), { fact: "project.material", op: "in", values: ["chain_link"] });
const edition = evidence.sourceEdition;
type Provision = typeof evidence.provisions[number];
const provision = (id: string) => { const p = evidence.provisions.find(p => p.id === id || p.draftProvisionId === id); if (!p) throw new Error(`Missing source provision ${id}`); return p; };
function citation(id: string, locator?: string): Citation {
  const p = provision(id);
  return { sourceTitle: "Clearwater Community Development Code (archived draft; currency unverified)", sectionIdentifier: locator ?? p.locator, sectionTitle: null, excerpt: p.excerpt, sourceUrl: p.url, editionLabel: edition, publishedOn: null, effectiveFrom: null, effectiveTo: null, citationRole: "primary", pinpointNote: `${id}; excerpt SHA256 ${p.excerptSha256}; current law and applicability unverified` };
}
const input = (key: string, label: string, dataType = "boolean", options: string[] = []): RuleInput => ({ key, label, dataType, unit: key === "project.height" ? "ft" : null, propertyDerived: key.startsWith("property."), userInputAllowed: !key.startsWith("property."), requiredWhenApplicable: true, role: "applicability", options: options.map(key => ({ key, label: key, description: null })) });
export const requiredInputs: RuleInput[] = [
  input("property.zoning_district", "Authoritatively established underlying district", "enum", ["ldr", "lmdr"]),
  input("property.overlay.crncod.applicability", "Legally verified Coachman Ridge applicability (not composite GIS identity)", "enum", ["verified", "absent"]),
  input("project.is_chain_link", "Is this chain-link, including vinyl-coated chain-link?"),
  input("project.material", "Proposed fence material", "enum", ["chain_link", "wood", "other"]),
  input("fence.between_front_building_and_property_line", "Does this segment lie between the front building line and front property line?"),
  input("fence.between_side_building_and_street_property_line", "Does this segment lie between a side building line and a property line adjacent to a public street right-of-way?"),
  input("project.location_zone", "Authoritatively established segment placement", "enum", ["front", "side", "rear"]),
  input("project.height", "Proposed height in feet", "decimal"),
  input("project.is_opaque", "Is the proposed fence opaque?"),
  { ...input("project.crncod_architectural_compatibility_confirmed", "City determination of compatibility with dwelling materials/design"), userInputAllowed: false },
];
function rule(key: string, condition: Condition, subjectKey: string, type: string, message: string, source: string, parameters: Outcome["parameters"] = {}, mode: LoadedRule["evaluationMode"] = "deterministic"): LoadedRule {
  const keys = new Set(conditionFactKeys(condition));
  // Compliance inputs are retained even when not needed to determine applicability.
  if (subjectKey.startsWith("project.")) keys.add(subjectKey);
  return { key, title: message, groupKey: "crncod", versionNumber: 1, condition, evaluationMode: mode, summary: message, outcomes: [{ sequence: 1, type, subjectKey, parameters, severity: "requirement", messageTemplate: message }], inputs: requiredInputs.filter(i => keys.has(i.key)), citations: [citation(source), citation("CR-BASE"), citation("FENCE-PRECEDENCE")] };
}
function relationship(from: string, to: string, scopeCondition: Condition | null, source: string): RuleRelationship {
  const p = provision(source);
  return { fromRuleKey: from, toRuleKey: to, type: "excepts", rationale: `Archived §2-1601.C and §3-803.A give the applicable overlay provision priority for this named subject only; ${p.locator}. Not a project approval.`, scopeCondition, sourceProvisionId: p.draftProvisionId, sourceProvisionChecksum: p.excerptSha256, citations: [citation(source), citation("FENCE-PRECEDENCE"), citation("CR-BASE")], metadata: { fromVersionNumber: 1, toVersionNumber: 1, sourceProvisionId: p.draftProvisionId, sourceProvisionChecksum: p.excerptSha256, sourceEditionLabel: edition } };
}
export function verifyEvidence() {
  if (zoningEvidenceHash(getClearwaterZoningRegistry()) !== evidence.mappingRegistrySha256) throw new Error("Stage A registry mismatch");
  if (sha256(readFileSync(resolve(root, "research/rules/coachman-ridge-v1/base-seed.json"))) !== evidence.baselineSeedSnapshotSha256) throw new Error("Generic seed snapshot mismatch");
  for (const seed of baseline.sourceSeeds) if (sha256(readFileSync(resolve(root, seed.path))) !== seed.sha256) throw new Error("Generic seed hash mismatch; reassess draft");
  const bytes = readFileSync(resolve(root, evidence.sourceFile));
  if (sha256(bytes) !== evidence.sourceSha256) throw new Error("Archived Code hash mismatch");
  const lines = bytes.toString("utf8").split("\n");
  for (const p of evidence.provisions) if (sha256(p.excerpt) !== p.excerptSha256 || lines.slice(p.lineStart - 1, p.lineEnd).join("\n") !== p.excerpt) throw new Error(`Provision mismatch ${p.id}`);
  if (evidence.active !== false || evidence.publishedAt !== null || evidence.currentLawVerified !== false) throw new Error("Draft lifecycle changed without review");
}
/** Actual seed conditions/outcomes, with two mixed rules decomposed only in the draft. */
export function buildBaseDraft(): LoadedRuleSet {
  const rules: LoadedRule[] = baseline.rules.flatMap(raw => {
    const { citationBindings, ...r } = structuredClone(raw);
    const loaded = { ...r, condition: r.condition as Condition, evaluationMode: r.evaluationMode as LoadedRule["evaluationMode"], outcomes: r.outcomes as Outcome[], inputs: r.inputs as RuleInput[], citations: citationBindings.map(binding => ({ ...citation("GENERAL-DIV8", binding.locator), sourceTitle: binding.locator === "28.06" ? "Clearwater Code of Ordinances (legacy seed, edition unverified)" : "Clearwater Community Development Code (legacy seed reconstruction)", excerpt: baseline.sourceProvisions.find(p => p[1] === binding.locator)?.[4] ?? null, sourceUrl: null, editionLabel: binding.locator === "28.06" ? null : edition, citationRole: binding.role, pinpointNote: `Unchanged generic seed reconstruction; pinned seed files retained. ${binding.note ?? ""}` })) };
    if (!["chain_link.public_landbank", "subdivision.perimeter_height"].includes(r.key)) return [loaded];
    return loaded.outcomes.map((outcome, i) => ({ ...loaded, key: `${r.key}.atomic_${i + 1}`, outcomes: [{ ...outcome, sequence: 1 }] }));
  });
  const relationships: RuleRelationship[] = baseline.relationships.map(raw => {
    const r = relationship(raw.fromRuleKey === "chain_link.public_landbank" ? "chain_link.public_landbank.atomic_3" : raw.fromRuleKey, raw.toRuleKey, null, "GENERAL-DIV8");
    // Null scope exactly preserves the original six ordinary relationships.
    return { ...r, type: raw.type, rationale: raw.rationale, scopeCondition: null };
  });
  return { key: "clearwater_crncod_archived_draft_v1", title: "INACTIVE archived Coachman Ridge fence draft", jurisdiction: "clearwater-fl", projectType: "fence", coverageStatus: "limited", knownGaps: evidence.blockers, rules, relationships };
}
export function buildCoachmanDraft(): LoadedRuleSet {
  verifyEvidence();
  const set = buildBaseDraft();
  set.rules.push(
    rule("crncod.chain_link_prohibition", all(applicable, chain), "project.material", "prohibition", "Chain-link and vinyl-coated chain-link are prohibited throughout CRNCOD.", "CR-CHAIN"),
    // This single controller avoids competing LDR/LMDR controllers when the base is unknown.
    // It withdraws generic numeric pathways; separate rules state each district's legal result.
    rule("crncod.interval_replacement", all(applicable, interval), "crncod.interval", "obligation", "Use the district-specific CRNCOD front/street-side provision instead of generic height pathways.", "CR-BASE"),
    rule("crncod.lmdr_interval_prohibition", all(applicable, eq("property.zoning_district", "lmdr"), interval), "project.location_zone", "prohibition", "LMDR fences are prohibited between the front building/property lines and between side building/street-adjacent property lines.", "CR-LMDR"),
    rule("crncod.ldr_interval_height", all(applicable, eq("property.zoning_district", "ldr"), interval), "project.height", "maximum", "LDR conditional pathway: height must not exceed three feet; this is not an automatic permission.", "CR-LDR", { value: 3, unit: "ft", permission: false }),
    rule("crncod.ldr_interval_opacity", all(applicable, eq("property.zoning_district", "ldr"), interval), "project.is_opaque", "required_value", "LDR conditional pathway requires a non-opaque fence.", "CR-LDR", { value: false, permission: false }),
    rule("crncod.ldr_compatibility_review", all(applicable, eq("property.zoning_district", "ldr"), interval), "project.crncod_architectural_compatibility_confirmed", "manual_review_required", "LDR fences may be permitted only subject to height, non-opacity and architectural materials/design compatibility; City interpretation remains required.", "CR-LDR", { permission: false }, "discretionary"),
    rule("crncod.side_rear_general", all(applicable, { fact: "project.location_zone", op: "in", values: ["side", "rear"] }), "crncod.side_rear", "obligation", "Side/rear fences remain subject to Article 3 Division 8 and CRNCOD material and street-side restrictions; this is not blanket permission.", "CR-SIDE"),
    rule("crncod.wire_review", all(applicable, yes("project.is_wire_fence")), "project.material", "obligation", "Generic wire-must-be-chain-link language cannot authorize a material prohibited in CRNCOD; review any proposed wire material.", "CR-CHAIN"),
  );
  const intervalTargets = ["height.front_baseline", "height.side_rear_baseline", "height.attached_dwelling", "design.front_landscape_strip", "waterfront.height", "frontage.double_rear_four", "frontage.double_rear_six", "subdivision.perimeter_height.atomic_1"];
  for (const target of intervalTargets) set.relationships.push(relationship("crncod.interval_replacement", target, all(applicable, interval), "CR-BASE"));
  for (const target of ["chain_link.side_rear_base_height", "chain_link.side_rear_vinyl_height", "chain_link.vacant_lot_height", "chain_link.recreation_exemption", "chain_link.public_landbank.atomic_1", "chain_link.public_landbank.atomic_2", "chain_link.public_landbank.atomic_3"]) set.relationships.push(relationship("crncod.chain_link_prohibition", target, applicable, "CR-CHAIN"));
  set.relationships.push(relationship("crncod.wire_review", "material.wire_chain_link_required", applicable, "CR-CHAIN"));
  // The wire input already exists in the seed; reuse its authoritative definition.
  set.rules.find(r => r.key === "crncod.wire_review")!.inputs.push(structuredClone(set.rules.find(r => r.key === "material.wire_chain_link_required")!.inputs[0]));
  set.rules.find(r => r.key === "crncod.interval_replacement")!.citations.push(citation("CR-LDR"), citation("CR-LMDR"));
  set.rules.push(rule("crncod.ldr_pathway_assessment", all(applicable, eq("property.zoning_district", "ldr"), interval, { fact: "project.height", op: "lte", value: 3, unit: "ft" }, { fact: "project.is_opaque", op: "is_false" }, yes("project.crncod_architectural_compatibility_confirmed")), "crncod.ldr_pathway", "manual_review_required", "Even with non-opacity, height and compatibility established, may be permitted is a review pathway, not an entitlement.", "CR-LDR", { permission: false }, "discretionary"));
  validateDraft(set);
  return set;
}
/** Verify publisher bindings as well as C1 graph validation (which only compares stored pins). */
export function validateDraft(set: LoadedRuleSet) {
  for (const rule of set.rules.filter(r => r.key.startsWith("crncod."))) {
    if (!rule.citations.length || rule.citations.some(c => c.editionLabel !== edition || !evidence.provisions.some(p => p.locator === c.sectionIdentifier && p.excerpt === c.excerpt && p.url === c.sourceUrl))) throw new Error("Overlay rule source citation mismatch");
  }
  for (const edge of set.relationships) {
    const p: Provision = provision(edge.sourceProvisionId!);
    if (edge.sourceProvisionChecksum !== p.excerptSha256 || edge.metadata.sourceProvisionChecksum !== p.excerptSha256 || edge.metadata.sourceEditionLabel !== edition) throw new Error("Source-version/checksum mismatch");
    if (!edge.citations?.some(c => c.excerpt === p.excerpt && c.sectionIdentifier === p.locator)) throw new Error("Missing bound provision citation");
  }
  validatePrecedence(set, "2026-10-21"); // Test as-of only; not an invented legal effective date.
}
/** Fixture/test adapter only. No Stage B identity-to-legal-applicability inference. */
export function evaluateDraft(set: LoadedRuleSet, facts: Facts) {
  const copy = structuredClone(facts);
  const state = copy["property.overlay.crncod.applicability"];
  if (state !== "verified" && state !== "absent") delete copy["property.overlay.crncod.applicability"];
  const material = copy["project.material"];
  if (typeof material === "string" && ["chain_link"].includes(material) && copy["project.is_chain_link"] === false) throw new Error("Contradictory material facts");
  validateDraft(set);
  return evaluateLoadedRuleSet(set, { jurisdiction: "clearwater-fl", projectType: "fence", asOfDate: "2026-10-21", facts: copy });
}
export function bundleDocument() {
  return { metadata: evidence, schemaMapping: { ruleSets: { researchStatus: "draft", publishedAt: null }, rules: { activeVersionId: null }, ruleVersions: { researchStatus: "draft", lifecycleStatus: "withdrawn", publishedAt: null }, effectiveDates: "Unknown legal dates remain null; evaluation as-of is a simulation only", draftSourceIds: "Deterministic offline UUIDs, not assertions of existing database rows; publication must reconcile canonical source/version IDs", storage: "LoadedRuleSet representation of existing SQL tables; no executable migration or DB operation" }, ruleSet: buildCoachmanDraft() };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = resolve(process.argv[2] ?? "/tmp/coachman-ridge-draft"); mkdirSync(dir, { recursive: true });
  const text = JSON.stringify(bundleDocument(), null, 2) + "\n";
  writeFileSync(resolve(dir, "coachman-ridge-fence.draft.json"), text);
  writeFileSync(resolve(dir, "checksums.sha256"), `${sha256(text)}  coachman-ridge-fence.draft.json\n`);
  console.log(JSON.stringify({ active: false, currentLawVerified: false, path: dir, sha256: sha256(text) }));
}
