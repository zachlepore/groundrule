/** Supplemental exact-area evidence only; never assigns zoning or modifies source. */
import { parentPort, workerData } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import bbox from "@turf/bbox";
import area from "@turf/area";
import booleanValid from "@turf/boolean-valid";
import intersect from "@turf/intersect";
import { featureCollection } from "@turf/helpers";
import RBush from "rbush";
import { normalizeZoning } from "./clearwater-pilot.mjs";

const valid = (f) => { try { return booleanValid(f); } catch { return false; } };
const item = (feature, index) => { const [minX, minY, maxX, maxY] = bbox(feature); return { minX, minY, maxX, maxY, feature, index }; };
const rounded = (n) => Number(n.toFixed(6));

export function measureParcel(parcel, entries) {
  const errors = [];
  const overlap = (a, b) => {
    try { const f = intersect(featureCollection([a, b])); return f ? area(f) : 0; }
    catch { errors.push("intersection_error"); return null; }
  };
  const parcelArea = area(parcel);
  const pEntries = entries.filter(e => normalizeZoning(e.feature.properties.ZONING) === "p");
  const pAreas = new Map(pEntries.map(e => [e.index, overlap(parcel, e.feature)]));
  // Positive area means the same > 0.000001 m² evidence cutoff as the frozen diagnostic.
  if (![...pAreas.values()].some(a => a > 0.000001) && !errors.length) return null;
  const zoningFeatures = [];
  for (const e of entries) {
    const a = pAreas.has(e.index) ? pAreas.get(e.index) : overlap(parcel, e.feature);
    if (a == null || a <= 0.000001) continue;
    zoningFeatures.push({ sourceIndex: e.index, sourceIdentifier: e.feature.properties.OBJECTID,
      rawZoningCode: e.feature.properties.ZONING, normalizedZoningCode: normalizeZoning(e.feature.properties.ZONING),
      geometryValid: valid(e.feature), multipart: e.feature.geometry.type === "MultiPolygon",
      intersectionAreaSquareMeters: rounded(a), percentOfParcel: rounded(100 * a / parcelArea) });
  }
  const codes = [...new Set(zoningFeatures.map(e => e.normalizedZoningCode))].sort();
  const zoningCodeCoverage = codes.map(code => {
    const group = zoningFeatures.filter(e => e.normalizedZoningCode === code);
    let overlappingPolygons = false;
    for (let a = 0; a < group.length; a++) for (let b = a + 1; b < group.length; b++) {
      const value = overlap(entries.find(e => e.index === group[a].sourceIndex).feature, entries.find(e => e.index === group[b].sourceIndex).feature);
      if (value > 0.000001) overlappingPolygons = true;
    }
    return { normalizedZoningCode: code, featureCount: group.length, repeatedPolygons: group.length > 1,
      overlappingPolygons, intersectionAreaSquareMeters: rounded(group.reduce((s,e) => s + e.intersectionAreaSquareMeters, 0)),
      percentOfParcel: rounded(group.reduce((s,e) => s + e.percentOfParcel, 0)) };
  });
  return { parcelIdentifier: String(parcel.properties.PARCELID ?? parcel.properties.STRAP), parcelFound: true,
    parcelGeometryValid: valid(parcel), parcelMultipart: parcel.geometry.type === "MultiPolygon",
    parcelAreaSquareMeters: rounded(parcelArea), hasInvalidZoningGeometry: zoningFeatures.some(e => !e.geometryValid),
    hasRepeatedNormalizedCode: zoningCodeCoverage.some(e => e.repeatedPolygons),
    hasOverlappingSameCodePolygons: zoningCodeCoverage.some(e => e.overlappingPolygons),
    totalZoningCoveragePercent: rounded(zoningCodeCoverage.reduce((s,e) => s + e.percentOfParcel, 0)),
    zoningFeatures, zoningCodeCoverage, sourceErrors: [...new Set(errors)], evidenceMethod: "supplemental_exact_intersection" };
}

if (parentPort && workerData) {
  const zoning = JSON.parse(await readFile(`${workerData.input}/zoning.geojson`, "utf8"));
  const parcels = JSON.parse(await readFile(`${workerData.input}/parcels.geojson`, "utf8"));
  const requested = new Set(workerData.ids);
  const tree = new RBush(); tree.load(zoning.features.map(item));
  const results = [];
  let count = 0;
  for (const parcel of parcels.features) {
    const id = String(parcel.properties.PARCELID ?? parcel.properties.STRAP);
    if (!requested.has(id)) continue;
    const entry = item(parcel, 0);
    const measured = measureParcel(parcel, tree.search(entry));
    if (measured) results.push(measured);
    if (++count % 250 === 0) parentPort.postMessage({ progress: count, total: requested.size });
  }
  parentPort.postMessage({ results });
}
