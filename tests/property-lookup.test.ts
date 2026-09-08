import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { evaluateLoadedRuleSet } from "../lib/rules/evaluate";
import { propertyProfileToFacts } from "../lib/properties/facts";
import { findPropertyByAddress, normalizeAddress, resolvePropertyAddress } from "../lib/properties/lookup";
import { gateClearwaterEvaluation } from "../lib/properties/jurisdiction";
import type { LoadedRuleSet } from "../lib/rules/types";

const profiles = JSON.parse(fs.readFileSync("research/gis/data/clearwater-residential-pilot-v2/property-profiles.json", "utf8"));
const clean = profiles.find((profile: { displayAddress: string }) => profile.displayAddress === "1950 DREW PLZ");

function clientReturning(data: unknown[]) {
  return { rpc: async (_name: string, args: Record<string, string>) => {
    if (normalizeAddress(args.lookup_address) !== clean.normalizedAddress || args.jurisdiction_slug !== "clearwater-fl") return { data: [], error: null };
    return { data, error: null };
  } } as never;
}

const jurisdictionRow = { jurisdiction_key: "clearwater", jurisdiction_authority_name: "City of Clearwater", jurisdiction_source: "Pinellas County municipal boundary GIS", jurisdiction_source_updated_at: "2026-08-25T00:00:00Z", jurisdiction_derived_at: "2026-08-26T00:00:00Z" };
const cleanRow = { ...jurisdictionRow, property_id: "pilot-property", display_address: clean.displayAddress, normalized_zoning_code: clean.normalizedZoningCode, validation_status: "clean" };

const resolutionClient = (data: unknown[]) => ({ rpc: async () => ({ data, error: null }) }) as never;

test("shared non-evaluating resolution preserves no-match, REVIEW, and ambiguity states", async () => {
  assert.deepEqual(await resolvePropertyAddress("clearwater-fl", "195 bingo bong", resolutionClient([])), { status: "no_match" });
  assert.deepEqual(await resolvePropertyAddress("clearwater-fl", "100 review st", resolutionClient([{ ...cleanRow, property_id: "review-property", validation_status: "review", match_count: 1 }])), {
    status: "untrusted_property", propertyId: "review-property", validationStatus: "review",
  });
  const ambiguous = await resolvePropertyAddress("clearwater-fl", "100 shared st", resolutionClient([
    { ...cleanRow, property_id: "first", match_count: 2 }, { ...cleanRow, property_id: "second", match_count: 2 },
  ]));
  assert.deepEqual(ambiguous, { status: "ambiguous", matchCount: 2 });
  assert.equal("property" in ambiguous, false);
});

test("unique CLEAN resolution remains subject to the existing jurisdiction gate", async () => {
  const inside = await resolvePropertyAddress("clearwater-fl", clean.displayAddress, resolutionClient([{ ...cleanRow, match_count: 1 }]));
  assert.equal(inside.status, "resolved");
  if (inside.status === "resolved") assert.deepEqual(gateClearwaterEvaluation(inside.property), { eligible: true });

  const outside = await resolvePropertyAddress("clearwater-fl", "100 county rd", resolutionClient([{ ...cleanRow, jurisdiction_key: "unincorporated_pinellas", jurisdiction_authority_name: "Unincorporated Pinellas County", match_count: 1 }]));
  assert.equal(outside.status, "resolved");
  if (outside.status === "resolved") assert.deepEqual(gateClearwaterEvaluation(outside.property), { eligible: false, reason: "outside", jurisdictionName: "Unincorporated Pinellas County" });
});

test("resolution RPC is informational while trusted lookup and suggestions stay clean-only", () => {
  const resolutionSql = fs.readFileSync("supabase/migrations/20260908000001_add_non_evaluating_property_resolution.sql", "utf8");
  const searchSql = fs.readFileSync("supabase/migrations/20260908000000_add_municipality_address_search.sql", "utf8");
  assert.doesNotMatch(resolutionSql, /validation_status\s*=\s*'clean'/);
  assert.match(resolutionSql, /count\(\*\) over \(\) as match_count/);
  assert.match(searchSql, /find_trusted_property_by_address[\s\S]*p\.validation_status='clean'/);
  assert.match(searchSql, /search_trusted_municipality_addresses[\s\S]*p\.validation_status='clean'/);
});

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
  assert.deepEqual(propertyProfileToFacts({ id: "1", displayAddress: "x", normalizedZoningCode: "lmdr", validationStatus: "clean", jurisdiction: { normalizedKey: "clearwater", authorityName: "City of Clearwater", source: "GIS", sourceUpdatedAt: null, derivedAt: "now" } }), { "property.zoning_district": "lmdr" });
  assert.deepEqual(propertyProfileToFacts({ id: "2", displayAddress: "x", normalizedZoningCode: "mdr", validationStatus: "review", jurisdiction: { normalizedKey: "unknown", authorityName: null, source: "GIS", sourceUpdatedAt: null, derivedAt: "now" } }), {});
});

test("seed contains CLEAN addresses and excludes all REVIEW addresses", () => {
  const seed = fs.readFileSync("supabase/migrations/20260824000001_seed_clearwater_residential_pilot.sql", "utf8");
  assert.match(seed, /1950 DREW PLZ/);
  for (const profile of profiles.filter((item: { status: string }) => item.status === "review")) assert.doesNotMatch(seed, new RegExp(profile.displayAddress.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("property-derived zoning is supplied to evaluation and removes that missing fact", () => {
  const ruleSet: LoadedRuleSet = { key: "proof", title: "proof", jurisdiction: "clearwater-fl", projectType: "fence", coverageStatus: "limited", knownGaps: [], relationships: [], rules: [{ key: "zone", title: "zone", groupKey: null, versionNumber: 1, condition: { fact: "property.zoning_district", op: "eq", value: "lmdr" }, evaluationMode: "deterministic", summary: "proof", outcomes: [], citations: [], inputs: [{ key: "property.zoning_district", label: "Zone", dataType: "enum", unit: null, propertyDerived: true, userInputAllowed: false, requiredWhenApplicable: true, role: "applicability", options: [] }] }] };
  const facts = propertyProfileToFacts({ id: "1", displayAddress: clean.displayAddress, normalizedZoningCode: clean.normalizedZoningCode, validationStatus: "clean", jurisdiction: { normalizedKey: "clearwater", authorityName: "City of Clearwater", source: "GIS", sourceUpdatedAt: null, derivedAt: "now" } });
  const result = evaluateLoadedRuleSet(ruleSet, { jurisdiction: "clearwater-fl", projectType: "fence", facts });
  assert.equal(result.matchedRules[0]?.key, "zone");
  assert.equal(result.missingInputs.some((input) => input.key === "property.zoning_district"), false);
});
