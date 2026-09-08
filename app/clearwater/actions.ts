"use server";

import { searchMunicipalityAddresses } from "../../lib/properties/address-search";
import { resolveClearwaterPropertyForGuide } from "./property-resolution";

export async function searchClearwaterAddresses(query: string) {
  return searchMunicipalityAddresses({ jurisdiction: "clearwater-fl", query });
}

export async function startClearwaterPropertyLookup(address: string) {
  const resolution = await resolveClearwaterPropertyForGuide(address);
  if (resolution.status !== "eligible") return resolution;
  const { property } = resolution;
  return { status: "eligible" as const, displayAddress: property.displayAddress, guide: null };
}
