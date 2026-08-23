import type { EvaluationRequest } from "../../../lib/rules/types";

/**
 * Deliberately incomplete diagnostic facts. Keys and enum values come from the
 * published Clearwater seed package; all regulatory behavior remains database-driven.
 */
export const liveEvaluatorRequest: EvaluationRequest = {
  jurisdiction: "clearwater-fl",
  projectType: "fence",
  facts: {
    "project.material": "wood",
    "project.is_wire_fence": false,
    "project.has_exposed_top_points": false,
    "project.in_required_setback": true,
    "project.street_plane_length": 120,
    "project.is_chain_link": false,
    "project.location_zone": "front",
    "project.height": 4,
    "project.landscape_strip_waived": false,
    "project.structure_type": "fence",
    "project.material_appropriateness_approved": false,
    "property.is_water_adjacent": false,
    "property.zoning_district": "ldr",
  },
};
