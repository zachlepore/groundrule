#!/usr/bin/env node

/** Read-only, exact-intersection diagnostics for REVIEW parcels with ambiguous zoning. */
import area from "@turf/area";
import bbox from "@turf/bbox";
import booleanValid from "@turf/boolean-valid";
import { featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import RBush from "rbush";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeZoning } from "./clearwater-pilot.mjs";

const REQUIRED_FILES = ["property-profiles.json", "parcels.geojson", "zoning.geojson"];
const PARCEL_ID_FIELDS = ["PARCELID", "STRAP", "PARCEL_ID", "PARCELNO", "FOLIO"];
const ZONING_ID_FIELDS = ["OBJECTID", "GlobalID", "GLOBALID"];
const ZONING_CODE_FIELDS = ["ZONING", "ZONING_CODE", "DISTRICT"];
const SAMPLE_SIZE = 20;

function property(properties, fields) {
  for (const field of fields) if (properties?.[field] != null && properties[field] !== "") return properties[field];
  return null;
}

function fixed(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function isPolygon(featureValue) {
  return ["Polygon", "MultiPolygon"].includes(featureValue?.geometry?.type);
}

function validity(featureValue) {
  if (!isPolygon(featureValue)) return false;
  try { return booleanValid(featureValue); } catch { return false; }
}

function exactIntersection(left, right) {
  try { return intersect(featureCollection([left, right])); } catch { return null; }
}

function indexItem(zoningFeature, index) {
  const [minX, minY, maxX, maxY] = bbox(zoningFeature);
  return { minX, minY, maxX, maxY, zoningFeature, index };
}

function sameCodeOverlap(entries) {
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const overlap = exactIntersection(entries[left].feature, entries[right].feature);
      if (overlap && area(overlap) > 0.000001) return true;
    }
  }
  return false;
}

export function analyzeAmbiguousZoning(profiles, parcels, zoning) {
  const affectedIds = [...new Set(profiles
    .filter((profile) => profile.issues?.includes("parcel_ambiguous_zoning") && profile.parcelIdentifier != null)
    .map((profile) => String(profile.parcelIdentifier)))].sort();
  const parcelById = new Map();
  for (const parcel of parcels.features ?? []) {
    const id = property(parcel.properties, PARCEL_ID_FIELDS);
    if (id != null && !parcelById.has(String(id))) parcelById.set(String(id), parcel);
  }

  const tree = new RBush();
  const indexableZoning = (zoning.features ?? []).filter(isPolygon);
  tree.load(indexableZoning.map(indexItem));

  const results = affectedIds.map((parcelIdentifier) => {
    const parcel = parcelById.get(parcelIdentifier);
    if (!parcel || !isPolygon(parcel)) return {
      parcelIdentifier, parcelFound: Boolean(parcel), parcelGeometryValid: false,
      parcelMultipart: parcel?.geometry?.type === "MultiPolygon", diagnosticCandidate: false,
      diagnosticCandidateFailures: [parcel ? "parcel_geometry_invalid" : "parcel_not_found"], zoningFeatures: [], zoningCodeCoverage: [],
    };

    const parcelAreaSquareMeters = area(parcel);
    const [minX, minY, maxX, maxY] = bbox(parcel);
    const intersections = tree.search({ minX, minY, maxX, maxY })
      .map(({ zoningFeature, index }) => {
        const overlap = exactIntersection(parcel, zoningFeature);
        const intersectionAreaSquareMeters = overlap ? area(overlap) : 0;
        if (intersectionAreaSquareMeters <= 0.000001) return null;
        const rawCode = property(zoningFeature.properties, ZONING_CODE_FIELDS);
        return {
          feature: zoningFeature,
          sourceIndex: index,
          sourceIdentifier: property(zoningFeature.properties, ZONING_ID_FIELDS),
          rawZoningCode: rawCode,
          normalizedZoningCode: normalizeZoning(rawCode),
          geometryValid: validity(zoningFeature),
          multipart: zoningFeature.geometry.type === "MultiPolygon",
          intersectionAreaSquareMeters,
          percentOfParcel: parcelAreaSquareMeters ? intersectionAreaSquareMeters * 100 / parcelAreaSquareMeters : 0,
        };
      }).filter(Boolean)
      .sort((a, b) => a.normalizedZoningCode.localeCompare(b.normalizedZoningCode)
        || String(a.sourceIdentifier ?? "").localeCompare(String(b.sourceIdentifier ?? "")) || a.sourceIndex - b.sourceIndex);

    const grouped = new Map();
    for (const entry of intersections) grouped.set(entry.normalizedZoningCode, [...(grouped.get(entry.normalizedZoningCode) ?? []), entry]);
    const zoningCodeCoverage = [...grouped].map(([normalizedZoningCode, entries]) => ({
      normalizedZoningCode,
      featureCount: entries.length,
      repeatedPolygons: entries.length > 1,
      overlappingPolygons: sameCodeOverlap(entries),
      intersectionAreaSquareMeters: fixed(entries.reduce((sum, entry) => sum + entry.intersectionAreaSquareMeters, 0), 3),
      percentOfParcel: fixed(entries.reduce((sum, entry) => sum + entry.percentOfParcel, 0)),
    })).sort((a, b) => b.percentOfParcel - a.percentOfParcel || a.normalizedZoningCode.localeCompare(b.normalizedZoningCode));
    const dominant = zoningCodeCoverage[0] ?? null;
    const totalZoningCoveragePercent = zoningCodeCoverage.reduce((sum, item) => sum + item.percentOfParcel, 0);
    const parcelGeometryValid = validity(parcel);
    const hasRepeatedNormalizedCode = zoningCodeCoverage.some((item) => item.repeatedPolygons);
    const failures = [];
    if (!parcelGeometryValid) failures.push("parcel_geometry_invalid");
    if (!dominant || dominant.percentOfParcel < 99.9) failures.push("dominant_coverage_below_99.9_percent");
    if (totalZoningCoveragePercent < 99.9 || totalZoningCoveragePercent > 100.1) failures.push("total_coverage_outside_99.9_to_100.1_percent");
    if (hasRepeatedNormalizedCode) failures.push("repeated_normalized_zoning_code_polygons");

    return {
      parcelIdentifier,
      parcelFound: true,
      parcelGeometryValid,
      parcelMultipart: parcel.geometry.type === "MultiPolygon",
      parcelAreaSquareMeters: fixed(parcelAreaSquareMeters, 3),
      intersectingZoningFeatureCount: intersections.length,
      hasMultipartZoning: intersections.some((entry) => entry.multipart),
      hasInvalidZoningGeometry: intersections.some((entry) => !entry.geometryValid),
      hasRepeatedNormalizedCode,
      hasOverlappingSameCodePolygons: zoningCodeCoverage.some((item) => item.overlappingPolygons),
      dominantNormalizedZoningCode: dominant?.normalizedZoningCode ?? null,
      dominantZoningCoveragePercent: dominant?.percentOfParcel ?? 0,
      totalZoningCoveragePercent: fixed(totalZoningCoveragePercent),
      diagnosticCandidate: failures.length === 0,
      diagnosticCandidateFailures: failures,
      zoningFeatures: intersections.map((entry) => ({
        sourceIndex: entry.sourceIndex,
        sourceIdentifier: entry.sourceIdentifier,
        rawZoningCode: entry.rawZoningCode,
        normalizedZoningCode: entry.normalizedZoningCode,
        geometryValid: entry.geometryValid,
        multipart: entry.multipart,
        intersectionAreaSquareMeters: fixed(entry.intersectionAreaSquareMeters, 3),
        percentOfParcel: fixed(entry.percentOfParcel),
      })),
      zoningCodeCoverage,
    };
  });

  const countBy = (values) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));
  const candidates = results.filter((result) => result.diagnosticCandidate);
  return {
    generatedAt: new Date().toISOString(),
    diagnosticOnly: true,
    criteria: { parcelGeometryValid: true, minimumDominantCoveragePercent: 99.9, totalCoveragePercentRange: [99.9, 100.1], allowRepeatedNormalizedCodePolygons: false },
    summary: {
      affectedProfileCount: profiles.filter((profile) => profile.issues?.includes("parcel_ambiguous_zoning")).length,
      uniqueAffectedParcelCount: affectedIds.length,
      analyzedParcelCount: results.length,
      diagnosticCandidateCount: candidates.length,
      multipartParcelCount: results.filter((result) => result.parcelMultipart).length,
      invalidParcelGeometryCount: results.filter((result) => !result.parcelGeometryValid).length,
      repeatedNormalizedCodeParcelCount: results.filter((result) => result.hasRepeatedNormalizedCode).length,
      overlappingSameCodeParcelCount: results.filter((result) => result.hasOverlappingSameCodePolygons).length,
      dominantZoneDistribution: countBy(results.map((result) => result.dominantNormalizedZoningCode ?? "<none>")),
      candidateDominantZoneDistribution: countBy(candidates.map((result) => result.dominantNormalizedZoningCode ?? "<none>")),
    },
    representativeSamples: results.slice().sort((a, b) => Number(b.diagnosticCandidate) - Number(a.diagnosticCandidate) || a.parcelIdentifier.localeCompare(b.parcelIdentifier)).slice(0, SAMPLE_SIZE),
    parcels: results,
  };
}

