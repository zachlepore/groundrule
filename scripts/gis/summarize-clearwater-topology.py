#!/usr/bin/env python3
"""Source polygon identity and measured topology summary; does not repair geometry."""
import argparse,collections,hashlib,json,pathlib
from shapely.geometry import shape

def run(source,analysis,output):
 source,analysis,output=map(pathlib.Path,(source,analysis,output));assert not output.exists()
 manifest=json.loads((pathlib.Path(__file__).resolve().parents[2]/'scripts/gis/clearwater-rule001-source.json').read_text())
 raw=(source/'zoning.geojson').read_bytes();assert hashlib.sha256(raw).hexdigest()==manifest['files']['zoning.geojson']['sha256']
 zones=json.loads(raw)['features'];by=collections.defaultdict(list)
 for z in zones:
  g=shape(z['geometry']);p=z['properties'];by[hashlib.sha256(g.normalize().wkb).hexdigest()].append({'objectId':p.get('OBJECTID'),'code':p.get('ZONING'),'shapelyValid':g.is_valid})
 duplicate=[{'geometrySha256':fp,'features':zs} for fp,zs in by.items() if len(zs)>1]
 rows=json.loads((analysis/'unresolved-addresses.json').read_text());parcels={r['parcelId']:r for r in rows if r['parcelId'] is not None}
 masked=[r for r in rows if 99.9<=r['coveragePercent']<=100.1 and r['geometryEvidence'].get('unionCoveragePercentApprox',100)<99.9]
 info={'zoningFeatures':len(zones),'shapelyInvalidZoningFeatures':sum(not shape(z['geometry']).is_valid for z in zones),'uniqueCanonicalZoningFootprints':len(by),'exactDuplicateZoningGeometryGroups':duplicate,'note':'Exact duplicate geometry is distinct from repeated normalized district codes; no polygon is removed. Different IDs with equal geometry do not establish identical legal meaning.','summedCoveragePassButUnionBelow99_9Addresses':len(masked),'summedCoveragePassButUnionBelow99_9ParcelIds':len({r['parcelId'] for r in masked}),'maskedCoverageExamples':[{'addressId':r['addressId'],'address':r['address'],'parcelId':r['parcelId'],'sum':r['coveragePercent'],'unionApprox':r['geometryEvidence']['unionCoveragePercentApprox']} for r in masked[:10]],'unresolvedParcelIds':len(parcels),'parcelIdsWithMultipleSourceFeatures':sum(r['geometryEvidence']['parcelSourceFeatureCount']>1 for r in parcels.values()),'duplicateZoningGeometryAffectedUnresolvedAddresses':sum(any(set(r['geometryEvidence'].get('zoneSourceIds',[]))&{f['objectId'] for f in g['features']} for g in duplicate) for r in rows)}
 output.write_text(json.dumps(info,indent=2)+'\n');print(json.dumps(info,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('analysis');p.add_argument('output');a=p.parse_args();run(a.source,a.analysis,a.output)
