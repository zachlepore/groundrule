import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { normalizeAddress } from "../lib/properties/address-normalization";
import { searchMunicipalityAddresses } from "../lib/properties/address-search";

test("normalization handles case, whitespace, punctuation, and established suffix equivalents", () => {
  for (const value of ["1950 Drew Plz", "  1950   DREW plaza ", "1950 drew plz."]) {
    assert.equal(normalizeAddress(value), "1950 DREW PLZ");
  }
  assert.equal(normalizeAddress("12 Main Street"), normalizeAddress("12 main st"));
  assert.equal(normalizeAddress("8 Lake Boulevard"), normalizeAddress("8 lake blvd"));
});

test("shared search passes normalized municipality-scoped input and a bounded configurable limit", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = { rpc: async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    return { data: [{ property_id: "p1", display_address: "1950 DREW PLZ", match_type: "fuzzy" }], error: null };
  }} as never;
  const result = await searchMunicipalityAddresses({ jurisdiction: "clearwater-fl", query: "1950 prew plaza", limit: 99, client });
  assert.deepEqual(calls[0], { name: "search_trusted_municipality_addresses", args: { jurisdiction_slug: "clearwater-fl", search_query: "1950 PREW PLZ", result_limit: 8 } });
  assert.deepEqual(result, [{ propertyId: "p1", canonicalAddress: "1950 DREW PLZ", municipality: "clearwater-fl", matchType: "fuzzy" }]);
});

test("short or unmatched input returns no suggestions safely", async () => {
  let called = false;
  const client = { rpc: async () => { called = true; return { data: [], error: null }; } } as never;
  assert.deepEqual(await searchMunicipalityAddresses({ jurisdiction: "wolcott-ct", query: " 1", client }), []);
  assert.equal(called, false);
  assert.deepEqual(await searchMunicipalityAddresses({ jurisdiction: "wolcott-ct", query: "no reasonable match", client }), []);
});

test("migration scopes, ranks, limits, and excludes non-CLEAN and unconfirmed municipality records", () => {
  const sql = fs.readFileSync("supabase/migrations/20260908000000_add_municipality_address_search.sql", "utf8");
  assert.match(sql, /j\.slug=jurisdiction_slug/);
  assert.match(sql, /p\.validation_status='clean'/);
  assert.match(sql, /p\.jurisdiction_key = split_part\(j\.slug/);
  assert.match(sql, /order by match_score desc, display_address, property_id/);
  assert.match(sql, /least\(coalesce\(result_limit, 5\), 8\)/);
  assert.match(sql, /gin \(normalized_address extensions\.gin_trgm_ops\)/);
});

test("combobox requires explicit fuzzy selection and clears selection after edits", () => {
  const source = fs.readFileSync("app/clearwater/resident-shell.tsx", "utf8");
  assert.match(source, /role="combobox"/); assert.match(source, /role="listbox"/); assert.match(source, /role="option"/);
  assert.match(source, /ArrowDown/); assert.match(source, /ArrowUp/); assert.match(source, /Escape/);
  assert.match(source, /candidate\.matchType === "fuzzy"/);
  assert.match(source, /setSelectedAddress\(null\)/);
  assert.doesNotMatch(source, /runLookup\(candidate\.canonicalAddress/);
});
