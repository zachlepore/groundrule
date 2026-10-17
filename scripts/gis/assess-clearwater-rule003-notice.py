#!/usr/bin/env python3
"""Descriptive frozen-geometry assessment only; never updates approvals or notices.

Dependencies: shapely==2.1.2 (including maximum_inscribed_circle), numpy.
Local metre projection is approximate; source areas/percentages remain authoritative evidence.
"""
import argparse,csv,hashlib,json,math
from pathlib import Path
import shapely
from shapely.geometry import shape
from shapely.ops import transform,unary_union

SQFT_PER_SQM=1/(.3048**2)
def digest(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for b in iter(lambda:f.read(1048576),b''):h.update(b)
    return {'bytes':Path(path).stat().st_size,'sha256':h.hexdigest()}
def project_geometries(record):
    geom=record['geometry'];parcel=shape(geom['parcel']['geometry']);lon,lat=parcel.centroid.coords[0];sx=111320*math.cos(math.radians(lat));sy=111320
    project=lambda x,y,z=None:((x-lon)*sx,(y-lat)*sy)
    return transform(project,parcel),unary_union([transform(project,shape(z['geometry'])) for z in geom['intersections'] if z['district']=='os/r'])
def describe_geometry(parcel,osr):
    if not parcel.is_valid or not osr.is_valid or parcel.is_empty or osr.is_empty:
        return {'measurementValid':False,'requiresHumanGeometryReview':True}
    outside=lambda width:osr.difference(parcel.boundary.buffer(width,quad_segs=32)).area
    lo,hi=0.,max(parcel.bounds[2]-parcel.bounds[0],parcel.bounds[3]-parcel.bounds[1])
    # Upper bound at 1 cm resolution; negligible residual is numerical, not a policy floor.
    while hi-lo>.01:
        mid=(lo+hi)/2
        if outside(mid)>1e-6:lo=mid
        else:hi=mid
    circle=shapely.maximum_inscribed_circle(osr,tolerance=.005)
    components=list(osr.geoms) if hasattr(osr,'geoms') else [osr]
    return {'measurementValid':True,'projectedOsrAreaSqM':osr.area,'projectedOsrPerimeterM':osr.length,
        'maximumInwardDistanceFromAnyParcelBoundaryMUpperBound':hi,
        'maximumInscribedCircleDiameterMApprox':2*circle.length,
        'osrAreaBeyondBoundaryBandSqFt':{str(w):outside(w)*SQFT_PER_SQM for w in [.25,.5,1,2,5]},
        'osrComponents':len(components),'interiorComponentsNotTouchingParcelBoundary':sum(g.distance(parcel.boundary)>.01 for g in components),
        'osrAreaOutsideSourceParcelSqM':osr.difference(parcel).area}
def assess(prepared,approved,observations,output,root,source=None):
    prepared,approved,observations,output,root=[p.resolve() for p in [prepared,approved,observations,output,root]]
    source=(source or prepared.parent/'source').resolve()
    assert not any(output==p or output.is_relative_to(p) for p in [prepared,approved,source]),'Separate new assessment output required'
    assert not output.exists(),'Fresh output required'
    population=json.loads((prepared/'population.json').read_text());sample=json.loads((prepared/'sample.json').read_text());analysis=json.loads((prepared/'analysis.json').read_text());human=json.loads(observations.read_text())
    assert digest(prepared/'sample.json')['sha256']==human['sampleSha256']
    assert len(human['records'])==25
    byid={r['parcelId']:r for r in sample}
    for r in human['records']:
        s=byid[r['parcelId']];assert r['caseId']==s['caseId'] and r['osrPercent']==s['osrPercent'] and r['address']==s['addresses'][0]['address']
        assert r['humanReview']['result']=='NEGLIGIBLE_FOR_PROMINENT_SPLIT_ZONING_NOTICE'
        assert r['humanReview']['approvalOfSixPercentPolicy'] is False and r['humanReview']['legalBoundaryDetermination'] is False
    for name,v in json.loads((approved/'output-checksums.json').read_text()).items():assert digest(approved/name)==v,name
    assert digest(approved/'clearwater-approved-address-lookup.jsonl')==analysis['inputApprovedLookup']
    assert analysis['inputApprovedLookup']==json.loads((root/'research/gis/rule003-manual-qc/analysis.json').read_text())['inputApprovedLookup']
    approved_geometry={r['parcelId']:r for r in json.loads((approved/'investigation/map-geometries.json').read_text())}
    approved_members={};approved_counts={};profiles=0
    with open(approved/'clearwater-approved-address-lookup.jsonl') as f:
        for line in f:
            row=json.loads(line);profiles+=1;a=row['approvedPrimaryGuidance']
            if a['status']=='GUIDANCE_READY_APPROVED':approved_counts[a['ruleId']]=approved_counts.get(a['ruleId'],0)+1
            if a.get('ruleId')=='CLR-Z-003':
                assert row['status']=='review' and row['zoningCode']=='MDR' and a['noticeThresholdPercent']==0
                assert a['osrNoticeRecommendation']=='RECOMMENDED_PHYSICAL_PROJECT_GUIDES'
                approved_members[row['sourceAddressIdentifier']]=str(row['parcelIdentifier'])
    assert profiles==63430 and approved_counts=={'CLR-Z-001':1967,'CLR-Z-002':262,'CLR-Z-003':731}
    config=root/'research/gis/rule003-approval.bounded-v1.json';assert digest(config)==analysis['inputApprovalConfig']
    membership=json.loads((root/'research/gis/rule003-membership.v1.json').read_text())['categories']
    expected={(r['addressId'],r['parcelId']) for r in membership['approvedCandidates']}
    actual={(a['addressId'],r['parcelId']) for r in population for a in r['addresses']};assert actual==expected and len(actual)==731 and len(population)==146
    assert set(approved_members.items())==actual
    for name,v in analysis['sourceManifest']['files'].items():assert digest(source/name)==v,name
    ds={r['parcelIdentifier']:r for r in json.loads((source/'zoning-diagnostic/zoning-diagnostic.json').read_text())['parcels']}
    reviewed=set(byid);contexts={r['sampleContextKey'] for r in sample};results=[]
    for r in population:
        d=ds[r['parcelId']];z=next(z for z in d['zoningCodeCoverage'] if z['normalizedZoningCode']=='os/r')
        assert r['osrPercent']==z['percentOfParcel'] and r['osrAreaSqM']==z['intersectionAreaSquareMeters']
        assert r['flags']==[] and all(a['originalStatus']=='review' and a['primary']=='MDR' for a in r['addresses'])
        for key in ['parcel','intersections']:assert r['geometry'][key]==approved_geometry[r['parcelId']][key],'Prepared geometry differs from verified static-export evidence'
        parcel,osr=project_geometries(r);metrics=describe_geometry(parcel,osr)
        results.append({'parcelId':r['parcelId'],'addresses':r['addresses'],'osrPercent':r['osrPercent'],'osrAreaSqFt':r['osrAreaSqFt'],'sampleContextKey':r['sampleContextKey'],
            'directHumanReviewed':r['parcelId'] in reviewed,'sharesApproximateContextWithReviewedParcel':r['sampleContextKey'] in contexts,
            'osrSourceFeatureIds':[z['sourceIdentifier'] for z in d['zoningFeatures'] if z['normalizedZoningCode']=='os/r'],**metrics})
    unreviewed=[r for r in results if not r['directHumanReviewed']];unseen=[r for r in results if not r['sharesApproximateContextWithReviewedParcel']]
    over=[r for r in results if r['osrPercent']>6];highest=max(r['osrPercent'] for r in results);maximum=[r for r in results if r['osrPercent']==highest]
    count=lambda rs:{'addresses':sum(len(r['addresses']) for r in rs),'parcelIds':len(rs)}
    summary={'analysisOnly':True,'policyImplemented':False,'proposedThresholdStrictlyGreaterThanPercent':6,'population':count(results),'maximumOsrPercent':highest,'maximumCases':maximum,
        'aboveSixPercent':count(over),'aboveSixPercentCases':over,'wouldSuppress':count([r for r in results if r['osrPercent']<=6]),
        'directHumanReviewed':count([r for r in results if r['directHumanReviewed']]),'notDirectlyHumanReviewed':count(unreviewed),
        'newApproximateSpatialContexts':len({r['sampleContextKey'] for r in unseen}),'newContextPopulation':count(unseen),
        'allOsrAreaWithinOneMetreBoundaryBand':all(r.get('measurementValid') and r['osrAreaBeyondBoundaryBandSqFt']['1']<.001 for r in results),
        'allOsrAreaWithinTwoMetreBoundaryBand':all(r.get('measurementValid') and r['osrAreaBeyondBoundaryBandSqFt']['2']<.001 for r in results),
        'maximumInwardDepthMUpperBound':max(r.get('maximumInwardDistanceFromAnyParcelBoundaryMUpperBound',0) for r in results),
        'unreviewedMaximumInwardDepthMUpperBound':max(r.get('maximumInwardDistanceFromAnyParcelBoundaryMUpperBound',0) for r in unreviewed),
        'unreviewedMaximumInscribedDiameterM':max(r.get('maximumInscribedCircleDiameterMApprox',0) for r in unreviewed),
        'interiorComponentsNotTouchingParcelBoundary':sum(r.get('interiorComponentsNotTouchingParcelBoundary',0) for r in results),
        'unreviewedGeometryAttention':[r for r in unreviewed if not r.get('measurementValid') or r['osrAreaBeyondBoundaryBandSqFt']['1']>.001 or r['interiorComponentsNotTouchingParcelBoundary']>0],
        'unreviewedLargestAreas':sorted(unreviewed,key=lambda r:r['osrAreaSqFt'],reverse=True)[:10],
        'upperOverlapSourceFeatures':{str(fid):count([r for r in results if r['osrPercent']>3 and fid in r['osrSourceFeatureIds']]) for fid in sorted({fid for r in results if r['osrPercent']>3 for fid in r['osrSourceFeatureIds']})},
        'limitations':['Local metric projection is approximate; buffer-depth bound has 1 cm resolution; inscribed circle tolerance 5 mm. These are morphology diagnostics, not notice/legal thresholds.','Exact parcel IDs do not inherit human labels from approximate bounding-box contexts.','No park inventory, aerial imagery, ordinance boundary or survey was added. Park adjacency is owner-reported visual evidence.'],
        'sourceArchiveSha256':analysis['sourceArchiveSha256'],'inputApprovedLookup':analysis['inputApprovedLookup'],'inputConfig':analysis['inputApprovalConfig'],
        'humanObservations':digest(observations),'assessmentScript':digest(Path(__file__)),'shapelyVersion':shapely.__version__,'geosVersion':shapely.geos_version_string}
    output.mkdir(parents=True)
    for name,v in [('assessment.json',summary),('geometry-inventory.json',results),('human-observations.json',human)]: (output/name).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
    with open(output/'geometry-inventory.csv','w',newline='') as f:
        w=csv.writer(f,lineterminator='\n');w.writerow(['Parcel ID','Representative address','Addresses','OSR percent','OSR sq ft','Direct human QC','Approx max inward depth m','Approx largest inscribed diameter m','OSR sq ft beyond 1m parcel boundary band','OSR sq ft beyond 2m parcel boundary band','Interior components'])
        for r in results:w.writerow([r['parcelId'],r['addresses'][0]['address'],len(r['addresses']),r['osrPercent'],r['osrAreaSqFt'],r['directHumanReviewed'],r.get('maximumInwardDistanceFromAnyParcelBoundaryMUpperBound'),r.get('maximumInscribedCircleDiameterMApprox'),r.get('osrAreaBeyondBoundaryBandSqFt',{}).get('1'),r.get('osrAreaBeyondBoundaryBandSqFt',{}).get('2'),r.get('interiorComponentsNotTouchingParcelBoundary')])
    print(json.dumps({k:v for k,v in summary.items() if k not in ['maximumCases','unreviewedGeometryAttention','unreviewedLargestAreas']},indent=2))
    return summary
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('prepared',type=Path);p.add_argument('approved',type=Path);p.add_argument('observations',type=Path);p.add_argument('output',type=Path);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);p.add_argument('--source',type=Path);a=p.parse_args();assess(a.prepared,a.approved,a.observations,a.output,a.root,a.source)
