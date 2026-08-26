"use server";
import { buildClearwaterShedGuide } from "../../../lib/guides/shed";
import { propertyProfileToFacts } from "../../../lib/properties";
import { findPropertyByAddress } from "../../../lib/properties/lookup";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startShedLookup(address: string) { const property = await findPropertyByAddress("clearwater-fl", address); if (!property) return null; const facts = { ...propertyProfileToFacts(property), "project.structure_type": "shed" }; const result = await evaluateProjectRules({ jurisdiction: "clearwater-fl", projectType: "shed", facts }); return { displayAddress: property.displayAddress, guide: buildClearwaterShedGuide(result, facts) }; }
