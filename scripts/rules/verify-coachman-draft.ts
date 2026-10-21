/** Reproducible offline audit. Synthetic project scenarios are not parcel approvals. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBaseDraft, buildCoachmanDraft, bundleDocument, evaluateDraft, sha256 } from "./coachman-ridge";
import type { EvaluationResult, Facts } from "../../lib/rules/types";
const output = resolve(process.argv[2] ?? "/tmp/coachman-ridge-verification");
mkdirSync(output, { recursive: true });
const common: Facts = { "property.zoning_district": "lmdr", "property.overlay.crncod.applicability": "verified", "project.structure_type": "fence", "project.is_chain_link": false, "project.is_wire_fence": false, "project.material": "wood", "project.location_zone": "front", "project.height": 3, "project.is_opaque": false, "property.is_water_adjacent": false, "property.is_recreational_facility": false, "property.is_public_landbank": false, "property.is_vacant_lot": false, "property.is_residential_subdivision_perimeter": false, "fence.between_front_building_and_property_line": true, "fence.between_side_building_and_street_property_line": false };
const scenarios: [string, Facts][] = [
  ["Ordinary LMDR, explicit overlay absence", { ...common, "property.overlay.crncod.applicability": "absent" }],
  ["CR LMDR front", common],
  ["CR LMDR street-side", { ...common, "project.location_zone": "side", "fence.between_front_building_and_property_line": false, "fence.between_side_building_and_street_property_line": true }],
  ["CR LDR conditional front, compatibility missing", { ...common, "property.zoning_district": "ldr" }],
  ["CR non-street side/rear", { ...common, "project.location_zone": "rear", "fence.between_front_building_and_property_line": false }],
  ["CR coated chain-link", { ...common, "project.is_chain_link": true, "project.is_wire_fence": true, "project.material": "chain_link", "project.location_zone": "rear", "project.vinyl_color": "green", "fence.between_front_building_and_property_line": false }],
  ["Overlay applicability unknown", { ...common, "property.overlay.crncod.applicability": undefined }],
  ["Front and street-side building lines unknown", { ...common, "fence.between_front_building_and_property_line": undefined, "fence.between_side_building_and_street_property_line": undefined }],
];
const rows = (result: EvaluationResult) => [...result.matchedRules, ...result.notMatchedRules, ...result.reviewRequiredRules, ...result.unknownRules].sort((a,b) => a.key.localeCompare(b.key));
const summarize = (result: EvaluationResult) => rows(result).filter(r => r.key.startsWith("crncod.") || ["height.front_baseline", "height.side_rear_baseline", "chain_link.side_rear_vinyl_height", "material.wire_chain_link_required"].includes(r.key)).map(r => ({ key: r.key, truth: r.truth, rawStatus: r.rawStatus, effectiveStatus: r.status, rawOutcomes: r.rawOutcomes, effectiveOutcomes: r.outcomes, resolution: r.resolution?.state, controllingRuleKeys: r.resolution?.controllingRuleKeys, citations: [...r.citations, ...(r.resolution?.citations ?? [])].map(c => ({ section: c.sectionIdentifier, edition: c.editionLabel, url: c.sourceUrl, note: c.pinpointNote })) }));
const base = buildBaseDraft(), draft = buildCoachmanDraft();
const comparison = scenarios.map(([label,facts]) => ({ label, synthetic: true, facts, before: summarize(evaluateDraft(base, facts)), after: summarize(evaluateDraft(draft, facts)), missingInputs: evaluateDraft(draft, facts).missingInputs }));
const files: Record<string, string> = {};
for (const [file, body] of [["coachman-ridge-fence.draft.json", bundleDocument()], ["before-after.json", comparison]] as const) {
  const bytes = JSON.stringify(body, null, 2) + "\n";
  writeFileSync(resolve(output, file), bytes); files[file] = sha256(bytes);
}
// Optional immutable-source non-regression audit; no GIS processing or fact emission.
let frozenBaseline = null;
if (process.argv[3]) {
  const raw = readFileSync(resolve(process.argv[3]));
  if (sha256(raw) !== bundleDocument().metadata.baselineLookupSha256) throw new Error("Approved lookup mismatch");
  const profiles = raw.toString("utf8").trimEnd().split("\n").map(row => JSON.parse(row));
  const ids = new Set(profiles.map(p => p.sourceAddressIdentifier));
  const approved = profiles.filter(p => p.approvedPrimaryGuidance?.status === "GUIDANCE_READY_APPROVED");
  const byRule = Object.fromEntries(["CLR-Z-001", "CLR-Z-002", "CLR-Z-003", "CLR-Z-004"].map(id => [id, approved.filter(p => p.approvedPrimaryGuidance.ruleId === id).length]));
  const remainingReview = profiles.filter(p => p.status === "review" && p.approvedPrimaryGuidance.status !== "GUIDANCE_READY_APPROVED").length;
  frozenBaseline = { byRule, remainingReview, sha256: sha256(raw), originalProfiles: profiles.length, uniqueAddressIdentifiers: ids.size, approvedRecords: approved.length, readOnly: true };
  if (profiles.length !== 63430 || ids.size !== 63430 || approved.length !== 3324 || remainingReview !== 17014 || JSON.stringify(Object.values(byRule)) !== "[1967,262,731,364]") throw new Error(`Baseline reconciliation mismatch: ${JSON.stringify(frozenBaseline)}`);
}
const report = { bundleVersion: bundleDocument().metadata.bundleVersion, inactive: true, currentLawVerified: false, syntheticScenarios: comparison.length, baselineRules: base.rules.length, overlayRules: draft.rules.length - base.rules.length, relationships: draft.relationships.length, frozenBaseline, blockers: bundleDocument().metadata.blockers };
const bytes = JSON.stringify(report, null, 2) + "\n";
writeFileSync(resolve(output, "validation.json"), bytes); files["validation.json"] = sha256(bytes);
writeFileSync(resolve(output, "checksums.sha256"), Object.entries(files).map(([name,hash]) => `${hash}  ${name}\n`).join(""));
console.log(JSON.stringify(report));
