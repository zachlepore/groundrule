import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRuleSet } from "../lib/rules/loader";
import { PrecedenceValidationError } from "../lib/rules/precedence";
const checksum="a".repeat(64);
const version=(id:string)=>({id,version_number:1,condition:{fact:"fixture",op:"is_true"},evaluation_mode:"deterministic",summary:id,effective_from:"2026-01-01",effective_to:null,research_status:"verified",lifecycle_status:"active",published_at:"2026-01-01T00:00:00Z"});
function data():Record<string,unknown> {return {
 rule_sets:{id:"set",key:"fixture",title:"fixture",coverage_status:"limited",known_gaps:[]},
 rules:[{id:"a",key:"specific",title:"specific",group_key:null,active_version_id:"va",rule_versions:version("va")},{id:"b",key:"generic",title:"generic",group_key:null,active_version_id:"vb",rule_versions:version("vb")}],
 rule_outcomes:[],rule_version_inputs:[],rule_citations:[],
 rule_relationships:[{from_rule_id:"a",to_rule_id:"b",relationship_type:"excepts",rationale:"Synthetic fixture",scope_condition:{fact:"scope",op:"is_true"},effective_from:"2026-01-01",effective_to:"2026-11-01",source_provision_id:"provision",metadata:{fromVersionNumber:1,toVersionNumber:1,sourceEditionLabel:"fixture-v1",sourceProvisionId:"provision",sourceProvisionChecksum:checksum},source_provisions:{locator:"fixture",display_locator:null,title:null,excerpt:"Synthetic fixture only",excerpt_checksum:checksum,source_url:null,regulatory_sources:{title:"Fixture",edition_label:"fixture-v1",published_on:null,effective_from:"2026-01-01",effective_to:null}}}]
};}
function client(tables:Record<string,unknown>,calls:string[]) {
 return {from(table:string){const builder={select(columns:string){calls.push(`${table}.select:${columns}`);return this;},eq(){return this;},not(){return this;},lte(column:string,value:string){calls.push(`${table}.lte:${column}:${value}`);return this;},or(expression:string){calls.push(`${table}.or:${expression}`);return this;},limit(){return this;},maybeSingle(){return this;},in(){return this;},order(){return this;},then(resolve:(result:unknown)=>unknown){return Promise.resolve({data:tables[table],error:null}).then(resolve);}};return builder;}} as unknown as SupabaseClient;
}
test("loader retains finite-ended current relationships and complete source/version/date trace",async()=>{
 const calls:string[]=[],set=await loadRuleSet("fixture","fence",client(data(),calls),"2026-10-20");assert.equal(set.relationships.length,1);assert.equal(set.relationships[0].effectiveTo,"2026-11-01");assert.equal(set.relationships[0].sourceProvisionChecksum,checksum);assert.equal(set.relationships[0].citations![0].editionLabel,"fixture-v1");assert.equal(set.relationships[0].validationPolicy,"versioned");assert.ok(calls.some(c=>c.includes("effective_to.gt.2026-10-20")));assert.ok(calls.some(c=>c.startsWith("rule_relationships.select:")&&c.includes("excerpt_checksum")));
});
test("loader excludes future and expired edges without removing finite active edges",async()=>{
 for(const date of ["2025-12-31","2026-11-01"]){const tables=data();if(date==="2025-12-31")(tables.rules as {rule_versions:ReturnType<typeof version>}[]).forEach(r=>r.rule_versions.effective_from="2025-01-01");assert.equal((await loadRuleSet("fixture","fence",client(tables,[]),date)).relationships.length,0);}
});
test("loader fails closed for mismatched active endpoint versions",async()=>{
 const tables=data();(tables.rules as {rule_versions:ReturnType<typeof version>}[])[0].rule_versions.version_number=2;await assert.rejects(loadRuleSet("fixture","fence",client(tables,[]),"2026-10-20"),PrecedenceValidationError);
});
test("loader refuses unavailable current versions instead of inventing historical versions",async()=>{
 for(const patch of [{effective_from:"2026-12-01"},{effective_to:"2026-10-20"},{research_status:"draft"},{lifecycle_status:"withdrawn"},{published_at:null}]){
  const tables=data();Object.assign((tables.rules as {rule_versions:ReturnType<typeof version>}[])[0].rule_versions,patch);await assert.rejects(loadRuleSet("fixture","fence",client(tables,[]),"2026-10-20"),PrecedenceValidationError);
 }
});
test("loader catches source substitution, missing graph endpoints and malformed evaluation dates",async()=>{
 for(const patch of [{source_provision_id:"wrong"},{to_rule_id:"unloaded"}]){const tables=data();Object.assign((tables.rule_relationships as object[])[0],patch);await assert.rejects(loadRuleSet("fixture","fence",client(tables,[]),"2026-10-20"),PrecedenceValidationError);}
 await assert.rejects(loadRuleSet("fixture","fence",client(data(),[]),"2026-02-30"),PrecedenceValidationError);
});