function renderSamples(report) {
  const rows = report.representativeSamples.map((item) => `| ${item.parcelIdentifier} | ${item.parcelGeometryValid} | ${item.parcelAreaSquareMeters ?? ""} | ${item.dominantNormalizedZoningCode ?? ""} | ${item.dominantZoningCoveragePercent ?? 0}% | ${item.totalZoningCoveragePercent ?? 0}% | ${item.hasRepeatedNormalizedCode ?? false} | ${item.diagnosticCandidate} |`);
  return `# Clearwater zoning ambiguity diagnostic samples\n\nThis report is diagnostic only. It does not alter profiles, classifications, or zoning matches. Samples are deterministically ordered by candidate status and parcel identifier.\n\n| Parcel | Valid | Area (m²) | Dominant code | Dominant coverage | Total coverage | Repeated code polygons | Candidate |\n|---|---:|---:|---|---:|---:|---:|---:|\n${rows.join("\n")}\n`;
}

export async function runDiagnostic(inputDirectory, outputDirectory) {
  const input = path.resolve(inputDirectory);
  const output = path.resolve(outputDirectory);
  if (input === output) throw new Error("Output directory must differ from the input directory");
  const [profiles, parcels, zoning] = await Promise.all(REQUIRED_FILES.map(async (name) => JSON.parse(await readFile(path.join(input, name), "utf8"))));
  const report = analyzeAmbiguousZoning(profiles, parcels, zoning);
  await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(path.join(output, "zoning-diagnostic.json"), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(path.join(output, "representative-samples.md"), renderSamples(report)),
  ]);
  return report;
}

async function main() {
  const [, , inputDirectory, outputDirectory] = process.argv;
  if (!inputDirectory || !outputDirectory) throw new Error("Usage: npm run gis:clearwater:diagnose-zoning -- <input-directory> <output-directory>");
  const output = path.resolve(outputDirectory);
  await rm(output, { recursive: true, force: true });
  const report = await runDiagnostic(inputDirectory, output);
  console.log(JSON.stringify(report.summary, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => {
  console.error(`Zoning diagnostic failed: ${error.message}`);
  process.exitCode = 1;
});
