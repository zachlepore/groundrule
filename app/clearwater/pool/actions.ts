"use server";
import { resolveClearwaterPropertyForGuide } from "../property-resolution";
import {buildClearwaterPoolGuide} from "../../../lib/guides/pool";import {propertyProfileToFacts} from "../../../lib/properties";import {evaluateProjectRules} from "../../../lib/rules";
export async function startPoolLookup(address:string){const resolution=await resolveClearwaterPropertyForGuide(address);if(resolution.status!=="eligible")return resolution;const {property}=resolution;const facts=propertyProfileToFacts(property);const result=await evaluateProjectRules({jurisdiction:"clearwater-fl",projectType:"pool",facts});return{status:"eligible" as const,displayAddress:property.displayAddress,guide:buildClearwaterPoolGuide(result,facts)};}
