import type { Facts } from "../../../lib/rules/types";

/**
 * Temporary, fictional residential parcel facts. These machine keys are present in
 * the published input metadata and must be replaced by authoritative GIS/parcel data.
 */
export const mockClearwaterPropertyFacts: Facts = {
  "property.zoning_district": "ldr",
  "property.is_water_adjacent": false,
  "property.is_attached_dwelling_lot": false,
  "property.is_downtown": false,
  "property.has_principal_structure": true,
  "property.is_vacant_lot": false,
  "property.is_residential_subdivision_perimeter": false,
  "property.lot_frontage_type": "interior",
  "property.rear_orientation_conditions_met": false,
  "project.adjacent_to_public_row": false,
  "project.intersects_prohibited_access_area": false,
  "project.in_utility_easement": false,
};
