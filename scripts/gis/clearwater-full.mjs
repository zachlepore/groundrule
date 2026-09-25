#!/usr/bin/env node

/** Full-municipality snapshot acquisition. This is an offline ETL tool; runtime never calls GIS. */
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { preprocess } from "./clearwater-pilot.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG = path.join(path.dirname(fileURLToPath(import.meta.url)), "clearwater-full.json");
const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const required = (name) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value.replace(/\/+$/, ""); };

async function json(url, params = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) if (value != null && value !== "") target.searchParams.set(key, String(value));
  const response = await fetch(target, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${target}`);
  const body = await response.json();
  if (body.error) throw new Error(`ArcGIS ${body.error.code}: ${body.error.message}`);
  return body;
}

async function layer(name, url, fields, where, expectedGeometry, geometry) {
  const metadata = await json(url, { f: "json" });
  if (metadata.geometryType !== expectedGeometry) throw new Error(`${name}: source structure changed; expected ${expectedGeometry}, received ${metadata.geometryType}`);
  const known = new Set((metadata.fields ?? []).map((field) => field.name));
  const missing = fields.filter((field) => !known.has(field));
  if (missing.length) throw new Error(`${name}: source structure changed; missing ${missing.join(", ")}`);
  if (!metadata.objectIdField || metadata.advancedQueryCapabilities?.supportsPagination === false) throw new Error(`${name}: safe deterministic pagination is unavailable`);
  const count = await json(`${url}/query`, { f: "json", where, returnCountOnly: true, ...(geometry ?? {}) });
  const size = Math.min(metadata.maxRecordCount ?? 1000, 2000), features = [];
  for (let offset = 0; offset < count.count; offset += size) {
    const page = await json(`${url}/query`, { f: "geojson", where, outFields: fields.join(","), returnGeometry: true, outSR: 4326, resultOffset: offset, resultRecordCount: size, orderByFields: `${metadata.objectIdField} ASC`, ...(geometry ?? {}) });
    if (page.type !== "FeatureCollection" || !Array.isArray(page.features)) throw new Error(`${name}: non-GeoJSON response`);
    features.push(...page.features);
  }
  if (features.length !== count.count) throw new Error(`${name}: count changed during snapshot (${count.count} expected, ${features.length} received)`);
  const collection = { type: "FeatureCollection", features };
  return { collection, snapshot: { name, layerUrl: url, queryUrl: `${url}/query`, where, geometry: geometry ?? null, retrievedAt: new Date().toISOString(), serviceLastEditDate: metadata.editingInfo?.lastEditDate ?? null, layerVersion: metadata.currentVersion ?? null, objectIdField: metadata.objectIdField, maxRecordCount: metadata.maxRecordCount ?? null, recordCount: features.length, fields, sha256: sha(collection) } };
}

function extentOfPoints(features, padding = 0.01) {
  const points = features.filter((f) => f.geometry?.type === "Point").map((f) => f.geometry.coordinates);
  if (!points.length) throw new Error("No valid Clearwater address points; municipality attribution cannot be trusted");
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return [Math.min(...xs) - padding, Math.min(...ys) - padding, Math.max(...xs) + padding, Math.max(...ys) + padding];
}

export function geographicSample(profiles, size = 24) {
  const clean = profiles.filter((p) => p.status === "clean" && p.addressCoordinates);
  const selected = new Map();
  const add = (profile, reason) => { if (profile && selected.size < size && !selected.has(profile.sourceAddressIdentifier)) selected.set(profile.sourceAddressIdentifier, { ...profile, sampleReason: reason }); };
  const by = (index, direction) => clean.slice().sort((a, b) => direction * (a.addressCoordinates[index] - b.addressCoordinates[index]));
  add(by(0, 1)[0], "west/boundary proxy"); add(by(0, -1)[0], "east/boundary proxy");
  add(by(1, 1)[0], "south/boundary proxy"); add(by(1, -1)[0], "north/boundary proxy");
  for (const district of [...new Set(clean.map((p) => p.normalizedZoningCode))].sort()) add(clean.find((p) => p.normalizedZoningCode === district), `zoning district ${district}`);
  const ordered = clean.slice().sort((a, b) => a.addressCoordinates[0] - b.addressCoordinates[0] || a.addressCoordinates[1] - b.addressCoordinates[1]);
  for (let i = 0; selected.size < size && i < ordered.length; i += Math.max(1, Math.floor(ordered.length / size))) add(ordered[i], "distributed extent");
  return [...selected.values()].map(({ displayAddress, parcelIdentifier, normalizedZoningCode, addressCoordinates, sampleReason }) => ({ displayAddress, parcelIdentifier, normalizedZoningCode, addressCoordinates, sampleReason, authoritativeComparisonStatus: "pending_manual_review" }));
}

export function humanReport(stats, sample) {
  return `# Full Clearwater GIS QA\n\nThis report is generated from a frozen snapshot. Completion of ETL is not proof of correctness; every geographic sample remains pending manual authoritative-GIS comparison.\n\n## Source and pipeline counts\n\n| Metric | Count | Percent of profiles |\n|---|---:|---:|\n| Addresses retrieved | ${stats.addressesFetched} | — |\n| Parcel features retrieved | ${stats.parcelsFetched} | — |\n| Zoning features retrieved | ${stats.zoningPolygonsFetched} | — |\n| Unique normalized addresses | ${stats.uniqueNormalizedAddresses} | — |\n| Unique parcels represented | ${stats.uniqueParcelsRepresented} | — |\n| Clearwater-confirmed records | ${stats.clearwaterConfirmedProfiles} | ${stats.addressesFetched ? (stats.clearwaterConfirmedProfiles * 100 / stats.addressesFetched).toFixed(2) : "0.00"}% |\n| CLEAN profiles | ${stats.cleanPropertyProfiles} | ${stats.cleanPropertyProfilesPercentage.toFixed(2)}% |\n| REVIEW profiles | ${stats.reviewPropertyProfiles} | ${stats.reviewPropertyProfilesPercentage.toFixed(2)}% |\n\n## Review reasons\n\n${Object.entries(stats.issueCountsByType).map(([reason, count]) => `- ${reason}: ${count} (${stats.addressesFetched ? (count * 100 / stats.addressesFetched).toFixed(2) : "0.00"}%)`).join("\n") || "- None"}\n\n## Geographic validation sample\n\n| Address | Parcel | Zoning | Coordinates | Selection | Status |\n|---|---|---|---|---|---|\n${sample.map((row) => `| ${row.displayAddress} | ${row.parcelIdentifier} | ${row.normalizedZoningCode} | ${row.addressCoordinates.join(", ")} | ${row.sampleReason} | ${row.authoritativeComparisonStatus} |`).join("\n")}\n`;
}

