import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLoadedRuleSet } from "../lib/rules/evaluate";
import { planQuestions } from "../lib/rules/questions";
import type { Condition, LoadedRule, LoadedRuleSet, RuleInput } from "../lib/rules/types";

const citation = (sectionIdentifier: string) => ({ sourceTitle: "Clearwater Community Development Code", sectionIdentifier, sectionTitle: null, excerpt: null, sourceUrl: null, editionLabel: "Volume II, Supplement No. 55 (July 2026)", publishedOn: null, effectiveFrom: null, effectiveTo: null, citationRole: "primary", pinpointNote: null });
const input = (key: string, userInputAllowed = true, role = "applicability"): RuleInput => ({ key, label: key, dataType: key === "project.height" ? "decimal" : key === "project.structure_type" ? "enum" : "boolean", unit: key === "project.height" ? "ft" : null, propertyDerived: false, userInputAllowed, requiredWhenApplicable: true, role, options: key === "project.structure_type" ? [{ key: "fence", label: "Fence", description: null }] : [] });
const rule = (key: string, condition: Condition, mode: LoadedRule["evaluationMode"], inputs: RuleInput[], section = "§ 3-904"): LoadedRule => ({ key, title: key, groupKey: key.split(".")[0], versionNumber: 1, condition, evaluationMode: mode, summary: key, outcomes: [{ sequence: 1, type: "obligation", subjectKey: null, parameters: {}, severity: "requirement", messageTemplate: key }], inputs, citations: [citation(section)] });

const structure = input("project.structure_type");
const exact = input("project.in_sight_visibility_triangle", false);
const near = input("project.near_sight_visibility_intersection");
const opaque = input("project.is_opaque", true, "compliance");
const height = input("project.height", true, "compliance");
const exception = input("project.sight_visibility_exception_approved", false);
const rules: LoadedRule[] = [
  rule("permit.building_required", { fact: structure.key, op: "eq", value: "fence" }, "deterministic", [structure], "§ 4-203"),
  rule("permit.review_path", { fact: structure.key, op: "eq", value: "fence" }, "informational", [structure], "§ 4-203"),
  rule("permit.final_inspection", { fact: structure.key, op: "eq", value: "fence" }, "informational", [structure], "§ 47.111"),
  rule("visibility.triangle_restriction", { fact: exact.key, op: "is_true" }, "deterministic", [exact]),
  rule("visibility.triangle_conflict", { all: [{ fact: exact.key, op: "is_true" }, { any: [{ fact: opaque.key, op: "is_true" }, { fact: height.key, op: "gt", value: 2.5, unit: "ft" }] }, { not: { fact: exception.key, op: "is_true" } }] }, "deterministic", [exact, opaque, height, exception]),
  rule("visibility.applicability_review", { all: [{ fact: near.key, op: "is_true" }, { fact: exact.key, op: "is_unknown" }] }, "external", [near, exact]),
];
const fixture: LoadedRuleSet = { key: "clearwater_fence_v1", title: "Clearwater fences", jurisdiction: "clearwater-fl", projectType: "fence", coverageStatus: "limited", knownGaps: [], rules, relationships: [] };
const evaluate = (facts: Record<string, string | number | boolean | null>) => evaluateLoadedRuleSet(fixture, { jurisdiction: "clearwater-fl", projectType: "fence", facts: { "property.zoning_district": "lmdr", ...facts } });

test("scenario A: ordinary LMDR side/rear answers retain permit guidance without permit-status questions", () => {
  const result = evaluate({ "project.structure_type": "fence", "project.location_zone": "rear", "project.height": 6, "project.is_opaque": true, "project.near_sight_visibility_intersection": false });
  assert.deepEqual(result.matchedRules.filter((r) => r.key.startsWith("permit.")).map((r) => r.key).sort(), ["permit.building_required", "permit.final_inspection", "permit.review_path"]);
  assert.equal(result.missingInputs.some((i) => i.key.includes("permit")), false);
  assert.equal(planQuestions(result.missingInputs, { "project.structure_type": "fence" }, result.unknownRules).some((q) => q.key.includes("permit")), false);
});

test("scenario B: known triangle, opaque fence above 30 inches produces a conservative conflict", () => {
  const result = evaluate({ "project.structure_type": "fence", "project.in_sight_visibility_triangle": true, "project.height": 4, "project.is_opaque": true, "project.sight_visibility_exception_approved": false });
  assert.ok(result.matchedRules.some((r) => r.key === "visibility.triangle_restriction"));
  assert.ok(result.matchedRules.some((r) => r.key === "visibility.triangle_conflict"));
});

test("scenario C: known triangle, non-opaque fence at 30 inches receives the restriction without a false conflict", () => {
  const result = evaluate({ "project.structure_type": "fence", "project.in_sight_visibility_triangle": true, "project.height": 2.5, "project.is_opaque": false, "project.sight_visibility_exception_approved": false });
  assert.ok(result.matchedRules.some((r) => r.key === "visibility.triangle_restriction"));
  assert.ok(result.notMatchedRules.some((r) => r.key === "visibility.triangle_conflict"));
});

test("scenario D: near an intersection with exact applicability unknown requires review and does not claim compliance", () => {
  const result = evaluate({ "project.structure_type": "fence", "project.near_sight_visibility_intersection": true, "project.height": 2.5, "project.is_opaque": false });
  assert.ok(result.reviewRequiredRules.some((r) => r.key === "visibility.applicability_review"));
  assert.ok(result.unknownRules.some((r) => r.key === "visibility.triangle_restriction"));
  assert.equal(result.missingInputs.find((i) => i.key === exact.key)?.userInputAllowed, false);
});
