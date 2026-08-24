export type PropertyValidationStatus = "clean" | "review";

export interface StoredPropertyProfile {
  id: string;
  displayAddress: string;
  normalizedZoningCode: string | null;
  validationStatus: PropertyValidationStatus;
}

export interface PublicPropertyMatch {
  displayAddress: string;
  facts: import("../rules/types").Facts;
}