async function exists(value) { try { await access(value); return true; } catch { return false; } }

async function main() {
  const config = JSON.parse(await readFile(CONFIG, "utf8"));
  const out = path.join(ROOT, config.outputDirectory), tmp = `${out}.tmp-${process.pid}`;
  if (await exists(out)) throw new Error(`Refusing to replace ${out}; validate and archive the prior snapshot first`);
  await mkdir(tmp, { recursive: true });
  try {
    const addressResult = await layer("addresses", required("PINELLAS_ADDRESSES_LAYER_URL"), config.layers.addresses.fields, config.layers.addresses.where, "esriGeometryPoint");
    const bbox = extentOfPoints(addressResult.collection.features);
    const spatial = { geometry: bbox.join(","), geometryType: "esriGeometryEnvelope", inSR: 4326, spatialRel: "esriSpatialRelIntersects" };
    const parcelResult = await layer("parcels", required("PINELLAS_PARCELS_LAYER_URL"), config.layers.parcels.fields, "1=1", "esriGeometryPolygon", spatial);
    const zoningResult = await layer("zoning", required("CLEARWATER_ZONING_LAYER_URL"), config.layers.zoning.fields, "1=1", "esriGeometryPolygon");
    const data = { addresses: addressResult.collection, parcels: parcelResult.collection, zoning: zoningResult.collection };
    const snapshots = { addresses: addressResult.snapshot, parcels: parcelResult.snapshot, zoning: zoningResult.snapshot };
    for (const [name, collection] of Object.entries(data)) await writeFile(path.join(tmp, `${name}.geojson`), `${JSON.stringify(collection)}\n`);
    const output = preprocess(data, snapshots, config), sample = geographicSample(output.profiles, config.qaSampleSize);
    await writeFile(path.join(tmp, "property-profiles.json"), `${JSON.stringify(output.profiles, null, 2)}\n`);
    await writeFile(path.join(tmp, "database-import.clean.json"), `${JSON.stringify(output.profiles.filter((p) => p.status === "clean"), null, 2)}\n`);
    await writeFile(path.join(tmp, "database-review.json"), `${JSON.stringify(output.profiles.filter((p) => p.status === "review"), null, 2)}\n`);
    await writeFile(path.join(tmp, "source-metadata.json"), `${JSON.stringify({ config, sources: snapshots }, null, 2)}\n`);
    await writeFile(path.join(tmp, "validation-report.json"), `${JSON.stringify({ ...output.stats, geographicSample: sample }, null, 2)}\n`);
    await writeFile(path.join(tmp, "validation-report.md"), humanReport(output.stats, sample));
    await rename(tmp, out);
    console.log(JSON.stringify(output.stats, null, 2));
  } catch (error) { await rm(tmp, { recursive: true, force: true }); throw error; }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => { console.error(`Full Clearwater GIS ingest stopped safely: ${error.message}`); process.exitCode = 1; });
