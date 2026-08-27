"use server";
import { buildClearwaterSetbacksGuide } from "../../../lib/guides/setbacks";
import { propertyProfileToFacts,requireClearwaterProperty } from "../../../lib/properties";
import { findPropertyByAddress } from "../../../lib/properties/lookup";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startSetbacksLookup(address:string){const property=await findPropertyByAddress("clearwater-fl",address);if(!property)return null;const gate=requireClearwaterProperty(property);if(!gate.eligible)return{status:"blocked" as const,displayAddress:property.displayAddress,...gate};const facts=propertyProfileToFacts(property);const result=await evaluateProjectRules({jurisdiction:"clearwater-fl",projectType:"setbacks",facts});return{status:"eligible" as const,displayAddress:property.displayAddress,guide:buildClearwaterSetbacksGuide(result,facts)};}
