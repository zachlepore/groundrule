import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildClearwaterFenceGuide } from "../lib/guides/fence";
import type { EvaluatedRule, EvaluationResult, Outcome } from "../lib/rules/types";

const citation = { sourceTitle: "Clearwater Community Development Code", sectionIdentifier: "§ 3-904", sectionTitle: null, excerpt: null, sourceUrl: "https://library.municode.com/", editionLabel: null, publishedOn: null, effectiveFrom: null, effectiveTo: null, citationRole: "primary", pinpointNote: null };
const makeRule = (key: string, status: EvaluatedRule["status"], outcomes: Outcome[], section = "§ 3-904"): EvaluatedRule => ({ key, title: key, groupKey: key.split(".")[0], versionNumber: 1, condition: { fact: "x", op: "is_true" }, evaluationMode: "deterministic", summary: key, outcomes, inputs: [], citations: [{ ...citation, sectionIdentifier: section }], status, truth: status === "MATCHED" ? "TRUE" : "UNKNOWN", missingFactKeys: [], relationships: [] });
const maximum = (value: number): Outcome => ({ sequence: 1, type: "maximum", subjectKey: "project.height", parameters: { value, unit: "ft" }, severity: "requirement", messageTemplate: "maximum" });
const result: EvaluationResult = {
  ruleSet: { key: "clearwater_fence_v1", title: "Fence", jurisdiction: "clearwater-fl", projectType: "fence", coverageStatus: "limited", knownGaps: [] }, conflicts: [], missingInputs: [], notMatchedRules: [], reviewRequiredRules: [], citations: [],
  matchedRules: [
    makeRule("permit.building_required", "MATCHED", [{ sequence: 1, type: "obligation", subjectKey: null, parameters: { presentation_group: "before_you_build" }, severity: "requirement", messageTemplate: "Permit required before construction." }], "§ 4-203"),
  ],
  unknownRules: [
    makeRule("height.front_baseline", "UNKNOWN", [maximum(4)], "§ 3-804"), makeRule("height.side_rear_baseline", "UNKNOWN", [maximum(6)], "§ 3-804"),
    makeRule("material.metal_prohibition", "UNKNOWN", [{ sequence: 1, type: "prohibition", subjectKey: "project.material", parameters: {}, severity: "prohibition", messageTemplate: "Corrugated or sheet metal may not be used to form the fence or wall." }], "§ 3-802"),
    makeRule("visibility.triangle_restriction", "UNKNOWN", [
      { sequence: 1, type: "maximum", subjectKey: "project.height", parameters: { value: 2.5, unit: "ft", display_value: 30, display_unit: "in", horizontal_leg_1_ft: 20, horizontal_leg_2_ft: 20, presentation_asset_id: "clearwater_sight_visibility_triangle_v1" }, severity: "requirement", messageTemplate: "height" },
      { sequence: 2, type: "required_value", subjectKey: "project.is_opaque", parameters: { value: false, meaning: "non-opaque", presentation_asset_id: "clearwater_sight_visibility_triangle_v1" }, severity: "requirement", messageTemplate: "opacity" },
    ]),
  ],
};

test("known LMDR property gets an answers-first guide without project details", () => {
  const facts = { "property.zoning_district": "lmdr", "project.structure_type": "fence" };
  const guide = buildClearwaterFenceGuide(result, facts);
  assert.equal(guide.zoningDistrict, "lmdr");
  assert.equal(facts["project.height" as keyof typeof facts], undefined);
  assert.deepEqual(guide.whatYouCanDo.map((item) => item.title), ["Front yard", "Side + rear", "Materials"]);
  assert.deepEqual(guide.highlights.map((item) => item.title), ["Front yard", "Side + rear", "Materials", "Permit"]);
  assert.equal(guide.highlights[0]?.answer, "Up to 4 feet");
  const materials = guide.highlights.find((item) => item.key === "material.metal_prohibition");
  assert.equal(materials?.answer, "Not allowed");
  assert.equal(materials?.qualification, "Corrugated or sheet metal");
  assert.match(materials?.body ?? "", /may not be used to form the fence or wall/);
  assert.equal(materials?.citations[0]?.sectionIdentifier, "§ 3-802");
});

test("permit is a before-build duty, visibility is conditional, and citations survive", () => {
  const guide = buildClearwaterFenceGuide(result, { "property.zoning_district": "lmdr" });
  assert.equal(guide.beforeYouBuild[0]?.title, "Building permit required");
  assert.equal(guide.checkThis[0]?.assetId, "clearwater_sight_visibility_triangle_v1");
  assert.match(guide.checkThis[0]?.body ?? "", /cannot tell/);
  assert.equal(guide.checkThis[0]?.values?.horizontal_leg_1_ft, 20);
  assert.equal(guide.checkThis[0]?.values?.display_value, 30);
  assert.equal(guide.checkThis[0]?.citations[0]?.sourceUrl, citation.sourceUrl);
  assert.doesNotMatch(JSON.stringify(guide), /UNKNOWN|REVIEW_REQUIRED/);
});

test("resident UI contains optional refinement and no embedded regulatory numbers", () => {
  const ui = fs.readFileSync("app/clearwater/fence/workflow.tsx", "utf8");
  assert.match(ui, /Check my fence/);
  assert.ok(ui.indexOf("<GuideHighlights items={guide.highlights}") < ui.indexOf('<aside className="refine"'));
  assert.doesNotMatch(ui, /30 inches|20 ft|maximum height is 4|maximum height is 6/);
  assert.doesNotMatch(ui, /Not allowed|Corrugated or sheet metal/);
});

test("unsupported lookup retains an explicit safe pilot message", () => {
  const ui = fs.readFileSync("app/clearwater/fence/workflow.tsx", "utf8");
  assert.match(ui, /isn’t in our limited Clearwater pilot area yet\. We did not evaluate it\./);
});
