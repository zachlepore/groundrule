#!/usr/bin/env python3
"""Read-only designation readiness, never approvals or base-code normalization."""
import argparse,collections,csv,hashlib,json,math,pathlib,re
from shapely.geometry import shape,Point,mapping
from shapely.affinity import translate,scale
from shapely.strtree import STRtree
ROOT=pathlib.Path(__file__).resolve().parents[2]
COHORT_CODE='LMDR-NCOD Coachman R'
DESIGNATION='3_AMBIGUOUS_WITH_KNOWN_ZONING_INFORMATION'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def j(p):return json.loads(p.read_text())
def csvout(p,rs):
 with p.open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(dict.fromkeys(k for r in rs for k in r)),lineterminator='\n');w.writeheader()
  for r in rs:w.writerow({k:json.dumps(v,separators=(',',':')) if isinstance(v,(dict,list)) else v for k,v in r.items()})
def counts(rs):return {'addresses':len(rs),'parcelIds':len({r['parcelId'] for r in rs}),'geometryGroups':len({r['footprintSha256'] for r in rs})}
def q(v):
 v=sorted(v);return {str(p):v[round((len(v)-1)*p/100)] for p in [0,25,50,75,95,100]} if v else {}
def technical_flags(d,profile,source_geometry_valid,address_inside,rep_codes,address_codes,cross_overlap,known):
 f=[]
 if not d.get('parcelFound') or not d.get('parcelGeometryValid') or not source_geometry_valid or d.get('parcelAreaSquareMeters',0)<=0:f.append('parcel_geometry_quality_hold')
 if d.get('hasInvalidZoningGeometry'):f.append('invalid_zoning_geometry')
 if d.get('hasRepeatedNormalizedCode'):f.append('repeated_same_code_polygons')
 if d.get('hasOverlappingSameCodePolygons'):f.append('overlapping_same_code_polygons')
 if d.get('sourceParcelFeatureCount')!=1:f.append('nonunique_parcel_identity')
 f+=d.get('sourceErrors',[])
 if not 99.9<=d.get('totalZoningCoveragePercent',0)<=100.1:f.append('coverage_outside_existing_tolerance')
 if any(not math.isfinite(z['percentOfParcel']) or not 0<z['percentOfParcel']<=100.1 for z in d['zoningCodeCoverage']):f.append('invalid_intersection_measurement')
 if any(i not in ['unsupported_zoning_code','parcel_ambiguous_zoning'] for i in profile['issues']):f.append('other_original_qa_issue')
 if profile['normalizedJurisdiction']!='clearwater' or profile['jurisdictionStatus']!='confirmed':f.append('jurisdiction_hold')
 if not address_inside:f.append('address_point_outside_authoritative_parcel')
 if rep_codes!=[profile['zoningCode']]:f.append('representative_point_primary_inconsistency')
 if address_codes!=[profile['zoningCode']]:f.append('address_point_primary_inconsistency')
 if cross_overlap>.01:f.append('existing_cross_code_overlap_diagnostic')
 for h in known:
  st=h['humanReview']['reviewStatus']
  if st in ['human_true_split','human_staff_review','human_primary_applicability_unclear']:f.append('human_review_hold')
  elif st=='human_primary_candidate':f.append('nonfinal_human_primary_candidate_requires_review')
  elif st=='human_confirmed':
   named=(h['humanReview'].get('result') or '').replace('CONFIRMED:','').strip()
   if named.casefold()!=profile['zoningCode'].casefold():f.append('human_code_confirmation_mismatch')
 return sorted(set(f))
def candidate(r):
 return r['sourceCode']==COHORT_CODE and r['mappedSourceCodes']==[COHORT_CODE] and r['originalIssues']==['unsupported_zoning_code'] and not r['researchTechnicalHolds']
