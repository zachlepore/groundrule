"use server";
import { buildClearwaterShedGuide } from "../../../lib/guides/shed";
import { propertyProfileToFacts, requireClearwaterProperty } from "../../../lib/properties";
import { findPropertyByAddress } from "../../../lib/properties/lookup";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startShedLookup(address: string) { const property = await findPropertyByAddress("clearwater-fl", address); if (!property) return null; const gate=requireClearwaterProperty(property); if(!gate.eligible)return {status:"blocked" as const,displayAddress:property.displayAddress,...gate}; const facts = { ...propertyProfileToFacts(property), "project.structure_type": "shed" }; const result = await evaluateProjectRules({ jurisdiction: "clearwater-fl", projectType: "shed", facts }); return { status:"eligible" as const, displayAddress: property.displayAddress, guide: buildClearwaterShedGuide(result, facts) }; }
