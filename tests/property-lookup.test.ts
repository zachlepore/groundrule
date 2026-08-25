import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { evaluateLoadedRuleSet } from "../lib/rules/evaluate";
import { propertyProfileToFacts } from "../lib/properties/facts";
import { findPropertyByAddress, normalizeAddress } from "../lib/properties/lookup";
import type { LoadedRuleSet } from "../lib/rules/types";

const profiles = JSON.parse(fs.readFileSync("research/gis/data/clearwater-residential-pilot-v2/property-profiles.json", "utf8"));
const clean = profiles.find((profile: { displayAddress: string }) => profile.displayAddress === "1950 DREW PLZ");

function clientReturning(data: unknown[]) {
  return { rpc: async (_name: string, args: Record<string, string>) => {
    if (normalizeAddress(args.lookup_address) !== clean.normalizedAddress || args.jurisdiction_slug !== "clearwater-fl") return { data: [], error: null };
    return { data, error: null };
  } } as never;
}

const cleanRow = { property_id: "pilot-property", display_address: clean.displayAddress, normalized_zoning_code: clean.normalizedZoningCode, validation_status: "clean" };

test("known clean pilot address resolves after conservative casing and spacing normalization", async () => {
  assert.equal(clean.status, "clean");
  assert.equal(clean.normalizedZoningCode, "lmdr");
  assert.equal(normalizeAddress("  1950   drew plz "), "1950 DREW PLZ");
  const property = await findPropertyByAddress("clearwater-fl", "  1950   drew plz ", clientReturning([cleanRow]));
  assert.equal(property?.displayAddress, "1950 DREW PLZ");
});

test("unknown address and duplicate matches fail safely", async () => {
  assert.equal(await findPropertyByAddress("clearwater-fl", "999 NOT IN PILOT", clientReturning([cleanRow])), null);
  assert.equal(await findPropertyByAddress("clearwater-fl", clean.displayAddress, clientReturning([cleanRow, cleanRow])), null);
});

test("only a CLEAN profile produces the supported zoning fact", () => {
  assert.deepEqual(propertyProfileToFacts({ id: "1", displayAddress: "x", normalizedZoningCode: "lmdr", validationStatus: "clean" }), { "property.zoning_district": "lmdr" });
  assert.deepEqual(propertyProfileToFacts({ id: "2", displayAddress: "x", normalizedZoningCode: "mdr", validationStatus: "review" }), {});
});

test("seed contains CLEAN addresses and excludes all REVIEW addresses", () => {
  const seed = fs.readFileSync("supabase/migrations/20260824000001_seed_clearwater_residential_pilot.sql", "utf8");
  assert.match(seed, /1950 DREW PLZ/);
  for (const profile of profiles.filter((item: { status: string }) => item.status === "review")) assert.doesNotMatch(seed, new RegExp(profile.displayAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("property-derived zoning is supplied to evaluation and removes that missing fact", () => {
  const ruleSet: LoadedRuleSet = { key: "proof", title: "proof", jurisdiction: "clearwater-fl", projectType: "fence", coverageStatus: "limited", knownGaps: [], relationships: [], rules: [{ key: "zone", title: "zone", groupKey: null, versionNumber: 1, condition: { fact: "property.zoning_district", op: "eq", value: "lmdr" }, evaluationMode: "deterministic", summary: "proof", outcomes: [], citations: [], inputs: [{ key: "property.zoning_district", label: "Zone", dataType: "enum", unit: null, propertyDerived: true, userInputAllowed: false, requiredWhenApplicable: true, role: "applicability", options: [] }] }] };
  const facts = propertyProfileToFacts({ id: "1", displayAddress: clean.displayAddress, normalizedZoningCode: clean.normalizedZoningCode, validationStatus: "clean" });
  const result = evaluateLoadedRuleSet(ruleSet, { jurisdiction: "clearwater-fl", projectType: "fence", facts });
  assert.equal(result.matchedRules[0]?.key, "zone");
  assert.equal(result.missingInputs.some((input) => input.key === "property.zoning_district"), false);
});
