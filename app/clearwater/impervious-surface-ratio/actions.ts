"use server";
import { buildClearwaterImperviousSurfaceRatioGuide } from "../../../lib/guides/impervious-surface-ratio";
import { propertyProfileToFacts, requireClearwaterProperty } from "../../../lib/properties";
import { findPropertyByAddress } from "../../../lib/properties/lookup";
import { evaluateProjectRules } from "../../../lib/rules";
export async function startImperviousSurfaceRatioLookup(address:string){const property=await findPropertyByAddress("clearwater-fl",address);if(!property)return null;const gate=requireClearwaterProperty(property);if(!gate.eligible)return{status:"blocked" as const,displayAddress:property.displayAddress,...gate};const facts=propertyProfileToFacts(property);const result=await evaluateProjectRules({jurisdiction:"clearwater-fl",projectType:"impervious_surface_ratio",facts});return{status:"eligible" as const,displayAddress:property.displayAddress,guide:buildClearwaterImperviousSurfaceRatioGuide(result,facts)};}
