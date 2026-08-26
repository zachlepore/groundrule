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
    makeRule("permit.review_path", "MATCHED", [{ sequence: 1, type: "obligation", subjectKey: null, parameters: { presentation_group: "before_you_build" }, severity: "requirement", messageTemplate: "Submit the application and applicable plans for City review." }], "§ 4-203"),
    makeRule("permit.final_inspection", "MATCHED", [{ sequence: 1, type: "obligation", subjectKey: null, parameters: { presentation_group: "before_you_build" }, severity: "requirement", messageTemplate: "Final inspection required after installation." }], "§ 4-203"),
  ],
  unknownRules: [
    makeRule("height.front_baseline", "UNKNOWN", [maximum(4)], "§ 3-804"), makeRule("height.side_rear_baseline", "UNKNOWN", [maximum(6)], "§ 3-804"),
    makeRule("material.metal_prohibition", "UNKNOWN", [{ sequence: 1, type: "prohibition", subjectKey: "project.material", parameters: {}, severity: "prohibition", messageTemplate: "Corrugated or sheet metal may not be used to form the fence or wall." }], "§ 3-802"),
    makeRule("visibility.triangle_restriction", "UNKNOWN", [
      { sequence: 1, type: "maximum", subjectKey: "project.height", parameters: { value: 2.5, unit: "ft", display_value: 30, display_unit: "in", horizontal_leg_1_ft: 20, horizontal_leg_2_ft: 20, presentation_asset_id: "clearwater_sight_visibility_triangle_v1" }, severity: "requirement", messageTemplate: "height" },
      { sequence: 2, type: "required_value", subjectKey: "project.is_opaque", parameters: { value: false, meaning: "non-opaque", presentation_asset_id: "clearwater_sight_visibility_triangle_v1" }, severity: "requirement", messageTemplate: "opacity" },
    ]),
    { ...makeRule("chain_link.front_location", "UNKNOWN", [{ sequence: 1, type: "required_value", subjectKey: "project.is_rear_of_front_building_line", parameters: { value: true }, severity: "requirement", messageTemplate: "Chain-link must be rear of the principal structure front building line." }], "§ 3-805") },
    { ...makeRule("chain_link.side_rear_base_height", "UNKNOWN", [maximum(4)], "§ 3-805"), condition: { all: [{ fact: "project.is_chain_link", op: "is_true" }, { fact: "project.vinyl_color", op: "not_in", values: ["green", "black"] }] } },
    { ...makeRule("chain_link.side_rear_vinyl_height", "UNKNOWN", [maximum(6)], "§ 3-805"), condition: { all: [{ fact: "project.is_chain_link", op: "is_true" }, { fact: "project.vinyl_color", op: "in", values: ["green", "black"] }] } },
    makeRule("chain_link.landscaping", "UNKNOWN", [{ sequence: 1, type: "manual_review_required", subjectKey: "project.chain_link_landscaping_approved", parameters: { full_length: true }, severity: "requirement", messageTemplate: "Full-length qualifying landscaping must be confirmed." }], "§ 3-805"),
    makeRule("waterfront.height", "UNKNOWN", [maximum(4)], "§ 3-804"),
    makeRule("waterfront.opacity", "UNKNOWN", [{ sequence: 1, type: "required_value", subjectKey: "project.is_opaque", parameters: { value: false }, severity: "requirement", messageTemplate: "The fence must be non-opaque." }], "§ 3-804"),
  ],
};

test("known LMDR property gets an answers-first guide without project details", () => {
  const facts = { "property.zoning_district": "lmdr", "project.structure_type": "fence" };
  const guide = buildClearwaterFenceGuide(result, facts);
  assert.equal(guide.zoningDistrict, "lmdr");
  assert.deepEqual(guide.propertyContext, ["Zoning · LMDR"]);
  assert.equal(facts["project.height" as keyof typeof facts], undefined);
  assert.deepEqual(guide.whatYouCanDo.map((item) => item.title), ["Front yard", "Side + rear", "Materials"]);
  assert.deepEqual(guide.highlights.map((item) => item.title), ["Front yard", "Side + rear", "Materials", "Permit"]);
  assert.equal(guide.highlights[0]?.answer, "4 ft maximum fence height");
  assert.equal(guide.highlights[1]?.answer, "6 ft maximum fence height");
  const materials = guide.highlights.find((item) => item.key === "material.metal_prohibition");
  assert.equal(materials?.answer, "Corrugated or sheet metal fencing is not allowed");
  assert.match(materials?.body ?? "", /may not be used to form the fence or wall/);
  assert.equal(materials?.citations[0]?.sectionIdentifier, "§ 3-802");
});

