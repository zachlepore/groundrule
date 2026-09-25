import assert from "node:assert/strict";
import test from "node:test";
import { acquireLayer, discoverObjectIdField, geographicSample, humanReport } from "../scripts/gis/clearwater-full.mjs";
import { preprocess } from "../scripts/gis/clearwater-pilot.mjs";

const polygon = (x, code = "LMDR") => ({ type: "Feature", properties: { OBJECTID: x, ZONING: code, ZONING_DESC: code }, geometry: { type: "Polygon", coordinates: [[[x, 0], [x + 0.9, 0], [x + 0.9, 0.9], [x, 0.9], [x, 0]]] } });
const snapshots = Object.fromEntries(["addresses", "parcels", "zoning"].map((name) => [name, { retrievedAt: "2026-09-25T00:00:00Z", sha256: name }]));

test("full QA exposes explicit CLEAN/REVIEW percentages and failure categories", () => {
  const data = {
    addresses: { features: [
      { properties: { OBJECTID: 1, FULLADDR: "1 MAIN ST", PIN_NUM: "P1", MUNICIPALITY: "CLEARWATER" }, geometry: { type: "Point", coordinates: [0.5, 0.5] } },
      { properties: { OBJECTID: 2, FULLADDR: "2 MAIN ST", PIN_NUM: "missing", MUNICIPALITY: "CLEARWATER" }, geometry: { type: "Point", coordinates: [3, 3] } },
    ] },
    parcels: { features: [{ properties: { OBJECTID: 10, PARCELID: "P1" }, geometry: polygon(0).geometry }] },
    zoning: { features: [polygon(0)] },
  };
  const result = preprocess(data, snapshots, { pilotName: "full-test", jurisdiction: "clearwater-fl" });
  assert.equal(result.stats.addressesFetched, 2);
  assert.equal(result.stats.uniqueNormalizedAddresses, 2);
  assert.equal(result.stats.clearwaterConfirmedProfiles, 2);
  assert.equal(result.stats.cleanPropertyProfilesPercentage, 50);
  assert.equal(result.stats.reviewPropertyProfilesPercentage, 50);
  assert.equal(result.stats.unmatchedAddresses, 1);
  assert.equal(result.profiles[1].evaluatorFacts, null);
  assert.match(humanReport(result.stats, geographicSample(result.profiles)), /address_without_parcel: 1 \(50\.00%\)/);
});

test("geographic QA is deterministic and distributed across extent and districts", () => {
  const profiles = Array.from({ length: 30 }, (_, i) => ({ status: "clean", sourceAddressIdentifier: i, displayAddress: `${i} MAIN ST`, parcelIdentifier: `P${i}`, normalizedZoningCode: i % 2 ? "lmdr" : "ldr", addressCoordinates: [i, i % 5] }));
  const first = geographicSample(profiles, 12), second = geographicSample(profiles, 12);
  assert.deepEqual(first, second);
  assert.equal(first.length, 12);
  assert.ok(first.some((row) => row.sampleReason.includes("boundary")));
  assert.deepEqual(new Set(first.map((row) => row.normalizedZoningCode)), new Set(["ldr", "lmdr"]));
  assert.ok(first.every((row) => row.authoritativeComparisonStatus === "pending_manual_review"));
});

test("full configuration uses explicit authoritative municipality attribution, never postal city", async () => {
  const config = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../scripts/gis/clearwater-full.json", import.meta.url), "utf8"));
  assert.equal(config.layers.addresses.where, "MUNICIPALITY = 'CLEARWATER'");
  assert.doesNotMatch(config.layers.addresses.where, /SITE_CITY|POSTCODE/);
});

const layerMetadata = (overrides = {}) => ({
  currentVersion: 10.91,
  geometryType: "esriGeometryPoint",
  fields: [{ name: "OBJECTID", type: "esriFieldTypeOID" }, { name: "FULLADDR", type: "esriFieldTypeString" }],
  uniqueIdField: { name: "OBJECTID", isSystemMaintained: true },
  maxRecordCount: 1000,
  advancedQueryCapabilities: { supportsPagination: true, supportsOrderBy: true },
  ...overrides,
});

const feature = (id) => ({ type: "Feature", properties: { OBJECTID: id, FULLADDR: `${id} MAIN ST` }, geometry: { type: "Point", coordinates: [id, id] } });

