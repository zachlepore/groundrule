import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { report, renderSql, validateManifest } from "../scripts/demo/clearwater-sales-v1.mjs";

const manifest = JSON.parse(readFileSync("research/gis/data/clearwater-sales-v1/demo-properties.json", "utf8"));
const verifiedRecord = {
  displayAddress: "100 TRUSTED STREET", normalizedAddress: "100 TRUSTED ST", parcelIdentifier: "trusted-parcel", sourceParcelIdentifier: "source-parcel",
  municipality: "Clearwater", zoningCode: "MDR", zoningDescription: "Medium Density Residential", normalizedZoningCode: "mdr", sourceAddressIdentifier: "source-address", ingestBatchId: "clearwater-sales-v1-test",
  verification: { status: "manually_verified", verifiedOn: "2026-09-29", zoningSource: "authoritative zoning record", zoningMethod: "manual parcel lookup", jurisdictionSource: "authoritative municipality record", notes: "test fixture only" },
};
const withRecords = (...records) => ({ ...manifest, records });

test("committed curated manifest is valid and contains no invented properties", () => {
  assert.equal(validateManifest(manifest).records.length, 0);
  assert.equal(report(manifest).propertyCount, 0);
});

test("verified zoning and demo provenance are retained in canonical insert SQL", () => {
  const output = renderSql(withRecords(verifiedRecord));
  assert.match(output, /insert into public\.properties/);
  assert.match(output, /insert into public\.property_addresses/);
  assert.match(output, /'MDR'.*'mdr'.*'clean'/s);
  assert.match(output, /clearwater-sales-v1/);
  assert.match(output, /curated_sales_demo/);
  assert.match(output, /manual_verification/);
  assert.match(output, /Canonical address already exists/);
  assert.match(output, /Parcel already exists/);
});

test("invalid, duplicate, and untrusted records are rejected", () => {
  assert.throws(() => validateManifest(withRecords({ ...verifiedRecord, normalizedZoningCode: "" })), /normalizedZoningCode is required/);
  assert.throws(() => validateManifest(withRecords({ ...verifiedRecord, verification: { ...verifiedRecord.verification, status: "review" } })), /must be manually_verified/);
  assert.throws(() => validateManifest(withRecords(verifiedRecord, { ...verifiedRecord, sourceAddressIdentifier: "other" })), /duplicates another manifest record/);
});

test("1950 DREW PLZ remains in the original seed and is not relabeled as Sales V1", () => {
  const seed = readFileSync("supabase/migrations/20260824000001_seed_clearwater_residential_pilot.sql", "utf8");
  assert.match(seed, /1950 DREW PLZ/);
  assert.doesNotMatch(seed, /clearwater-sales-v1|curated_sales_demo|manually_verified/);
});
