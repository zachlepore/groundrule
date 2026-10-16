import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFlags } from '../scripts/gis/investigate-clearwater-rule003.mjs';

const evidence=()=>({parcelFound:true,parcelGeometryValid:true,parcelAreaSquareMeters:100,
  totalZoningCoveragePercent:100,zoningCodeCoverage:[{percentOfParcel:95},{percentOfParcel:5}]});
const profiles=[{normalizedJurisdiction:'clearwater',jurisdictionStatus:'confirmed',status:'review',issues:['parcel_ambiguous_zoning']}];
test('technical screen does not assert legal eligibility or require 99.9% primary dominance',()=>{
  assert.deepEqual(sourceFlags(evidence(),profiles),[]);
});
test('invalid, repeated, overlapping and duplicate source evidence veto the screen',()=>{
  const d={...evidence(),parcelGeometryValid:false,hasInvalidZoningGeometry:true,hasRepeatedNormalizedCode:true,hasOverlappingSameCodePolygons:true,sourceErrors:['intersection_error'],totalZoningCoveragePercent:NaN};
  assert.deepEqual(sourceFlags(d,profiles,true),['invalid_or_missing_parcel_geometry','invalid_zoning_geometry','intersection_error','coverage_outside_99.9_to_100.1_percent','repeated_same_code_polygons','overlapping_same_code_polygons','duplicate_parcel_identity']);
});
test('unsupported profile flags and uncertain human evidence remain exclusions',()=>{
  assert.ok(sourceFlags(evidence(),[{...profiles[0],issues:['parcel_ambiguous_zoning','unsupported_zoning_code']}]).includes('unrelated_source_profile_issue'));
  for(const reviewStatus of ['human_true_split','human_staff_review','human_primary_applicability_unclear']){
    assert.ok(sourceFlags(evidence(),profiles,false,[{humanReview:{reviewStatus}}]).includes('human_split_or_uncertain'));
  }
  assert.ok(sourceFlags(evidence(),profiles,false,[{humanReview:{reviewStatus:'human_confirmed',result:'CONFIRMED: LMDR'}}]).includes('gold_contradiction'));
  assert.deepEqual(sourceFlags(evidence(),profiles,false,[{humanReview:{reviewStatus:'human_confirmed',result:'CONFIRMED: MDR'}}]),[]);
});
