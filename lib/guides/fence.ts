import type { Citation, EvaluatedRule, EvaluationResult, Facts, JsonValue, Outcome } from "../rules/types";

export type FenceGuideSection = "what_you_can_do" | "before_you_build" | "check_this";
export interface FenceGuideItem {
  key: string;
  title: string;
  answer?: string;
  qualification?: string;
  body: string;
  bullets?: string[];
  citations: Citation[];
  assetId?: string;
  values?: Record<string, JsonValue>;
  actionText?: string;
  secondaryRequirement?: string;
}
export interface FenceGuide { zoningDistrict: string | null; propertyContext: string[]; highlights: FenceGuideItem[]; whatYouCanDo: FenceGuideItem[]; beforeYouBuild: FenceGuideItem[]; checkThis: FenceGuideItem[] }

const allRules = (result: EvaluationResult) => [...result.matchedRules, ...result.reviewRequiredRules, ...result.unknownRules, ...result.notMatchedRules];
const outcome = (rule: EvaluatedRule | undefined, type?: string) => rule?.outcomes.find((item) => !type || item.type === type);
const number = (item: Outcome | undefined, key: string) => typeof item?.parameters[key] === "number" ? item.parameters[key] as number : null;
const displayMeasure = (item: Outcome | undefined) => {
  const value = item?.parameters.display_value ?? item?.parameters.value;
  const unit = item?.parameters.display_unit ?? item?.parameters.unit;
  return value == null || unit == null ? null : `${value} ${unit === "ft" ? "feet" : unit === "in" ? "inches" : unit}`;
};
const displayCompactMeasure = (item: Outcome | undefined) => {
  const value = item?.parameters.display_value ?? item?.parameters.value;
  const unit = item?.parameters.display_unit ?? item?.parameters.unit;
  return value == null || unit == null ? null : `${value} ${unit}`;
};
const sourceItem = (rule: EvaluatedRule, item: Omit<FenceGuideItem, "citations">): FenceGuideItem => ({ ...item, citations: rule.citations });

/** Builds a resident guide from structured outcomes; it never treats an unmatched prohibition as permission. */
export function buildClearwaterFenceGuide(result: EvaluationResult, facts: Facts): FenceGuide {
  const rules = new Map(allRules(result).map((rule) => [rule.key, rule]));
  const whatYouCanDo: FenceGuideItem[] = [];
  const beforeYouBuild: FenceGuideItem[] = [];
  const checkThis: FenceGuideItem[] = [];

  const front = rules.get("height.front_baseline");
  const frontMaximum = outcome(front, "maximum");
  if (front && displayMeasure(frontMaximum)) whatYouCanDo.push(sourceItem(front, {
    key: front.key, title: "Front yard", answer: `${displayCompactMeasure(frontMaximum)} maximum fence height`,
    qualification: "Ordinary, non-chain-link fence.",
    body: `For an ordinary, non-chain-link fence, the maximum height is ${displayMeasure(frontMaximum)}. Other designs or special locations may follow different rules.`,
    values: frontMaximum?.parameters,
  }));

  const sideRear = rules.get("height.side_rear_baseline");
  const sideRearMaximum = outcome(sideRear, "maximum");
  if (sideRear && displayMeasure(sideRearMaximum)) whatYouCanDo.push(sourceItem(sideRear, {
    key: sideRear.key, title: "Side + rear", answer: `${displayCompactMeasure(sideRearMaximum)} maximum fence height`,
    qualification: "Ordinary, non-chain-link fence away from a protected waterfront area.",
    body: `For an ordinary, non-chain-link fence away from a protected waterfront area, the maximum height is ${displayMeasure(sideRearMaximum)}.`,
    values: sideRearMaximum?.parameters,
  }));

  const material = rules.get("material.metal_prohibition");
  if (material) {
    const materialText = material.outcomes[0]?.messageTemplate ?? material.summary;
    whatYouCanDo.push(sourceItem(material, {
      key: material.key, title: "Materials", answer: "No corrugated or sheet metal fencing",
      body: materialText,
    }));
  }

  for (const [key, title, fallback] of [
    ["permit.building_required", "Building permit required", "Get a building permit before construction."],
    ["permit.review_path", "Submit your application and plans", "Submit the application and applicable plans for City review."],
    ["permit.final_inspection", "Final inspection", "Request a final inspection after the work is complete."],
  ] as const) {
    const rule = rules.get(key);
    if (rule?.status === "MATCHED") beforeYouBuild.push(sourceItem(rule, {
      key, title, answer: key === "permit.building_required" ? "Required" : undefined,
      body: rule.outcomes[0]?.messageTemplate ?? fallback,
    }));
  }

  const permitDuty = beforeYouBuild.find((item) => item.key === "permit.building_required");
  const reviewDuty = beforeYouBuild.find((item) => item.key === "permit.review_path");
  const inspectionDuty = beforeYouBuild.find((item) => item.key === "permit.final_inspection");
  const permitCitations = [permitDuty, reviewDuty, inspectionDuty]
    .flatMap((item) => item?.citations ?? [])
    .filter((citation, index, citations) => citations.findIndex((candidate) =>
      candidate.sourceUrl === citation.sourceUrl && candidate.sectionIdentifier === citation.sectionIdentifier
    ) === index);
  const permitAction = permitDuty ? {
    ...permitDuty,
    title: "Get your fence permit",
    answer: "Permit required",
    actionText: reviewDuty?.body,
    secondaryRequirement: inspectionDuty?.body,
    citations: permitCitations,
  } : undefined;

  const visibility = rules.get("visibility.triangle_restriction");
  const height = outcome(visibility, "maximum");
  const opacity = outcome(visibility, "required_value");
  const assetId = height?.parameters.presentation_asset_id === "clearwater_sight_visibility_triangle_v1" ? "clearwater_sight_visibility_triangle_v1" : undefined;
  if (visibility && height && opacity && assetId) {
    const leg1 = number(height, "horizontal_leg_1_ft");
    const leg2 = number(height, "horizontal_leg_2_ft");
    checkThis.push(sourceItem(visibility, {
      key: visibility.key, title: "Special visibility rules may apply",
      body: "Groundrule cannot tell from the stored property data whether your fence enters this area.",
      bullets: [
        `The visibility area extends ${leg1} feet along one applicable edge and ${leg2} feet along the other applicable edge.`,
        `Only a ${String(opacity.parameters.meaning)} fence is permitted there.`,
        `The maximum fence height in the visibility area is ${displayMeasure(height)}.`,
        "Ask Clearwater to confirm the exact area; a City Engineer exception may be available.",
      ], assetId, values: { ...height.parameters, ...opacity.parameters },
    }));
  }

  const highlights = [...whatYouCanDo, ...(permitDuty ? [{ ...permitDuty, title: "Permit", answer: "Permit required" }] : [])];
  const zoningDistrict = typeof facts["property.zoning_district"] === "string" ? facts["property.zoning_district"] : null;
  const propertyContext = zoningDistrict ? [`Zoning · ${zoningDistrict.toUpperCase()}`] : [];
  return { zoningDistrict, propertyContext, highlights, whatYouCanDo, beforeYouBuild: permitAction ? [permitAction] : [], checkThis };
}
