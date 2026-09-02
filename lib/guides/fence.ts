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
  action?: { label: string; url: string };
}
export interface FenceGuide { zoningDistrict: string | null; propertyContext: string[]; highlights: FenceGuideItem[]; whatYouCanDo: FenceGuideItem[]; beforeYouBuild: FenceGuideItem[]; checkThis: FenceGuideItem[]; specificSituations: FenceGuideItem[] }

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
const conditionValues = (rule: EvaluatedRule | undefined, fact: string): string[] => {
  if (!rule) return [];
  const visit = (condition: EvaluatedRule["condition"]): JsonValue[] => {
    if ("all" in condition) return condition.all.flatMap(visit);
    if ("any" in condition) return condition.any.flatMap(visit);
    if ("not" in condition) return visit(condition.not);
    return condition.fact === fact && "values" in condition ? condition.values : [];
  };
  return visit(rule.condition).filter((value): value is string => typeof value === "string");
};
const vinylColorList = (values: string[]) => values.map((value, index) => `${value.replaceAll("_", " ")}${index < values.length - 1 ? "-" : ""}`).join(" or ");
const CLEARWATER_FENCE_PERMIT_GUIDANCE_URL = "https://www.myclearwater.com/Business-Development/Permitting/06-Fence-Permit-Application-Checklist";