test("permit duties remain structured, visibility is resident-facing, and citations survive", () => {
  const guide = buildClearwaterFenceGuide(result, { "property.zoning_district": "lmdr" });
  const permit = guide.highlights.find((item) => item.title === "Permit");
  assert.equal(permit?.answer, "Required");
  assert.deepEqual(permit?.action, {
    label: "View fence permit steps",
    url: "https://www.myclearwater.com/Business-Development/Permitting/06-Fence-Permit-Application-Checklist",
  });
  assert.equal(guide.beforeYouBuild.length, 1);
  assert.equal(guide.beforeYouBuild[0]?.title, "Get your fence permit");
  assert.match(guide.beforeYouBuild[0]?.actionText ?? "", /application and applicable plans/);
  assert.match(guide.beforeYouBuild[0]?.secondaryRequirement ?? "", /Final inspection required after installation/);
  assert.equal(guide.checkThis[0]?.assetId, "clearwater_sight_visibility_triangle_v1");
  assert.equal(guide.checkThis[0]?.body, "If your fence is near a driveway or street corner:");
  assert.equal(guide.checkThis[0]?.values?.horizontal_leg_1_ft, 20);
  assert.equal(guide.checkThis[0]?.values?.display_value, 30);
  assert.equal(guide.checkThis[0]?.bullets?.[0], "The visibility area extends 20 ft along each applicable edge.");
  assert.equal(guide.checkThis[0]?.bullets?.[2], "Maximum fence height in this area is 30 in.");
  assert.equal(guide.checkThis[0]?.citations[0]?.sourceUrl, citation.sourceUrl);
  assert.doesNotMatch(JSON.stringify(guide), /UNKNOWN|REVIEW_REQUIRED/);
});

test("specific situations compose chain-link and water-adjacent guidance from structured rules", () => {
  const guide = buildClearwaterFenceGuide(result, { "property.zoning_district": "lmdr" });
  assert.deepEqual(guide.specificSituations.map((item) => item.title), ["Chain-link fences", "Property next to the water"]);
  const chain = guide.specificSituations[0];
  assert.equal(chain?.body, "Chain-link fences follow different rules. They generally must be behind the front building line. Standard chain-link is limited to 48 in. Green- or black-vinyl-coated chain-link may be allowed up to 6 ft, with additional location and landscaping requirements.");
  assert.equal(chain?.values?.standard_height_in, 48);
  assert.deepEqual(chain?.values?.coating_colors, ["green", "black"]);
  assert.equal((chain?.values?.coated_height as Record<string, unknown>)?.value, 6);
  assert.equal(chain?.citations[0]?.sectionIdentifier, "§ 3-805");
  assert.equal(guide.highlights.some((item) => item.key.startsWith("chain_link.")), false);
  assert.doesNotMatch(chain?.body ?? "", /4 ft maximum fence height|6 ft maximum fence height/);

  const water = guide.specificSituations[1];
  assert.equal(water?.body, "Additional fence restrictions apply near a water-adjacent property line. If your fence is within 20 ft of that property line — or within the required setback, whichever is greater — different rules may apply. Not sure whether this applies? Clearwater can confirm it.");
  assert.equal(water?.values?.distance_ft, 20);
  assert.equal(water?.citations[0]?.sectionIdentifier, "§ 3-804");
  assert.deepEqual(guide.propertyContext, ["Zoning · LMDR"]);
  assert.doesNotMatch(guide.propertyContext.join(" "), /Waterfront/);
});

test("resident UI ends with guidance, shows trusted property context, and embeds no regulatory numbers", () => {
  const ui = fs.readFileSync("app/clearwater/fence/workflow.tsx", "utf8");
  assert.doesNotMatch(ui, /Check my fence|specific fence in mind|QuestionControl|nextQuestion|stage === "refine"/);
  assert.match(ui, /guide\.propertyContext\.map/);
  assert.doesNotMatch(ui, /Clearwater fence guide|Fences at/);
  assert.match(ui, /<GuideHighlights items={guide.highlights}/);
  assert.match(ui, /<SpecificSituations items={guide.specificSituations}/);
  assert.ok(ui.indexOf("<GuideHighlights") < ui.indexOf("<SpecificSituations"));
  assert.ok(ui.indexOf("<GuideSection") < ui.indexOf("<SpecificSituations"));
  assert.match(ui, /Source ↗/);
  assert.match(ui, /citation\.sectionIdentifier/);
  assert.doesNotMatch(ui, /Before you build|ProcessSection|secondaryRequirement/);
  assert.match(ui, /item\.action\.label/);
  assert.match(ui, /href={item\.action\.url}/);
  assert.doesNotMatch(ui, /https:\/\/www\.myclearwater\.com\/Business-Development\/Permitting/);
  assert.doesNotMatch(ui, /Official rule|stored property data|cannot tell/);
  assert.doesNotMatch(ui, /30 inches|20 ft|maximum height is 4|maximum height is 6/);
  assert.doesNotMatch(ui, /48 in|6 ft|vinyl-coated|waterfront/i);
  assert.doesNotMatch(ui, /Not allowed|Corrugated or sheet metal/);
});

test("resident workflow adds no chain-link or waterfront questionnaire", () => {
  const ui = fs.readFileSync("app/clearwater/fence/workflow.tsx", "utf8");
  assert.doesNotMatch(ui, /Is your fence chain-link|Is your property waterfront|within 20 feet of the water/i);
  assert.equal((ui.match(/<input/g) ?? []).length, 1);
  assert.doesNotMatch(ui, /Waterfront · (?:Yes|No)/);
});

test("unsupported lookup retains an explicit safe pilot message", () => {
  const ui = fs.readFileSync("app/clearwater/fence/workflow.tsx", "utf8");
  assert.match(ui, /isn’t in our limited Clearwater pilot area yet\. We did not evaluate it\./);
});
