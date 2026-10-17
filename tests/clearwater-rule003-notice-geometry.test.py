"""Diagnostic geometry tests: no legal/significance classifications are produced."""
import importlib.util
from pathlib import Path
import unittest
from shapely.geometry import box

module_path=Path(__file__).resolve().parents[1]/'scripts/gis/assess-clearwater-rule003-notice.py'
spec=importlib.util.spec_from_file_location('assessment',module_path);assessment=importlib.util.module_from_spec(spec);spec.loader.exec_module(assessment)

class GeometryEvidenceTests(unittest.TestCase):
    def test_narrow_boundary_strip_is_described_without_legal_or_notice_assignment(self):
        result=assessment.describe_geometry(box(0,0,100,100),box(0,0,100,.5))
        self.assertTrue(result['measurementValid']);self.assertLessEqual(result['maximumInwardDistanceFromAnyParcelBoundaryMUpperBound'],.51)
        self.assertEqual(result['osrAreaBeyondBoundaryBandSqFt']['1'],0)
        self.assertEqual(result['interiorComponentsNotTouchingParcelBoundary'],0)
        self.assertNotIn('noticeWarranted',result);self.assertNotIn('legallyInsignificant',result)
    def test_interior_region_is_identified_even_when_percentage_may_be_small(self):
        result=assessment.describe_geometry(box(0,0,1000,1000),box(495,495,505,505))
        self.assertEqual(result['interiorComponentsNotTouchingParcelBoundary'],1)
        self.assertGreater(result['osrAreaBeyondBoundaryBandSqFt']['1'],1000)
    def test_wide_boundary_region_is_not_described_as_wholly_within_one_metre(self):
        result=assessment.describe_geometry(box(0,0,100,100),box(0,0,100,10))
        self.assertGreater(result['osrAreaBeyondBoundaryBandSqFt']['1'],0)
        self.assertGreater(result['maximumInwardDistanceFromAnyParcelBoundaryMUpperBound'],9.9)
    def test_missing_geometry_requires_attention(self):
        result=assessment.describe_geometry(box(0,0,100,100),box(0,0,0,0))
        self.assertFalse(result['measurementValid']);self.assertTrue(result['requiresHumanGeometryReview'])

if __name__=='__main__':unittest.main()
