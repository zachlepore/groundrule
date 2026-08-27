#!/usr/bin/env node

/** Reproducible, dependency-free ArcGIS acquisition and conservative spatial join. */
import { createHash } from "node:crypto";
import { readFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const CONFIG_PATH = path.join(__dirname, "clearwater-residential-pilot.json");
export const allowedZoning = new Set(["ldr", "lmdr", "mdr", "mhdr", "hdr", "mhp", "c", "t", "o", "i", "irt", "osr", "p", "d", "us19"]);

const definitions = {
  addresses: { env: "PINELLAS_ADDRESSES_LAYER_URL", fieldsEnv: "PINELLAS_ADDRESS_FIELDS", expectedGeometry: "esriGeometryPoint" },
  parcels: { env: "PINELLAS_PARCELS_LAYER_URL", fieldsEnv: "PINELLAS_PARCEL_FIELDS", expectedGeometry: "esriGeometryPolygon" },
  zoning: { env: "CLEARWATER_ZONING_LAYER_URL", fieldsEnv: "CLEARWATER_ZONING_FIELDS", expectedGeometry: "esriGeometryPolygon" },
};

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}; see research/gis/clearwater-residential-gis-pilot-v2.md`);
  return value;
}
function configured(env, fallback) { return (process.env[env] ?? fallback).split(",").map((v) => v.trim()).filter(Boolean); }
function prop(feature, candidates) { for (const key of candidates) if (feature.properties?.[key] != null && feature.properties[key] !== "") return feature.properties[key]; return null; }
function layerUrl(value) { return value.replace(/\/+$/, ""); }
function sha(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export function parseBbox(value) {
  const bbox = String(value ?? "").split(",").map(Number);
  if (bbox.length !== 4 || bbox.some((n) => !Number.isFinite(n)) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) throw new Error("CLEARWATER_RESIDENTIAL_BBOX must be west,south,east,north in WGS84");
  return bbox;
}
export function normalizeAddress(value) { return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9# ]/g, " ").replace(/\s+/g, " "); }
export function normalizeZoning(value) { return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, ""); }

const supportedMunicipalities = new Map([
  ["CLEARWATER", { normalizedJurisdiction: "clearwater", authorityName: "City of Clearwater" }],
  ["UNINCORPORATED", { normalizedJurisdiction: "unincorporated_pinellas", authorityName: "Unincorporated Pinellas County" }],
]);
for (const name of ["BELLEAIR", "BELLEAIR BEACH", "BELLEAIR BLUFFS", "BELLEAIR SHORE", "DUNEDIN", "GULFPORT", "INDIAN ROCKS BEACH", "INDIAN SHORES", "KENNETH CITY", "LARGO", "MADEIRA BEACH", "NORTH REDINGTON BEACH", "OLDSMAR", "PINELLAS PARK", "REDINGTON BEACH", "REDINGTON SHORES", "SAFETY HARBOR", "SEMINOLE", "SOUTH PASADENA", "ST PETE BEACH", "ST PETERSBURG", "TARPON SPRINGS", "TREASURE ISLAND"]) {
  supportedMunicipalities.set(name, { normalizedJurisdiction: "other_pinellas_municipality", authorityName: name });
}

/** Resolve the county's authoritative MUNICIPALITY value before considering geometry. */
export function normalizeMunicipality(value) {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return null;
  const normalized = raw.toUpperCase();
  const supported = supportedMunicipalities.get(normalized);
  if (supported) return { rawMunicipality: raw, ...supported };
  throw new Error(`Unsupported authoritative MUNICIPALITY value: ${JSON.stringify(raw)}`);
}

export function resolvePropertyJurisdiction(rawValues, geometryFallback) {
  const values = [...new Set(rawValues.map((value) => value == null ? "" : String(value).trim()))];
  const resolved = values.filter(Boolean).map(normalizeMunicipality);
  const keys = new Set(resolved.map((value) => value.normalizedJurisdiction));
  if (keys.size === 1 && resolved.length === values.length) return { ...resolved[0], rawMunicipality: values.join(" | "), derivationMethod: "authoritative_municipality", jurisdictionStatus: "confirmed" };
  if (keys.size > 1 || (resolved.length && values.includes(""))) return { rawMunicipality: values.join(" | "), normalizedJurisdiction: "ambiguous", authorityName: null, derivationMethod: "authoritative_municipality_conflict", jurisdictionStatus: "conflict" };
  if (typeof geometryFallback === "function") return { ...geometryFallback(), rawMunicipality: values.join(" | ") || null, derivationMethod: "geometry_fallback" };
  return { rawMunicipality: null, normalizedJurisdiction: "unknown", authorityName: null, derivationMethod: "unresolved", jurisdictionStatus: "missing" };
}

async function requestJson(url, params = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) if (value !== "") target.searchParams.set(key, String(value));
  const response = await fetch(target, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${target}`);
  const body = await response.json();
  if (body.error) throw new Error(`ArcGIS error ${body.error.code}: ${body.error.message}; ${JSON.stringify(body.error.details ?? [])}`);
  return body;
}
async function fetchLayer(name, definition, bbox, pilot) {
  const url = layerUrl(required(definition.env));
  const fields = required(definition.fieldsEnv).split(",").map((field) => field.trim()).filter(Boolean);
  const metadata = await requestJson(url, { f: "json" });
  if (!['Feature Layer', 'Table'].includes(metadata.type) && !metadata.geometryType) throw new Error(`${name}: URL is not a queryable ArcGIS layer`);
  if (metadata.geometryType !== definition.expectedGeometry) throw new Error(`${name}: expected ${definition.expectedGeometry}, received ${metadata.geometryType}`);
  const known = new Set((metadata.fields ?? []).map((field) => field.name));
  const unknown = fields.filter((field) => !known.has(field));
  if (unknown.length) throw new Error(`${name}: fields absent from metadata: ${unknown.join(", ")}`);
  const pageSize = Math.min(metadata.maxRecordCount || 1000, 2000), features = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await requestJson(`${url}/query`, { f: "geojson", where: "1=1", geometry: bbox.join(","), geometryType: "esriGeometryEnvelope", inSR: 4326, outSR: 4326, spatialRel: "esriSpatialRelIntersects", outFields: fields.join(","), returnGeometry: true, resultOffset: offset, resultRecordCount: pageSize, orderByFields: metadata.objectIdField ? `${metadata.objectIdField} ASC` : "" });
    if (page.type !== "FeatureCollection" || !Array.isArray(page.features)) throw new Error(`${name}: service did not return GeoJSON`);
    features.push(...page.features);
    if (page.features.length < pageSize) break;
  }
  const collection = { type: "FeatureCollection", features };
  return { collection, snapshot: { name, agency: name === "zoning" ? "City of Clearwater" : "Pinellas County", layerUrl: url, queryUrl: `${url}/query`, retrievedAt: new Date().toISOString(), pilotName: pilot.pilotName, bbox, requestedFields: fields, objectIdField: metadata.objectIdField ?? null, geometryType: metadata.geometryType, spatialReference: metadata.extent?.spatialReference ?? metadata.sourceSpatialReference ?? null, capabilities: metadata.capabilities ?? null, maxRecordCount: metadata.maxRecordCount ?? null, serviceLastEditDate: metadata.editingInfo?.lastEditDate ?? null, supportsPagination: metadata.advancedQueryCapabilities?.supportsPagination ?? null, supportsGeoJSON: true, recordCount: features.length, sha256: sha(collection) } };
}

