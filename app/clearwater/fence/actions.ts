"use server";
import { resolveClearwaterPropertyForGuide } from "../property-resolution";

import { evaluateProjectRules } from "../../../lib/rules";
import { propertyProfileToFacts } from "../../../lib/properties";
import { buildClearwaterFenceGuide } from "../../../lib/guides/fence";

const jurisdiction = "clearwater-fl";

export async function startFenceLookup(address: string) {
  const resolution = await resolveClearwaterPropertyForGuide(address);
  if (resolution.status !== "eligible") return resolution;
  const { property } = resolution;
  const facts = { ...propertyProfileToFacts(property), "project.structure_type": "fence", "project.work_type": "new", "project.temporary_construction_fence": false };
  const result = await evaluateProjectRules({ jurisdiction, projectType: "fence", facts });
  return { status: "eligible" as const, displayAddress: property.displayAddress, facts, result, guide: buildClearwaterFenceGuide(result, facts) };
}
