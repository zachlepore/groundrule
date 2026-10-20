/** Read-only counterfactual audit of committed rules; never loads or changes Supabase. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluateLoadedRuleSet} from '../../lib/rules/evaluate';
import type {LoadedRule,LoadedRuleSet,Condition} from '../../lib/rules/types';
async function main(){
const file='supabase/migrations/20260823000000_seed_clearwater_fence_rules.sql';
const text=await readFile(file,'utf8');
const keys=['height.front_baseline','height.side_rear_baseline','chain_link.side_rear_base_height','chain_link.side_rear_vinyl_height'];
const rules:LoadedRule[]=keys.map(key=>{
 const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=text.match(new RegExp("\\('"+escaped+"','(deterministic|partial|external|informational)','([^']+)'::jsonb"));
 assert.ok(match,`Committed condition ${key}`);
 return {key,title:key,groupKey:key.split('.')[0],versionNumber:1,condition:JSON.parse(match[2]) as Condition,evaluationMode:match[1] as LoadedRule['evaluationMode'],summary:'Committed migration condition, not a newly encoded rule',outcomes:[],inputs:[],citations:[]};
});
const set:LoadedRuleSet={key:'READ_ONLY_MIGRATION_CONDITION_AUDIT',title:'Counterfactual only',jurisdiction:'clearwater-fl',projectType:'fence',coverageStatus:'limited',knownGaps:['Overlay precedence not encoded'],rules,relationships:[]};
const scenarios=[
 {id:'composite_code_front_non_chain',facts:{'property.zoning_district':'LMDR-NCOD Coachman R','project.is_chain_link':false,'project.location_zone':'front'},forbiddenGenericMatch:'height.front_baseline'},
 {id:'stripped_base_front_non_chain',facts:{'property.zoning_district':'lmdr','project.is_chain_link':false,'project.location_zone':'front'},forbiddenGenericMatch:'height.front_baseline'},
 {id:'coachman_side_uncoated_chain_link',facts:{'property.zoning_district':'lmdr','project.is_chain_link':true,'project.location_zone':'rear','project.vinyl_color':'none','property.is_recreational_facility':false},forbiddenGenericMatch:'chain_link.side_rear_base_height'},
 {id:'coachman_side_coated_chain_link',facts:{'property.zoning_district':'lmdr','project.is_chain_link':true,'project.location_zone':'side','project.vinyl_color':'black','property.is_recreational_facility':false},forbiddenGenericMatch:'chain_link.side_rear_vinyl_height'},
];
const results=scenarios.map(s=>{const e=evaluateLoadedRuleSet(set,{jurisdiction:'clearwater-fl',projectType:'fence',facts:s.facts});assert.ok(e.matchedRules.some(r=>r.key===s.forbiddenGenericMatch));return {...s,matchedRules:e.matchedRules.map(r=>r.key),interpretation:'A generic condition matches if the unsupported property is fed directly/aliased into the evaluator. This is not production behavior or permission; overlay-specific rules/precedence are missing.'};});
const result={sourceFile:file,sourceSha256:createHash('sha256').update(text).digest('hex'),readOnly:true,noDatabaseAccess:true,scope:'Committed migration conditions, not a live rule-database audit; original property adapter blocks REVIEW and supplies only normalized zoning for clean profiles.',conditions:rules.map(r=>({key:r.key,condition:r.condition})),scenarios:results,scenariosPassed:results.length,newApprovals:0};
const encoded=JSON.stringify(result,null,2)+'\n';if(process.argv[2])await writeFile(process.argv[2],encoded);else console.log(encoded);

}
main().catch(error=>{console.error(error);process.exitCode=1;});
