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
    heading: "Not allowed at this property",
    explanation: prohibition.outcomes.find((outcome) => outcome.type === "prohibition")!.messageTemplate,
    zoningDistrict,
    propertyContext: zoningDistrict ? [`Zoning · ${zoningDistrict.toUpperCase()}`] : [],
    citations: prohibition.citations,
  };
  return { status: "unknown", heading: "Needs confirmation", explanation: "This property cannot be confirmed from the available property data.", zoningDistrict, propertyContext: [], citations: [] };
}
