#!/usr/bin/env python3
"""Frozen-source Rule 004 human QC evidence; never changes approvals or human labels."""
import argparse,collections,csv,hashlib,json,math,pathlib,re
from shapely.geometry import shape,mapping,Point
from shapely.affinity import translate,scale
ROOT=pathlib.Path(__file__).resolve().parents[2]
HUMAN=['meaningfulSecondaryZone','likelyBoundaryArtifact','startingHdrGuidanceAppropriate','prominentNoticeWarranted','furtherLegalOrOwnershipReviewNeeded','reviewer','reviewDate','notes']
def digest(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def writejson(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
def writecsv(p,rows,fields=None):
 with p.open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields or list(rows[0]),lineterminator='\n');w.writeheader()
  for r in rows:w.writerow({k:json.dumps(v,separators=(',',':')) if isinstance(v,(list,dict)) else v for k,v in r.items()})
def fp(g):return hashlib.sha256(g.normalize().wkb).hexdigest()
def group_cases(records):
 groups=collections.defaultdict(list)
 for r in records:groups[r['footprintSha256']].append(r)
 return sorted(groups.items(),key=lambda x:(-len(x[1]),x[0]))
def unit_prefix(a):
 m=re.search(r' UNIT ([A-Z]+)-',a);return m.group(1) if m else None
def outside_reason(r):
 if 'invalid_zoning' in r['flags']:return 'INVALID_SOURCE_ZONING_GEOMETRY'
 if r['originalZoning']!='HDR':return 'EXISTING_PRIMARY_LMDR_OUTSIDE_HDR_SCOPE'
 return 'OTHER_HOLD_REQUIRES_INVESTIGATION'
def worksheet_row(case,r):return {'caseId':case,'addressId':r['addressId'],'address':r['address'],'parcelId':r['parcelId'],'geometryGroup':r['groupId'],'recordedLandUseCode':r['landUseCode'],**{k:'' for k in HUMAN}}
def write_reports(out,records,cases,compare,excluded,context,additional,provenance):
 def table(headers,rows):return '| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+'\n'.join('| '+' | '.join(map(str,r))+' |' for r in rows)+'\n'
 case_table=table(['Case','Representative','Parcel ID','Addresses / parcel IDs','Footprint m²','HDR m² / %','LMDR m² / %'],[(c['caseId'],c['representative']['address'],c['representative']['parcelId'],f"{c['addressCount']} / {c['parcelCount']}",c['parcelAreaM2'],'24169.340 / 99.905922','22.759 / 0.094078') for c in cases])
 type_table=table(['Address prefix','Recorded land-use code','Addresses'],[(prefix,code,sum(r['unitPrefix']==prefix and r['landUseCode']==code for r in records)) for prefix,code in [('C','04'),('N','04'),('S','04'),('CU','09'),('CU','17')]])
 outside_summary=[]
 for reason in sorted({r['reason'] for r in excluded}):
  rs=[r for r in excluded if r['reason']==reason];outside_summary.append([reason,len(rs),len({r['parcelId'] for r in rs})])
 site=next(r for r in context if r['parcelId']);unit_examples=table(['Prompt','Address','Parcel ID','Raw land-use code'],[(x['caseId'],x['record']['address'],x['record']['parcelId'],x['record']['landUseCode']) for x in additional])
 evidence=f"""# Rule 004 visual QC evidence — HDR + LMDR

Investigation only. All human conclusions are blank. Basis: Big Fish commit `1c33794`, frozen September 28 Release and the validated PR #100 approved lookup. No Rule 004 approval, notice threshold or legal finding is created.

## Reconciliation and indexed map cases

{case_table}

All **364 address identities / 364 distinct parcel IDs** match the committed investigation membership hash `{provenance['candidateMembershipSha256']}`. Every original field is compared across all 63,430 profiles; existing approvals remain 1,967 + 262 + 731 = 2,960, leaving 17,378 unresolved original REVIEW profiles. Every candidate retains HDR / REVIEW and `parcel_ambiguous_zoning`, with no new approval. All 11 frozen source-file and 38 approved-output checksums and the pinned Release archive/lookup hashes pass.

Indexed maps: `maps/R004-01.png` and `.pdf`, `maps/R004-02.png` and `.pdf`; 300-dpi PNGs (2550 × 3300) and vector PDF. `qc-atlas.pdf` has two pages; `contact-sheet.pdf` is one page. Full-site maps show a larger un-unitized source record as dotted grey context, actual HDR/LMDR clips in blue/orange, and its OS/R/P clips in faint green/purple. Each case includes the whole LMDR strip and a 3 × 3 m close-up, north arrow, approximate metre axes and scale bars. Source zoning outlines are blue/brown; dashed black is the unit-record footprint. No aerial imagery, survey or building/floorplan is supplied. Do not infer the legal boundary from the color fills.

## Why so many geometrically coincident parcel records?

The **frozen source itself** contains 364 separately identified parcel features, one per candidate identity, with site address `880 MANDALAY AVE`. The workflow does not join or dissolve them into a common outline. All 364 raw address `PIN_NUM` values match the unique parcel `PARCELID`; every address OBJECTID, full unit address, parcel OBJECTID, source profile parcel reference and authoritative-identifier match agrees. All address points lie inside the linked horizontal footprint. The repeated outlines therefore arise upstream in the source representation, consistent with separately identified units represented by a site-level horizontal footprint. This is an interpretation of the GIS representation, **not proof of deeded condominium boundaries, shared rights or ownership**. Unit identifiers and address points do not provide floor elevations or unit polygons.

The primary normalized footprint is repeated across 363 different parcel features. The N-1005 outlier has 49 exterior vertices including closure versus 51 in the primary group; it omits two almost-collinear western-edge vertices. Exact topological equality is false. Approximate symmetric-difference area is **{compare['symmetricDifferenceM2Approx']:.12f} m²**, Hausdorff separation **{compare['maximumHausdorffDistanceMApprox']:.12f} m**. Source coordinates and both hashes are preserved; no snapping, equality tolerance or boundary repair is applied. These differences are below map-scale visibility and do not establish a second physical site or different ownership relationship. Both diagnostic footprint areas round to 24,192.099 m², and district measurements match at recorded precision.

## Secondary LMDR morphology

Both groups intersect the same zoning features: **HDR OBJECTID 10707, source index 224; LMDR OBJECTID 10764, source index 281** (September 28 `zoning.geojson`). LMDR forms one connected narrow strip along the **southern footprint boundary**, rather than a detached interior region. Its recorded area is 22.759 m² (about {22.759*10.7639104167:.2f} ft²), 0.094078%; HDR is 24,169.340 m² / 99.905922%. Approximate maximum LMDR inward depth from the parcel boundary is **{cases[0]['maximumSecondaryInwardDepthMApprox']:.6f} m**; measured LMDR area beyond a 1 m boundary band is zero for both groups. The 1 m band is diagnostic, not a notice cutoff or legal exemption. A true boundary strip can remain legally applicable. Nothing here determines whether prominent notices should be suppressed.

Original diagnostic area/percentage values are retained rather than replaced by local projection areas. Supplemental widths and tiny variant differences use an approximate local metre plane at 27.97°N; they are not survey measurements. All raw polygons/intersections are preserved in `geometries/` with source references.

## Unit-type evidence and ownership uncertainty

{type_table}

All 347 C/N/S-prefixed addresses carry raw code `04`; 17 CU-prefixed records carry `09` (12) or `17` (5). These are verified raw field differences; their code descriptions, legal unit types and permitted uses are **not independently confirmed**. Do not label all 364 residential units or assume CU means a particular ownership or commercial entitlement. Five parcel `SITE_CITY` values are null, while all 364 authoritative address records state CLEARWATER and have matching source identities. Those null property attributes are retained, not rewritten. Representative prompts sharing the primary geometry:

{unit_examples}

Live verification attempts to the Pinellas parcel-layer metadata and Property Appraiser detail page returned **HTTP 403 on October 17, 2026**. Frozen property attributes contain STRAP, site/parcel identifiers and raw land-use codes, but no owners, declarations, deed descriptions, floor plans or common-area allocations. Property-level identity consistency is verified; legal ownership relationships remain unverified. No website text or code taxonomy is invented.

## Larger site record and two unresolved units — separate from both cohorts

There are **367** frozen address profiles beginning `880 MANDALAY AVE`: 364 proposed candidates plus these three records, all unresolved:

{table(['Address','Parcel ID','Disposition'],[(r['address'],r['parcelId'] or '(unresolved)', 'Outside candidate scope: '+('four mapped districts; cross-code overlap retained' if r['parcelId'] else 'multiple parcel matches; no resolved parcel')) for r in context])}

The un-unitized site record `322815740740000001` carries mapped **HDR {site['intersections'][0]['percentOfParcel']}%, OS/R {next(z['percentOfParcel'] for z in site['intersections'] if z['normalizedZoningCode']=='os/r')}%, P {next(z['percentOfParcel'] for z in site['intersections'] if z['normalizedZoningCode']=='p')}%, LMDR {next(z['percentOfParcel'] for z in site['intersections'] if z['normalizedZoningCode']=='lmdr')}%**. Its original diagnostic and all intersections accompany the packet. It is not assumed to be legally owned in common with any candidate; no title relationship is present in the frozen schema. It does show why a tiny LMDR portion on a unit-record footprint cannot establish that all project areas or shared land are exclusively HDR. The two unmatched units remain link holds and are not added to the 364. Their raw address PINs have no exact parcel record in this frozen snapshot: N-1003 reports `322815740740141003`; S-905 reports the shorter `322815740190905`. Spatial fallback cannot distinguish coincident unit footprints. The exact source values and counts of site-address polygon features covering each point are retained in `site-context-exclusions.json`; no PIN is guessed or corrected. These three records are **not part of the 133 exact HDR + LMDR exclusions** below.

Starting guidance can mislead if it implies exclusive zoning, parcel-wide project permission, residential use rights for every unit, transferable density or entitlement over shared land. Any future interpretation must distinguish unit interior work from exterior/association/site projects and retain district evidence, original REVIEW and project-location applicability. Geometry alone cannot resolve ownership, association restrictions or density/setback calculations.

## The 133 other exact HDR + LMDR unresolved addresses

497 exact-pair unresolved addresses = **364 bounded candidates + 133 excluded addresses**. Exclusions are mutually exclusive by the reason below; secondary flags overlap.

{table(['Primary exclusion','Addresses','Distinct parcel IDs'],outside_summary)}

Of 129 source-geometry exclusions, 123 have existing HDR and six existing LMDR; **66 also have coverage failures**, retained as secondary flags, not added again. These are future source-correction/topology research leads, not threshold-based recoveries. The four otherwise screened LMDR-primary profiles are outside the explicitly existing-HDR scope: 1630 FULTON AVE, 916 ELDORADO AVE, 803 FAIRMONT ST and 3132 SAN JOSE ST. Three have a more material secondary intersection; the fourth has near-complete LMDR. They would require a separate LMDR-specific investigation; no existing classification is changed. Complete addresses, parcel IDs, intersections and flags are in `outside-cohort-133.csv`. Total excluded parcel IDs: {len({r['parcelId'] for r in excluded})}; parcel counts across reasons may overlap in general.

## Reproduction

Use existing Node GIS dependencies, Python 3, Shapely 2.1.2 and matplotlib. Keep outputs outside Git and use fresh directories:

```sh
PYTHONPATH=/path/to/shapely python3 scripts/gis/prepare-clearwater-rule004-qc.py SOURCE APPROVED_EXPORT BIG_FISH_ANALYSIS SOURCE_ZIP NEW_PREPARED
XDG_CACHE_HOME=/writable/cache PYTHONPATH=/path/to/shapely python3 scripts/gis/render-clearwater-rule004-qc.py NEW_PREPARED NEW_MAPS
PYTHONPATH=/path/to/shapely python3 tests/clearwater-rule004-qc.test.py
```

Frozen Release: https://github.com/zachlepore/groundrule/releases/tag/clearwater-gis-2026-09-28 . Validated approved baseline: https://github.com/zachlepore/groundrule/actions/runs/39030680013/artifacts/12100112777 . Big Fish address analysis is in the prior downloadable package and can be regenerated with its read-only scripts. `provenance.json` pins source/archive/lookup, scripts, input analysis, membership and library version. Prepared/render checksum manifests cover their outputs. All reviewer fields remain blank. No Rules 001–003, Supabase, Guides, UX, production or deployment changes.
"""
 memo=f"""# Rule 004 — owner decision memo

**Manual QC preparation only. No properties approved; no notice threshold proposed or inherited.**

Review R004-01 (C-609, 363-record shared geometry) and R004-02 (N-1005, one-record vertex variant). Both show 22.759 m² / 0.094078% LMDR as a southern edge strip, approximate maximum inward depth 0.553635 m. This visual pattern supports inspection for possible boundary artifacts, not a legal conclusion. Two additional worksheet rows isolate CU raw land-use codes 09 and 17.

Owner questions for this review:

1. Does the mapped LMDR strip look meaningful for starting guidance, or like an apparent boundary artifact? Record visual judgment separately from any legal interpretation.
2. Is HDR appropriate as a non-exclusive starting classification for these units, with LMDR and original REVIEW evidence retained?
3. Is a prominent notice warranted for this bounded pattern? No threshold from Rules 001–003 applies automatically.
4. Do CU-coded records require a separate applicability/ownership hold before any future approval scope is proposed?
5. Does the larger un-unitized source record (HDR + OS/R + P + LMDR) require City/property-record confirmation for exterior/shared-site projects, association rights or density? The packet cannot establish its ownership relationship to the units.

The worksheet's meaningful-zone, likely-artifact, HDR-starting, prominent-notice, legal/ownership-review and notes fields are intentionally blank. Visual findings alone do not establish legal boundary corrections or zoning exemptions. Future implementation would require explicit owner approval of membership and presentation policy, with unresolved exceptions retained. The 133 excluded exact-pair records, two unmatched units and separate four-district site record remain outside the 364.
"""
 worksheet=['# Rule 004 human-review worksheet','', 'Reviewer: ____________________    Review date: ____________________', '', 'Record visual findings separately from legal conclusions. Leave uncertainty explicit.']
 for c,r in [(c['caseId'],c['representative']) for c in cases]+[(x['caseId'],x['record']) for x in additional]:
  worksheet+=['',f"## {c} — {r['address']}",'',f"Parcel: `{r['parcelId']}`; raw land-use code `{r['landUseCode']}`.",'','- Meaningful secondary zone? ____________________','- Likely boundary artifact? ____________________','- Starting HDR guidance appropriate? ____________________','- Prominent notice warranted? ____________________','- Further legal or ownership review needed? ____________________','- Notes: ____________________________________________________________']
 (out/'evidence-report.md').write_text(evidence);(out/'decision-memo.md').write_text(memo);(out/'review-worksheet.md').write_text('\n'.join(worksheet)+'\n')

def run(source,approved,analysis,archive,output):
 source,approved,analysis,archive,out=map(pathlib.Path,(source,approved,analysis,archive,output));assert not out.exists(),'Fresh output required'
 assert not out.resolve().is_relative_to(source.resolve()) and not out.resolve().is_relative_to(approved.resolve())
 manifest=json.loads((ROOT/'scripts/gis/clearwater-rule001-source.json').read_text());assert digest(archive)==manifest['archiveSha256']
 for n,v in manifest['files'].items():assert digest(source/n)==v['sha256'],n
 checks=json.loads((approved/'output-checksums.json').read_text())
 for n,v in checks.items():assert digest(approved/n)==v['sha256'],n
 assert digest(approved/'clearwater-approved-address-lookup.jsonl')=='cdb14957486a6665cd4367edce9136df8bf2f01053fc2c0ea62ef4ee0cbbbbb2'
 original=json.loads((source/'property-profiles.json').read_text());lookup=[json.loads(l) for l in (approved/'clearwater-approved-address-lookup.jsonl').open()]
 assert len(original)==len(lookup)==63430
 approvals=collections.Counter();remaining=set()
 for o,r in zip(original,lookup):
  assert {k:v for k,v in r.items() if k not in ['researchRule001','researchRule002','researchRule003','approvedPrimaryGuidance']}==o
  if r['approvedPrimaryGuidance']['status']=='GUIDANCE_READY_APPROVED':approvals[r['approvedPrimaryGuidance']['ruleId']]+=1
  elif r['status']=='review':remaining.add(r['sourceAddressIdentifier'])
 assert dict(approvals)=={'CLR-Z-001':1967,'CLR-Z-002':262,'CLR-Z-003':731};assert len(remaining)==17378
 population=json.loads((analysis/'unresolved-addresses.json').read_text());assert {r['addressId'] for r in population}==remaining
 pins=list(csv.DictReader((ROOT/'research/gis/big-fish-results/rule004-candidates.csv').open()));pinids={int(r['addressId']) for r in pins};assert len(pins)==len(pinids)==364
 expected=json.loads((ROOT/'research/gis/big-fish-results/rule004-summary.json').read_text())
 assert hashlib.sha256(json.dumps(sorted(pinids),separators=(',',':')).encode()).hexdigest()==expected['candidateMembershipSha256']
 broad=[r for r in population if r['districts']==['hdr','lmdr']];assert len(broad)==497
 candidates=[r for r in broad if r['qualityScreenPass'] and r['originalZoning']=='HDR' and r['dominantCode']=='hdr' and r['dominantPercent']>=99]
 assert {r['addressId'] for r in candidates}==pinids
 parcel_features=json.loads((source/'parcels.geojson').read_text())['features'];parcels=collections.defaultdict(list)
 for p in parcel_features:parcels[p['properties']['PARCELID']].append(p)
 addresses={a['properties']['OBJECTID']:a for a in json.loads((source/'addresses.geojson').read_text())['features']};profiles={r['sourceAddressIdentifier']:r for r in lookup}
 diagnostic={d['parcelIdentifier']:d for d in json.loads((source/'zoning-diagnostic/zoning-diagnostic.json').read_text())['parcels']}
 zones=json.loads((source/'zoning.geojson').read_text())['features'];zbyid={z['properties']['OBJECTID']:z for z in zones}
 records=[]
 for r in candidates:
  i=r['parcelId'];assert len(parcels[i])==1;p=parcels[i][0];d=diagnostic[i];a=addresses[r['addressId']];profile=profiles[r['addressId']];g=shape(p['geometry'])
  assert p['properties']['SITE_ADDRESS']=='880 MANDALAY AVE';assert a['properties']['PIN_NUM']==i;assert a['properties']['FULLADDR']==r['address'];assert profile['parcelSourceIdentifier']==p['properties']['OBJECTID'];assert profile['parcelMatchMethod']=='authoritative_identifier';assert g.covers(shape(a['geometry']))
  assert g.is_valid and d['parcelGeometryValid'] and not any(d[k] for k in ['hasInvalidZoningGeometry','hasRepeatedNormalizedCode','hasOverlappingSameCodePolygons'])
  assert {z['normalizedZoningCode'] for z in d['zoningCodeCoverage']}=={'hdr','lmdr'} and d['totalZoningCoveragePercent']==100
  assert r['flags']==['near_complete']
  assert [(z['normalizedZoningCode'],z['intersectionAreaSquareMeters'],z['percentOfParcel']) for z in d['zoningCodeCoverage']]==[('hdr',24169.340,99.905922),('lmdr',22.759,.094078)]
  assert set(z['sourceIdentifier'] for z in d['zoningFeatures'])=={10707,10764}
  recorded={'addressId':r['addressId'],'address':r['address'],'parcelId':i,'parcelObjectId':p['properties']['OBJECTID'],'strap':p['properties']['STRAP'],'siteAddress':p['properties']['SITE_ADDRESS'],'siteCity':p['properties']['SITE_CITY'],'landUseCode':p['properties']['LAND_USE_CODE'],'unitPrefix':unit_prefix(r['address']),'addressPin':a['properties']['PIN_NUM'],'siteAddId':a['properties']['SITEADDID'],'addressStatus':a['properties']['STATUS'],'originalZoning':profile['zoningCode'],'originalQa':profile['status'],'originalIssues':profile['issues'],'guidanceStatus':profile['approvedPrimaryGuidance']['status'],'parcelMatchMethod':profile['parcelMatchMethod'],'coordinates':a['geometry']['coordinates'],'footprintSha256':fp(g),'sourceReference':f"parcels.geojson#OBJECTID={p['properties']['OBJECTID']};addresses.geojson#OBJECTID={r['addressId']};zoning-diagnostic/zoning-diagnostic.json#{i}"}
  records.append(recorded)
 groups=group_cases(records);assert [len(rs) for _,rs in groups]==[363,1]
 out.mkdir(parents=True);(out/'geometries').mkdir();cases=[]
 for number,(key,rs) in enumerate(groups,1):
  case=f'R004-{number:02d}';rep=next((r for r in rs if r['addressId']==4248),rs[0]);g=shape(parcels[rep['parcelId']][0]['geometry']);d=diagnostic[rep['parcelId']]
  for r in rs:r['groupId']=case
  lon,lat=g.centroid.x,g.centroid.y
  def metric(x):return scale(translate(x,-lon,-lat),xfact=111195*math.cos(math.radians(27.97)),yfact=111195,origin=(0,0))
  lm=g.intersection(shape(zbyid[10764]['geometry']));mg,ml=metric(g),metric(lm)
  lo,hi=0,5
  for _ in range(40):
   mid=(lo+hi)/2
   if ml.difference(mg.boundary.buffer(mid)).area>1e-9:lo=mid
   else:hi=mid
  data={'caseId':case,'representative':rep,'addressCount':len(rs),'parcelCount':len({r['parcelId'] for r in rs}),'footprintSha256':key,'parcelAreaM2':d['parcelAreaSquareMeters'],'districts':d['zoningCodeCoverage'],'sourceZoningFeatures':d['zoningFeatures'],'vertexCount':len(g.exterior.coords),'secondaryGeometryType':lm.geom_type,'secondaryComponents':len(lm.geoms) if hasattr(lm,'geoms') else 1,'secondaryBeyond1mBoundaryM2Approx':ml.difference(mg.boundary.buffer(1)).area,'maximumSecondaryInwardDepthMApprox':hi,'secondaryMaximumInscribedDiameterMApprox':2*ml.maximum_inscribed_circle(tolerance=.0001).length if hasattr(ml,'maximum_inscribed_circle') else None,'unitPrefixCounts':dict(collections.Counter(r['unitPrefix'] for r in rs)),'landUseCounts':dict(collections.Counter(r['landUseCode'] for r in rs)),'humanReview':{k:'' for k in HUMAN}}
  # Raw source polygons and clipped intersections retained separately; no coordinate rounding.
  geom={'parcel':parcels[rep['parcelId']][0],'zoningFeatures':[zbyid[10707],zbyid[10764]],'intersections':[{'district':z['normalizedZoningCode'],'sourceId':z['sourceIdentifier'],'geometry':mapping(g.intersection(shape(zbyid[z['sourceIdentifier']]['geometry'])))} for z in d['zoningFeatures']]}
  writejson(out/'geometries'/f'{case}.json',geom);cases.append(data)
 # Metric comparison preserves the exact two normalization groups, even though their map-scale shapes coincide.
 a,b=[shape(parcels[c['representative']['parcelId']][0]['geometry']) for c in cases];lon,lat=a.centroid.x,a.centroid.y
 metric=lambda g:scale(translate(g,-lon,-lat),xfact=111195*math.cos(math.radians(27.97)),yfact=111195,origin=(0,0))
 am,bm=metric(a),metric(b)
 compare={'topologicallyEqual':a.equals(b),'sharedGroupVerticesIncludingClosure':len(a.exterior.coords),'outlierVerticesIncludingClosure':len(b.exterior.coords),'maximumHausdorffDistanceMApprox':am.hausdorff_distance(bm),'symmetricDifferenceM2Approx':am.symmetric_difference(bm).area,'sharedOnlySourceVertices':sorted(set(a.exterior.coords)-set(b.exterior.coords)),'outlierOnlySourceVertices':sorted(set(b.exterior.coords)-set(a.exterior.coords)),'interpretation':'Outlier omits two almost-collinear source vertices; tiny positive geometry difference, not normalized to equality. No independent site or ownership distinction established.'}
 outside=[r for r in broad if r['addressId'] not in pinids];assert len(outside)==133
 excluded=[{'addressId':r['addressId'],'address':r['address'],'parcelId':r['parcelId'],'existingPrimary':r['originalZoning'],'reason':outside_reason(r),'originalIssues':r['issues'],'allFlags':r['flags'],'intersections':r['intersections'],'sourceReference':r['sourceEvidence']} for r in outside]
 assert collections.Counter(r['reason'] for r in excluded)=={'INVALID_SOURCE_ZONING_GEOMETRY':129,'EXISTING_PRIMARY_LMDR_OUTSIDE_HDR_SCOPE':4}
 site_context=[r for r in population if r['address'].startswith('880 MANDALAY AVE') and r['addressId'] not in pinids];assert len(site_context)==3
 for r in site_context:
  if r['parcelId']:
   writejson(out/'geometries'/'site-context-parcel.json',{'parcel':parcels[r['parcelId']][0],'intersections':[{'district':z['normalizedZoningCode'],'geometry':mapping(shape(parcels[r['parcelId']][0]['geometry']).intersection(shape(zbyid[z['sourceIdentifier']]['geometry']))),'sourceId':z['sourceIdentifier']} for z in diagnostic[r['parcelId']]['zoningFeatures']], 'diagnostic':diagnostic[r['parcelId']]})
  else:
   a=addresses[r['addressId']];r['rawAddressRecord']=a;r['rawPinParcelFeatureCount']=len(parcels.get(a['properties']['PIN_NUM'],[]));r['matchingSiteAddressParcelFeaturesByPoint']=sum(shape(p['geometry']).covers(shape(a['geometry'])) for p in parcel_features if p['properties'].get('SITE_ADDRESS')=='880 MANDALAY AVE')
 # Additional unit-type prompts preserve raw code differences without interpreting titles or permitted uses.
 additional=[]
 for code in ['09','17']:
  r=sorted([r for r in records if r['unitPrefix']=='CU' and r['landUseCode']==code],key=lambda r:str(r['addressId']))[0]
  additional.append({'caseId':f'R004-01-CU{code}','record':r,'purpose':f'CU prefix; recorded LAND_USE_CODE {code}; relationship and permitted use not established by frozen fields.'})
 worksheet=[worksheet_row(c['caseId'],c['representative']) for c in cases]+[worksheet_row(x['caseId'],x['record']) for x in additional]
 assert all(r[k]=='' for r in worksheet for k in HUMAN)
 writecsv(out/'review-worksheet.csv',worksheet);writecsv(out/'candidate-addresses.csv',records);writecsv(out/'outside-cohort-133.csv',excluded)
 writecsv(out/'case-index.csv',[{'caseId':c['caseId'],'address':c['representative']['address'],'parcelId':c['representative']['parcelId'],'addresses':c['addressCount'],'parcelIds':c['parcelCount'],'footprintAreaM2':c['parcelAreaM2'],'hdrAreaM2':24169.340,'hdrPercent':99.905922,'lmdrAreaM2':22.759,'lmdrPercent':.094078,'hdrSourceObjectId':10707,'lmdrSourceObjectId':10764,'map':f"maps/{c['caseId']}.png"} for c in cases])
 writejson(out/'cases.json',cases);writejson(out/'additional-unit-examples.json',additional);writejson(out/'site-context-exclusions.json',site_context)
 writejson(out/'geometry-comparison.json',compare)
 provenance={'basisCommit':'1c33794','sourceSnapshotId':manifest['snapshotId'],'sourceArchiveSha256':manifest['archiveSha256'],'approvedLookupSha256':digest(approved/'clearwater-approved-address-lookup.jsonl'),'sourceFilesVerified':len(manifest['files']),'approvedChecksumsVerified':len(checks),'profilesRetained':63430,'originalFieldsChanged':0,'approvals':dict(approvals),'remainingReview':17378,'candidateMembershipSha256':expected['candidateMembershipSha256'],'candidateAddresses':364,'candidateParcelIds':364,'groups':[{'caseId':c['caseId'],'records':c['addressCount'],'sha256':c['footprintSha256']} for c in cases],'outsideCohort':133,'siteContextOutsideCohort':3,'scriptSha256':digest(pathlib.Path(__file__)),'analysisInputSha256':digest(analysis/'unresolved-addresses.json'),'shapelyVersion':__import__('shapely').__version__,'geometryMethod':'Original diagnostic areas/percentages retained. Supplemental distances/areas: local equirectangular plane, fixed latitude 27.97N, 111195 m/degree; not survey distances. Boundary-depth binary search with residual-area tolerance 1e-9 m2.','propertyRecordsLimitations':'Frozen property fields contain parcel identifiers, STRAP, site address and LAND_USE_CODE, not owners, deeds, condo declarations, unit use entitlements or common-area rights. Live Pinellas parcel service and Property Appraiser property-details requests returned HTTP 403 on 2026-10-17; no live property records used.','liveAttempts':[{'url':'https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer/1?f=pjson','httpStatus':403},{'url':'https://www.pcpao.gov/property-details?s=152832740740030609','httpStatus':403}],'newApprovals':0,'humanConclusionsAutomaticallyFilled':False}
 write_reports(out,records,cases,compare,excluded,site_context,additional,provenance)
 writejson(out/'provenance.json',provenance)
 writejson(out/'checksums.json',{str(p.relative_to(out)):digest(p) for p in sorted(out.rglob('*')) if p.is_file()})
 print(json.dumps({'groups':provenance['groups'],'comparison':compare,'unitTypes':dict(collections.Counter((r['unitPrefix'] or '')+':'+r['landUseCode'] for r in records))},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('approved');p.add_argument('analysis');p.add_argument('archive');p.add_argument('output');a=p.parse_args();run(a.source,a.approved,a.analysis,a.archive,a.output)
