"use server";

import { findPropertyByAddress } from "../../lib/properties/lookup";
import { requireClearwaterProperty } from "../../lib/properties";

export async function startClearwaterPropertyLookup(address: string) {
  const property = await findPropertyByAddress("clearwater-fl", address);
  if (!property) return null;
  const gate = requireClearwaterProperty(property);
  if (!gate.eligible) return { status: "blocked" as const, displayAddress: property.displayAddress, ...gate };
  return { status: "eligible" as const, displayAddress: property.displayAddress, guide: null };
}
