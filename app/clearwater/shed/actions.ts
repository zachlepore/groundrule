"use server";
import { resolveClearwaterPropertyForGuide } from "../property-resolution";
import { buildClearwaterShedGuide } from "../../../lib/guides/shed";
import { propertyProfileToFacts } from "../../../lib/properties";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startShedLookup(address: string) { const resolution=await resolveClearwaterPropertyForGuide(address);if(resolution.status!=="eligible")return resolution;const {property}=resolution; const facts = { ...propertyProfileToFacts(property), "project.structure_type": "shed" }; const result = await evaluateProjectRules({ jurisdiction: "clearwater-fl", projectType: "shed", facts }); return { status:"eligible" as const, displayAddress: property.displayAddress, guide: buildClearwaterShedGuide(result, facts) }; }
