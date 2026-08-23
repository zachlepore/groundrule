#!/usr/bin/env node

/** Reproducible, dependency-free ArcGIS acquisition and conservative spatial join. */
import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "research/gis/data/clearwater-pilot-v1");
const TMP = path.join(OUT, ".tmp");
const BBOX = [-82.7605, 27.974, -82.7555, 27.979];
const allowedZoning = new Set(["ldr", "lmdr", "mdr", "mhdr", "hdr", "mhp", "c", "t", "o", "i", "irt", "osr", "p", "d", "us19"]);

const definitions = {
  addresses: { env: "PINELLAS_ADDRESSES_LAYER_URL", fieldsEnv: "PINELLAS_ADDRESS_FIELDS", geometry: true },
  parcels: { env: "PINELLAS_PARCELS_LAYER_URL", fieldsEnv: "PINELLAS_PARCEL_FIELDS", geometry: true },
  zoning: { env: "CLEARWATER_ZONING_LAYER_URL", fieldsEnv: "CLEARWATER_ZONING_FIELDS", geometry: true },
};

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Endpoint/field names must be verified from authoritative layer metadata; see research/gis/clearwater-gis-pilot-v1.md.`);
  return value;
}
function layerUrl(value) { return value.replace(/\/+$/, ""); }
async function requestJson(url, params = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, String(value));
  const response = await fetch(target, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${target}`);
  const body = await response.json();
  if (body.error) throw new Error(`ArcGIS error ${body.error.code}: ${body.error.message}; ${JSON.stringify(body.error.details ?? [])}`);
  return body;
}
async function fetchLayer(name, definition) {
  const url = layerUrl(required(definition.env));
  const fields = required(definition.fieldsEnv).split(",").map((field) => field.trim()).filter(Boolean);
  const metadata = await requestJson(url, { f: "json" });
  if (metadata.type !== "Feature Layer") throw new Error(`${name}: URL is not a Feature Layer`);
  const known = new Set((metadata.fields ?? []).map((field) => field.name));
  const unknown = fields.filter((field) => !known.has(field));
  if (unknown.length) throw new Error(`${name}: fields absent from metadata: ${unknown.join(", ")}`);
  const pageSize = Math.min(metadata.maxRecordCount || 1000, 2000);
  const features = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await requestJson(`${url}/query`, {
      f: "geojson", where: "1=1", geometry: BBOX.join(","), geometryType: "esriGeometryEnvelope",
      inSR: 4326, outSR: 4326, spatialRel: "esriSpatialRelIntersects", outFields: fields.join(","),
      returnGeometry: definition.geometry, resultOffset: offset, resultRecordCount: pageSize,
      orderByFields: metadata.objectIdField ? `${metadata.objectIdField} ASC` : "",
    });
    if (page.type !== "FeatureCollection" || !Array.isArray(page.features)) throw new Error(`${name}: service did not return GeoJSON`);
    features.push(...page.features);
    if (page.features.length < pageSize) break;
  }
  const collection = { type: "FeatureCollection", features };
  const snapshot = {
    name, agency: name === "zoning" ? "City of Clearwater" : "Pinellas County",
    layerUrl: url, queryUrl: `${url}/query`, retrievedAt: new Date().toISOString(), bbox: BBOX,
    requestedFields: fields, objectIdField: metadata.objectIdField ?? null, geometryType: metadata.geometryType,
    spatialReference: metadata.extent?.spatialReference ?? metadata.sourceSpatialReference ?? null,
    capabilities: metadata.capabilities ?? null, maxRecordCount: metadata.maxRecordCount ?? null,
    serviceLastEditDate: metadata.editingInfo?.lastEditDate ?? null,
    supportsPagination: metadata.advancedQueryCapabilities?.supportsPagination ?? null,
    supportsGeoJSON: true, recordCount: features.length,
    sha256: createHash("sha256").update(JSON.stringify(collection)).digest("hex"),
  };
  return { collection, snapshot };
}

