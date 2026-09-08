import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server";
import type { PropertyResolutionResult, StoredPropertyProfile } from "./types";
export { normalizeAddress } from "./address-normalization";
import { normalizeAddress } from "./address-normalization";

type LookupClient = Pick<SupabaseClient, "rpc">;

function propertyFromRow(row: Record<string, unknown>): StoredPropertyProfile {
  return {
    id: String(row.property_id),
    displayAddress: String(row.display_address),
    normalizedZoningCode: typeof row.normalized_zoning_code === "string" ? row.normalized_zoning_code : null,
    validationStatus: "clean",
    jurisdiction: {
      normalizedKey: String(row.jurisdiction_key) as StoredPropertyProfile["jurisdiction"]["normalizedKey"],
      authorityName: typeof row.jurisdiction_authority_name === "string" ? row.jurisdiction_authority_name : null,
      source: String(row.jurisdiction_source),
      sourceUpdatedAt: typeof row.jurisdiction_source_updated_at === "string" ? row.jurisdiction_source_updated_at : null,
      derivedAt: String(row.jurisdiction_derived_at),
    },
  };
}

/**
 * Resolves an exact canonical address without granting evaluation eligibility.
 * Callers must still apply the municipality's jurisdiction gate before evaluation.
 */
export async function resolvePropertyAddress(
  jurisdiction: string,
  address: string,
  client: LookupClient = createSupabaseServerClient(),
): Promise<PropertyResolutionResult> {
  const normalized = normalizeAddress(address);
  if (!normalized) return { status: "no_match" };
  const { data, error } = await client.rpc("resolve_property_address_state", {
    jurisdiction_slug: jurisdiction,
    lookup_address: normalized,
  });
  if (error) throw new Error(`Property resolution failed: ${error.message}`);
  if (!Array.isArray(data) || data.length === 0) return { status: "no_match" };
  const matchCount = Number((data[0] as Record<string, unknown>).match_count ?? data.length);
  if (matchCount !== 1 || data.length !== 1) return { status: "ambiguous", matchCount: Math.max(matchCount, data.length) };
  const row = data[0] as Record<string, unknown>;
  if (row.validation_status !== "clean") {
    return { status: "untrusted_property", propertyId: String(row.property_id), validationStatus: "review" };
  }
  return { status: "resolved", property: propertyFromRow(row) };
}

export async function findPropertyByAddress(
  jurisdiction: string,
  address: string,
  client: LookupClient = createSupabaseServerClient(),
): Promise<StoredPropertyProfile | null> {
  const normalized = normalizeAddress(address);
  if (!normalized) return null;
  const { data, error } = await client.rpc("find_trusted_property_by_address", {
    jurisdiction_slug: jurisdiction,
    lookup_address: normalized,
  });
  if (error) throw new Error(`Property lookup failed: ${error.message}`);
  if (!Array.isArray(data) || data.length !== 1) return null;
  const row = data[0] as Record<string, unknown>;
  if (row.validation_status !== "clean") return null;
  return propertyFromRow(row);
}
