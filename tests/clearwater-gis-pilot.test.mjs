import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { covers, normalizeZoning, parseBbox, preprocess, renderQc } from "../scripts/gis/clearwater-pilot.mjs";

const polygon = (minX, maxX) => ({ type: "Polygon", coordinates: [[[minX, 0], [maxX, 0], [maxX, 1], [minX, 1], [minX, 0]]] });
const snapshots = { addresses: { retrievedAt: "t", sha256: "a" }, parcels: { retrievedAt: "t", sha256: "p" }, zoning: { retrievedAt: "t", sha256: "z" } };

test("configuration and case/format-only normalization are strict", () => {
  assert.deepEqual(parseBbox("-82.8,27.9,-82.7,28"), [-82.8, 27.9, -82.7, 28]);
  assert.throws(() => parseBbox("-82.7,27.9,-82.8,28"));
  assert.equal(normalizeZoning(" LM-DR "), "lmdr");
  assert.equal(normalizeZoning("OS/R"), "os/r");
});

test("covers includes polygon boundaries", () => {
  assert.equal(covers(polygon(0, 1), [0, 0.5]), true);
  assert.equal(covers(polygon(0, 1), [2, 0.5]), false);
});

test("ambiguous zoning is REVIEW and never produces evaluator facts", () => {
  const data = {
    addresses: { features: [{ properties: { OBJECTID: 1, FULLADDR: "1 Main St", PARCELID: "P1" }, geometry: { type: "Point", coordinates: [0.5, 0.5] } }] },
    parcels: { features: [{ properties: { OBJECTID: 2, PARCELID: "P1" }, geometry: polygon(0, 1) }] },
    zoning: { features: [
      { properties: { OBJECTID: 3, ZONING: "LDR", ZONING_DESC: "Low Density Residential" }, geometry: polygon(0, 0.5) },
      { properties: { OBJECTID: 4, ZONING: "LMDR", ZONING_DESC: "Low Medium Density Residential" }, geometry: polygon(0.5, 1) },
    ] },
  };
  const first = preprocess(data, snapshots, { pilotName: "test", jurisdiction: "clearwater-fl" });
  const second = preprocess(data, snapshots, { pilotName: "test", jurisdiction: "clearwater-fl" });
  assert.deepEqual(first, second);
  assert.equal(first.profiles[0].status, "review");
  assert.ok(first.profiles[0].issues.includes("parcel_ambiguous_zoning"));
  assert.equal(first.profiles[0].evaluatorFacts, null);
  assert.equal(first.stats.evaluatorReadyZoningDistrictPercentage, 0);
});

test("committed live v1 evidence exercises identifier-first matching and conservative reviews", async () => {
  const base = new URL("../research/gis/data/clearwater-pilot-v1/", import.meta.url);
  const read = async (name) => JSON.parse(await readFile(new URL(name, base), "utf8"));
  const result = preprocess({ addresses: await read("addresses.geojson"), parcels: await read("parcels.geojson"), zoning: await read("zoning.geojson") }, await read("source-metadata.json"), { pilotName: "v1-evidence", jurisdiction: "clearwater-fl" });
  assert.equal(result.stats.cleanPropertyProfiles, 4);
  assert.equal(result.stats.matchMethodsUsed.authoritative_identifier, 8);
  assert.equal(result.stats.issueCountsByType.parcel_ambiguous_zoning, 4);
  assert.deepEqual(new Set(result.profiles.filter((p) => p.status === "clean").map((p) => p.normalizedZoningCode)), new Set(["i", "irt"]));
  assert.match(renderQc(result.qcSamples, { pilotName: "v1-evidence" }), /property\.zoning_district/);
});