function rings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}
function onSegment([x, y], [a, b], [c, d]) {
  return Math.abs((y - b) * (c - a) - (x - a) * (d - b)) < 1e-10 && x >= Math.min(a, c) && x <= Math.max(a, c) && y >= Math.min(b, d) && y <= Math.max(b, d);
}
function inRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (onSegment(point, ring[j], ring[i])) return true;
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function covers(geometry, point) { return rings(geometry).some((polygon) => inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole))); }
function vertices(geometry) { return rings(geometry).flatMap((polygon) => polygon[0]); }
function representativePoint(geometry) {
  for (const polygon of rings(geometry)) {
    const ring = polygon[0];
    const average = ring.slice(0, -1).reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map((n) => n / Math.max(1, ring.length - 1));
    if (covers(geometry, average)) return average;
    for (let i = 1; i < ring.length; i++) {
      const midpoint = [(ring[0][0] + ring[i][0]) / 2, (ring[0][1] + ring[i][1]) / 2];
      if (covers(geometry, midpoint)) return midpoint;
    }
  }
  return null;
}
function prop(feature, candidates) { for (const key of candidates) if (feature.properties?.[key] != null && feature.properties[key] !== "") return feature.properties[key]; return null; }
function configured(env, fallback) { return (process.env[env] ?? fallback).split(",").map((v) => v.trim()).filter(Boolean); }
function normalizeAddress(value) { return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9# ]/g, " ").replace(/\s+/g, " "); }
function normalizeZoning(value) { return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, ""); }

