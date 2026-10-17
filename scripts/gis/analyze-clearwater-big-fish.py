#!/usr/bin/env python3
"""Read-only inventory. Never writes lookup/source files or assigns guidance eligibility.
Usage: PYTHONPATH=<Shapely installation> python3 ... SOURCE APPROVED ARCHIVE NEW_OUTPUT
"""
import argparse, collections, csv, hashlib, json, math, pathlib, re, subprocess
from shapely.geometry import shape, Point
from shapely.affinity import scale
from shapely.strtree import STRtree
from shapely.ops import unary_union
ROOT=pathlib.Path(__file__).resolve().parents[2]
def digest(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def norm(s):return re.sub(r'[\s-]','',str(s or '').lower())
def count(rs):return {'addresses':len(rs),'parcels':len({r['parcelId'] for r in rs if r['parcelId'] is not None})}
def distribution(v):
 v=sorted(v)
 return {str(q):v[round((len(v)-1)*q/100)] if v else None for q in [0,25,50,75,90,95,99,100]}
def primary_category(flags):
 for f,c in [('human_hold','Human interpretation hold'),('link_failure','Address/parcel link failure'),('unsupported','Unsupported classification'),('missing_primary','Missing primary zoning'),('invalid_parcel','Invalid parcel geometry'),('invalid_zoning','Invalid source zoning geometry'),('new_topology_invalid','Supplemental topology validity failure'),('representative_point_inconsistent','Representative-point zoning inconsistency'),('same_code_overlap','Overlapping same-code polygons'),('repeated_code','Repeated non-overlapping same-code polygons'),('cross_code_overlap_measured','Measured cross-code polygon overlap'),('coverage_failure','Incomplete/excess summed coverage'),('primary_mismatch','Existing primary differs from area dominant'),('near_complete','Near-complete primary with secondary intersections')]:
  if f in flags:return c
 return 'Material mapped multi-district / unresolved ambiguity'
def screen(r):
 return not any(f in r['flags'] for f in ['human_hold','human_code_conflict','link_failure','unsupported','missing_primary','invalid_parcel','invalid_zoning','same_code_overlap','repeated_code','coverage_failure','measurement_error','unrelated_profile_issue','new_topology_invalid','representative_point_inconsistent','address_point_outside_linked_parcel','cross_code_overlap_measured','parcel_peer_hold']) and r['districtCount']>=2
RES={'ldr','lmdr','mdr','mhdr','hdr','mhp'}
def opportunity(r):
 f=r['flags'];zs=set(r['districts'])
 if 'human_hold' in f or 'link_failure' in f or 'invalid_parcel' in f:return 'outside_top10_holds'
 if 'unsupported' in f:return 'NCOD and unsupported-code support'
 if 'invalid_zoning' in f:return 'Authoritative invalid zoning geometry replacement'
 if 'repeated_code' in f:return 'Same-code polygon identity / union investigation'
 if 'coverage_failure' in f or 'measurement_error' in f:return 'Coverage and cross-code topology reconciliation'
 if r['pendingRule001']:return 'Previously investigated Rule 001 changed/new-code scope'
 if screen(r) and 'primary_mismatch' not in f and r['dominantPercent']>=99:
  if len(zs)>=3:return 'Near-complete primary, three or more districts'
  if zs<=RES:return 'Near-complete primary, residential district pairs'
  if 'os/r' not in zs:return 'Near-complete primary, mixed-use district pairs'
 if screen(r) and len(zs)==2 and 'os/r' in zs:return 'Remaining exact OS/R pairs'
 return 'Material splits and remaining classification conflicts'
def csvout(p,rows):
 if not rows:return
 with open(p,'w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator="\n");w.writeheader()
  for r in rows:w.writerow({k:json.dumps(v,separators=(',',':')) if isinstance(v,(list,dict)) else v for k,v in r.items()})
def run(source,approved,archive,out):
 source,approved,archive,out=map(pathlib.Path,(source,approved,archive,out))
 assert not out.exists(),'Fresh output required'
 assert not out.resolve().is_relative_to(source.resolve()) and not out.resolve().is_relative_to(approved.resolve())
 manifest=json.loads((ROOT/'scripts/gis/clearwater-rule001-source.json').read_text())
 assert digest(archive)==manifest['archiveSha256']
 for n,v in manifest['files'].items():assert digest(source/n)==v['sha256'],n
 checks=json.loads((approved/'output-checksums.json').read_text())
 for n,v in checks.items():assert digest(approved/n)==v['sha256'],n
 # Use the established normalizer and validated Rule 002 evidence loader; preserve every veto.
 js="""import{readFile}from'node:fs/promises';import{normalizeReviewSession}from'./scripts/gis/clearwater-rule001-policy.mjs';import{loadHumanEvidence}from'./scripts/gis/clearwater-rule002.mjs';const g=JSON.parse(await readFile('research/gis/zoning-gold/reference-dataset.json'));let r=[...g.records];for(const e of g.additionalReviewDatasets)r.push(...normalizeReviewSession(JSON.parse(await readFile('research/gis/zoning-gold/'+e.path)).records));r.push(...(await loadHumanEvidence()).reviews);console.log(JSON.stringify(r));"""
 human=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=ROOT))
 hmap=collections.defaultdict(list)
 for h in human:hmap[h['parcelId']].append(h)
 originals=json.loads((source/'property-profiles.json').read_text())
 allrows=[json.loads(l) for l in (approved/'clearwater-approved-address-lookup.jsonl').open()]
 assert digest(approved/'clearwater-approved-address-lookup.jsonl')=='cdb14957486a6665cd4367edce9136df8bf2f01053fc2c0ea62ef4ee0cbbbbb2','Latest validated PR100 lookup required'
 assert len(allrows)==len(originals)==63430
 approvals=collections.Counter();rows=[];seen=set()
 for r,o in zip(allrows,originals):
  raw={k:v for k,v in r.items() if k not in ['researchRule001','researchRule002','researchRule003','approvedPrimaryGuidance']}
  assert raw==o,'Source evidence changed'
  assert r['sourceAddressIdentifier'] not in seen;seen.add(r['sourceAddressIdentifier'])
  if r['approvedPrimaryGuidance']['status']=='GUIDANCE_READY_APPROVED':approvals[r['approvedPrimaryGuidance']['ruleId']]+=1
  elif r['status']=='review':rows.append(r)
 assert dict(approvals)=={'CLR-Z-001':1967,'CLR-Z-002':262,'CLR-Z-003':731}
 assert len(rows)==17378
 notice_counts={}
 for rule,key in [('CLR-Z-001','preservationNoticeRecommendation'),('CLR-Z-002','osrNoticeRecommendation'),('CLR-Z-003','osrNoticeRecommendation')]:
  a=[r for r in allrows if r['approvedPrimaryGuidance'].get('ruleId')==rule and r['approvedPrimaryGuidance']['status']=='GUIDANCE_READY_APPROVED']
  notice_counts[rule]=dict(collections.Counter(r['approvedPrimaryGuidance'][key] for r in a))
 assert notice_counts['CLR-Z-001']=={'RECOMMENDED_PHYSICAL_PROJECT_GUIDES':762,'NOT_PROMINENT_IN_ORDINARY_GUIDES':1205}
 assert notice_counts['CLR-Z-002']=={'RECOMMENDED_PHYSICAL_PROJECT_GUIDES':4,'NOT_PROMINENT_IN_ORDINARY_GUIDES':258}
 assert notice_counts['CLR-Z-003']=={'NOT_PROMINENT_IN_ORDINARY_GUIDES':731}

 diagnostics={str(d['parcelIdentifier']):d for d in json.loads((source/'zoning-diagnostic/zoning-diagnostic.json').read_text())['parcels']}
 parcel_features=json.loads((source/'parcels.geojson').read_text())['features'];zones=json.loads((source/'zoning.geojson').read_text())['features']
 assert len(parcel_features)==112466 and len(zones)==761
 ids={str(r['parcelIdentifier']) for r in rows if r['parcelIdentifier'] is not None};pmap={};pc=collections.Counter()
 for p in parcel_features:
  i=str(p['properties'].get('PARCELID'))
  if i in ids:pc[i]+=1;pmap.setdefault(i,p)
 zg=[shape(z['geometry']) for z in zones];tree=STRtree(zg)
 def meters(g):return scale(g,xfact=111195*math.cos(math.radians(27.97)),yfact=111195,origin=(0,0))
 spatial={};failed=0
 for i in sorted(ids):
  p=pmap.get(i);v={'parcelSourceFeatureCount':pc[i],'shapelyParcelValid':False,'spatialErrors':[]}
  if p:
   g=shape(p['geometry']);v['shapelyParcelValid']=g.is_valid;v['areaM2Approx']=meters(g).area;v['canonicalFootprintSha256']=hashlib.sha256(g.normalize().wkb).hexdigest()
   inds=list(map(int,tree.query(g)));positive=[];v['zoneSourceIds']=[]
   if g.is_valid:
    for j in inds:
     if not zg[j].is_valid:continue
     try:
      x=g.intersection(zg[j]);a=meters(x).area
      if a>1e-6:positive.append((j,x,a));v['zoneSourceIds'].append(zones[j]['properties'].get('OBJECTID'))
     except Exception:v['spatialErrors'].append('intersection_failed')
   v['crossCodeOverlapM2Approx']=0
   for k,(j,x,a) in enumerate(positive):
    for j2,y,b in positive[k+1:]:
     if norm(zones[j]['properties'].get('ZONING'))!=norm(zones[j2]['properties'].get('ZONING')):v['crossCodeOverlapM2Approx']+=meters(x.intersection(y)).area
   if g.is_valid and not any(not zg[j].is_valid for j in inds):
    v['unionCoveragePercentApprox']=100*unary_union([x for _,x,_ in positive]).area/g.area if g.area else 0
   d=diagnostics.get(i)
   if d and g.is_valid and d.get('dominantZoningCoveragePercent',0)>=99 and not d.get('hasInvalidZoningGeometry'):
    sec=[x for j,x,a in positive if norm(zones[j]['properties'].get('ZONING'))!=d.get('dominantNormalizedZoningCode')]
    if sec:
     sm=meters(unary_union(sec));gm=meters(g);v['secondaryAreaM2Approx']=sm.area;v['secondaryBeyond1mBoundaryM2Approx']=sm.difference(gm.boundary.buffer(1)).area
   # Supplemental exact topology only for unsupported/missing-diagnostic rows; never substitute it for established Turf QC.
   if not d and g.is_valid and not any(not zg[j].is_valid for j in inds):
    by=collections.defaultdict(list)
    for j,x,a in positive:by[norm(zones[j]['properties'].get('ZONING'))].append((j,a))
    v['supplementalCoverage']=[{'normalizedZoningCode':c,'percentOfParcel':sum(a for j,a in es)/v['areaM2Approx']*100,'intersectionAreaSquareMeters':sum(a for j,a in es),'featureCount':len(es)} for c,es in by.items()]
  spatial[i]=v
 inventory=[]
 for r in rows:
  i=r['parcelIdentifier'];d=diagnostics.get(str(i));sp=spatial.get(str(i),{});z=(d or {}).get('zoningCodeCoverage') or sp.get('supplementalCoverage',[]);z=sorted(z,key=lambda x:-x['percentOfParcel']);codes=sorted(x['normalizedZoningCode'] for x in z);flags=[];hr=hmap.get(str(i),[])
  for h in hr:
   status=h['humanReview']['reviewStatus'];result=h['humanReview'].get('result') or ''
   if status in ['human_true_split','human_staff_review','human_primary_applicability_unclear']:flags.append('human_hold')
   if status=='human_confirmed' and result.startswith('CONFIRMED:') and norm(result.split(':',1)[1])!=norm(r['zoningCode']):flags.append('human_code_conflict')
  if any(x in r['issues'] for x in ['address_multiple_parcels','address_without_parcel']):flags.append('link_failure')
  if 'unsupported_zoning_code' in r['issues']:flags.append('unsupported')
  if not r['zoningCode']:flags.append('missing_primary')
  if d and not d.get('parcelGeometryValid'):flags.append('invalid_parcel')
  if d and d.get('hasInvalidZoningGeometry'):flags.append('invalid_zoning')
  if i is not None and sp.get('shapelyParcelValid') is False:flags.append('new_topology_invalid')
  if d and d.get('hasOverlappingSameCodePolygons'):flags.append('same_code_overlap')
  if d and d.get('hasRepeatedNormalizedCode'):flags.append('repeated_code')
  total=sum(x['percentOfParcel'] for x in z)
  if z and not 99.9<=total<=100.1:flags.append('coverage_failure')
  if (d and d.get('sourceErrors')) or sp.get('spatialErrors'):flags.append('measurement_error')
  if any(x!='parcel_ambiguous_zoning' for x in r['issues']):flags.append('unrelated_profile_issue')
  dom=z[0] if z else {};same=bool(z) and norm(r['zoningCode'])==dom['normalizedZoningCode']
  if z and not same:flags.append('primary_mismatch')
  if len(z)>1 and same and dom['percentOfParcel']>=99:flags.append('near_complete')
  if sp.get('crossCodeOverlapM2Approx',0)>0.01:flags.append('cross_code_overlap_measured')
  point=r.get('parcelRepresentativePoint');rep=[]
  if point:
   pt=Point(point);rep=[zones[int(j)]['properties'].get('OBJECTID') for j in tree.query(pt) if zg[int(j)].covers(pt)]
   if len(rep)!=1 or r['zoningSourceIdentifier'] not in rep:flags.append('representative_point_inconsistent')
  ac=r.get('addressCoordinates');address_inside=None
  if i in pmap and ac:address_inside=shape(pmap[i]['geometry']).covers(Point(ac))
  if address_inside is False:flags.append('address_point_outside_linked_parcel')
  rec={'addressId':r['sourceAddressIdentifier'],'address':r['displayAddress'],'parcelId':i,'originalStatus':r['status'],'guidanceStatus':r['approvedPrimaryGuidance']['status'],'originalZoning':r['zoningCode'],'issues':r['issues'],'flags':sorted(set(flags)),'districts':codes,'combination':' + '.join(codes) or '(no measured intersection)','districtCount':len(z),'dominantCode':dom.get('normalizedZoningCode'),'dominantPercent':dom.get('percentOfParcel',0),'secondaryPercent':sum(x['percentOfParcel'] for x in z[1:]),'secondaryAreaM2':sum(x['intersectionAreaSquareMeters'] for x in z[1:]),'coveragePercent':total,'intersections':z,'diagnosticAvailable':d is not None,'humanCaseIds':[h['caseNumber'] for h in hr],'representativePointMatches':rep,'addressPointInsideLinkedParcel':address_inside,'pendingRule001':r['approvedPrimaryGuidance']['disposition']=='PENDING_CHANGED_OR_NEW_CODE_SCOPE','sourceEvidence':f'zoning-diagnostic/zoning-diagnostic.json#{i}' if d else f'parcels.geojson#{i}; zoning.geojson (supplemental Shapely)','geometryEvidence':sp}
  rec['primaryCategory']=primary_category(rec['flags']);rec['qualityScreenPass']=screen(rec);rec['opportunity']=opportunity(rec);inventory.append(rec)
 peer_holds={r['parcelId'] for r in inventory if any(f in r['flags'] for f in ['human_hold','human_code_conflict','link_failure','unsupported','missing_primary','unrelated_profile_issue','address_point_outside_linked_parcel','representative_point_inconsistent'])}
 for r in inventory:
  if r['parcelId'] in peer_holds and r['parcelId'] is not None:r['flags']=sorted(set(r['flags']+['parcel_peer_hold']))
  r['qualityScreenPass']=screen(r);r['opportunity']=opportunity(r)
 out.mkdir(parents=True)
 csvout(out/'unresolved-addresses.csv',inventory)
 (out/'unresolved-addresses.json').write_text(json.dumps(inventory,separators=(',',':'))+'\n')
 categories=[]
 for cat in sorted({r['primaryCategory'] for r in inventory}):
  rs=[r for r in inventory if r['primaryCategory']==cat];categories.append({'category':cat,**count(rs),'percent':round(len(rs)/len(inventory)*100,4),'combinations':collections.Counter(r['combination'] for r in rs).most_common(5),'flags':dict(collections.Counter(f for r in rs for f in r['flags']))})
 categories.sort(key=lambda x:-x['addresses'])
 combos=[]
 for c in sorted({r['combination'] for r in inventory}):
  rs=[r for r in inventory if r['combination']==c];combos.append({'combination':c,**count(rs),'qualityPass':sum(r['qualityScreenPass'] for r in rs),'samePrimaryDominant':sum(norm(r['originalZoning'])==r['dominantCode'] for r in rs)})
 combos.sort(key=lambda x:-x['addresses'])
 opps=[]
 for o in sorted({r['opportunity'] for r in inventory}):
  rs=[r for r in inventory if r['opportunity']==o];qs=[r for r in rs if r['qualityScreenPass']];opps.append({'opportunity':o,**count(rs),'qualityPass':len(qs),'qualityParcels':count(qs)['parcels']})
 summary={'sourceArchiveSha256':manifest['archiveSha256'],'lookupSha256':digest(approved/'clearwater-approved-address-lookup.jsonl'),'sourceFilesVerified':len(manifest['files']),'approvedOutputChecksumsVerified':len(checks),'originalProfiles':63430,'originalClean':sum(r['status']=='clean' for r in allrows),'originalReview':sum(r['status']=='review' for r in allrows),'approvals':dict(approvals),'noticeCounts':notice_counts,'originalFieldsChanged':0,'duplicateAddressIds':0,'remaining':len(inventory),'remainingParcels':count(inventory)['parcels'],'unlinkedAddresses':sum(r['parcelId'] is None for r in inventory),'categories':categories,'secondaryFlags':dict(collections.Counter(f for r in inventory for f in r['flags'])),'combinations':combos,'opportunities':opps,'analysisScriptSha256':digest(pathlib.Path(__file__)), 'baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(), 'pythonGeometryVersion':__import__('shapely').__version__, 'schemaNotes':'Primary category first-match precedence in script. Categories mutually exclusive by address; distinct parcel counts are not additive. Quality screen is technical only, not eligibility or legal approval. Supplemental geometric areas local equirectangular approximation at 27.97N; established diagnostic percentages retained unchanged.'}
 assert sum(x['addresses'] for x in categories)==17378
 assert sum(x['addresses'] for x in opps)==17378
 (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');csvout(out/'categories.csv',categories);csvout(out/'combinations.csv',combos);csvout(out/'opportunities.csv',opps)
 (out/'analysis-checksums.json').write_text(json.dumps({p.name:digest(p) for p in sorted(out.iterdir()) if p.is_file()},indent=2)+'\n')
 print(json.dumps({k:v for k,v in summary.items() if k in ['remaining','remainingParcels','categories','opportunities']},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('approved');p.add_argument('archive');p.add_argument('output');a=p.parse_args();run(a.source,a.approved,a.archive,a.output)
