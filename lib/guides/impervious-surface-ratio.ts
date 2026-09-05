import type { Citation, EvaluationResult, Facts } from "../rules/types";

export interface ImperviousSurfaceRatioGuide {
  status: "determined" | "unknown";
  maximumPercent: number | null;
  heading: string;
  explanation: string;
  whatCounts: string;
  scopeNote: string;
  propertyContext: string[];
  citations: Citation[];
}

/** Converts only the generalized evaluator's structured maximum outcome into resident copy. */
export function buildClearwaterImperviousSurfaceRatioGuide(result: EvaluationResult, facts: Facts): ImperviousSurfaceRatioGuide {
  const zoning = typeof facts["property.zoning_district"] === "string" ? facts["property.zoning_district"] : null;
  const rule = result.matchedRules.find(candidate => candidate.outcomes.some(outcome => outcome.type === "maximum"));
  const outcome = rule?.outcomes.find(candidate => candidate.type === "maximum");
  const value = outcome?.parameters.value;
  if (rule && outcome && typeof value === "number") return {
    status: "determined", maximumPercent: value, heading: "Maximum allowed",
    explanation: outcome.messageTemplate,
    whatCounts: "Roofs, sidewalks, parking areas, and surfaces made from compacted sand, limerock, shell, or clay are examples of surfaces that can count as impervious.",
    scopeNote: "This is the maximum applicable ratio. This guide does not calculate your property’s existing impervious coverage or remaining capacity.",
    propertyContext: zoning ? [`Zoning · ${zoning.toUpperCase()}`] : [], citations: rule.citations,
  };
  return { status: "unknown", maximumPercent: null, heading: "Needs confirmation", explanation: "The applicable maximum cannot be confirmed from the trusted property facts available.", whatCounts: "Roofs, sidewalks, parking areas, and surfaces made from compacted sand, limerock, shell, or clay are examples of surfaces that can count as impervious.", scopeNote: "No ratio was estimated.", propertyContext: zoning ? [`Zoning · ${zoning.toUpperCase()}`] : [], citations: [] };
}
