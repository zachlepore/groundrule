#!/usr/bin/env python3
"""Read-only complete parcel/NCOD census. Source geometries never repaired or replaced."""
import json,sys,hashlib,collections
import shapely
from pathlib import Path
from shapely.geometry import shape,Point
from shapely.strtree import STRtree
from shapely import normalize

def measure(source,output):
 assert shapely.__version__=='2.1.2','Pinned Shapely 2.1.2 required'
 source=Path(source);zones=json.loads((source/'zoning.geojson').read_text())['features'];parcels=json.loads((source/'parcels.geojson').read_text())['features']
 profiles=json.loads((source/'property-profiles.json').read_text());linked={str(p['parcelIdentifier']) for p in profiles if p['parcelIdentifier'] is not None}
 zg=[shape(f['geometry']) for f in zones];tree=STRtree(zg);cache={};results=[];pmap=collections.defaultdict(list)
 for index,p in enumerate(parcels):
  pid=str(p['properties']['PARCELID'])
  if pid not in linked:continue
  pmap[pid].append(shape(p['geometry']));raw=p['geometry'];key=json.dumps(raw,sort_keys=True,separators=(',',':'))
  if key not in cache:
   g=shape(raw);features=[];errors=[]
   for zi in sorted(tree.query(g)):
    h=zg[int(zi)];f=zones[int(zi)];code=f['properties'].get('ZONING');touch=False;percent=None
    try:
     if not g.intersects(h):continue
     inter=g.intersection(h);touch=inter.area==0;percent=round(100*inter.area/g.area,9) if g.area>0 else None
    except Exception:
     errors.append('intersection_error');features.append({'sourceIndex':int(zi),'sourceIdentifier':f['properties']['OBJECTID'],'rawZoningCode':code,'contact':'uncertain','percentOfParcelPlanar':None,'geometryValid':h.is_valid});continue
    features.append({'sourceIndex':int(zi),'sourceIdentifier':f['properties']['OBJECTID'],'rawZoningCode':code,'contact':'boundary_only' if touch else 'positive_area','percentOfParcelPlanar':percent,'geometryValid':h.is_valid})
   cache[key]={'footprintSha256':hashlib.sha256(normalize(g).wkb).hexdigest(),'parcelGeometryValid':g.is_valid,'parcelAreaSquareDegrees':g.area,'features':features,'errors':sorted(set(errors))}
  results.append({'parcelId':pid,'sourceParcelIndex':index,'sourceParcelObjectId':p['properties']['OBJECTID'],**cache[key]})
 addresses=[]
 for p in profiles:
  gs=pmap.get(str(p['parcelIdentifier']),[]);xy=p.get('addressCoordinates');inside=None
  try:inside=any(g.covers(Point(xy)) for g in gs) if gs and xy else None
  except Exception:inside=None
  addresses.append({'addressId':p['sourceAddressIdentifier'],'addressInsideLinkedParcel':inside})
 Path(output).write_text(json.dumps({'addresses':addresses,'method':'Shapely 2.1.2 all-layer STRtree; unmodified geometries; normalized WKB footprint proxy; planar percentages supplementary only, not source QA or policy measures','distinctRawGeometryComputations':len(cache),'parcels':results},separators=(',',':'))+'\n')
if __name__=='__main__':measure(*sys.argv[1:])
