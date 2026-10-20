"""Research boundaries and source-citation regressions; no approvals are tested into existence."""
import importlib.util,pathlib,json,hashlib,unittest,copy
R=pathlib.Path(__file__).resolve().parents[1];p=R/'scripts/gis/analyze-clearwater-rule005.py';spec=importlib.util.spec_from_file_location('r5',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture():
 d={'parcelFound':True,'parcelGeometryValid':True,'parcelAreaSquareMeters':1000,'sourceParcelFeatureCount':1,'totalZoningCoveragePercent':100,'zoningCodeCoverage':[{'percentOfParcel':100}]}
 r={'issues':['unsupported_zoning_code'],'normalizedJurisdiction':'clearwater','jurisdictionStatus':'confirmed','zoningCode':m.COHORT_CODE}
 return d,r
class Rule005(unittest.TestCase):
 def test_research_screen_does_not_remove_original_unsupported(self):
  d,r=fixture();original=copy.deepcopy(r);self.assertEqual(m.technical_flags(d,r,True,True,[m.COHORT_CODE],[m.COHORT_CODE],0,[]),[]);self.assertEqual(r,original)
 def test_coverage_hold_is_retained(self):
  d,r=fixture();d['totalZoningCoveragePercent']=99.818656;self.assertIn('coverage_outside_existing_tolerance',m.technical_flags(d,r,True,True,[m.COHORT_CODE],[m.COHORT_CODE],0,[]))
 def test_existing_quality_and_matching_holds_remain(self):
  d,r=fixture();d['hasInvalidZoningGeometry']=True;f=m.technical_flags(d,r,True,False,[m.COHORT_CODE],[],0,[]);self.assertIn('invalid_zoning_geometry',f);self.assertIn('address_point_outside_authoritative_parcel',f);self.assertIn('address_point_primary_inconsistency',f)
 def test_human_uncertainty_and_nonfinal_candidates_do_not_become_confirmation(self):
  for status,flag in [('human_true_split','human_review_hold'),('human_primary_candidate','nonfinal_human_primary_candidate_requires_review')]:
   d,r=fixture();self.assertIn(flag,m.technical_flags(d,r,True,True,[m.COHORT_CODE],[m.COHORT_CODE],0,[{'humanReview':{'reviewStatus':status}}]))
 def test_membership_is_exact_and_extra_districts_fail(self):
  r={'sourceCode':m.COHORT_CODE,'mappedSourceCodes':[m.COHORT_CODE],'originalIssues':['unsupported_zoning_code'],'researchTechnicalHolds':[]};self.assertTrue(m.candidate(r));self.assertFalse(m.candidate({**r,'mappedSourceCodes':['I',m.COHORT_CODE]}));self.assertFalse(m.candidate({**r,'sourceCode':'LMDR'}));self.assertFalse(m.candidate({**r,'sourceCode':'LMDR-NCOD Island Est'}))
 def test_ambiguity_flag_is_not_silently_cleared_for_cohort(self):
  r={'sourceCode':m.COHORT_CODE,'mappedSourceCodes':[m.COHORT_CODE],'originalIssues':['unsupported_zoning_code','parcel_ambiguous_zoning'],'researchTechnicalHolds':[]};self.assertFalse(m.candidate(r))
 def test_enumerated_crosswalk_requires_description_and_special_not_suffix_parser(self):
  e=json.loads((R/'research/gis/rule005-regulatory-evidence.v1.json').read_text());self.assertEqual(len(e['exactCodeEvidenceCrosswalk']),8);c=next(c for c in e['exactCodeEvidenceCrosswalk'] if c['exactSourceCode']==m.COHORT_CODE);self.assertEqual(c['sourceDescribedBaseDistrict'],'LMDR');self.assertEqual(c['overlayCode'],'CRNCOD');self.assertEqual(c['sourcePolygons'][0]['SPECIAL'],'(CRNCOD)');self.assertIn('NOT_SUFFIX_STRIPPING',c['method'])
 def test_source_vintage_not_claimed_current_and_no_certification(self):
  e=json.loads((R/'research/gis/rule005-regulatory-evidence.v1.json').read_text());self.assertFalse(e['liveCurrencyVerified']);self.assertTrue(e['noApprovals']);self.assertEqual(m.DESIGNATION,'3_AMBIGUOUS_WITH_KNOWN_ZONING_INFORMATION')
 def test_every_citation_is_exactly_traceable_to_newline_indexed_archive(self):
  e=json.loads((R/'research/gis/rule005-regulatory-evidence.v1.json').read_text());p=R/'research/clearwater/clearwater-development-code.txt';self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),e['sourceSha256']);lines=p.read_text().split('\n')
  for c in e['citations']:
   self.assertEqual(c['sourceExtract'],'\n'.join(lines[c['lineStart']-1:c['lineEnd']]));self.assertIn('#L'+str(c['lineStart']),c['permalink'])
 def test_material_fence_exceptions_have_source_text_not_generic_assumptions(self):
  e=json.loads((R/'research/gis/rule005-regulatory-evidence.v1.json').read_text());by={c['id']:c for c in e['citations']};self.assertIn('Chain link and vinyl',by['CR-CHAIN']['sourceExtract']);self.assertIn('front property line',by['CR-LMDR']['sourceExtract']);self.assertIn('non-opaque',by['IE-LMDR-FENCE']['sourceExtract']);self.assertIn('seawall',by['IE-MULTI-FENCE']['sourceExtract']);self.assertIn('three feet',by['CR-LDR']['sourceExtract'])
if __name__=='__main__':unittest.main()
