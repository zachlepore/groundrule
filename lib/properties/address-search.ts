import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server";
import { normalizeAddress, type AddressMatchType, type MunicipalityAddressCandidate } from "./address-normalization";

type SearchClient = Pick<SupabaseClient, "rpc">;

export async function searchMunicipalityAddresses({
  jurisdiction,
  query,
  limit = 5,
  client = createSupabaseServerClient(),
}: {
  jurisdiction: string;
  query: string;
  limit?: number;
  client?: SearchClient;
}): Promise<MunicipalityAddressCandidate[]> {
  const normalized = normalizeAddress(query);
  if (normalized.length < 3) return [];
  const safeLimit = Math.max(1, Math.min(8, Math.trunc(limit)));
  const { data, error } = await client.rpc("search_trusted_municipality_addresses", {
    jurisdiction_slug: jurisdiction,
    search_query: normalized,
    result_limit: safeLimit,
  });
  if (error) throw new Error(`Address search failed: ${error.message}`);
  if (!Array.isArray(data)) return [];
  return data.map((value) => {
    const row = value as Record<string, unknown>;
    return {
      propertyId: String(row.property_id),
      canonicalAddress: String(row.display_address),
      municipality: jurisdiction,
      matchType: String(row.match_type) as AddressMatchType,
    };
  });
}
