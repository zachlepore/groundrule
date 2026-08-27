# Clearwater shed permit threshold research record

## Previous authoritative-source gap

The Shed V1 review found no accessible Clearwater primary-source provision that resolved whether the reported 100-square-foot building-permit exemption was strict or inclusive, how area was measured, or whether the exemption displaced zoning requirements. The initial package therefore retained the candidate `<= 100` boundary as a documented validation gap rather than claiming published-Code support.

## Planner validation — August 27, 2026

Clearwater planner contact Abi responded:

> “Exactly 100 SF doesn’t need one still. We measure the 100 SF by the pad or footprint by the exterior dimensions. And yes still has to follow normal zoning/setback rules or you risk a code stop work order where they’ll make you take it down”

This is direct **planner validation**, not Community Development Code language, Building Code language, published City permit guidance, or an official web source.

The validated interpretation is:

- The building-permit exemption includes shed area **less than or equal to 100 square feet**.
- A shed at exactly **100.0 square feet** remains exempt from that building permit.
- Area is the **pad or footprint measured using exterior dimensions**.
- The exemption concerns the **building permit only**. Applicable zoning, placement, setback, and height rules continue independently.
- Abi's enforcement explanation is preserved in the response above. The resident-facing conclusion is stated calmly: no building permit does not mean no setback or zoning rules.

## Structured reconciliation

- `permit.small_shed_exemption`: planner-validated at `exempt_max_sq_ft = 100`, `exempt_max_inclusive = true`, with `measurement_basis = pad_or_footprint`, `dimension_basis = exterior_dimensions`, `exempts = building_permit`, and `zoning_setbacks_still_apply = true`.
- `permit.larger_shed_review`: planner-validated complementary boundary at `trigger_min_exclusive_sq_ft = 100`; a shed over 100 square feet follows the Clearwater building-permit path.
- `permit.utilities`: **not validated by Abi's response**. The existing cautious direction to confirm possible electrical or plumbing trade permits remains unresolved and is not promoted to a permit conclusion.

## Remaining limits

The accessible primary-source package still does not independently publish the exact exemption or measurement interpretation. Abi did not address electrical or plumbing trade permits, foundations or anchoring, shed-type qualifiers, flood rules, easements, or impervious-surface capacity. Existing Clearwater Code citations remain the authority for the LMDR setbacks and accessory-structure height rules; the planner response is provenance only for the permit boundary, measurement, and continued applicability of zoning/setbacks.

## Final status

**CLEARWATER SHED PERMIT THRESHOLD PLANNER-VALIDATED**
