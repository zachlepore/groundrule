import assert from "node:assert/strict";
import test from "node:test";
import { nextQuestion, planQuestions } from "../lib/rules/questions";
import type { EvaluatedRule, RuleInput } from "../lib/rules/types";

const input = (overrides: Partial<RuleInput> = {}): RuleInput => ({ key: "project.height", label: "Proposed height", dataType: "decimal", unit: "ft", propertyDerived: false, userInputAllowed: true, requiredWhenApplicable: true, role: "applicability", options: [], ...overrides });
const unresolved = (keys: string[]) => [{ missingFactKeys: keys }] as Pick<EvaluatedRule, "missingFactKeys">[];

test("Scenario A — no answers returns the most useful user question", () => {
  const height = input(); const material = input({ key: "project.material", label: "Material", dataType: "enum", options: [{ key: "wood", label: "Wood", description: null }] });
  assert.equal(nextQuestion([height, material], {}, [...unresolved([height.key]), ...unresolved([height.key, material.key])])?.key, height.key);
});
test("Scenario B — answered input is not asked again", () => assert.equal(nextQuestion([input()], { "project.height": 4 }, unresolved(["project.height"])), null));
test("Scenario C — property-derived-only input is not asked", () => assert.equal(nextQuestion([input({ key: "property.zone", propertyDerived: true, userInputAllowed: false })], {}, unresolved(["property.zone"])), null));
test("Scenario D — enum question retains seeded-style options", () => { const options = [{ key: "wood", label: "Wood", description: null }, { key: "chain_link", label: "Chain-link", description: null }]; assert.deepEqual(nextQuestion([input({ dataType: "enum", options })], {}, unresolved(["project.height"]))?.options, options); });
test("Scenario E — unknown answer remains unresolved but is not asked repeatedly", () => { const facts = { "project.height": null }; assert.equal(planQuestions([input()], facts, unresolved(["project.height"])).length, 0); assert.equal(facts["project.height"], null); });
test("Scenario F — no useful questions moves workflow to result state", () => assert.equal(nextQuestion([input({ userInputAllowed: false })], {}, unresolved(["project.height"])), null));
