"use server";
import { resolveClearwaterPropertyForGuide } from "../property-resolution";
import { buildClearwaterImperviousSurfaceRatioGuide } from "../../../lib/guides/impervious-surface-ratio";
import { propertyProfileToFacts } from "../../../lib/properties";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startImperviousSurfaceRatioLookup(address:string){const resolution=await resolveClearwaterPropertyForGuide(address);if(resolution.status!=="eligible")return resolution;const {property}=resolution;const facts=propertyProfileToFacts(property);const result=await evaluateProjectRules({jurisdiction:"clearwater-fl",projectType:"impervious_surface_ratio",facts});return{status:"eligible" as const,displayAddress:property.displayAddress,guide:buildClearwaterImperviousSurfaceRatioGuide(result,facts)};}
