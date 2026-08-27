import type { StoredPropertyProfile, TrustedJurisdiction } from "./types";

export type ClearwaterGate =
  | { eligible: true }
  | { eligible: false; reason: "outside" | "unconfirmed"; jurisdictionName: string | null };

/** The single shared admission boundary for every Clearwater municipal evaluator. */
export function gateClearwaterEvaluation(profile: StoredPropertyProfile): ClearwaterGate {
  if (profile.validationStatus === "clean" && profile.jurisdiction.normalizedKey === "clearwater") return { eligible: true };
  const unknown = profile.jurisdiction.normalizedKey === "unknown" || profile.jurisdiction.normalizedKey === "ambiguous";
  return { eligible: false, reason: unknown ? "unconfirmed" : "outside", jurisdictionName: profile.jurisdiction.authorityName };
}

type Point = [number, number];
export interface BoundaryPolygon { jurisdiction: Omit<TrustedJurisdiction, "derivedAt">; rings: Point[][] }

function pointOnSegment(p: Point, a: Point, b: Point) {
  const cross = (p[1] - a[1]) * (b[0] - a[0]) - (p[0] - a[0]) * (b[1] - a[1]);
  return Math.abs(cross) < 1e-10 && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
}

function contains(point: Point, ring: Point[]): "inside" | "boundary" | "outside" {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (pointOnSegment(point, ring[j], ring[i])) return "boundary";
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? "inside" : "outside";
}

const UNKNOWN_SOURCE = "Pinellas County municipal boundary GIS";
export function classifyParcelJurisdiction(parcelRing: Point[], boundaries: BoundaryPolygon[], derivedAt: string): TrustedJurisdiction {
  if (parcelRing.length < 4) return { normalizedKey: "unknown", authorityName: null, source: UNKNOWN_SOURCE, sourceUpdatedAt: null, derivedAt };
  // Test vertices plus edge midpoints. A parcel represented by more than one authority, or touching a boundary, is deliberately ambiguous.
  const samples = parcelRing.flatMap((point, i) => [point, [(point[0] + parcelRing[(i + 1) % parcelRing.length][0]) / 2, (point[1] + parcelRing[(i + 1) % parcelRing.length][1]) / 2] as Point]);
  const matches = new Set<number>();
  let touches = false;
  let uncovered = false;
  samples.forEach((point) => {
    const sampleMatches = new Set<number>();
    boundaries.forEach((boundary, index) => boundary.rings.forEach((ring) => {
      const relation = contains(point, ring); if (relation === "inside") sampleMatches.add(index); if (relation === "boundary") touches = true;
    }));
    if (sampleMatches.size !== 1) uncovered = true;
    sampleMatches.forEach((index) => matches.add(index));
  });
  if (touches || uncovered || matches.size !== 1) return { normalizedKey: matches.size ? "ambiguous" : "unknown", authorityName: null, source: UNKNOWN_SOURCE, sourceUpdatedAt: null, derivedAt };
  return { ...boundaries[[...matches][0]].jurisdiction, derivedAt };
}