def run(source,measured,bigfish,output):
 source,measured,bigfish,out=map(pathlib.Path,(source,measured,bigfish,output));assert not out.exists();assert not out.resolve().is_relative_to(source.resolve()) and not out.resolve().is_relative_to(measured.resolve())
 for name,expected in j(measured/'output-checksums.json').items():assert sha(measured/name)==expected['sha256'],name
 source_manifest=j(ROOT/'scripts/gis/clearwater-rule001-source.json')
 for name in ['parcels.geojson','zoning.geojson']:assert sha(source/name)==source_manifest['files'][name]['sha256']
 v=j(measured/'verification.json');assert v['remainingReview']==17014 and v['unsupportedAddresses']==2832
 assert v['approvedLookup']['sha256']=='a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739'
 assert v['codeNormalizationPerformed'] is False
 profiles=j(measured/'unsupported-profiles.json');measurements={r['parcelIdentifier']:r for r in j(measured/'parcel-measurements.json')};human=j(measured/'human-evidence.json')
 evidence=j(ROOT/'research/gis/rule005-regulatory-evidence.v1.json');assert sha(ROOT/'research/clearwater/clearwater-development-code.txt')==evidence['sourceSha256']
 crosswalk={r['exactSourceCode']:r for r in evidence['exactCodeEvidenceCrosswalk']}
 old={r['addressId']:r for r in j(bigfish/'unresolved-addresses.json')}
 pmap=collections.defaultdict(list)
 for f in j(source/'parcels.geojson')['features']:pmap[f['properties']['PARCELID']].append(f)
 zones=j(source/'zoning.geojson')['features'];zg=[shape(z['geometry']) for z in zones];tree=STRtree(zg);hmap=collections.defaultdict(list)
 for h in human:hmap[h['parcelId']].append(h)
 rows=[];shapes={}
 for r in profiles:
  pid=r['parcelIdentifier'];d=measurements[pid];p=pmap[pid][0];g=shape(p['geometry']);shapes[pid]=g;fp=hashlib.sha256(g.normalize().wkb).hexdigest();o=old[r['sourceAddressIdentifier']];assert fp==o['geometryEvidence']['canonicalFootprintSha256']
  def at(pt):
   if not pt:return []
   point=Point(pt);return [zones[int(i)]['properties']['ZONING'] for i in tree.query(point) if zg[int(i)].covers(point)]
  rep,addr=at(r['parcelRepresentativePoint']),at(r['addressCoordinates']);known=hmap.get(pid,[]);inside=g.covers(Point(r['addressCoordinates']))
  flags=technical_flags(d,r,g.is_valid,inside,rep,addr,o['geometryEvidence'].get('crossCodeOverlapM2Approx',0),known)
  rawcodes=sorted({z['rawZoningCode'] for z in d['zoningFeatures']});c=crosswalk[r['zoningCode']]
  unit=' UNIT ' in r['displayAddress'] or ' APT ' in r['displayAddress']
  rec={'addressId':r['sourceAddressIdentifier'],'address':r['displayAddress'],'parcelId':pid,'originalStatus':r['status'],'originalNormalizedZoningCode':r['normalizedZoningCode'],'sourceCode':r['zoningCode'],'sourceDescribedBaseDistrict':c['sourceDescribedBaseDistrict'],'overlaySubtype':c['overlaySubtype'],'overlayCode':c['overlayCode'],'baseEvidenceCitation':c['codeCitationId'],'baseDerivationMethod':c['method'],'mappedSourceCodes':rawcodes,'combination':' + '.join(rawcodes),'additionalDistricts':[z for z in rawcodes if z!=r['zoningCode']],'coverage':d['zoningCodeCoverage'],'sourceZoningFeatures':d['zoningFeatures'],'originalIssues':r['issues'],'researchTechnicalHolds':flags,'technicalScreenApartFromUnsupported':not flags,'diagnosticMethod':d['investigationMethod'],'humanCaseIds':[h['caseNumber'] for h in known],'footprintSha256':fp,'unitLabelPresent':unit,'recordedLandUseCode':p['properties']['LAND_USE_CODE'],'parcelObjectId':p['properties']['OBJECTID'],'strap':p['properties']['STRAP'],'siteAddress':p['properties']['SITE_ADDRESS'],'parcelAreaM2':d['parcelAreaSquareMeters'],'sourcePolygonIds':[z['sourceIdentifier'] for z in d['zoningFeatures']],'representativePointCodes':rep,'addressPointCodes':addr,'addressInsideLinkedParcel':inside,'addressCoordinates':r['addressCoordinates'],'currentResearchResponseDesignation':DESIGNATION,'currentCertifiedReadiness':False,'newApproval':False,'legalApplicabilityConfirmed':False,'informationSafeToRetain':['exact_source_code','explicit_source_base_description','mapped_overlay_subtype','all_positive_area_districts_and_percentages','source_qa_and_holds','source_references_and_geometry'],'evidenceReference':f'parcel-measurements.json#{pid};source/parcels.geojson#OBJECTID={p["properties"]["OBJECTID"]}'}
  rows.append(rec)
 # A peer hold on the same parcel cannot be hidden by selecting another address.
 held={r['parcelId'] for r in rows if r['researchTechnicalHolds']}
 for r in rows:
  if r['parcelId'] in held and not r['researchTechnicalHolds']:r['researchTechnicalHolds']=['parcel_peer_hold'];r['technicalScreenApartFromUnsupported']=False
 cohort=[r for r in rows if candidate(r)];assert len(rows)==2832 and len({r['parcelId'] for r in rows})==2676
 codes=[]
 for code in sorted(crosswalk,key=lambda c:-sum(r['sourceCode']==c for r in rows)):
  rs=[r for r in rows if r['sourceCode']==code];codes.append({'sourceCode':code,**counts(rs),'baseEvidence':crosswalk[code]['sourceDescribedBaseDistrict'],'overlaySubtype':crosswalk[code]['overlaySubtype'],'exactSingleMappedCode':sum(r['mappedSourceCodes']==[code] for r in rs),'technicalScreenApartFromUnsupported':sum(r['technicalScreenApartFromUnsupported'] for r in rs),'unitLabeledAddresses':sum(r['unitLabelPresent'] for r in rs),'flags':dict(collections.Counter(f for r in rs for f in r['researchTechnicalHolds']))})
 combos=[]
 for code,combination in sorted({(r['sourceCode'],r['combination']) for r in rows}):
  rs=[r for r in rows if r['sourceCode']==code and r['combination']==combination];ok=sum(r['technicalScreenApartFromUnsupported'] for r in rs);single=rs[0]['mappedSourceCodes']==[code];cr=code==COHORT_CODE;ldr=code=='LDR-NCOD Coachman R';ie=rs[0]['overlayCode']=='IENCOD';res=rs[0]['sourceDescribedBaseDistrict'] not in ['I','OSR']
  # Explicit expert judgments, not probabilities or eligibility. Favor a complete overlay-aware residential response over raw volume.
  scores={'volume':5*math.sqrt(ok/len(rows)),'sourceConfidence':5*ok/len(rs),'regulatoryClarity':4.5 if cr and single else 4 if ldr and single else 3.5 if ie and single else 2 if single else 1.5,'humanQcEase':3.5 if cr and single else 4.5 if len({r['footprintSha256'] for r in rs})<10 else 3 if single else 2,'cardExtensionEase':4 if cr and single else 3.5 if ldr and single else 2.5 if single else 1,'residentialFenceFit':5 if cr and single else 4.5 if ldr and single else 4 if code=='LMDR-NCOD Island Est' and single else 2.5 if res and single else 1 if res else 0}
  weights={'volume':.20,'sourceConfidence':.15,'regulatoryClarity':.25,'humanQcEase':.10,'cardExtensionEase':.15,'residentialFenceFit':.15}
  score=20*sum(scores[k]*w for k,w in weights.items());sensitivity={}
  for name,w in [('volume_emphasis',{'volume':.35,'sourceConfidence':.15,'regulatoryClarity':.20,'humanQcEase':.10,'cardExtensionEase':.10,'residentialFenceFit':.10}),('regulatory_emphasis',{'volume':.10,'sourceConfidence':.15,'regulatoryClarity':.35,'humanQcEase':.10,'cardExtensionEase':.15,'residentialFenceFit':.15})]:sensitivity[name]=round(20*sum(scores[k]*a for k,a in w.items()),3)
  combos.append({'sourceCode':code,'sourceDescribedBaseDistrict':crosswalk[code]['sourceDescribedBaseDistrict'],'overlaySubtype':crosswalk[code]['overlaySubtype'],'regulatoryCitationIds':['CR-BASE','CR-CHAIN','CR-LMDR' if cr else 'CR-LDR','FENCE-PRECEDENCE'] if cr or ldr else ['IE-BASE','IE-LMDR-FENCE' if code=='LMDR-NCOD Island Est' else 'IE-INSTITUTIONAL' if code=='I-NCOD Island Est' else 'IE-MULTI-FENCE','FENCE-PRECEDENCE'] if ie else ['OSR-SCOPE'],'reasonCurrentlyAmbiguous':'Overlay-specific fence standards/precedence and current applicability not supported/confirmed; technical holds retained' if cr or ldr or ie else 'Nonresidential OSR scope and source/applicability questions; no residential alias','mappedCombination':combination,**counts(rs),'technicalScreenApartFromUnsupported':ok,'allCurrentDesignation3':len(rs),'currentCertifiedOrQualifiedSplitReady':0,'researchPotentialCeilingAfterRegulatoryAndProductWork':ok,'scores':scores,'weightedScore':round(score,3),'sensitivityScores':sensitivity,'currentReadiness':DESIGNATION,'futureDesignationPossibility':'1_AFTER_OVERLAY_AWARE_CARDS_QC_CURRENCY_AND_OWNER_APPROVAL' if single and res else '2_ONLY_AFTER_PRIMARY_RULE_COMPLETENESS_AND_MEANINGFUL_SPLIT_REVIEW' if res else '3_NONRESIDENTIAL_OR_APPLICABILITY_REVIEW','exclusionFlags':dict(collections.Counter(f for r in rs for f in r['researchTechnicalHolds']))})
 combos.sort(key=lambda r:(-r['weightedScore'],r['sourceCode'],r['mappedCombination']))
 for name in ['volume_emphasis','regulatory_emphasis']:
  for rank,r in enumerate(sorted(combos,key=lambda r:-r['sensitivityScores'][name]),1):r.setdefault('sensitivityRanks',{})[name]=rank
 assert combos[0]['sourceCode']==COHORT_CODE and combos[0]['mappedCombination']==COHORT_CODE,'Ranking must be examined if another cohort wins; do not silently pick a preset.'
 out.mkdir(parents=True);(out/'geometries').mkdir();qc=[]
 source_zone=next(z for z in zones if z['properties']['OBJECTID']==10947);zone_g=shape(source_zone['geometry'])
 for r in cohort:
  g=shapes[r['parcelId']];lon,lat=g.centroid.x,g.centroid.y;meter=lambda geom:scale(translate(geom,-lon,-lat),xfact=111195*math.cos(math.radians(lat)),yfact=111195,origin=(0,0));mg=meter(g);r['perimeterMApprox']=mg.length;r['compactness']=4*math.pi*mg.area/(mg.length**2);r['vertexCount']=len(g.exterior.coords) if g.geom_type=='Polygon' else sum(len(x.exterior.coords) for x in g.geoms);r['distanceToCombinedZoneBoundaryMApprox']=meter(zone_g.boundary).distance(mg);r['selectedForQc']=False
 # Stratify eight distinct parcels by extent, size, shape and closeness to the mapped combined-zone boundary.
 chosen=[]
 def select(seq,reason):
  for r in seq:
   if r['parcelId'] not in {x['record']['parcelId'] for x in chosen}:chosen.append({'record':r,'reason':reason});return
 select(sorted(cohort,key=lambda r:r['parcelAreaM2']),'Smallest footprint')
 select(sorted(cohort,key=lambda r:-r['parcelAreaM2']),'Largest footprint')
 select(sorted(cohort,key=lambda r:r['compactness']),'Most irregular outline by compactness')
 select(sorted(cohort,key=lambda r:r['distanceToCombinedZoneBoundaryMApprox']),'Closest to combined-zone boundary')
 select(sorted(cohort,key=lambda r:r['addressCoordinates'][1]),'Southern extent')
 select(sorted(cohort,key=lambda r:-r['addressCoordinates'][1]),'Northern extent')
 select(sorted(cohort,key=lambda r:r['addressCoordinates'][0]),'Western extent')
 select(sorted(cohort,key=lambda r:-r['addressCoordinates'][0]),'Eastern extent')
 # Excluded comparisons remain outside membership and have no inferred legal interpretation.
 excluded=[r for r in rows if r['sourceCode']==COHORT_CODE and r not in cohort]
 select_extra=sorted(excluded,key=lambda r:(not bool(r['researchTechnicalHolds']),-len(r['mappedSourceCodes']),r['addressId']))[:1]
 mixed_i=[r for r in excluded if 'I' in r['mappedSourceCodes']]
 if mixed_i:select_extra.append(max(mixed_i,key=lambda r:next(z['percentOfParcel'] for z in r['coverage'] if z['normalizedZoningCode']=='i')))
 other_ldr=[r for r in rows if r['sourceCode']=='LDR-NCOD Coachman R' and len(r['mappedSourceCodes'])>1]
 if other_ldr:select_extra.append(other_ldr[0])
 for n,x in enumerate(chosen+[{'record':r,'reason':'EXCLUDED comparison: preserve extra districts and/or source-quality holds'} for r in select_extra],1):
  r=x['record'];cid=f'R005-{n:02d}';g=shapes[r['parcelId']];ps=pmap[r['parcelId']][0];bounds=g.buffer(.0005).bounds;near=[z for z,gz in zip(zones,zg) if gz.bounds[0]<=bounds[2] and gz.bounds[2]>=bounds[0] and gz.bounds[1]<=bounds[3] and gz.bounds[3]>=bounds[1]]
  geom={'parcel':ps,'zoningContext':near,'positiveAreaIntersections':[{'sourceObjectId':z['sourceIdentifier'],'rawCode':z['rawZoningCode'],'geometry':mapping(g.intersection(shape(next(f for f in zones if f['properties']['OBJECTID']==z['sourceIdentifier'])['geometry'])))} for z in measurements[r['parcelId']]['zoningFeatures'] if shape(next(f for f in zones if f['properties']['OBJECTID']==z['sourceIdentifier'])['geometry']).is_valid]}
  (out/'geometries'/f'{cid}.json').write_text(json.dumps(geom)+'\n');sample={'caseId':cid,'inCandidateScope':candidate(r),'selectionReason':x['reason'],'record':r,'citationIds':['CR-BASE','CR-CHAIN','CR-LMDR','CR-SIDE','FENCE-PRECEDENCE'] if r['sourceCode']==COHORT_CODE else ['CR-BASE','CR-LDR','FENCE-PRECEDENCE'],'ownerQc':{'reviewer':'','date':'','combinedNcodMappingCredible':'','additionalDistrictOrBoundaryConcern':'','frontOrStreetSideConfiguration':'','cityRegulatoryClarificationNeeded':'','knownFactsAdequateForAmbiguousResponse':'','futureStartingGuidanceAfterOverlaySupportAppropriate':'','proposedInternalDesignation':'','notes':''}};qc.append(sample);r['selectedForQc']=True
 assert len({x['record']['parcelId'] for x in qc})==len(qc)
 summary={'baseline':v,'unsupportedTotal':counts(rows),'ncod':counts([r for r in rows if r['overlayCode']]),'nonNcod':counts([r for r in rows if not r['overlayCode']]),'sourceCodes':codes,'combinationCount':len(combos),'technicalHolds':dict(collections.Counter(f for r in rows for f in r['researchTechnicalHolds'])),'designationsToday':{'1_certified_starting':0,'2_certified_with_meaningful_split':0,'3_ambiguous_known_information':2832},'note':'Internal confidence designations only, not municipal certification. This is an investigation recommendation, not a modified export. Technical screen apart from unsupported does not resolve the original issue or establish regulatory readiness.','candidate':{'exactSourceCode':COHORT_CODE,'exactMappedCombination':[COHORT_CODE],**counts(cohort),'otherSamePrimary':counts(excluded),'currentCertifiedReady':0,'potentialAfterAllGates':len(cohort),'originalIssueOnlyUnsupported':True,'rawLandUseCodes':dict(collections.Counter(r['recordedLandUseCode'] for r in cohort)),'areaM2Quantiles':q([r['parcelAreaM2'] for r in cohort]),'coveragePercentQuantiles':q([r['coverage'][0]['percentOfParcel'] for r in cohort]),'definition':'Exact raw source code and sole positive-area combined district; original issues exactly unsupported_zoning_code; unchanged source QA and no existing geometry, coverage, source, matching, jurisdiction or human hold. No derived alias is assigned.'},'qcCases':len(qc),'qcCandidateCases':sum(x['inCandidateScope'] for x in qc),'scriptSha256':sha(pathlib.Path(__file__)),'regulatoryEvidenceSha256':sha(ROOT/'research/gis/rule005-regulatory-evidence.v1.json'),'noApprovals':True}
 for name,data in [('summary.json',summary),('all-records.json',rows),('ranking.json',combos),('qc-cases.json',qc)]: (out/name).write_text(json.dumps(data,indent=2)+'\n')
 csvout(out/'unsupported-addresses.csv',rows);csvout(out/'candidate-membership.csv',cohort);csvout(out/'source-code-summary.csv',codes);csvout(out/'combination-ranking.csv',combos)
 csvout(out/'review-worksheet.csv',[{'caseId':x['caseId'],'address':x['record']['address'],'parcelId':x['record']['parcelId'],'scope':'CANDIDATE' if x['inCandidateScope'] else 'EXCLUDED_COMPARISON',**x['ownerQc']} for x in qc])
 (out/'checksums.json').write_text(json.dumps({str(p.relative_to(out)):sha(p) for p in sorted(out.rglob('*')) if p.is_file()},indent=2)+'\n')
 print(json.dumps({'population':summary['unsupportedTotal'],'candidate':summary['candidate'],'topRanking':[(r['sourceCode'],r['mappedCombination'],r['addresses'],r['technicalScreenApartFromUnsupported'],r['weightedScore']) for r in combos[:7]]},indent=2))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('source');a.add_argument('measured');a.add_argument('bigfish');a.add_argument('output');v=a.parse_args();run(v.source,v.measured,v.bigfish,v.output)
