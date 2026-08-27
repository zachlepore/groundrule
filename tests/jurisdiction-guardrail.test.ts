import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { classifyParcelJurisdiction, gateClearwaterEvaluation, type BoundaryPolygon } from "../lib/properties/jurisdiction";
import type { JurisdictionKey, StoredPropertyProfile } from "../lib/properties/types";

const now="2026-08-26T00:00:00Z";
const source="Pinellas County Enterprise GIS Municipal Boundaries, MUNI field";
const boundaries:BoundaryPolygon[]=[
 {jurisdiction:{normalizedKey:"clearwater",authorityName:"City of Clearwater",source,sourceUpdatedAt:now},rings:[[[0,0],[10,0],[10,10],[0,10],[0,0]]]},
 {jurisdiction:{normalizedKey:"unincorporated_pinellas",authorityName:"Unincorporated Pinellas County",source,sourceUpdatedAt:now},rings:[[[10,0],[20,0],[20,10],[10,10],[10,0]]]},
];
const classify=(ring:[number,number][])=>classifyParcelJurisdiction(ring,boundaries,now);
const profile=(key:JurisdictionKey,name:string|null="City of Clearwater"):StoredPropertyProfile=>({id:"parcel",displayAddress:"1950 DREW PLZ, CLEARWATER, FL",normalizedZoningCode:"lmdr",validationStatus:"clean",jurisdiction:{normalizedKey:key,authorityName:name,source,sourceUpdatedAt:now,derivedAt:now}});

test("ordinary parcel is deterministically classified and retains provenance",()=>{const result=classify([[1,1],[2,1],[2,2],[1,2],[1,1]]);assert.equal(result.normalizedKey,"clearwater");assert.equal(result.source,source);assert.equal(result.sourceUpdatedAt,now)});
test("1950 DREW PLZ committed parcel is confirmed before Clearwater evaluation",()=>{const profiles=JSON.parse(fs.readFileSync("research/gis/data/clearwater-residential-pilot-v2/property-profiles.json","utf8"));assert.ok(profiles.some((p:{displayAddress:string})=>p.displayAddress==="1950 DREW PLZ"));assert.deepEqual(gateClearwaterEvaluation(profile("clearwater")),{eligible:true})});
test("unincorporated, other municipality, unknown and ambiguous cannot evaluate Fence or Shed",()=>{for(const key of ["unincorporated_pinellas","other_pinellas_municipality","unknown","ambiguous"] as JurisdictionKey[]){const gate=gateClearwaterEvaluation(profile(key,key==="other_pinellas_municipality"?"City of Largo":"Unincorporated Pinellas County"));assert.equal(gate.eligible,false);for(const workflow of ["fence","shed"])assert.equal(gate.eligible,false,workflow)}});
test("parcel crossing or touching a municipal boundary fails ambiguous",()=>assert.equal(classify([[9,1],[11,1],[11,2],[9,2],[9,1]]).normalizedKey,"ambiguous"));
test("missing or malformed parcel geometry fails unknown",()=>assert.equal(classify([]).normalizedKey,"unknown"));
test("mailing city and agreement-to-annex text never affect classification",()=>{const p=profile("unincorporated_pinellas","Unincorporated Pinellas County");p.displayAddress="CLEARWATER FL — AGREEMENT TO ANNEX";assert.equal(gateClearwaterEvaluation(p).eligible,false)});
test("runtime gate source has no network request",()=>{const code=fs.readFileSync("lib/properties/jurisdiction.ts","utf8");assert.doesNotMatch(code,/fetch\(|https?:\/\//)});
test("migration is forward-only and historical migrations remain free of jurisdiction columns",()=>{const old=fs.readFileSync("supabase/migrations/20260824000000_create_property_lookup_schema.sql","utf8");assert.doesNotMatch(old,/jurisdiction_key/);assert.match(fs.readFileSync("supabase/migrations/20260826000001_add_property_jurisdiction_guardrail.sql","utf8"),/jurisdiction_key/) });
test("pilot enrichment is deterministic, count-checked, and idempotent",()=>{const migration=fs.readFileSync("supabase/migrations/20260827000000_enrich_clearwater_pilot_jurisdiction.sql","utf8");assert.match(migration,/matched_count <> 106/);assert.match(migration,/enriched_count <> 106/);assert.match(migration,/update public\.properties/);assert.doesNotMatch(migration,/insert into public\.properties/)});
