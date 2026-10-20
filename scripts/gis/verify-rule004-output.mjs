#!/usr/bin/env node
/** Independent full-city serialized-output reconciliation against source and preceding approval. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {digest} from './export-clearwater-approved-rule004.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function rows(p){const result=[];for await(const l of createInterface({input:createReadStream(p),crlfDelay:Infinity}))result.push(JSON.parse(l));return result;}
export async function verify(source,baseline,output){
 const originals=await json(path.join(source,'property-profiles.json')),before=await rows(path.join(baseline,'clearwater-approved-address-lookup.jsonl')),after=await rows(path.join(output,'clearwater-approved-address-lookup.jsonl'));
 const membership=await json(path.join(ROOT,'research/gis/rule004-membership.v1.json')),members=new Map(membership.members.map(m=>[m.addressId,m]));
 assert.equal(before.length,63430);assert.equal(after.length,63430);assert.equal(originals.length,63430);assert.equal(new Set(after.map(r=>r.sourceAddressIdentifier)).size,63430);
 const actual=[],counts={},groups={},notices={};let remaining=0,originalReview=0;
 for(let i=0;i<after.length;i++){
  const r=after[i],b=before[i],o=originals[i],a=r.approvedPrimaryGuidance;for(const k of Object.keys(o))assert.deepEqual(r[k],o[k],`Frozen original ${i} ${k}`);
  const {approvedPrimaryGuidance:_,...rest}=r,{approvedPrimaryGuidance:old,...prior}=b;assert.deepEqual(rest,prior,'Research/source evidence drift');
  originalReview+=+(r.status==='review');remaining+=+(r.status==='review'&&a.status!=='GUIDANCE_READY_APPROVED');
  if(a.status==='GUIDANCE_READY_APPROVED')counts[a.ruleId]=(counts[a.ruleId]??0)+1;
  if(a.ruleId!=='CLR-Z-004'){assert.deepEqual(r,b,'Nonmember/prior approval changed');continue;}
  assert.notEqual(old.status,'GUIDANCE_READY_APPROVED');const m=members.get(r.sourceAddressIdentifier);assert.ok(m);assert.equal(m.parcelId,r.parcelIdentifier);actual.push(r.sourceAddressIdentifier);assert.equal(r.status,'review');assert.equal(r.zoningCode,'HDR');assert.deepEqual(r.issues,['parcel_ambiguous_zoning']);
  assert.deepEqual(a.sourceMappedDistricts,['HDR','LMDR']);assert.deepEqual(a.mappedZoningIntersections.map(z=>z.normalizedZoningCode),['hdr','lmdr']);assert.equal(a.mappedZoningIntersections[1].percentOfParcel,.094078);assert.equal(a.mappedZoningIntersections[1].intersectionAreaSquareMeters,22.759);assert.equal(a.primaryZoning,'HDR');assert.equal(a.noticeThresholdPercent,null);assert.equal(a.lmdrNoticeRecommendation,'NOT_PROMINENT_IN_ORDINARY_GUIDES');assert.equal(a.otherIndependentNoticeConditionsSuppressed,false);assert.equal(a.condominiumDevelopment.legalCommonOwnershipVerified,false);assert.equal(a.condominiumDevelopment.individualDevelopmentRightsEstablished,false);assert.equal(a.condominiumDevelopment.sharedSiteDistrictsNotAssignedToUnit,true);assert.equal(a.condominiumDevelopment.relationshipBasis,'OWNER_VISUAL_QC');
  assert.equal(a.humanNoticeQcCaseId,m.geometryGroup);groups[m.geometryGroup]=(groups[m.geometryGroup]??0)+1;
 }
 assert.deepEqual(actual.sort((a,b)=>a-b),[...members.keys()].sort((a,b)=>a-b),'Exact approved identities');assert.equal(new Set(after.filter(r=>r.approvedPrimaryGuidance.ruleId==='CLR-Z-004').map(r=>r.parcelIdentifier)).size,364);
 assert.deepEqual(counts,{'CLR-Z-001':1967,'CLR-Z-003':731,'CLR-Z-004':364,'CLR-Z-002':262});assert.equal(remaining,17014);assert.equal(originalReview,20338);assert.deepEqual(groups,{'R004-01':363,'R004-02':1});
 const site=await json(path.join(output,'evidence/geometries/site-context-parcel.json'));assert.equal(site.parcel.properties.PARCELID,'322815740740000001');assert.deepEqual(site.intersections.map(z=>z.district).sort(),['hdr','lmdr','os/r','p']);assert.equal(site.diagnostic.zoningCodeCoverage.find(z=>z.normalizedZoningCode==='os/r').percentOfParcel,18.778423);assert.equal(site.diagnostic.zoningCodeCoverage.find(z=>z.normalizedZoningCode==='p').percentOfParcel,4.396145);
 const excludedSite=after.find(r=>r.parcelIdentifier==='322815740740000001');assert.notEqual(excludedSite.approvedPrimaryGuidance.ruleId,'CLR-Z-004');
 for(const [name,expected] of Object.entries(await json(path.join(output,'output-checksums.json'))))assert.deepEqual(await digest(path.join(output,name)),expected,`Checksum ${name}`);
 const result={status:'PASS',allAddresses:63430,originalReview:20338,approvedCounts:counts,totalApproved:3324,remainingReview:17014,exactRule004AddressAndParcelMembership:true,geometryGroups:groups,rule004ProminentNotices:0,rule004NonProminentNotices:364,sourceAndResearchFieldsChanged:0,priorApprovalChanges:0,duplicateOrDoubleApprovals:0,sharedSiteEvidencePreservedAndNotAssignedToUnits:true,lookup:await digest(path.join(output,'clearwater-approved-address-lookup.jsonl'))};
 console.log(JSON.stringify(result,null,2));return result;
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href)await verify(...process.argv.slice(2));
