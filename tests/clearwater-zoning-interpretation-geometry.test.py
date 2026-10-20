import importlib.util,json,pathlib,tempfile,unittest
spec=importlib.util.spec_from_file_location('ncod_geometry',pathlib.Path(__file__).resolve().parents[1]/'scripts/gis/measure-clearwater-zoning-interpretation.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def polygon(points,props):return {'type':'Feature','properties':props,'geometry':{'type':'Polygon','coordinates':[points]}}
class GeometryTests(unittest.TestCase):
 def run_measure(self,zones):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)
   parcels=[polygon([[0,0],[1,0],[1,1],[0,1],[0,0]],{'OBJECTID':i,'PARCELID':str(i)}) for i in [1,2]]
   for name,value in [('zoning.geojson',{'features':zones}),('parcels.geojson',{'features':parcels}),('property-profiles.json',[{'sourceAddressIdentifier':i,'parcelIdentifier':str(i),'addressCoordinates':[.5,.5]} for i in [1,2]])]:
    (p/name).write_text(json.dumps(value))
   module.measure(p,p/'output.json');return json.loads((p/'output.json').read_text())
 def test_boundary_and_positive_contact_keep_two_unit_identities(self):
  zones=[polygon([[0,0],[.5,0],[.5,1],[0,1],[0,0]],{'OBJECTID':10,'ZONING':'LMDR-NCOD Coachman R'}),polygon([[1,0],[2,0],[2,1],[1,1],[1,0]],{'OBJECTID':11,'ZONING':'LMDR-NCOD Island Est'})]
  r=self.run_measure(zones);self.assertEqual(r['distinctRawGeometryComputations'],1);self.assertEqual(len(r['parcels']),2)
  self.assertNotEqual(r['parcels'][0]['parcelId'],r['parcels'][1]['parcelId']);self.assertEqual(r['parcels'][0]['footprintSha256'],r['parcels'][1]['footprintSha256'])
  self.assertEqual([f['contact'] for f in r['parcels'][0]['features']],['positive_area','boundary_only']);self.assertEqual(r['parcels'][0]['features'][0]['percentOfParcelPlanar'],50)
  self.assertTrue(all(x['addressInsideLinkedParcel'] for x in r['addresses']))
 def test_invalid_polygon_is_retained_as_uncertain_not_repaired(self):
  r=self.run_measure([polygon([[0,0],[1,1],[0,1],[1,0],[0,0]],{'OBJECTID':10,'ZONING':'LMDR-NCOD Coachman R'})]);p=r['parcels'][0]
  self.assertIn('intersection_error',p['errors']);self.assertEqual(p['features'][0]['contact'],'uncertain');self.assertFalse(p['features'][0]['geometryValid'])
if __name__=='__main__':unittest.main()
