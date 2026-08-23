import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCondition } from "../lib/rules/condition";
import { evaluateLoadedRuleSet } from "../lib/rules/evaluate";
import type { Condition, LoadedRuleSet } from "../lib/rules/types";

const citation = { sourceTitle: "Clearwater Community Development Code", sectionIdentifier: "§ 3-805", sectionTitle: "Fences and walls", excerpt: "Fixture excerpt", sourceUrl: null, editionLabel: "Supplement No. 55", publishedOn: null, effectiveFrom: null, effectiveTo: null, citationRole: "primary", pinpointNote: null };
const input = (key: string, dataType = "boolean") => ({ key, label: key, dataType, unit: null, propertyDerived: key.startsWith("property."), userInputAllowed: key.startsWith("project."), requiredWhenApplicable: true, role: "applicability", options: [] });
const rule = (key: string, condition: Condition, mode: "deterministic" | "partial" | "discretionary" = "deterministic") => ({ key, title: key, groupKey: null, versionNumber: 1, condition, evaluationMode: mode, summary: key, outcomes: [{ sequence: 1, type: mode === "discretionary" ? "manual_review_required" : "maximum", subjectKey: null, parameters: { value: 4 }, severity: "requirement", messageTemplate: key }], inputs: [...new Set((JSON.stringify(condition).match(/(?:project|property)\.[a-z_]+/g) ?? []))].map((key) => input(key)), citations: [citation] });
const fixture: LoadedRuleSet = {
  key: "clearwater_fence_v1", title: "Clearwater fence rules v1", jurisdiction: "clearwater-fl", projectType: "fence", coverageStatus: "limited", knownGaps: [],
  rules: [
    rule("height.front_baseline", { all: [{ fact: "project.is_chain_link", op: "is_false" }, { fact: "project.location_zone", op: "eq", value: "front" }] }),
    rule("chain_link.front_location", { all: [{ fact: "project.is_chain_link", op: "is_true" }, { fact: "property.has_principal_structure", op: "is_true" }, { fact: "property.is_recreational_facility", op: "is_false" }] }),
    rule("chain_link.recreation_exemption", { all: [{ fact: "project.is_chain_link", op: "is_true" }, { fact: "property.is_recreational_facility", op: "is_true" }] }, "partial"),
    rule("materials.appropriateness_review", { fact: "project.material_appropriateness_approved", op: "is_false" }, "discretionary"),
    rule("material.exposed_top_prohibition", { fact: "project.has_exposed_top_points", op: "is_true" }, "partial"),
    rule("barbed_wire.street_adjacency", { all: [{ fact: "project.material", op: "eq", value: "barbed_wire" }, { fact: "project.has_exposed_top_points", op: "is_true" }] }, "partial"),
  ],
  relationships: [
    { fromRuleKey: "chain_link.recreation_exemption", toRuleKey: "chain_link.front_location", type: "exempts_from", rationale: "Express exemption", scopeCondition: null, metadata: {} },
    { fromRuleKey: "material.exposed_top_prohibition", toRuleKey: "barbed_wire.street_adjacency", type: "potentially_conflicts_with", rationale: "Unresolved", scopeCondition: null, metadata: {} },
  ],
};
const request = (facts: Record<string, boolean | string | number | null> = {}) => ({ jurisdiction: "clearwater-fl", projectType: "fence", facts });

test("condition AST implements schema operators and three-valued logic", () => {
  assert.equal(evaluateCondition({ all: [{ fact: "a", op: "is_true" }, { fact: "missing", op: "is_true" }] }, { a: false }), "FALSE");
  assert.equal(evaluateCondition({ any: [{ fact: "a", op: "is_true" }, { fact: "missing", op: "is_true" }] }, { a: false }), "UNKNOWN");
  assert.equal(evaluateCondition({ not: { fact: "a", op: "is_true" } }, { a: true }), "FALSE");
  assert.equal(evaluateCondition({ fact: "n", op: "between", values: [1, 3], lower_inclusive: true, upper_inclusive: false }, { n: 2 }), "TRUE");
  assert.equal(evaluateCondition({ fact: "x", op: "not_in", values: ["a"] }, { x: "b" }), "TRUE");
  assert.equal(evaluateCondition({ fact: "x", op: "is_unknown" }, { x: null }), "TRUE");
});

test("scenario A: insufficient facts remain unknown with deduplicated prompts", () => {
  const result = evaluateLoadedRuleSet(fixture, request());
  assert.ok(result.unknownRules.length > 1); assert.equal(new Set(result.missingInputs.map((i) => i.key)).size, result.missingInputs.length);
});
test("scenario B: ordinary fence produces matched and non-matched rules with citations", () => {
  const result = evaluateLoadedRuleSet(fixture, request({ "project.is_chain_link": false, "project.location_zone": "front" }));
  assert.ok(result.matchedRules.some((r) => r.key === "height.front_baseline")); assert.ok(result.notMatchedRules.length); assert.ok(result.citations.length);
});
test("scenario C: data-driven chain-link condition matches", () => {
  const result = evaluateLoadedRuleSet(fixture, request({ "project.is_chain_link": true, "property.has_principal_structure": true, "property.is_recreational_facility": false }));
  assert.ok(result.matchedRules.some((r) => r.key === "chain_link.front_location"));
});
test("scenario D: discretionary applicability requires review", () => {
  const result = evaluateLoadedRuleSet(fixture, request({ "project.material_appropriateness_approved": false }));
  assert.ok(result.reviewRequiredRules.some((r) => r.key === "materials.appropriateness_review"));
});
test("scenario E: exemption applies and unresolved conflict is surfaced", () => {
  const exempt = evaluateLoadedRuleSet(fixture, request({ "project.is_chain_link": true, "property.has_principal_structure": true, "property.is_recreational_facility": true }));
  assert.ok(exempt.reviewRequiredRules.some((r) => r.key === "chain_link.recreation_exemption"));
  const conflict = evaluateLoadedRuleSet(fixture, request({ "project.has_exposed_top_points": true, "project.material": "barbed_wire" }));
  assert.equal(conflict.conflicts.length, 1); assert.equal(conflict.conflicts[0].requiresReview, true);
});
