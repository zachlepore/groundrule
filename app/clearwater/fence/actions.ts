"use server";

import { evaluateProjectRules } from "../../../lib/rules";
import type { Facts } from "../../../lib/rules/types";
import { findPropertyByAddress } from "../../../lib/properties/lookup";
import { propertyProfileToFacts } from "../../../lib/properties";
import { buildClearwaterFenceGuide } from "../../../lib/guides/fence";

const jurisdiction = "clearwater-fl";

export async function startFenceLookup(address: string) {
  const property = await findPropertyByAddress(jurisdiction, address);
  if (!property) return null;
  const facts = { ...propertyProfileToFacts(property), "project.structure_type": "fence", "project.work_type": "new", "project.temporary_construction_fence": false };
  const result = await evaluateProjectRules({ jurisdiction, projectType: "fence", facts });
  return { displayAddress: property.displayAddress, facts, result, guide: buildClearwaterFenceGuide(result, facts) };
}

export async function evaluateFenceAnswers(address: string, facts: Facts) {
  const property = await findPropertyByAddress(jurisdiction, address);
  if (!property) throw new Error("The property is outside trusted pilot coverage.");
  const propertyFacts = propertyProfileToFacts(property);
  return evaluateProjectRules({ jurisdiction, projectType: "fence", facts: { ...facts, ...propertyFacts } });
}
