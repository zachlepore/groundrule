"use server";

import { evaluateProjectRules } from "../../../lib/rules";
import { findPropertyByAddress } from "../../../lib/properties/lookup";
import { propertyProfileToFacts, requireClearwaterProperty } from "../../../lib/properties";
import { buildClearwaterFenceGuide } from "../../../lib/guides/fence";

const jurisdiction = "clearwater-fl";

export async function startFenceLookup(address: string) {
  const property = await findPropertyByAddress(jurisdiction, address);
  if (!property) return null;
  const gate = requireClearwaterProperty(property);
  if (!gate.eligible) return { status: "blocked" as const, displayAddress: property.displayAddress, ...gate };
  const facts = { ...propertyProfileToFacts(property), "project.structure_type": "fence", "project.work_type": "new", "project.temporary_construction_fence": false };
  const result = await evaluateProjectRules({ jurisdiction, projectType: "fence", facts });
  return { status: "eligible" as const, displayAddress: property.displayAddress, facts, result, guide: buildClearwaterFenceGuide(result, facts) };
}
