import type { Citation, EvaluationResult, Facts } from "../rules/types";

export interface ShortTermRentalGuide {
  status: "not_allowed" | "allowed" | "unknown";
  heading: string;
  explanation: string;
  zoningDistrict: string | null;
  propertyContext: string[];
  citations: Citation[];
}

export const CLEARWATER_SHORT_TERM_RENTAL_GUIDANCE_URL = "https://www.myclearwater.com/My-Government/0-City-Departments/Planning-Development/Code-Compliance/Citizens-Guide-to-Code-Compliance";

/** Presents only conclusions produced by the generalized evaluator. */
export function buildClearwaterShortTermRentalGuide(result: EvaluationResult, facts: Facts): ShortTermRentalGuide {
  const zoningDistrict = typeof facts["property.zoning_district"] === "string" ? facts["property.zoning_district"] : null;
  const prohibition = result.matchedRules.find((rule) => rule.outcomes.some((outcome) => outcome.type === "prohibition"));
  const prohibitionMessage = prohibition?.outcomes.find((outcome) => outcome.type === "prohibition")?.messageTemplate;
  if (prohibition) return {
    status: "not_allowed",
    heading: "Not allowed at this property",
    explanation: zoningDistrict === "lmdr"
      ? `${prohibitionMessage} Rentals must be for at least 31 days or one calendar month, whichever is less.`
      : prohibitionMessage!,
    zoningDistrict,
    propertyContext: zoningDistrict ? [`Zoning · ${zoningDistrict.toUpperCase()}`] : [],
    citations: prohibition.citations,
  };
  return { status: "unknown", heading: "Needs confirmation", explanation: "This property cannot be confirmed from the available property data.", zoningDistrict, propertyContext: [], citations: [] };
}