async function preprocess(data, snapshots) {
  const addressId = configured("PINELLAS_ADDRESS_ID_FIELDS", "OBJECTID,GlobalID,GLOBALID");
  const addressText = configured("PINELLAS_ADDRESS_TEXT_FIELDS", "FULLADDR,FULL_ADDRESS,SITE_ADDRESS");
  const addressParcel = configured("PINELLAS_ADDRESS_PARCEL_FIELDS", "PARCELID,PARCEL_ID,PARCELNO");
  const parcelId = configured("PINELLAS_PARCEL_ID_FIELDS", "PARCELID,PARCEL_ID,PARCELNO,FOLIO");
  const parcelSource = configured("PINELLAS_PARCEL_SOURCE_ID_FIELDS", "OBJECTID,GlobalID,GLOBALID");
  const zoningId = configured("CLEARWATER_ZONING_ID_FIELDS", "OBJECTID,GlobalID,GLOBALID");
  const zoningCode = configured("CLEARWATER_ZONING_CODE_FIELDS", "ZONING,ZONING_CODE,DISTRICT");
  const zoningDescription = configured("CLEARWATER_ZONING_DESCRIPTION_FIELDS", "DESCRIPTION,DISTRICT_NAME,ZONING_DESC");
  const parcels = data.parcels.features.map((feature) => ({ feature, id: prop(feature, parcelId), sourceId: prop(feature, parcelSource) }));
  const zoning = data.zoning.features.map((feature) => ({ feature, sourceId: prop(feature, zoningId), code: prop(feature, zoningCode), description: prop(feature, zoningDescription) }));
  const duplicateCounts = new Map();
  for (const address of data.addresses.features) { const key = normalizeAddress(prop(address, addressText)); duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1); }
  const profiles = data.addresses.features.map((address) => {
    const displayAddress = String(prop(address, addressText) ?? "").trim();
    const normalizedAddress = normalizeAddress(displayAddress);
    const sourceParcelId = prop(address, addressParcel);
    let parcelMatches = sourceParcelId ? parcels.filter((p) => String(p.id) === String(sourceParcelId)) : [];
    let parcelMatchMethod = parcelMatches.length ? "authoritative_identifier" : "spatial_covers";
    if (!parcelMatches.length && address.geometry?.type === "Point") parcelMatches = parcels.filter((p) => covers(p.feature.geometry, address.geometry.coordinates));
    const parcel = parcelMatches.length === 1 ? parcelMatches[0] : null;
    const point = parcel && representativePoint(parcel.feature.geometry);
    const representativeMatches = point ? zoning.filter((z) => covers(z.feature.geometry, point)) : [];
    const touchedCodes = parcel ? new Set(zoning.filter((z) => vertices(parcel.feature.geometry).some((v) => covers(z.feature.geometry, v))).map((z) => normalizeZoning(z.code))) : new Set();
    const zone = representativeMatches.length === 1 ? representativeMatches[0] : null;
    const normalizedCode = normalizeZoning(zone?.code);
    const issues = [];
    if (!displayAddress || !prop(address, addressId)) issues.push("missing_address_identity");
    if ((duplicateCounts.get(normalizedAddress) ?? 0) > 1) issues.push("duplicate_address");
    if (parcelMatches.length === 0) issues.push("address_without_parcel");
    if (parcelMatches.length > 1) issues.push("address_multiple_parcels");
    if (parcel && !parcel.id) issues.push("missing_parcel_identifier");
    if (representativeMatches.length === 0) issues.push("parcel_without_zoning");
    if (representativeMatches.length > 1 || touchedCodes.size > 1) issues.push("parcel_ambiguous_zoning");
    if (zone && !allowedZoning.has(normalizedCode)) issues.push("unsupported_zoning_code");
    return {
      displayAddress, normalizedAddress, sourceAddressIdentifier: prop(address, addressId), parcelIdentifier: parcel?.id ?? null,
      parcelSourceIdentifier: parcel?.sourceId ?? null, parcelMatchMethod, zoningCode: zone?.code ?? null,
      normalizedZoningCode: allowedZoning.has(normalizedCode) ? normalizedCode : null, zoningDescription: zone?.description ?? null,
      zoningSourceIdentifier: zone?.sourceId ?? null, jurisdiction: "clearwater-fl", status: issues.length ? "review" : "clean", issues,
      addressCoordinates: address.geometry?.type === "Point" ? address.geometry.coordinates : null, parcelRepresentativePoint: point,
      sourceSnapshots: Object.fromEntries(Object.entries(snapshots).map(([key, value]) => [key, { retrievedAt: value.retrievedAt, sha256: value.sha256 }])) ,
      evaluatorFacts: issues.length ? null : { "property.zoning_district": normalizedCode },
    };
  });
  const stats = {
    addressesFetched: data.addresses.features.length, parcelsFetched: parcels.length, zoningPolygonsFetched: zoning.length,
    cleanPropertyProfiles: profiles.filter((p) => p.status === "clean").length,
    unmatchedAddresses: profiles.filter((p) => p.issues.includes("address_without_parcel")).length,
    duplicateAddressMatches: profiles.filter((p) => p.issues.includes("duplicate_address")).length,
    parcelsWithNoZoning: new Set(profiles.filter((p) => p.issues.includes("parcel_without_zoning") && p.parcelIdentifier != null).map((p) => p.parcelIdentifier)).size,
    parcelsWithAmbiguousZoning: new Set(profiles.filter((p) => p.issues.includes("parcel_ambiguous_zoning") && p.parcelIdentifier != null).map((p) => p.parcelIdentifier)).size,
    zoningValuesRepresented: [...new Set(profiles.filter((p) => p.status === "clean").map((p) => p.normalizedZoningCode))].sort(),
  };
  return { profiles, stats, spotChecks: profiles.filter((p) => p.status === "clean").slice(0, 8) };
}

async function main() {
  await mkdir(TMP, { recursive: true });
  const data = {}, snapshots = {};
  for (const [name, definition] of Object.entries(definitions)) {
    const result = await fetchLayer(name, definition); data[name] = result.collection; snapshots[name] = result.snapshot;
    await writeFile(path.join(TMP, `${name}.geojson`), `${JSON.stringify(result.collection, null, 2)}\n`);
  }
  const output = await preprocess(data, snapshots);
  for (const [name, value] of Object.entries({ "source-metadata.json": snapshots, "property-profiles.json": output.profiles, "validation-report.json": { ...output.stats, spotChecks: output.spotChecks } }))
    await writeFile(path.join(TMP, name), `${JSON.stringify(value, null, 2)}\n`);
  for (const name of [...Object.keys(definitions).map((n) => `${n}.geojson`), "source-metadata.json", "property-profiles.json", "validation-report.json"])
    await rename(path.join(TMP, name), path.join(OUT, name));
  await rm(TMP, { recursive: true, force: true });
  console.log(JSON.stringify(output.stats, null, 2));
}

main().catch((error) => { console.error(`GIS pilot failed: ${error.message}`); process.exitCode = 1; });
