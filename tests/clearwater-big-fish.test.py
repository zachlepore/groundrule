"""Research-accounting regressions: no eligibility or source changes."""
import importlib.util,pathlib,unittest
p=pathlib.Path(__file__).resolve().parents[1]/'scripts/gis/analyze-clearwater-big-fish.py'
s=importlib.util.spec_from_file_location('audit',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def row(**kw):
 r={'flags':[],'districtCount':2,'districts':['hdr','lmdr'],'dominantPercent':99.5,'pendingRule001':False};r.update(kw);return r
class Accounting(unittest.TestCase):
 def test_human_veto_precedes_all(self):self.assertEqual(m.primary_category(['unsupported','link_failure','human_hold']),'Human interpretation hold')
 def test_link_failure_precedes_missing_zoning(self):self.assertEqual(m.primary_category(['missing_primary','link_failure']),'Address/parcel link failure')
 def test_overlapping_same_code_is_not_counted_again_as_repeated(self):self.assertEqual(m.primary_category(['repeated_code','same_code_overlap']),'Overlapping same-code polygons')
 def test_invalid_source_precedes_apparent_sliver(self):self.assertEqual(m.primary_category(['near_complete','invalid_zoning']),'Invalid source zoning geometry')
 def test_new_evidence_blocks_technical_screen(self):
  for f in ['human_code_conflict','representative_point_inconsistent','address_point_outside_linked_parcel','cross_code_overlap_measured','parcel_peer_hold','new_topology_invalid']:
   with self.subTest(f=f):self.assertFalse(m.screen(row(flags=[f])))
 def test_one_code_is_not_a_multi_district_candidate(self):self.assertFalse(m.screen(row(districtCount=1)))
 def test_boundary_is_analytical_only_and_partition_is_disjoint(self):
  self.assertEqual(m.opportunity(row(dominantPercent=99)),'Near-complete primary, residential district pairs')
  self.assertEqual(m.opportunity(row(dominantPercent=98.999999)),'Material splits and remaining classification conflicts')
 def test_unsupported_does_not_inherit_base_code(self):self.assertEqual(m.opportunity(row(flags=['unsupported'])),'NCOD and unsupported-code support')
 def test_missing_parcel_not_a_unique_parcel(self):self.assertEqual(m.count([{'parcelId':None},{'parcelId':'x'},{'parcelId':'x'}]),{'addresses':3,'parcels':1})
 def test_multiple_failures_get_one_opportunity(self):self.assertEqual(m.opportunity(row(flags=['invalid_zoning','repeated_code','coverage_failure'])),'Authoritative invalid zoning geometry replacement')
if __name__=='__main__':unittest.main()
