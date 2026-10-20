"""Membership grouping, no invented review labels, and retained exclusion precedence."""
import importlib.util,pathlib,unittest
from shapely.geometry import Polygon
p=pathlib.Path(__file__).resolve().parents[1]/'scripts/gis/prepare-clearwater-rule004-qc.py'
s=importlib.util.spec_from_file_location('qc',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class QcEvidence(unittest.TestCase):
 def test_normalized_vertex_order_is_one_group(self):
  a=Polygon([(0,0),(1,0),(1,1),(0,1)]);b=Polygon(list(a.exterior.coords)[::-1]);self.assertEqual(m.fp(a),m.fp(b))
 def test_tiny_real_geometry_difference_not_merged(self):
  a=Polygon([(0,0),(1,0),(1,1),(0,1)]);b=Polygon([(0,0),(1,0),(1,1),(0,1.000000001)])
  self.assertNotEqual(m.fp(a),m.fp(b));self.assertEqual(len(m.group_cases([{'footprintSha256':m.fp(a)},{'footprintSha256':m.fp(b)}])),2)
 def test_grouping_retains_unit_identity(self):
  r=[{'parcelId':'a','footprintSha256':'same'},{'parcelId':'b','footprintSha256':'same'},{'parcelId':'c','footprintSha256':'outlier'}]
  g=m.group_cases(r);self.assertEqual([len(v) for k,v in g],[2,1]);self.assertEqual({v['parcelId'] for k,rs in g for v in rs},{'a','b','c'})
 def test_every_human_field_blank(self):
  r={'addressId':1,'address':'sample','parcelId':'1','groupId':'R004-01','landUseCode':'17'};w=m.worksheet_row('R004-01',r)
  self.assertTrue(all(w[k]=='' for k in m.HUMAN));self.assertEqual(w['recordedLandUseCode'],'17')
 def test_invalid_source_precedes_scope_reason(self):self.assertEqual(m.outside_reason({'flags':['invalid_zoning','coverage_failure'],'originalZoning':'LMDR'}),'INVALID_SOURCE_ZONING_GEOMETRY')
 def test_lmdr_is_not_relabelled_hdr(self):self.assertEqual(m.outside_reason({'flags':[],'originalZoning':'LMDR'}),'EXISTING_PRIMARY_LMDR_OUTSIDE_HDR_SCOPE')
 def test_prefix_is_recorded_without_use_inference(self):
  self.assertEqual(m.unit_prefix('880 MANDALAY AVE UNIT CU-13'),'CU');self.assertIsNone(m.unit_prefix('880 MANDALAY AVE'))
if __name__=='__main__':unittest.main()
