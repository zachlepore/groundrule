import type { Citation, EvaluatedRule, EvaluationResult, Facts, JsonValue, Outcome } from "../rules/types";

export interface ShedGuideItem { key: string; title: string; answer: string; qualification?: string; citations: Citation[]; values?: Record<string, JsonValue> }
export interface ShedGuide { zoningDistrict: string | null; propertyContext: string[]; highlights: ShedGuideItem[]; specificSituations: ShedGuideItem[] }
const rules = (result: EvaluationResult) => new Map([...result.matchedRules, ...result.reviewRequiredRules, ...result.unknownRules, ...result.notMatchedRules].map((rule) => [rule.key, rule]));
const outcome = (rule: EvaluatedRule | undefined, type: string): Outcome | undefined => rule?.outcomes.find((value) => value.type === type);
const item = (rule: EvaluatedRule, title: string, answer: string, qualification?: string, values?: Record<string, JsonValue>): ShedGuideItem => ({ key: rule.key, title, answer, qualification, values, citations: rule.citations });

export function qualifiesForShedBuildingPermitExemption(parameters: Record<string, JsonValue>, areaSqFt: number): boolean {
  const maximum = parameters.exempt_max_sq_ft;
  if (typeof maximum !== "number") return false;
  return parameters.exempt_max_inclusive === true ? areaSqFt <= maximum : areaSqFt < maximum;
}

/** Converts structured outcomes into an answers-first shed guide. */
export function buildClearwaterShedGuide(result: EvaluationResult, facts: Facts): ShedGuide {
  const byKey = rules(result); const highlights: ShedGuideItem[] = []; const specificSituations: ShedGuideItem[] = [];
  const exemption = byKey.get("permit.small_shed_exemption"); const threshold = outcome(exemption, "exemption");
  if (exemption && threshold) highlights.push(item(exemption, "Building permit", `Not required for sheds ${threshold.parameters.exempt_max_sq_ft} sq ft or smaller.`, "Measured by the shed footprint using exterior dimensions. Even without a building permit, your shed still has to meet Clearwater’s setback and zoning rules.", threshold.parameters));
  const setback = byKey.get("location.lmdr_setbacks"); const minimums = outcome(setback, "obligation");
  if (setback && minimums) highlights.push(item(setback, "Setbacks", `${minimums.parameters.front_ft} ft from the front property line · ${minimums.parameters.side_ft} ft from a side property line · ${minimums.parameters.rear_ft} ft from the rear property line`, "The shed cannot be between the street right-of-way and the principal structure.", minimums.parameters));
  const height = byKey.get("height.residential_maximum"); const maximum = outcome(height, "maximum");
  if (height && maximum) highlights.push(item(height, "Maximum height", `${maximum.parameters.value} ft maximum shed height`, undefined, maximum.parameters));
  const larger = byKey.get("permit.larger_shed_review"); const largerOutcome = outcome(larger, "external_authority_required"); if (larger && largerOutcome) specificSituations.push(item(larger, `Sheds larger than ${largerOutcome.parameters.trigger_min_exclusive_sq_ft} sq ft`, largerOutcome.messageTemplate ?? larger.summary, undefined, largerOutcome.parameters));
  const utilities = byKey.get("permit.utilities"); if (utilities) specificSituations.push(item(utilities, "Electricity or plumbing", utilities.outcomes[0]?.messageTemplate ?? utilities.summary));
  const zoningDistrict = typeof facts["property.zoning_district"] === "string" ? facts["property.zoning_district"] : null;
  return { zoningDistrict, propertyContext: zoningDistrict ? [`Zoning · ${zoningDistrict.toUpperCase()}`] : [], highlights, specificSituations };
}
