"use server";
import { buildClearwaterShortTermRentalGuide } from "../../../lib/guides/short-term-rental";
import { propertyProfileToFacts, requireClearwaterProperty } from "../../../lib/properties";
import { findPropertyByAddress } from "../../../lib/properties/lookup";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startShortTermRentalLookup(address:string){const property=await findPropertyByAddress("clearwater-fl",address);if(!property)return null;const gate=requireClearwaterProperty(property);if(!gate.eligible)return{status:"blocked" as const,displayAddress:property.displayAddress,...gate};const facts=propertyProfileToFacts(property);const result=await evaluateProjectRules({jurisdiction:"clearwater-fl",projectType:"short_term_rental",facts});return{status:"eligible" as const,displayAddress:property.displayAddress,guide:buildClearwaterShortTermRentalGuide(result,facts)};}
