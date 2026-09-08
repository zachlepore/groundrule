import "server-only";

import { findPropertyByAddress, resolvePropertyAddress } from "../../lib/properties/lookup";
import { requireClearwaterProperty } from "../../lib/properties";
import type { StoredPropertyProfile } from "../../lib/properties/types";

const jurisdiction = "clearwater-fl";

export type ClearwaterAddressResolution =
  | { status: "no_match" | "ambiguous" | "untrusted_property" }
  | { status: "blocked"; reason: "outside" | "unconfirmed"; jurisdictionName: string | null }
  | { status: "eligible"; property: StoredPropertyProfile };

/**
 * Converts generic resolution states into Clearwater admission states. Resolution
 * explains failures; the strict lookup and existing jurisdiction gate still grant admission.
 */
export async function resolveClearwaterPropertyForGuide(address: string): Promise<ClearwaterAddressResolution> {
  const resolution = await resolvePropertyAddress(jurisdiction, address);
  if (resolution.status !== "resolved") return { status: resolution.status };

  // Do not use the informational resolver as evaluation authorization.
  const property = await findPropertyByAddress(jurisdiction, address);
  if (!property) return { status: "untrusted_property" };

  const gate = requireClearwaterProperty(property);
  if (!gate.eligible) return { status: "blocked", ...gate };
  return { status: "eligible", property };
}
