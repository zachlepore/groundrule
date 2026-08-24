import type { Facts } from "../rules/types";
import type { StoredPropertyProfile } from "./types";

export function propertyProfileToFacts(profile: StoredPropertyProfile): Facts {
  if (profile.validationStatus !== "clean") return {};
  if (!profile.normalizedZoningCode) return {};
  return { "property.zoning_district": profile.normalizedZoningCode };
}