function mockArcGis(metadata, pages, count = pages.flat().length) {
  const calls = [];
  const counts = Array.isArray(count) ? count.slice() : [count, count];
  const request = async (url, params) => {
    calls.push({ url, params });
    if (!url.endsWith("/query")) return metadata;
    if (params.returnCountOnly) return { count: counts.shift() };
    const page = pages.shift() ?? [];
    return { type: "FeatureCollection", features: page };
  };
  return { calls, request };
}

test("MapServer OID metadata enables maxRecordCount-aware, explicitly ordered pagination", async () => {
  const metadata = layerMetadata({ maxRecordCount: 2 });
  assert.equal(discoverObjectIdField(metadata), "OBJECTID");
  const mock = mockArcGis(metadata, [[feature(1), feature(2)], [feature(3)]]);
  const result = await acquireLayer("addresses", "https://example.test/MapServer/0", ["FULLADDR"], "1=1", "esriGeometryPoint", undefined, mock.request);
  const pageCalls = mock.calls.filter(({ params }) => params.f === "geojson");
  assert.deepEqual(pageCalls.map(({ params }) => params.resultOffset), [0, 2]);
  assert.ok(pageCalls.every(({ params }) => params.resultRecordCount === 2 && params.orderByFields === "OBJECTID ASC"));
  assert.ok(pageCalls.every(({ params }) => params.outFields === "FULLADDR,OBJECTID"));
  assert.equal(result.snapshot.objectIdField, "OBJECTID");
  assert.equal(result.snapshot.ordering, "OBJECTID ASC");
});

test("OID discovery supports MapServer and FeatureServer metadata representations", () => {
  assert.equal(discoverObjectIdField(layerMetadata()), "OBJECTID");
  assert.equal(discoverObjectIdField(layerMetadata({ uniqueIdField: undefined, objectIdField: "OBJECTID" })), "OBJECTID");
  assert.equal(discoverObjectIdField(layerMetadata({ uniqueIdField: undefined, objectIdFieldName: "OBJECTID" })), "OBJECTID");
  assert.equal(discoverObjectIdField(layerMetadata({ uniqueIdField: undefined })), "OBJECTID");
});

test("full extraction refuses layers without both an OID and deterministic paging capabilities", async () => {
  for (const metadata of [
    layerMetadata({ fields: [{ name: "FULLADDR", type: "esriFieldTypeString" }], uniqueIdField: undefined }),
    layerMetadata({ advancedQueryCapabilities: { supportsPagination: false, supportsOrderBy: true } }),
    layerMetadata({ advancedQueryCapabilities: { supportsPagination: true, supportsOrderBy: false } }),
  ]) {
    const mock = mockArcGis(metadata, []);
    await assert.rejects(acquireLayer("addresses", "https://example.test/MapServer/0", ["FULLADDR"], "1=1", "esriGeometryPoint", undefined, mock.request), /safe deterministic pagination is unavailable/);
  }
});

test("full extraction detects duplicate and non-monotonic object IDs", async () => {
  for (const ids of [[1, 1], [2, 1]]) {
    const mock = mockArcGis(layerMetadata(), [ids.map(feature)]);
    await assert.rejects(acquireLayer("addresses", "https://example.test/MapServer/0", ["FULLADDR"], "1=1", "esriGeometryPoint", undefined, mock.request), /duplicate OBJECTID|ordering is not strictly ascending/);
  }
});

test("full extraction detects missing OIDs and reconciles every page with the preflight count", async () => {
  const withoutOid = { ...feature(1), properties: { FULLADDR: "1 MAIN ST" } };
  let mock = mockArcGis(layerMetadata(), [[withoutOid]]);
  await assert.rejects(acquireLayer("addresses", "https://example.test/MapServer/0", ["FULLADDR"], "1=1", "esriGeometryPoint", undefined, mock.request), /response is missing OBJECTID/);
  mock = mockArcGis(layerMetadata({ maxRecordCount: 2 }), [[feature(1)]], 2);
  await assert.rejects(acquireLayer("addresses", "https://example.test/MapServer/0", ["FULLADDR"], "1=1", "esriGeometryPoint", undefined, mock.request), /incomplete page at offset 0 \(2 expected, 1 received\)/);
  mock = mockArcGis(layerMetadata(), [[feature(1)]], [1, 2]);
  await assert.rejects(acquireLayer("addresses", "https://example.test/MapServer/0", ["FULLADDR"], "1=1", "esriGeometryPoint", undefined, mock.request), /count changed during snapshot \(1 before, 2 after\)/);
});