function rings(geometry) { return !geometry ? [] : geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : []; }
function onSegment([x, y], [a, b], [c, d]) { return Math.abs((y - b) * (c - a) - (x - a) * (d - b)) < 1e-10 && x >= Math.min(a, c) && x <= Math.max(a, c) && y >= Math.min(b, d) && y <= Math.max(b, d); }
function inRing(point, ring) { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { if (onSegment(point, ring[j], ring[i])) return true; const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside; } return inside; }
export function covers(geometry, point) { return rings(geometry).some((polygon) => inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole))); }
function vertices(geometry) { return rings(geometry).flatMap((polygon) => polygon[0]); }
function representativePoint(geometry) { for (const polygon of rings(geometry)) { const ring = polygon[0], average = ring.slice(0, -1).reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map((n) => n / Math.max(1, ring.length - 1)); if (covers(geometry, average)) return average; for (let i = 1; i < ring.length; i++) { const midpoint = [(ring[0][0] + ring[i][0]) / 2, (ring[0][1] + ring[i][1]) / 2]; if (covers(geometry, midpoint)) return midpoint; } } return null; }

export function preprocess(data, snapshots, pilot = { jurisdiction: "clearwater-fl" }) {
  const addressId = configured("PINELLAS_ADDRESS_ID_FIELDS", "OBJECTID,SITEADDID,ADDPTKEY,GlobalID,GLOBALID");
  const addressText = configured("PINELLAS_ADDRESS_TEXT_FIELDS", "FULLADDR,FULL_ADDRESS,SITE_ADDRESS");
  const addressParcel = configured("PINELLAS_ADDRESS_PARCEL_FIELDS", "PIN_NUM,PARCELID,PARCEL_ID,PARCELNO");
  const addressMunicipality = configured("PINELLAS_ADDRESS_MUNICIPALITY_FIELDS", "MUNICIPALITY");
  const parcelId = configured("PINELLAS_PARCEL_ID_FIELDS", "PARCELID,STRAP,PARCEL_ID,PARCELNO,FOLIO");
  const parcelSource = configured("PINELLAS_PARCEL_SOURCE_ID_FIELDS", "OBJECTID,GlobalID,GLOBALID");
  const zoningId = configured("CLEARWATER_ZONING_ID_FIELDS", "OBJECTID,GlobalID,GLOBALID");
  const zoningCode = configured("CLEARWATER_ZONING_CODE_FIELDS", "ZONING,ZONING_CODE,DISTRICT");
  const zoningDescription = configured("CLEARWATER_ZONING_DESCRIPTION_FIELDS", "ZONING_DESC,DESCRIPTION,DISTRICT_NAME");
  const parcels = data.parcels.features.map((feature) => ({ feature, id: prop(feature, parcelId), sourceId: prop(feature, parcelSource) }));
  const zoning = data.zoning.features.map((feature) => ({ feature, sourceId: prop(feature, zoningId), code: prop(feature, zoningCode), description: prop(feature, zoningDescription) }));
  const duplicateCounts = new Map();
  for (const address of data.addresses.features) { const key = normalizeAddress(prop(address, addressText)); duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1); }
  const profiles = data.addresses.features.map((address) => {
    const displayAddress = String(prop(address, addressText) ?? "").trim(), normalizedAddress = normalizeAddress(displayAddress), sourceParcelId = prop(address, addressParcel);
    let parcelMatches = sourceParcelId ? parcels.filter((p) => String(p.id) === String(sourceParcelId)) : [], parcelMatchMethod = parcelMatches.length ? "authoritative_identifier" : "spatial_covers";
    if (!parcelMatches.length && address.geometry?.type === "Point") parcelMatches = parcels.filter((p) => covers(p.feature.geometry, address.geometry.coordinates));
    const parcel = parcelMatches.length === 1 ? parcelMatches[0] : null, point = parcel && representativePoint(parcel.feature.geometry), representativeMatches = point ? zoning.filter((z) => covers(z.feature.geometry, point)) : [];
    const touchedCodes = parcel ? new Set(zoning.filter((z) => vertices(parcel.feature.geometry).some((v) => covers(z.feature.geometry, v))).map((z) => normalizeZoning(z.code))) : new Set();
    const zone = representativeMatches.length === 1 ? representativeMatches[0] : null, normalizedCode = normalizeZoning(zone?.code), issues = [];
    if (!displayAddress || !prop(address, addressId)) issues.push("missing_address_identity");
    if ((duplicateCounts.get(normalizedAddress) ?? 0) > 1) issues.push("duplicate_address");
    if (parcelMatches.length === 0) issues.push("address_without_parcel");
    if (parcelMatches.length > 1) issues.push("address_multiple_parcels");
    if (parcel && !parcel.id) issues.push("missing_parcel_identifier");
    if (representativeMatches.length === 0) issues.push("parcel_without_zoning");
    if (representativeMatches.length > 1 || touchedCodes.size > 1) issues.push("parcel_ambiguous_zoning");
    if (zone && !allowedZoning.has(normalizedCode)) issues.push("unsupported_zoning_code");
    return { displayAddress, normalizedAddress, sourceAddressIdentifier: prop(address, addressId), parcelIdentifier: parcel?.id ?? null, parcelSourceIdentifier: parcel?.sourceId ?? null, parcelMatchMethod, zoningCode: zone?.code ?? null, normalizedZoningCode: allowedZoning.has(normalizedCode) ? normalizedCode : null, zoningDescription: zone?.description ?? null, zoningSourceIdentifier: zone?.sourceId ?? null, jurisdiction: pilot.jurisdiction, rawMunicipality: prop(address, addressMunicipality), status: issues.length ? "review" : "clean", issues, addressCoordinates: address.geometry?.type === "Point" ? address.geometry.coordinates : null, parcelRepresentativePoint: point, sourceSnapshots: Object.fromEntries(Object.entries(snapshots).map(([key, value]) => [key, { retrievedAt: value.retrievedAt, sha256: value.sha256 }])), evaluatorFacts: issues.length ? null : { "property.zoning_district": normalizedCode } };
  });
  const byParcel = new Map();
  for (const profile of profiles) byParcel.set(profile.parcelIdentifier, [...(byParcel.get(profile.parcelIdentifier) ?? []), profile]);
  for (const profile of profiles) {
    const resolution = resolvePropertyJurisdiction((byParcel.get(profile.parcelIdentifier) ?? [profile]).map((item) => item.rawMunicipality));
    Object.assign(profile, resolution);
    if (resolution.normalizedJurisdiction === "ambiguous") profile.issues.push("conflicting_address_municipality");
    if (resolution.normalizedJurisdiction === "unknown") profile.issues.push("missing_address_municipality");
    profile.status = profile.issues.length ? "review" : "clean";
    profile.evaluatorFacts = profile.status === "clean" ? { "property.zoning_district": profile.normalizedZoningCode } : null;
  }
  const countIssues = (issue) => profiles.filter((p) => p.issues.includes(issue)).length, parcelSet = (predicate) => new Set(profiles.filter(predicate).map((p) => p.parcelIdentifier).filter((id) => id != null));
  const clean = profiles.filter((p) => p.status === "clean"), evaluatorReady = profiles.filter((p) => p.evaluatorFacts?.["property.zoning_district"]);
  const countBy = (values) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((v) => v === value).length]));
  const propertyResolutions = [...byParcel.values()].map((items) => items[0]);
  const stats = { pilotName: pilot.pilotName, addressesFetched: data.addresses.features.length, uniqueParcelsRepresented: parcelSet(() => true).size, parcelsFetched: parcels.length, zoningPolygonsFetched: zoning.length, cleanPropertyProfiles: clean.length, cleanProperties: new Set(clean.map((p) => p.parcelIdentifier)).size, reviewPropertyProfiles: profiles.length - clean.length, reviewProperties: new Set(profiles.filter((p) => p.status === "review").map((p) => p.parcelIdentifier)).size, unmatchedAddresses: countIssues("address_without_parcel"), duplicateOrAmbiguousAddressMatches: profiles.filter((p) => p.issues.includes("duplicate_address") || p.issues.includes("address_multiple_parcels")).length, parcelsWithNoZoning: parcelSet((p) => p.issues.includes("parcel_without_zoning")).size, parcelsWithAmbiguousZoning: parcelSet((p) => p.issues.includes("parcel_ambiguous_zoning")).size, zoningDistrictsRepresented: [...new Set(profiles.map((p) => p.zoningCode).filter(Boolean))].sort(), evaluatorReadyZoningDistrictProfiles: evaluatorReady.length, evaluatorReadyZoningDistrictPercentage: profiles.length ? Number((evaluatorReady.length * 100 / profiles.length).toFixed(2)) : 0, matchMethodsUsed: countBy(profiles.map((p) => p.parcelMatchMethod)), issueCountsByType: countBy(profiles.flatMap((p) => p.issues)), rawMunicipalityAddressCounts: countBy(profiles.map((p) => p.rawMunicipality || "<blank>")), normalizedJurisdictionPropertyCounts: countBy(propertyResolutions.map((p) => p.normalizedJurisdiction)), jurisdictionDerivationPropertyCounts: countBy(propertyResolutions.map((p) => p.derivationMethod)) };
  return { profiles, stats, qcSamples: clean.slice().sort((a, b) => a.normalizedAddress.localeCompare(b.normalizedAddress) || String(a.parcelIdentifier).localeCompare(String(b.parcelIdentifier))).slice(0, 10) };
}

