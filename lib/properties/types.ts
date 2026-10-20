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

/** Source interpretation only. These types do not authorize evaluator inputs. */
export interface ZoningEvidence {
  refs: string[];
  sha256: string;
}
export type InterpretedBaseZoning =
  | { state: "identified"; code: string; evidence: ZoningEvidence }
  | { state: "unknown"; evidence: ZoningEvidence }
  | { state: "conflicting"; candidates: string[]; evidence: ZoningEvidence };
export interface InterpretedOverlay {
  type: string;
  code: string;
  name: string;
  mappingState: "source_verified" | "unknown" | "conflicting";
  applicability: "verified" | "absent" | "unknown" | "conflicting";
  evidence: ZoningEvidence;
  applicabilityEvidence: ZoningEvidence | null;
  provisionRefs: string[];
}
export interface ZoningInterpretation {
  schemaVersion: 1;
  interpretationVersion: string;
  jurisdiction: string;
  sourceIdentity: {
    snapshotId: string;
    archiveSha256: string;
    zoningFileSha256: string;
    profileEvidenceSha256: string;
    mappingSha256: string;
  };
  originalSourceZoning: string | null;
  base: InterpretedBaseZoning;
  overlayInventory: {
    state: "complete_for_source" | "unknown" | "conflicting";
    scope: string;
    legalApplicabilityConfirmed: false;
    evidence: ZoningEvidence;
  };
  overlays: InterpretedOverlay[];
  spatialEvidenceRef: string;
  sourceQaRef: string;
  holds: { kind: "source_qc" | "human" | "interpretation"; code: string; evidenceRefs: string[] }[];
  /** Stage A can represent unresolved readiness only; no approval ID or ready state. */
  projectReadiness: Record<string, { designation: "unresolved" | "ambiguous"; reasons: string[] }>;
}
