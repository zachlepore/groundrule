/** Pure offline source interpretation. Not imported by lookup, facts, engine or Guides. */
import { createHash } from "node:crypto";
import registryJson from "../../research/gis/clearwater-ncod-mappings.v1.json";
import type { InterpretedOverlay, ZoningEvidence, ZoningInterpretation } from "./types";

export interface SourceFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: unknown;
  [key: string]: unknown;
}
export interface MappingEntry {
  originalSourceCode: string;
  baseCode: string;
  kind: "base_with_overlay" | "district";
  overlay: { type: "NCOD"; code: string; name: string } | null;
  citationIds: string[];
  sourcePolygons: { OBJECTID: number; ZONING: string; ZONING_DESC: string; SPECIAL: string | null; featureSha256: string }[];
}
export interface ZoningMappingRegistry {
  schemaVersion: 1;
  registryVersion: string;
  jurisdiction: string;
  snapshotId: string;
  archiveSha256: string;
  zoningFileSha256: string;
  regulatoryEvidenceSha256: string;
  legalCurrencyVerified: false;
  entries: MappingEntry[];
}

/** Sorted object keys; preserves array order, rejects lossy/non-JSON values. */
export function canonicalZoningJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    check(Object.keys(value).length === value.length, "Sparse or extended evidence array");
    return `[${value.map(canonicalZoningJson).join(",")}]`;
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map(key => `${JSON.stringify(key)}:${canonicalZoningJson(row[key])}`).join(",")}}`;
  }
  throw new Error("Non-JSON zoning evidence");
}
export const zoningEvidenceHash = (value: unknown): string => createHash("sha256").update(canonicalZoningJson(value)).digest("hex");
const REGISTRY_SHA256 = "fbdc5988be614857615e832b0cf4501997f699aeaf4f44973df73ff284239734";
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
export function validateZoningRegistry(value: unknown): asserts value is ZoningMappingRegistry {
  // Pin the reviewed content, not a caller-provided checksum. Any modification requires review/versioning.
  check(zoningEvidenceHash(value) === REGISTRY_SHA256, "Unreviewed or incompatible mapping registry");
}
export function getClearwaterZoningRegistry(): ZoningMappingRegistry {
  const copy: unknown = JSON.parse(JSON.stringify(registryJson)); validateZoningRegistry(copy); return copy;
}
export interface SourceMappingContext {
  jurisdiction: string;
  snapshotId: string;
  registryVersion: string;
  archiveSha256: string;
  zoningFileSha256: string;
  originalSourceZoning: string;
  feature: SourceFeature;
}
export type SourceMappingResolution =
  | { state: "identified"; entry: MappingEntry; featureSha256: string }
  | { state: "unsupported" | "conflicting"; reason: string };
export function resolveExactZoningMapping(context: SourceMappingContext, registry: unknown = registryJson): SourceMappingResolution {
  validateZoningRegistry(registry);
  if (context.jurisdiction !== registry.jurisdiction || context.snapshotId !== registry.snapshotId || context.registryVersion !== registry.registryVersion || context.archiveSha256 !== registry.archiveSha256 || context.zoningFileSha256 !== registry.zoningFileSha256)
    return { state: "unsupported", reason: "source_or_registry_version_mismatch" };
  const entry = registry.entries.find(e => e.originalSourceCode === context.originalSourceZoning);
  if (!entry) return { state: "unsupported", reason: "unmapped_exact_source_code" };
  const p = context.feature.properties;
  const polygon = entry.sourcePolygons.find(f => f.OBJECTID === p.OBJECTID);
  if (!polygon || p.ZONING !== context.originalSourceZoning || p.ZONING_DESC !== polygon.ZONING_DESC || p.SPECIAL !== polygon.SPECIAL)
    return { state: "conflicting", reason: "polygon_or_attribute_mismatch" };
  const hash = zoningEvidenceHash(context.feature);
  if (hash !== polygon.featureSha256) return { state: "conflicting", reason: "source_feature_hash_mismatch" };
  return { state: "identified", entry: JSON.parse(JSON.stringify(entry)) as MappingEntry, featureSha256: hash };
}

// Strict runtime validator: unknown fields (including facts/approvals) are rejected.
function object(value: unknown, keys: string[]): Record<string, unknown> {
  check(value !== null && typeof value === "object" && !Array.isArray(value), "Expected object");
  const o = value as Record<string, unknown>;
  check(Object.keys(o).sort().join("|") === [...keys].sort().join("|"), "Unexpected or missing fields"); return o;
}
function text(value: unknown): asserts value is string { check(typeof value === "string" && value.trim().length > 0, "Expected nonempty text"); }
function strings(value: unknown, min = 0): asserts value is string[] {
  check(Array.isArray(value) && value.length >= min, "Expected text array"); value.forEach(text);
  check(new Set(value).size === value.length, "Duplicate evidence or identity");
}
function choice(value: unknown, values: string[]) { check(typeof value === "string" && values.includes(value), "Invalid state"); }
function sha(value: unknown) { check(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), "Invalid SHA-256"); }
function evidence(value: unknown) { const o = object(value, ["refs", "sha256"]); strings(o.refs, 1); sha(o.sha256); }
export function validateZoningInterpretation(value: unknown): asserts value is ZoningInterpretation {
  const o = object(value, ["schemaVersion", "interpretationVersion", "jurisdiction", "sourceIdentity", "originalSourceZoning", "base", "overlayInventory", "overlays", "spatialEvidenceRef", "sourceQaRef", "holds", "projectReadiness"]);
  check(o.schemaVersion === 1, "Unsupported interpretation schema");
  for (const k of ["interpretationVersion", "jurisdiction", "originalSourceZoning", "spatialEvidenceRef", "sourceQaRef"]) text(o[k]);
  const s = object(o.sourceIdentity, ["snapshotId", "archiveSha256", "zoningFileSha256", "profileEvidenceSha256", "mappingSha256"]); text(s.snapshotId);
  for (const k of ["archiveSha256", "zoningFileSha256", "profileEvidenceSha256", "mappingSha256"]) sha(s[k]);
  const base = o.base as Record<string, unknown>; check(base && typeof base === "object", "Missing base");
  choice(base.state, ["identified", "unknown", "conflicting"]);
  object(base, base.state === "identified" ? ["state", "code", "evidence"] : base.state === "conflicting" ? ["state", "candidates", "evidence"] : ["state", "evidence"]);
  evidence(base.evidence);
  if (base.state === "identified") text(base.code);
  if (base.state === "conflicting") strings(base.candidates, 2);
  const inv = object(o.overlayInventory, ["state", "scope", "legalApplicabilityConfirmed", "evidence"]);
  choice(inv.state, ["complete_for_source", "unknown", "conflicting"]); text(inv.scope); evidence(inv.evidence);
  check(inv.legalApplicabilityConfirmed === false, "Stage A cannot certify legal inventory");
  check(Array.isArray(o.overlays), "Expected overlays"); const identities = new Set<string>();
  for (const item of o.overlays) {
    const overlay = object(item, ["type", "code", "name", "mappingState", "applicability", "evidence", "applicabilityEvidence", "provisionRefs"]);
    for (const k of ["type", "code", "name"]) text(overlay[k]);
    const id = `${overlay.type}:${overlay.code}`; check(!identities.has(id), "Duplicate overlay"); identities.add(id);
    choice(overlay.mappingState, ["source_verified", "unknown", "conflicting"]); choice(overlay.applicability, ["verified", "absent", "unknown", "conflicting"]);
    evidence(overlay.evidence); strings(overlay.provisionRefs);
    if (overlay.mappingState === "source_verified") strings(overlay.provisionRefs, 1);
    if (overlay.applicabilityEvidence !== null) evidence(overlay.applicabilityEvidence);
    if (overlay.applicability !== "unknown") check(overlay.applicabilityEvidence !== null, "Applicability needs independent evidence");
    if (overlay.applicability === "verified") check(overlay.mappingState === "source_verified", "Unverified overlay identity");
  }
  check(Array.isArray(o.holds), "Expected holds");
  for (const h of o.holds) { const hold = object(h, ["kind", "code", "evidenceRefs"]); choice(hold.kind, ["source_qc", "human", "interpretation"]); text(hold.code); strings(hold.evidenceRefs, 1); }
  check(o.projectReadiness !== null && typeof o.projectReadiness === "object" && !Array.isArray(o.projectReadiness), "Expected project readiness");
  check(Object.keys(o.projectReadiness).length > 0, "Missing project readiness");
  for (const [project, state] of Object.entries(o.projectReadiness)) { text(project); const r = object(state, ["designation", "reasons"]); choice(r.designation, ["unresolved", "ambiguous"]); strings(r.reasons, 1); }
  // Ensure only JSON values were accepted, independently of TypeScript callers.
  canonicalZoningJson(value);
}

/** Checks source compatibility only; never certifies external legal evidence. */
export function validateInterpretationRegistryCompatibility(document: unknown, registry: unknown = registryJson): asserts document is ZoningInterpretation {
  validateZoningInterpretation(document); validateZoningRegistry(registry);
  const s = document.sourceIdentity;
  check(document.jurisdiction === registry.jurisdiction && document.interpretationVersion === registry.registryVersion && s.snapshotId === registry.snapshotId && s.archiveSha256 === registry.archiveSha256 && s.zoningFileSha256 === registry.zoningFileSha256 && s.mappingSha256 === zoningEvidenceHash(registry), "Interpretation source/version mismatch");
  const entry = registry.entries.find(e => e.originalSourceCode === document.originalSourceZoning);
  check(entry, "Unmapped interpretation source code");
  if (document.base.state === "identified") check(document.base.code === entry.baseCode, "Contradictory interpreted base");
  // This checks compatibility, not legal truth or completeness of externally supplied documents.
  if (entry.overlay) check(document.overlays.some(o => o.type === entry.overlay!.type && o.code === entry.overlay!.code && o.name === entry.overlay!.name), "Missing source-identified overlay");
}

/** A single evidenced feature is not a complete parcel overlay inventory or legal finding. */
export function interpretSourceZoning(context: SourceMappingContext, refs: { spatialEvidenceRef: string; sourceQaRef: string; holds: ZoningInterpretation["holds"] }, registry: unknown = registryJson): ZoningInterpretation {
  const result = resolveExactZoningMapping(context, registry);
  check(result.state === "identified", result.state === "identified" ? "" : result.reason);
  validateZoningRegistry(registry);
  const ev: ZoningEvidence = { refs: [`zoning.geojson#OBJECTID=${context.feature.properties.OBJECTID}`, ...result.entry.citationIds], sha256: result.featureSha256 };
  const overlay = result.entry.overlay;
  const overlays: InterpretedOverlay[] = overlay ? [{ ...overlay, mappingState: "source_verified", applicability: "unknown", evidence: ev, applicabilityEvidence: null, provisionRefs: result.entry.citationIds }] : [];
  const document: ZoningInterpretation = {
    schemaVersion: 1, interpretationVersion: registry.registryVersion, jurisdiction: context.jurisdiction,
    sourceIdentity: { snapshotId: context.snapshotId, archiveSha256: context.archiveSha256, zoningFileSha256: context.zoningFileSha256, profileEvidenceSha256: zoningEvidenceHash(context), mappingSha256: zoningEvidenceHash(registry) },
    originalSourceZoning: context.originalSourceZoning, base: { state: "identified", code: result.entry.baseCode, evidence: ev },
    overlayInventory: { state: "unknown", scope: "NCOD_in_frozen_Clearwater_zoning_layer_single_feature_only", legalApplicabilityConfirmed: false, evidence: ev },
    overlays, spatialEvidenceRef: refs.spatialEvidenceRef, sourceQaRef: refs.sourceQaRef, holds: structuredClone(refs.holds),
    projectReadiness: { fence: { designation: "unresolved", reasons: ["source_identity_only", "parcel_overlay_inventory_not_assessed", "legal_applicability_not_confirmed", "overlay_guidance_not_authorized"] } },
  };
  validateInterpretationRegistryCompatibility(document, registry); return structuredClone(document);
}
