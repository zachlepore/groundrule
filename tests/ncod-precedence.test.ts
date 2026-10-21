import test from "node:test";
import assert from "node:assert/strict";
import { evaluateLoadedRuleSet } from "../lib/rules/evaluate";
import { PrecedenceValidationError } from "../lib/rules/precedence";
import type { Citation, Condition, LoadedRule, LoadedRuleSet, RuleRelationship, Facts } from "../lib/rules/types";
const citation: Citation = { sourceTitle:"Synthetic fixture only",sectionIdentifier:"fixture-section",sectionTitle:null,excerpt:"No municipal regulatory content",sourceUrl:null,editionLabel:"fixture-v1",publishedOn:null,effectiveFrom:"2026-01-01",effectiveTo:null,citationRole:"precedence",pinpointNote:null };
const yes: Condition = {fact:"yes",op:"is_true"};
function rule(key:string,condition:Condition=yes):LoadedRule { return {key,title:key,groupKey:null,versionNumber:1,condition,evaluationMode:"deterministic",summary:key,outcomes:[{sequence:1,type:key==="generic"?"permission":"prohibition",subjectKey:"fixture.subject",parameters:{},severity:"requirement",messageTemplate:key}],inputs:[{key:"scope",label:"Scope",dataType:"boolean",unit:null,propertyDerived:false,userInputAllowed:true,requiredWhenApplicable:true,role:"applicability",options:[]}],citations:[{...citation,sectionIdentifier:key}]}; }
function edge(from="specific",to="generic",type="excepts",scope:Condition|null={fact:"scope",op:"is_true"}):RuleRelationship {return {fromRuleKey:from,toRuleKey:to,type,rationale:"Synthetic explicit relationship",scopeCondition:scope,metadata:{fromVersionNumber:1,toVersionNumber:1,sourceEditionLabel:"fixture-v1",sourceProvisionId:"fixture-section",sourceProvisionChecksum:"a".repeat(64)},sourceProvisionId:"fixture-section",sourceProvisionChecksum:"a".repeat(64),citations:[citation],effectiveFrom:"2026-01-01",effectiveTo:null};}
function fixture():LoadedRuleSet {return {key:"synthetic",title:"Synthetic fixture",jurisdiction:"fixture",projectType:"fixture",coverageStatus:"limited",knownGaps:[],rules:[rule("generic"),rule("specific"),rule("unrelated")],relationships:[edge()]};}
const evaluate=(set=fixture(),facts:Facts={yes:true,scope:true},date="2026-10-20")=>evaluateLoadedRuleSet(set,{jurisdiction:"fixture",projectType:"fixture",facts,asOfDate:date});
const all=(result:ReturnType<typeof evaluate>)=>[...result.matchedRules,...result.unknownRules,...result.reviewRequiredRules,...result.notMatchedRules];
const get=(result:ReturnType<typeof evaluate>,key="generic")=>all(result).find(r=>r.key===key)!;
test("scoped override suppresses effective outcomes, preserving truth, original match and provisions",()=>{
 const set=fixture(),before=structuredClone(set),r=evaluate(set),g=get(r);
 assert.equal(g.truth,"TRUE");assert.equal(g.rawStatus,"MATCHED");assert.equal(g.status,"NOT_MATCHED");assert.equal(g.resolution?.state,"suppressed");assert.equal(g.outcomes.length,0);assert.equal(g.rawOutcomes?.length,1);
 assert.deepEqual(g.resolution?.controllingRuleKeys,["specific"]);assert.ok(g.resolution?.citations.some(c=>c.sectionIdentifier==="fixture-section"));assert.equal(get(r,"unrelated").status,"MATCHED");assert.deepEqual(set,before);
});
for(const type of ["excepts","exempts_from"])test(`${type}: false scope preserves ordinary result`,()=>{const s=fixture();s.relationships[0].type=type;assert.equal(get(evaluate(s,{yes:true,scope:false})).status,"MATCHED");});
test("UNKNOWN scope withholds contradictory permission and exposes missing scope prompt",()=>{const r=evaluate(fixture(),{yes:true});assert.equal(get(r).status,"UNKNOWN");assert.equal(get(r).outcomes.length,0);assert.deepEqual(get(r).missingFactKeys,["scope"]);assert.deepEqual(r.missingInputs.map(i=>i.key),["scope"]);});
test("known null scope fact remains UNKNOWN",()=>assert.equal(get(evaluate(fixture(),{yes:true,scope:null})).status,"UNKNOWN"));
test("different base district makes relationship inapplicable",()=>{const s=fixture();s.relationships[0].scopeCondition={fact:"base",op:"eq",value:"fixture-base"};assert.equal(get(evaluate(s,{yes:true,base:"other"})).status,"MATCHED");});
test("more-specific labels do not invent legal suppression",()=>{const s=fixture();s.relationships[0].type="more_specific_than";assert.equal(get(evaluate(s)).status,"MATCHED");});
test("effective interval includes start, excludes end; future and expired edges inactive",()=>{
 const s=fixture();s.relationships[0].effectiveTo="2026-11-01";
 assert.equal(get(evaluate(s,undefined,"2026-01-01")).status,"NOT_MATCHED");assert.equal(get(evaluate(s,undefined,"2025-12-31")).status,"MATCHED");assert.equal(get(evaluate(s,undefined,"2026-11-01")).status,"MATCHED");
});
test("expired old version does not invalidate current graph",()=>{const s=fixture();s.relationships[0].effectiveTo="2026-02-01";s.relationships[0].metadata.fromVersionNumber=99;assert.equal(get(evaluate(s)).status,"MATCHED");});
for(const mutation of ["version","endpoint","cycle","duplicate","conflict","binding","checksum","edition","date","scope"]){test(`invalid graph ${mutation} returns no partial guidance`,()=>{
 const s=fixture();
 if(mutation==="version")s.relationships[0].metadata.fromVersionNumber=2;
 if(mutation==="endpoint")s.relationships[0].fromRuleKey="missing";
 if(mutation==="cycle")s.relationships.push(edge("generic","specific"));
 if(mutation==="duplicate")s.relationships.push(structuredClone(s.relationships[0]));
 if(mutation==="conflict")s.relationships.push(edge("specific","generic","potentially_conflicts_with"));
 if(mutation==="binding")s.relationships[0].metadata={};
 if(mutation==="checksum")s.relationships[0].sourceProvisionChecksum="b".repeat(64);
 if(mutation==="edition")s.relationships[0].metadata.sourceEditionLabel="stale";
 if(mutation==="date")s.relationships[0].effectiveFrom="2026-02-30";
 if(mutation==="scope")s.relationships[0].scopeCondition={fact:"scope",op:"invalid"} as unknown as Condition;
 assert.throws(()=>evaluate(s),PrecedenceValidationError);
 });}
