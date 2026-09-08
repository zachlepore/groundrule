"use server";
import { resolveClearwaterPropertyForGuide } from "../property-resolution";
import { buildClearwaterSetbacksGuide } from "../../../lib/guides/setbacks";
import { propertyProfileToFacts } from "../../../lib/properties";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startSetbacksLookup(address:string){const resolution=await resolveClearwaterPropertyForGuide(address);if(resolution.status!=="eligible")return resolution;const {property}=resolution;const facts=propertyProfileToFacts(property);const result=await evaluateProjectRules({jurisdiction:"clearwater-fl",projectType:"setbacks",facts});return{status:"eligible" as const,displayAddress:property.displayAddress,guide:buildClearwaterSetbacksGuide(result,facts)};}
