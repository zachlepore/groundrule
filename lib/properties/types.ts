export type PropertyValidationStatus = "clean" | "review";
export type JurisdictionKey = "clearwater" | "unincorporated_pinellas" | "other_pinellas_municipality" | "unknown" | "ambiguous";

export interface TrustedJurisdiction {
  normalizedKey: JurisdictionKey;
  authorityName: string | null;
  source: string;
  sourceUpdatedAt: string | null;
  derivedAt: string;
}

export interface StoredPropertyProfile {
  id: string;
  displayAddress: string;
  normalizedZoningCode: string | null;
  validationStatus: PropertyValidationStatus;
  jurisdiction: TrustedJurisdiction;
}

export interface PublicPropertyMatch {
  displayAddress: string;
  facts: import("../rules/types").Facts;
}

/** Informational address resolution. This result never authorizes rule evaluation. */
export type PropertyResolutionResult =
  | { status: "no_match" }
  | { status: "ambiguous"; matchCount: number }
  | { status: "untrusted_property"; propertyId: string; validationStatus: "review" }
  | { status: "resolved"; property: StoredPropertyProfile };
