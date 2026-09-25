import assert from "node:assert/strict";
import test from "node:test";
import { geographicSample, humanReport } from "../scripts/gis/clearwater-full.mjs";
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
