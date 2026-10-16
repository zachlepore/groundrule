# Findings after Batch 3A

October 6, 2026. Human official-viewer review; research only. No production implementation, universal threshold, database write, or resident UX change is authorized.

## Counts and reviewed evidence

The cumulative set contains 20 reviewed records: 17 single-district confirmations and 3 true splits. Batch 1B's five cases were skipped and have no human labels. The three broader calibration batches 1C, 2A and 3A comprise 15 reviewed cases; the earlier five-case 1A baseline brings the cumulative total to 20.

| Class | Reviewed examples | Human findings | Scope |
|---|---:|---|---|
| LMDR/OS/R | 10, including the 1A baseline | All confirmed LMDR; wider sampling in 1C reached 96.887830% dominant LMDR | Microscopic through roughly 3.1% OS/R intersections in these examples did not produce a meaningful viewer split. Sampling paused. |
| LMDR/P | 5 | All confirmed LMDR, including a 50.601139% LMDR / 49.398885% P case | Human observations describe water/pond geometry or preservation context; 2A-03 remains a separate investigation. Sampling paused. |
| LMDR/MDR | 5 | 2 confirmed LMDR; 3 true splits | Minor intersections at 98.998339% and 95.696176% LMDR were not meaningful viewer splits. Cases at 69.282837%, 52.379527% LMDR and 51.216386% MDR were genuine mapped splits. |

These are selected examples, not a random validation sample, a measured citywide error rate, or a universal percentage tolerance. They demonstrate that the nature of the competing district and the actual mapped boundary matter. There is no sampled evidence establishing the precise transition between a single district and a true split.

## Preserve three distinct reference outcomes

False/technical ambiguity: the human identifies one applicable district despite the supplied diagnostic intersection. True split zoning: the human identifies both development districts materially occupying the parcel. Unresolved/uncertain: staff review is needed to establish an interpretation. True splits must not be relabeled as uncertainty or silently forced to the dominant district or address-point district. There are currently no human staff-review labels in this set; that outcome remains available.

Batch 3A raw results and notes are retained verbatim. Case 3A-05 retains the human's ordering `MDR / LMDR`. The proposed future `zoning_status: split` and two-zone representation, along with the suggested resident message and district-specific pathways, are stored only as unimplemented human architecture observations. No production schema, Supabase table, Guide, or classification changed.

## Recommended next class: LMDR versus Commercial (C)

This pair introduces a residential/commercial boundary with more distinct regulatory consequences than another residential density pair. Under a simple research selection screen (two codes only, valid diagnostic parcel/zoning geometry, no repeated same-code polygons, total diagnostic coverage 99.9–100.1%), the supplied diagnostic has 72 LMDR/C parcels, including 54 with one non-unit address. Dominant coverage spans 50.000134–99.936350%. These screens are sample-selection criteria, not a production resolver rule.

Recommend five distinct properties near 99%, 95%, 85%, 70% and 50% dominant coverage, avoiding repeated condo footprints and adjacent examples where possible. The purpose is to see whether the small-intersection observations transfer to a different development-district pair and to collect independently confirmed splits. This is a proposed next sampling class; no cases have been queued or labeled, and no generalized resolver rule is proposed.