test("source provision dates must cover evaluation date",()=>{const s=fixture();s.relationships[0].citations![0]={...citation,effectiveTo:"2026-03-01"};assert.throws(()=>evaluate(s),PrecedenceValidationError);});
test("non-deterministic source cannot establish a definitive exemption",()=>{const s=fixture();s.rules[1].evaluationMode="discretionary";assert.equal(get(evaluate(s)).status,"UNKNOWN");assert.equal(get(evaluate(s)).outcomes.length,0);});
test("missing source facts block affected permission",()=>{const s=fixture();s.rules[1].condition={fact:"source-missing",op:"is_true"};assert.equal(get(evaluate(s)).status,"UNKNOWN");});
test("explicit conflict withholds both effective outcomes, scope FALSE does nothing",()=>{const s=fixture();s.relationships[0].type="potentially_conflicts_with";const r=evaluate(s);assert.equal(r.conflicts.length,1);assert.equal(get(r).resolution?.state,"conflicting");assert.equal(get(r,"specific").outcomes.length,0);assert.equal(get(evaluate(s,{yes:true,scope:false})).status,"MATCHED");});
test("competing controllers require review rather than arbitrary priority",()=>{const s=fixture();s.relationships.push(edge("unrelated","generic"));assert.throws(()=>evaluate(s),PrecedenceValidationError);});
test("override chains resolve effective controllers before their targets",()=>{const s=fixture();s.rules.push(rule("higher"));s.relationships.push(edge("higher","specific"));const r=evaluate(s);assert.equal(get(r,"specific").status,"NOT_MATCHED");assert.equal(get(r).status,"MATCHED");});
test("depends_on uses prerequisite result and scope, never exemption semantics",()=>{const s=fixture();s.relationships=[edge("generic","specific","depends_on")];s.rules[1].condition={fact:"prerequisite",op:"is_true"};assert.equal(get(evaluate(s,{yes:true,scope:true,prerequisite:false})).status,"NOT_MATCHED");assert.equal(get(evaluate(s,{yes:true,scope:true})).status,"UNKNOWN");});
test("rule and relationship permutations produce identical complete results",()=>{
 const s=fixture();s.rules.push(rule("other"));s.relationships.push(edge("other","unrelated"));const expected=evaluate(s);s.rules.reverse();s.relationships.reverse();assert.deepEqual(evaluate(s),expected);
});
test("registered Clearwater seed-v1 compatibility cannot leak to later versions or new scoped edges",()=>{
 const s=fixture();s.key="clearwater_fence_v1";s.rules=[rule("chain_link.public_landbank"),rule("chain_link.landscaping")];s.relationships=[{fromRuleKey:s.rules[0].key,toRuleKey:s.rules[1].key,type:"exempts_from",rationale:"Existing seed",scopeCondition:null,metadata:{}}];assert.doesNotThrow(()=>evaluate(s));s.rules[0].versionNumber=2;assert.throws(()=>evaluate(s),PrecedenceValidationError);
});
test("inherited object properties are not known scope facts",()=>{const s=fixture();s.relationships[0].scopeCondition={fact:"constructor",op:"is_true"};const r=evaluate(s,{yes:true});assert.equal(get(r).status,"UNKNOWN");assert.deepEqual(get(r).missingFactKeys,["constructor"]);});
test("a pending override cannot erase an existing explicit conflict",()=>{const s=fixture();s.rules.push(rule("other"));s.relationships=[edge("other","generic","potentially_conflicts_with"),edge("specific","generic")];const r=evaluate(s);assert.equal(get(r).resolution?.state,"conflicting");assert.equal(get(r).status,"REVIEW_REQUIRED");assert.equal(r.conflicts[0].toStatus,"REVIEW_REQUIRED");assert.equal(get(r).outcomes.length,0);});
test("source FALSE with unknown scope does not block generic guidance",()=>{const s=fixture();s.rules[1].condition={fact:"absent",op:"is_true"};assert.equal(get(evaluate(s,{yes:true,absent:false})).status,"MATCHED");});
test("relationship missing-input metadata is deterministic when rule roles differ",()=>{const s=fixture();s.rules[0].inputs[0].role="measurement";const expected=evaluate(s,{yes:true});s.rules.reverse();assert.deepEqual(evaluate(s,{yes:true}),expected);});
test("loaded rule-version dates and evaluation date are checked in memory too",()=>{const s=fixture();s.rules[0].effectiveTo="2026-10-20";assert.throws(()=>evaluate(s),PrecedenceValidationError);assert.throws(()=>evaluate(fixture(),undefined,"not-a-date"),PrecedenceValidationError);});
test("cycles made only of descriptive specificity edges are invalid",()=>{const s=fixture();s.relationships=[edge("specific","generic","more_specific_than"),edge("generic","specific","more_specific_than")];assert.throws(()=>evaluate(s),PrecedenceValidationError);});
test("a new override cannot erase unrelated subjects within a mixed generic rule",()=>{const s=fixture();s.rules[0].outcomes.push({...s.rules[0].outcomes[0],sequence:2,subjectKey:"unrelated.subject"});assert.throws(()=>evaluate(s),PrecedenceValidationError);});
