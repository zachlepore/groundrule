#!/usr/bin/env node
/** Read-only MDR/OSR investigation. Never writes an address lookup or approvals. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import RBush from 'rbush';
import intersect from '@turf/intersect';
import area from '@turf/area';
import { featureCollection } from '@turf/helpers';
import { verifySource } from './clearwater-rule001.mjs';
import { normalizeZoning as norm, covers } from './clearwater-pilot.mjs';
import { normalizeReviewSession } from './clearwater-rule001-policy.mjs';
import { loadHumanEvidence } from './clearwater-rule002.mjs';
import { rankRemaining, validateApproval } from './export-clearwater-approved-rule002.mjs';
import { indexItem, measureOsrParcel } from './clearwater-rule002-intersections.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function digest(p){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(p)){h.update(b);bytes+=b.length;}return {sha256:h.digest('hex'),bytes};}
const metrics=rs=>({parcels:rs.length,addresses:rs.reduce((s,r)=>s+r.remainingProfiles.length,0)});
const codes=d=>[...new Set(d.zoningCodeCoverage.map(z=>z.normalizedZoningCode))].sort();
export function sourceFlags(d,profiles,duplicate=false,reviews=[]){
  const flags=[];
  if(!d.parcelFound||!d.parcelGeometryValid||!(d.parcelAreaSquareMeters>0))flags.push('invalid_or_missing_parcel_geometry');
  if(d.hasInvalidZoningGeometry)flags.push('invalid_zoning_geometry');
  flags.push(...(d.sourceErrors??[]));
  if(!Number.isFinite(d.totalZoningCoveragePercent)||d.totalZoningCoveragePercent<99.9||d.totalZoningCoveragePercent>100.1)flags.push('coverage_outside_99.9_to_100.1_percent');
  if(d.zoningCodeCoverage.some(z=>!Number.isFinite(z.percentOfParcel)||z.percentOfParcel<=0||z.percentOfParcel>100.1))flags.push('invalid_district_coverage');
  if(d.hasRepeatedNormalizedCode||d.zoningCodeCoverage.some(z=>z.repeatedPolygons))flags.push('repeated_same_code_polygons');
  if(d.hasOverlappingSameCodePolygons||d.zoningCodeCoverage.some(z=>z.overlappingPolygons))flags.push('overlapping_same_code_polygons');
  if(duplicate)flags.push('duplicate_parcel_identity');
  if(profiles.some(p=>p.normalizedJurisdiction!=='clearwater'||p.jurisdictionStatus!=='confirmed'))flags.push('jurisdiction_not_confirmed');
  if(profiles.some(p=>!['clean','review'].includes(p.status)||!Array.isArray(p.issues)||p.issues.some(i=>i!=='parcel_ambiguous_zoning')))flags.push('unrelated_source_profile_issue');
  if(reviews.some(r=>['human_true_split','human_staff_review','human_primary_applicability_unclear'].includes(r.humanReview.reviewStatus)))flags.push('human_split_or_uncertain');
  if(reviews.some(r=>r.humanReview.reviewStatus==='human_confirmed'&&norm(r.humanReview.result.replace(/^CONFIRMED:\s*/,''))!=='mdr'))flags.push('gold_contradiction');
  if(reviews.some(r=>r.humanReview.reviewStatus==='human_primary_candidate'&&r.humanReview.reportedPrimaryCode&&norm(r.humanReview.reportedPrimaryCode)!=='mdr'))flags.push('conflicting_human_candidate_evidence');
  return [...new Set(flags)];
}
export async function run(sourceDir,approvedDir,outputDir,archive){
assert.ok(sourceDir&&approvedDir&&outputDir&&archive,'source approved output archive required');
[sourceDir,approvedDir,outputDir,archive]=[sourceDir,approvedDir,outputDir,archive].map(p=>path.resolve(p));
assert.ok(![sourceDir,approvedDir].some(p=>outputDir===p||outputDir.startsWith(p+path.sep)));
try{await access(outputDir);throw new Error('Fresh output directory required');}catch(e){if(e.code!=='ENOENT')throw e;}
const manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json'));
assert.equal((await digest(archive)).sha256,manifest.archiveSha256);
const gold=await json(path.join(ROOT,'research/gis/zoning-gold/reference-dataset.json'));
const source=await verifySource(sourceDir,manifest,gold);
console.log('Verified archive, source file hashes, metadata and full-city denominators.');
const approval=await json(path.join(ROOT,'research/gis/rule002-approval.same-code-v1.json'));
validateApproval(approval,manifest);
for(const [name,sha] of Object.entries(approval.basisFileSha256))assert.equal((await digest(path.join(ROOT,name))).sha256,sha,name);
const checks=await json(path.join(approvedDir,'output-checksums.json'));
for(const [name,v] of Object.entries(checks)){assert.equal(path.basename(name),name);assert.deepEqual(await digest(path.join(approvedDir,name)),v,name);}
const audit=await json(path.join(approvedDir,'approval-audit.json'));
assert.equal(audit.approvalConfigSha256,(await digest(path.join(ROOT,'research/gis/rule002-approval.same-code-v1.json'))).sha256);
assert.equal(audit.exporterSha256,(await digest(path.join(ROOT,'scripts/gis/export-clearwater-approved-rule002.mjs'))).sha256);
for(const [k,v] of Object.entries(approval.expected))assert.equal(audit[k],v,k);
const rows=[];for await(const l of createInterface({input:createReadStream(path.join(approvedDir,'clearwater-approved-address-lookup.jsonl')),crlfDelay:Infinity}))rows.push(JSON.parse(l));
assert.equal(rows.length,63430);
for(let i=0;i<rows.length;i++){const {researchRule001,researchRule002,approvedPrimaryGuidance,...original}=rows[i];assert.deepEqual(original,source.profiles[i]);}
const approvalCounts={};for(const r of rows)if(r.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED'){const id=r.approvedPrimaryGuidance.ruleId;approvalCounts[id]=(approvalCounts[id]??0)+1;}
assert.deepEqual(approvalCounts,{'CLR-Z-001':1967,'CLR-Z-002':262});
const reviews=[...gold.records];
for(const e of gold.additionalReviewDatasets){const p=path.join(ROOT,'research/gis/zoning-gold',e.path);assert.equal((await digest(p)).sha256,e.sha256);reviews.push(...normalizeReviewSession((await json(p)).records));}
reviews.push(...(await loadHumanEvidence()).reviews);
const ranking=rankRemaining(rows,source.diagnostic.parcels,reviews);
assert.deepEqual(ranking,await json(path.join(approvedDir,'remaining-review-population.json')));
const remaining=rows.filter(r=>r.status==='review'&&r.approvedPrimaryGuidance.status!=='GUIDANCE_READY_APPROVED');
const byParcel=new Map();for(const p of source.profiles){const id=String(p.parcelIdentifier);if(!byParcel.has(id))byParcel.set(id,[]);byParcel.get(id).push(p);}
const remainingIds=new Set(remaining.map(r=>String(r.parcelIdentifier)));
const evidence=new Map(source.diagnostic.parcels.map(d=>[d.parcelIdentifier,d]));
const zoningTree=new RBush();zoningTree.load(source.layers.zoning.features.map(indexItem));
const trees=['mdr','os/r'].map(c=>{const t=new RBush();t.load(source.layers.zoning.features.map(indexItem).filter(e=>norm(e.feature.properties.ZONING)===c));return t;});
const parcels=new Map(),duplicates=new Set(),missing=[],screened=[];
for(const p of source.layers.parcels.features){
  const id=String(p.properties.PARCELID??p.properties.STRAP);
  if(parcels.has(id))duplicates.add(id);else parcels.set(id,p);
  if(!remainingIds.has(id)||!trees.every(t=>t.collides(indexItem(p))))continue;
  screened.push(id);
  if(!evidence.has(id)){const d=measureOsrParcel(p,zoningTree.search(indexItem(p)));evidence.set(id,d);missing.push(d);}
}
console.log(`Completeness screen: ${new Set(screened).size} remaining REVIEW parcel boxes; ${missing.length} missing diagnostics measured.`);
const population=[...evidence.values()].filter(d=>remainingIds.has(d.parcelIdentifier)&&['mdr','os/r'].every(c=>codes(d).includes(c))).map(d=>{
  const id=d.parcelIdentifier,profiles=byParcel.get(id),observed=reviews.filter(r=>r.parcelId===id);
  const remainingProfiles=remaining.filter(r=>String(r.parcelIdentifier)===id).map(r=>({address:r.displayAddress,addressId:r.sourceAddressIdentifier,primary:r.zoningCode,issues:r.issues,coordinates:r.addressCoordinates}));
  return {parcelId:id,districts:codes(d),evidence:d,remainingProfiles,knownReviews:observed.map(r=>({caseId:r.caseNumber,humanReview:r.humanReview})),flags:sourceFlags(d,profiles,duplicates.has(id),observed),investigativeHolds:[],osrPercent:d.zoningCodeCoverage.find(z=>z.normalizedZoningCode==='os/r').percentOfParcel};
}).sort((a,b)=>a.parcelId.localeCompare(b.parcelId));
const exact=population.filter(r=>r.districts.length===2),multi=population.filter(r=>r.districts.length>2);
// Independent repeat measurement plus cross-code overlap check; never changes frozen evidence.
let maxPercentDelta=0,maxAreaDelta=0;const geometries=[];
for(const r of exact){
  const p=parcels.get(r.parcelId),entries=zoningTree.search(indexItem(p)),measured=measureOsrParcel(p,entries);
  assert.deepEqual(codes(measured),r.districts);
  for(const z of r.evidence.zoningCodeCoverage){const m=measured.zoningCodeCoverage.find(e=>e.normalizedZoningCode===z.normalizedZoningCode);maxPercentDelta=Math.max(maxPercentDelta,Math.abs(m.percentOfParcel-z.percentOfParcel));maxAreaDelta=Math.max(maxAreaDelta,Math.abs(m.intersectionAreaSquareMeters-z.intersectionAreaSquareMeters));}
  const clipped=measured.zoningFeatures.map(z=>({district:z.normalizedZoningCode,geometry:intersect(featureCollection([p,source.layers.zoning.features[z.sourceIndex]])).geometry}));
  let crossCodeOverlapM2=0;
  for(let i=0;i<clipped.length;i++)for(let j=i+1;j<clipped.length;j++)if(clipped[i].district!==clipped[j].district){const f=intersect(featureCollection([clipped[i],clipped[j]].map(x=>({type:'Feature',properties:{},geometry:x.geometry}))));if(f)crossCodeOverlapM2+=area(f);}
  r.crossCodeOverlapM2=crossCodeOverlapM2;
  if(crossCodeOverlapM2>0.000001)r.flags.push('cross_code_positive_area_overlap');
  r.addressPointEvidence=r.remainingProfiles.map(a=>({addressId:a.addressId,address:a.address,
    insideLinkedParcel:covers(p.geometry,a.coordinates),mappedDistrictsAtAddress:clipped.filter(z=>covers(z.geometry,a.coordinates)).map(z=>z.district)}));
  if(r.addressPointEvidence.some(a=>!a.insideLinkedParcel))r.investigativeHolds.push('address_point_outside_identifier_linked_parcel');
  r.representativePointEvidence=byParcel.get(r.parcelId).map(a=>({addressId:a.sourceAddressIdentifier,point:a.parcelRepresentativePoint,
    mappedDistricts:clipped.filter(z=>covers(z.geometry,a.parcelRepresentativePoint)).map(z=>z.district)}));
  geometries.push({parcelId:r.parcelId,parcel:p,intersections:clipped,addresses:r.remainingProfiles.map(p=>({address:p.address,coordinates:p.coordinates}))});
}
assert.ok(maxPercentDelta<=0.000002&&maxAreaDelta<=0.000501,'Repeat measurement differs from frozen diagnostic');
const screenedSameCode=exact.filter(r=>!r.flags.length&&r.remainingProfiles.every(p=>norm(p.primary)==='mdr'));
const proposedBounded=screenedSameCode.filter(r=>!r.investigativeHolds.length);
const geometryGroups=new Map();for(const r of exact){const key=JSON.stringify(parcels.get(r.parcelId).geometry);if(!geometryGroups.has(key))geometryGroups.set(key,[]);geometryGroups.get(key).push(r);}
const sharedGeometryGroups=[...geometryGroups.values()].filter(g=>g.length>1).map(g=>({parcelIds:g.map(r=>r.parcelId),...metrics(g),osrPercent:g[0].osrPercent}));
const bands=[[0,.1],[.1,1],[1,2],[2,3],[3,5],[5,10],[10,20],[20,50],[50,100.1]].map(([lo,hi])=>({range:`>${lo}–${hi}%`,allExactPair:metrics(exact.filter(r=>r.osrPercent>lo&&r.osrPercent<=hi)),screenedSameCode:metrics(screenedSameCode.filter(r=>r.osrPercent>lo&&r.osrPercent<=hi))}));
const groups={};for(const r of multi){const key=r.districts.join(' + ');(groups[key]??=[]).push(r);}
const exclusions={};for(const f of [...new Set(exact.flatMap(r=>r.flags))])exclusions[f]=metrics(exact.filter(r=>r.flags.includes(f)));
const quantiles=rs=>{const a=rs.map(r=>r.osrPercent).sort((a,b)=>a-b);return Object.fromEntries([0,.25,.5,.75,.9,.95,1].map(q=>[q,a[Math.floor(q*(a.length-1))]]));};
const addressQuantiles=rs=>quantiles(rs.flatMap(r=>r.remainingProfiles.map(()=>r)));
const summary={investigationOnly:true,approved:false,sourceSnapshotId:manifest.snapshotId,sourceArchiveSha256:manifest.archiveSha256,allAddresses:rows.length,approvalCounts,remainingReview:remaining.length,
  historicalDiagnosticClass:ranking.ranking.find(g=>g.combination==='mdr + os/r'),exactPair:metrics(exact),screenedSameCode:metrics(screenedSameCode),proposedBounded:metrics(proposedBounded),investigativeHold:metrics(screenedSameCode.filter(r=>r.investigativeHolds.length)),sharedGeometry:{distinctExactPairGeometries:geometryGroups.size,groups:sharedGeometryGroups},additionalDistricts:metrics(multi),additionalDistrictCombinations:Object.fromEntries(Object.entries(groups).map(([k,rs])=>[k,metrics(rs)])),exclusionReasonsOverlapping:exclusions,
  exactPairPrimaryCounts:Object.fromEntries([...new Set(exact.flatMap(r=>r.remainingProfiles.map(p=>p.primary)))].map(c=>[c,exact.flatMap(r=>r.remainingProfiles).filter(p=>p.primary===c).length])),
  bands,screenedSameCodeOsrQuantiles:{parcelWeighted:quantiles(screenedSameCode),addressWeighted:addressQuantiles(screenedSameCode)},
  presentationComparisons:Object.fromEntries([1,2,3,5].map(t=>[t,{prominent:metrics(screenedSameCode.filter(r=>r.osrPercent>t)),nonProminent:metrics(screenedSameCode.filter(r=>r.osrPercent<=t))}])),
  proposedBoundedPresentationComparisons:Object.fromEntries([0,1,2,3,5].map(t=>[t,{prominent:metrics(proposedBounded.filter(r=>r.osrPercent>t)),nonProminent:metrics(proposedBounded.filter(r=>r.osrPercent<=t))}])),
  completeness:{remainingReviewParcels:remainingIds.size,bboxScreenedParcels:new Set(screened).size,missingDiagnosticsMeasured:missing.length,supplementalPositivePairs:missing.filter(d=>['mdr','os/r'].every(c=>codes(d).includes(c))).length},
  independentMeasurement:{parcels:exact.length,maxPercentDelta,maxAreaDelta,crossCodeOverlappingParcels:exact.filter(r=>r.crossCodeOverlapM2>0.000001).length},
  knownReviewedExactPairParcels:exact.filter(r=>r.knownReviews.length).length,duplicateExactParcelIds:exact.filter(r=>duplicates.has(r.parcelId)).length,multipartExactParcels:exact.filter(r=>r.evidence.parcelMultipart).length,
  largestAddressConcentrations:screenedSameCode.slice().sort((a,b)=>b.remainingProfiles.length-a.remainingProfiles.length).slice(0,10).map(r=>({parcelId:r.parcelId,address:r.remainingProfiles[0].address,addresses:r.remainingProfiles.length,osrPercent:r.osrPercent})),
  sourceVerification:source.verification,approvedLookup:await digest(path.join(approvedDir,'clearwater-approved-address-lookup.jsonl')),processorSha256:(await digest(fileURLToPath(import.meta.url))).sha256};
await mkdir(outputDir,{recursive:true});
for(const [name,v] of Object.entries({'summary.json':summary,'parcel-inventory.json':population,'map-geometries.json':geometries,'supplemental-intersections.json':missing}))await writeFile(path.join(outputDir,name),JSON.stringify(v,null,2)+'\n');
const outputChecks={};for(const name of ['summary.json','parcel-inventory.json','map-geometries.json','supplemental-intersections.json'])outputChecks[name]=await digest(path.join(outputDir,name));
await writeFile(path.join(outputDir,'checksums.json'),JSON.stringify(outputChecks,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await run(...process.argv.slice(2));