/** Builds a resident guide from structured outcomes; it never treats an unmatched prohibition as permission. */
export function buildClearwaterFenceGuide(result: EvaluationResult, facts: Facts): FenceGuide {
  const rules = new Map(allRules(result).map((rule) => [rule.key, rule]));
  const whatYouCanDo: FenceGuideItem[] = [];
  const beforeYouBuild: FenceGuideItem[] = [];
  const checkThis: FenceGuideItem[] = [];
  const specificSituations: FenceGuideItem[] = [];

  const front = rules.get("height.front_baseline");
  const frontMaximum = outcome(front, "maximum");
  const frontLandscape = rules.get("design.front_landscape_strip");
  const frontLandscapeMinimum = outcome(frontLandscape, "minimum");
  if (front && displayMeasure(frontMaximum)) whatYouCanDo.push(sourceItem(front, {
    key: front.key, title: "Front yard", answer: `${displayCompactMeasure(frontMaximum)} maximum fence height`,
    qualification: frontLandscapeMinimum && displayMeasure(frontLandscapeMinimum)
      ? `Reaching the full maximum requires a ${displayCompactMeasure(frontLandscapeMinimum)} vegetation buffer on the street side unless the City waives it. Chain-link follows separate rules.`
      : "Chain-link is not allowed in front of the principal structure and follows separate rules.",
    body: frontLandscapeMinimum && displayMeasure(frontLandscapeMinimum)
      ? `For a fence other than chain-link, the maximum height is ${displayMeasure(frontMaximum)}. Reaching that maximum requires a ${displayMeasure(frontLandscapeMinimum)} vegetation buffer on the right-of-way side unless the City waives it. Chain-link is not allowed in front of the principal structure and follows separate rules.`
      : `For a fence other than chain-link, the maximum height is ${displayMeasure(frontMaximum)}. Chain-link is not allowed in front of the principal structure and follows separate rules.`,
    values: { ...frontMaximum?.parameters, landscape_buffer: frontLandscapeMinimum?.parameters ?? {} },
  }));

  const sideRear = rules.get("height.side_rear_baseline");
  const sideRearMaximum = outcome(sideRear, "maximum");
  if (sideRear && displayMeasure(sideRearMaximum)) whatYouCanDo.push(sourceItem(sideRear, {
    key: sideRear.key, title: "Side + rear", answer: `${displayCompactMeasure(sideRearMaximum)} maximum fence height`,
    qualification: "For fences other than chain-link. Chain-link and waterfront locations follow different rules.",
    body: `For a fence other than chain-link, the maximum height is ${displayMeasure(sideRearMaximum)}. Chain-link has separate height, coating, location, and landscaping rules. Waterfront locations need confirmation before relying on this ordinary side/rear answer.`,
    values: sideRearMaximum?.parameters,
  }));

  const material = rules.get("material.metal_prohibition");
  if (material) {
    const materialText = material.outcomes[0]?.messageTemplate ?? material.summary;
    whatYouCanDo.push(sourceItem(material, {
      key: material.key, title: "Materials", answer: "Corrugated or sheet metal fencing is not allowed",
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
      key: visibility.key, title: "Special visibility rules apply",
      body: "If your fence is near a driveway or street corner:",
      bullets: [
        leg1 === leg2 ? `The visibility area extends ${leg1} ft along each applicable edge.` : `The visibility area extends ${leg1} ft along one applicable edge and ${leg2} ft along the other applicable edge.`,
        `Fence in this area must be ${String(opacity.parameters.meaning)}.`,
        `Maximum fence height in this area is ${displayCompactMeasure(height)}.`,
      ], assetId, values: { ...height.parameters, ...opacity.parameters },
    }));
  }

  const chainLocation = rules.get("chain_link.front_location");
  const standardChain = rules.get("chain_link.side_rear_base_height");
  const coatedChain = rules.get("chain_link.side_rear_vinyl_height");
  const chainLandscaping = rules.get("chain_link.landscaping");
  const standardMaximum = outcome(standardChain, "maximum");
  const coatedMaximum = outcome(coatedChain, "maximum");
  const coatingColors = conditionValues(coatedChain, "project.vinyl_color");
  if (chainLocation && standardChain && coatedChain && chainLandscaping && standardMaximum && coatedMaximum && coatingColors.length) {
    const standardFeet = number(standardMaximum, "value");
    const standardInches = standardFeet == null || standardMaximum.parameters.unit !== "ft" ? null : standardFeet * 12;
    if (standardInches != null) specificSituations.push({
      key: "specific.chain_link", title: "Chain-link fences",
      body: `Chain-link fences follow different rules. They generally must be behind the front building line. Standard chain-link is limited to ${standardInches} in. ${vinylColorList(coatingColors).replace(/^./, (letter) => letter.toUpperCase())}-vinyl-coated chain-link may be allowed up to ${displayCompactMeasure(coatedMaximum)}, with additional location and landscaping requirements.`,
      values: { standard_height_in: standardInches, coated_height: coatedMaximum.parameters, coating_colors: coatingColors, placement: outcome(chainLocation, "required_value")?.parameters ?? {}, landscaping: chainLandscaping.outcomes[0]?.parameters ?? {} },
      citations: chainLocation.citations,
    });
  }

  const waterfrontHeight = rules.get("waterfront.height");
  const waterfrontOpacity = rules.get("waterfront.opacity");
  if (waterfrontHeight && waterfrontOpacity) specificSituations.push({
    key: "specific.water_adjacent", title: "Property next to the water",
    body: "Waterfront fence rules depend on the water-adjacent property line, the required setback, and the proposed fence location. Groundrule does not currently have those trusted property and project facts. Contact Clearwater Planning & Zoning before relying on the ordinary height answer.",
    values: { determination: "staff_confirmation_required", reason: "waterfront_property_and_fence_geometry_unavailable" },
    citations: waterfrontHeight.citations,
  });

  const prohibitedAccess = rules.get("access.prohibited_area");
  const utilityEasement = rules.get("access.utility_easement");
  if (prohibitedAccess && utilityEasement) specificSituations.push({
    key: "specific.easement", title: "Fence in an easement or right-of-way",
    body: "City zoning guidance does not authorize interference with utility or access rights. Easements, rights-of-way, meters, and manholes require the applicable City or utility review before placement. Contact Clearwater Planning & Zoning to start that check.",
    values: { determination: "external_review_required" },
    citations: [...prohibitedAccess.citations, ...utilityEasement.citations],
  });

  specificSituations.push({
    key: "specific.government_adjacent", title: "Next to City or County property",
    body: "Additional departmental review is needed when a proposed fence touches or abuts City- or County-owned property. Groundrule cannot currently detect government-property adjacency. Contact Clearwater Planning & Zoning before proceeding.",
    values: { determination: "staff_confirmation_required", reason: "government_adjacency_data_unavailable" },
    citations: [],
  });

  const highlights = [...whatYouCanDo, ...(permitDuty ? [{
    ...permitDuty,
    title: "Permit",
    answer: "Required",
    action: { label: "View fence permit steps", url: CLEARWATER_FENCE_PERMIT_GUIDANCE_URL },
  }] : [])];
  const zoningDistrict = typeof facts["property.zoning_district"] === "string" ? facts["property.zoning_district"] : null;
  const propertyContext = zoningDistrict ? [`Zoning · ${zoningDistrict.toUpperCase()}`] : [];
  return { zoningDistrict, propertyContext, highlights, whatYouCanDo, beforeYouBuild: permitAction ? [permitAction] : [], checkThis, specificSituations };
}
