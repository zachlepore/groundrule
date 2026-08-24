import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server";
import type { StoredPropertyProfile } from "./types";

export function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, " ").toUpperCase();
}

type LookupClient = Pick<SupabaseClient, "rpc">;

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
  return {
    id: String(row.property_id),
    displayAddress: String(row.display_address),
    normalizedZoningCode: typeof row.normalized_zoning_code === "string" ? row.normalized_zoning_code : null,
    validationStatus: "clean",
  };
}
