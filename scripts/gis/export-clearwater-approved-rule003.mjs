#!/usr/bin/env node
/** Owner-authorized, allowlisted offline Rule 003. Never changes frozen originals. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, access, cp, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { run as investigate, sourceFlags } from './investigate-clearwater-rule003.mjs';
import { writeJsonl } from './clearwater-rule002.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CONFIG='research/gis/rule003-approval.bounded-v1.json';
export const NOTICE="Part of this property intersects an area mapped OS/R. The guidance below begins with the property's MDR zoning classification. Additional restrictions may apply depending on the location and nature of your project. Confirm applicable requirements with the City.";
export const UNCERTAINTIES=['shared_land_rights','density_calculations','zoning_boundary_disputes','project_specific_applicability'];
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function digest(p){const h=createHash('sha256');let bytes=0;for await(const b of createReadStream(p)){h.update(b);bytes+=b.length;}return {sha256:h.digest('hex'),bytes};}
async function* lines(p){for await(const l of createInterface({input:createReadStream(p),crlfDelay:Infinity}))yield JSON.parse(l);}
export function validateApproval(c,manifest){
  assert.equal(c.schemaVersion,1);assert.equal(c.ruleId,'CLR-Z-003');assert.equal(c.ruleVersion,'1.0.0-approved-static');
  assert.equal(c.approvalId,'CLR-Z-003-BOUNDED-MDR-2026-10-16');assert.equal(c.decision,'APPROVED_FOR_OFFLINE_STATIC_EXPORT_ONLY');assert.ok(c.authorization);
  assert.equal(c.basisCommit,'c83bf91');assert.equal(c.sourceSnapshotId,manifest.snapshotId);assert.equal(c.sourceArchiveSha256,manifest.archiveSha256);
  assert.deepEqual(c.scope,{originalQaStatus:'review',existingPrimaryCode:'MDR',exactPositiveAreaDistricts:['MDR','OS/R'],membershipFile:'research/gis/rule003-membership.v1.json',maximumNewApprovals:731,requireAllExistingEligibilityAndHumanChecks:true,excludeAddressLinkHolds:true});
  assert.deepEqual(c.presentation,{osrNoticeProminentWhenPercentGreaterThan:0,presentationOnly:true,noticeThresholdIsLegalExemption:false,secondaryOsrAppliesToEntireParcel:false,retainSecondaryGeometryPercentagesAndProvenance:true,noticeText:NOTICE});
  assert.deepEqual(c.uncertainties,UNCERTAINTIES);
  assert.deepEqual(c.expected,{allAddresses:63430,rule001Approved:1967,rule002Approved:262,candidateAddresses:731,addressLinkHolds:2,unsupportedOsrPrimary:3,additionalDistricts:148,maximumTotalApproved:2960});
  assert.match(c.investigationInventorySha256,/^[a-f0-9]{64}$/);assert.ok(Object.keys(c.basisFileSha256).length>=10);
}
export function reconcileMembership(population,membership){
  assert.equal(membership.schemaVersion,1);assert.equal(membership.basisCommit,'c83bf91');assert.equal(membership.sourceSnapshotId,'clearwater-gis-2026-09-28');
  const actual={approvedCandidates:[],addressLinkHolds:[],unsupportedOsrPrimary:[],additionalDistricts:[]};
  for(const r of population){
    const category=r.districts.length>2?'additionalDistricts':r.flags.length?'unsupportedOsrPrimary':r.investigativeHolds.length?'addressLinkHolds':'approvedCandidates';
    for(const p of r.remainingProfiles)actual[category].push({addressId:p.addressId,parcelId:r.parcelId});
  }
  for(const rows of Object.values(actual))rows.sort((a,b)=>a.addressId-b.addressId);
  assert.deepEqual(actual,membership.categories,'Investigated membership drift: no substitutions or scope expansion');
  const ids=Object.values(actual).flat().map(r=>r.addressId);assert.equal(new Set(ids).size,884,'Duplicate or missing investigation membership');
  for(const [k,n] of Object.entries({approvedCandidates:731,addressLinkHolds:2,unsupportedOsrPrimary:3,additionalDistricts:148}))assert.equal(actual[k].length,n,k);
  return actual;
}
export function assess(row,parcel,member){
  const failures=[];
  if(!member||member.addressId!==row.sourceAddressIdentifier||member.parcelId!==String(row.parcelIdentifier))failures.push('not_in_approved_membership');
  if(row.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED')failures.push('prior_approval_conflict');
  if(row.status!=='review'||row.zoningCode!=='MDR')failures.push('not_original_review_existing_MDR');
  if(!parcel||parcel.parcelId!==String(row.parcelIdentifier))return [...failures,'missing_parcel_evidence'];
  if(JSON.stringify(parcel.districts)!==JSON.stringify(['mdr','os/r']))failures.push('not_exact_MDR_OSR');
  failures.push(...parcel.flags,...parcel.investigativeHolds,...sourceFlags(parcel.evidence,[row],false,parcel.knownReviews));
  const zones=parcel.evidence.zoningCodeCoverage;
  if(zones.length!==2||new Set(zones.map(z=>z.normalizedZoningCode)).size!==2||!['mdr','os/r'].every(c=>zones.some(z=>z.normalizedZoningCode===c)))failures.push('invalid_exact_pair_evidence');
  const osr=zones.find(z=>z.normalizedZoningCode==='os/r');
  if(!(osr?.percentOfParcel>0)||!(osr?.intersectionAreaSquareMeters>0.000001)||osr.percentOfParcel!==parcel.osrPercent)failures.push('nonpositive_or_inconsistent_OSR');
  if(parcel.crossCodeOverlapM2>0.000001)failures.push('cross_code_overlap');
  if(!parcel.addressPointEvidence?.some(p=>p.addressId===row.sourceAddressIdentifier&&p.insideLinkedParcel&&p.mappedDistrictsAtAddress.length===1&&p.mappedDistrictsAtAddress[0]==='mdr'))failures.push('address_location_unresolved');
  if(!parcel.representativePointEvidence?.some(p=>p.addressId===row.sourceAddressIdentifier&&p.mappedDistricts.length===1&&p.mappedDistricts[0]==='mdr'))failures.push('primary_location_unresolved');
  return [...new Set(failures)];
}
export function approveRecord(row,parcel,member,config){
  const failures=assess(row,parcel,member);if(failures.length)return {row,failures};
  return {failures:[],row:{...row,approvedPrimaryGuidance:{...row.approvedPrimaryGuidance,
    status:'GUIDANCE_READY_APPROVED',primaryZoning:'MDR',ruleId:config.ruleId,ruleVersion:config.ruleVersion,approvalId:config.approvalId,
    disposition:'APPROVED_RULE003_BOUNDED_SAME_CODE_REVIEW',stillRequiresReview:false,sourceSnapshotId:config.sourceSnapshotId,
    sourceMappedDistricts:['MDR','OS/R'],retainedSecondaryDistrict:'OS/R',mappedOsrPercent:parcel.osrPercent,mappedZoningIntersections:parcel.evidence.zoningCodeCoverage,
    osrNoticeRecommendation:'RECOMMENDED_PHYSICAL_PROJECT_GUIDES',noticeThresholdPercent:0,noticeThresholdMeaning:'PRESENTATION_ONLY_NOT_ELIGIBILITY_OR_ZONING_APPLICABILITY',osrNoticeText:config.presentation.noticeText,
    exclusiveZoningClassification:false,legalZoningDetermination:false,doesNotEraseMappedSplitZoning:true,secondaryOsrAppliesToEntireParcel:false,
    unresolvedInterpretations:config.uncertainties,secondaryOsrRelevance:'NOT_HUMAN_ASSESSED',substantiveSecondaryOsr:null,
    evidenceReference:`investigation/parcel-inventory.json#${parcel.parcelId}`,geometryEvidenceReference:`investigation/map-geometries.json#${parcel.parcelId}`,
    sourceZoningFeatures:parcel.evidence.zoningFeatures,humanReviewReferences:parcel.knownReviews,
    officialViewerAccess:{zoningLayerUrl:'https://gis.myclearwater.com/arcgis/rest/services/ArcGISMapServices/Zoning_WGS84/MapServer/1',mapViewerUrl:'https://www.arcgis.com/home/webmap/viewer.html?url=https%3A%2F%2Fgis.myclearwater.com%2Farcgis%2Frest%2Fservices%2FArcGISMapServices%2FZoning_WGS84%2FMapServer%2F1&source=sd'},
    viewerLinkMeaning:'SOURCE_LAYER_IN_ARCGIS_VIEWER_NOT_CITY_BOUNDARY_DETERMINATION',projectLocationAndCityConfirmationRequired:true}}};
}
export async function exportApproved(source,baseline,output,archive){
  [source,baseline,output,archive]=[source,baseline,output,archive].map(p=>path.resolve(p));
  assert.ok(![source,baseline].some(p=>output===p||output.startsWith(p+path.sep)));
  try{await access(output);throw new Error('Fresh output required');}catch(e){if(e.code!=='ENOENT')throw e;}
  const config=await json(path.join(ROOT,CONFIG)),manifest=await json(path.join(ROOT,'scripts/gis/clearwater-rule001-source.json'));
  validateApproval(config,manifest);
  for(const [name,sha] of Object.entries(config.basisFileSha256))assert.equal((await digest(path.join(ROOT,name))).sha256,sha,`Pinned Rule 003 evidence ${name}`);
  await investigate(source,baseline,path.join(output,'investigation'),archive);
  assert.equal((await digest(path.join(output,'investigation/parcel-inventory.json'))).sha256,config.investigationInventorySha256,'Frozen investigation evidence drift');
  const inventory=await json(path.join(output,'investigation/parcel-inventory.json')),membership=await json(path.join(ROOT,config.scope.membershipFile));
  const categories=reconcileMembership(inventory,membership),members=new Map(categories.approvedCandidates.map(m=>[m.addressId,m])),parcels=new Map(inventory.map(p=>[p.parcelId,p]));
  const rows=[];for await(const row of lines(path.join(baseline,'clearwater-approved-address-lookup.jsonl')))rows.push(row);
  const failures=[],approvals=[];
  const transformed=rows.map(row=>{
    const member=members.get(row.sourceAddressIdentifier);if(!member)return row;
    const result=approveRecord(row,parcels.get(member.parcelId),member,config);
    if(result.failures.length)failures.push({addressId:member.addressId,parcelId:member.parcelId,reasons:result.failures});else approvals.push(member.addressId);
    return result.row;
  });
  const count=id=>transformed.filter(r=>r.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED'&&r.approvedPrimaryGuidance.ruleId===id).length;
  const audit={allAddresses:transformed.length,rule001Approved:count('CLR-Z-001'),rule002Approved:count('CLR-Z-002'),rule003Approved:count('CLR-Z-003'),candidateAddresses:members.size,candidateFailures:failures,
    totalApproved:transformed.filter(r=>r.approvedPrimaryGuidance.status==='GUIDANCE_READY_APPROVED').length,
    stillReview:transformed.filter(r=>r.status==='review'&&r.approvedPrimaryGuidance.status!=='GUIDANCE_READY_APPROVED').length,
    changedOriginalZoning:0,changedOriginalQa:0,changedOtherOriginalOrResearchFields:0,changedPriorApprovals:0,doubleApprovals:0,excludedRule003Approvals:0,
    addressLinkHolds:categories.addressLinkHolds.length,unsupportedOsrPrimary:categories.unsupportedOsrPrimary.length,additionalDistricts:categories.additionalDistricts.length,
    rule001NoticeProminent:0,rule001NoticeNonProminent:0,rule002NoticeProminent:0,rule002NoticeNonProminent:0,rule003NoticeProminent:0,rule003NoticeNonProminent:0};
  for(let i=0;i<rows.length;i++){
    const before=rows[i],after=transformed[i],a=after.approvedPrimaryGuidance;
    audit.changedOriginalZoning+=+(before.zoningCode!==after.zoningCode);audit.changedOriginalQa+=+(before.status!==after.status);
    const {approvedPrimaryGuidance:b,...restBefore}=before,{approvedPrimaryGuidance:_,...restAfter}=after;
    assert.deepEqual(restAfter,restBefore,`Original/evidence row ${i}`);
    if(b.status==='GUIDANCE_READY_APPROVED'){assert.deepEqual(a,b,'Prior Rule 001/002 approval changed');audit.doubleApprovals+=+(a.ruleId==='CLR-Z-003');}
    if(a.status!=='GUIDANCE_READY_APPROVED')continue;
    if(a.ruleId==='CLR-Z-001'){if(a.preservationNoticeRecommendation==='RECOMMENDED_PHYSICAL_PROJECT_GUIDES')audit.rule001NoticeProminent++;else audit.rule001NoticeNonProminent++;}
    if(a.ruleId==='CLR-Z-002'){if(a.osrNoticeRecommendation==='RECOMMENDED_PHYSICAL_PROJECT_GUIDES')audit.rule002NoticeProminent++;else audit.rule002NoticeNonProminent++;}
    if(a.ruleId==='CLR-Z-003'){assert.ok(members.has(after.sourceAddressIdentifier));if(a.osrNoticeRecommendation==='RECOMMENDED_PHYSICAL_PROJECT_GUIDES')audit.rule003NoticeProminent++;else audit.rule003NoticeNonProminent++;}
  }
  for(const group of ['addressLinkHolds','unsupportedOsrPrimary','additionalDistricts'])for(const m of categories[group]){
    const row=transformed.find(r=>r.sourceAddressIdentifier===m.addressId);assert.ok(row);assert.notEqual(row.approvedPrimaryGuidance.ruleId,'CLR-Z-003','Excluded address approved');
  }
  assert.equal(audit.allAddresses,63430);assert.equal(audit.rule001Approved,1967);assert.equal(audit.rule002Approved,262);
  assert.equal(audit.rule003Approved+failures.length,731);assert.ok(audit.rule003Approved<=731);assert.equal(audit.totalApproved,2229+audit.rule003Approved);
  assert.equal(audit.stillReview,18109-audit.rule003Approved);assert.equal(audit.rule003NoticeProminent,audit.rule003Approved);assert.equal(audit.rule003NoticeNonProminent,0);
  assert.deepEqual([audit.rule001NoticeProminent,audit.rule001NoticeNonProminent,audit.rule002NoticeProminent,audit.rule002NoticeNonProminent],[762,1205,4,258]);
  assert.equal(new Set(approvals).size,approvals.length);assert.equal(new Set(transformed.map(r=>r.sourceAddressIdentifier)).size,63430);
  const lookup=path.join(output,'clearwater-approved-address-lookup.jsonl');await writeJsonl(lookup,transformed);
  let n=0;for await(const r of lines(lookup)){assert.deepEqual(r,transformed[n++],'Serialized export drift');}assert.equal(n,63430);
  const write=async(name,v)=>writeFile(path.join(output,name),JSON.stringify(v,null,2)+'\n');
  audit.lookup=await digest(lookup);await write('approval-audit.json',audit);await write('rule003-approval-config.json',config);await write('rule003-membership.json',membership);
  await cp(baseline,path.join(output,'rules001002-baseline'),{recursive:true});
  await write('provenance.json',{sourceManifest:manifest,rule003ApprovalConfig:await digest(path.join(ROOT,CONFIG)),exporter:await digest(fileURLToPath(import.meta.url)),basisCommit:config.basisCommit,basisFileSha256:config.basisFileSha256,
    precedingPolicies:'rules001002-baseline/rule001-approval-config.json and rules001002-baseline/rule002-approval-config.json',originalSourceAndQaUnchanged:true,approvalScope:'OFFLINE_STATIC_ONLY'});
  await writeFile(path.join(output,'report.md'),`# Approved offline Clearwater Rules 001–003\n\nOriginal profiles: ${audit.allAddresses}. Approved guidance: ${audit.rule001Approved} Rule 001 + ${audit.rule002Approved} Rule 002 + ${audit.rule003Approved} Rule 003 = ${audit.totalApproved}. Remaining REVIEW: ${audit.stillReview}.\n\nRule 003 candidates: 731; failed: ${failures.length}. Excluded: two address-link holds, three unsupported OS/R-primary addresses, 148 additional-district addresses. No substitutions or additional addresses. Original zoning/QA and preceding approvals unchanged; zero double approvals.\n\nRule 001 notices 762/1205 (>2% P); Rule 002 4/258 (>3% OS/R), unchanged. Rule 003 ${audit.rule003NoticeProminent}/${audit.rule003NoticeNonProminent}: contextual notice for every strictly positive mapped OS/R intersection, presentation only.\n\n${NOTICE}\n\nMDR is non-exclusive starting guidance. OS/R does not automatically govern the entire parcel. Shared-land rights, density calculations, boundary disputes and project-specific applicability remain unresolved; confirm applicable requirements with the City. All geometry, source QA, intersections and provenance retained in investigation/ and rules001002-baseline/. No Supabase, Guides, production runtime, resident UX or deployment changes.\n`);
  const checks={};async function collect(dir,prefix=''){for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=prefix+e.name;if(e.isDirectory())await collect(path.join(dir,e.name),name+'/');else checks[name]=await digest(path.join(dir,e.name));}}await collect(output);
  await write('output-checksums.json',checks);for(const [name,v] of Object.entries(checks))assert.deepEqual(await digest(path.join(output,name)),v,name);
  console.log(JSON.stringify(audit,null,2));return audit;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){const a=await exportApproved(...process.argv.slice(2));if(a.candidateFailures.length)process.exitCode=1;}
