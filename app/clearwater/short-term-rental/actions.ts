"use server";
import { resolveClearwaterPropertyForGuide } from "../property-resolution";
import { buildClearwaterShortTermRentalGuide } from "../../../lib/guides/short-term-rental";
import { propertyProfileToFacts } from "../../../lib/properties";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startShortTermRentalLookup(address:string){const resolution=await resolveClearwaterPropertyForGuide(address);if(resolution.status!=="eligible")return resolution;const {property}=resolution;const facts=propertyProfileToFacts(property);const result=await evaluateProjectRules({jurisdiction:"clearwater-fl",projectType:"short_term_rental",facts});return{status:"eligible" as const,displayAddress:property.displayAddress,guide:buildClearwaterShortTermRentalGuide(result,facts)};}