export function renderQc(samples, pilot) {
  const rows = samples.map((p) => `| ${p.displayAddress} | ${p.parcelIdentifier} | ${p.parcelMatchMethod} | ${p.zoningCode} | ${p.zoningDescription ?? ""} | ${p.normalizedZoningCode} | \`${JSON.stringify(p.evaluatorFacts)}\` |`);
  return `# ${pilot.pilotName}: clean-profile QC sample\n\nGenerated only from CLEAN profiles; fewer than ten rows means fewer than ten clean examples existed. Verify every row in the authoritative viewers before ingestion.\n\n| Address | Parcel identifier | Match method | Raw zoning | Description | Normalized | Evaluator facts |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
}

async function main() {
  const pilot = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  const bbox = pilot.bbox ?? parseBbox(required(pilot.bboxEnvironmentVariable));
  const out = path.join(ROOT, pilot.outputDirectory), tmp = `${out}.tmp-${process.pid}`;
  await rm(tmp, { recursive: true, force: true }); await mkdir(tmp, { recursive: true });
  try {
    const data = {}, snapshots = {};
    for (const [name, definition] of Object.entries(definitions)) { const result = await fetchLayer(name, definition, bbox, pilot); data[name] = result.collection; snapshots[name] = result.snapshot; await writeFile(path.join(tmp, `${name}.geojson`), `${JSON.stringify(result.collection, null, 2)}\n`); }
    const output = preprocess(data, snapshots, pilot);
    await writeFile(path.join(tmp, "source-metadata.json"), `${JSON.stringify({ pilot, sources: snapshots }, null, 2)}\n`);
    await writeFile(path.join(tmp, "property-profiles.json"), `${JSON.stringify(output.profiles, null, 2)}\n`);
    await writeFile(path.join(tmp, "validation-report.json"), `${JSON.stringify(output.stats, null, 2)}\n`);
    await writeFile(path.join(tmp, "qc-sample.md"), renderQc(output.qcSamples, pilot));
    await rm(out, { recursive: true, force: true }); await rename(tmp, out);
    console.log(JSON.stringify(output.stats, null, 2));
  } catch (error) { await rm(tmp, { recursive: true, force: true }); throw error; }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => { console.error(`GIS pilot failed: ${error.message}`); process.exitCode = 1; });
