import type { Citation, EvaluationResult, Facts } from "../rules/types";

export interface ShortTermRentalGuide {
  status: "not_allowed" | "allowed" | "unknown";
  heading: string;
  explanation: string;
  zoningDistrict: string | null;
  propertyContext: string[];
  citations: Citation[];
}

/** Presents only conclusions produced by the generalized evaluator. */
export function buildClearwaterShortTermRentalGuide(result: EvaluationResult, facts: Facts): ShortTermRentalGuide {
  const zoningDistrict = typeof facts["property.zoning_district"] === "string" ? facts["property.zoning_district"] : null;
  const prohibition = result.matchedRules.find((rule) => rule.outcomes.some((outcome) => outcome.type === "prohibition"));
  if (prohibition) return {
    status: "not_allowed",
    heading: "NOT ALLOWED",
    explanation: prohibition.outcomes.find((outcome) => outcome.type === "prohibition")!.messageTemplate,
    zoningDistrict,
    propertyContext: zoningDistrict ? [`Zoning · ${zoningDistrict.toUpperCase()}`] : [],
    citations: prohibition.citations,
  };
  return { status: "unknown", heading: "NEEDS CONFIRMATION", explanation: "Groundrule can’t confirm this property yet.", zoningDistrict, propertyContext: [], citations: [] };
}
