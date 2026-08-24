# Clearwater property-specific fence guide V1

## Product principle

Groundrule now defaults to **answers before questions**. The ordinary resident path is address → project choice → useful guide. A resident is asked for a fact only in the optional design check, when that fact cannot reasonably come from trusted property data and is needed to evaluate a proposed fence.

## Primary interaction flow

At `/clearwater/fence`, the resident enters an address. The server accepts only an exact, trusted CLEAN Clearwater pilot match. The page confirms the human-readable address without parcel, zoning, GIS, source, or evaluator diagnostics. The only available project is honestly shown as “Build or replace a fence.” Selecting it opens the guide immediately; height, material, and location are not prerequisites.

For the canonical test, `1950 DREW PLZ` resolves from the stored property lookup and supplies `property.zoning_district = "lmdr"`. The latest resident update is present as `20260824000002_update_clearwater_resident_fence_rules.sql`.

## Guide-generation architecture

`buildClearwaterFenceGuide` is a small, pure presentation/domain layer downstream of the existing evaluator. It receives trusted facts and the evaluator result, selects only supported resident topics, reads legal measurements and presentation asset identifiers from structured outcomes, and carries each rule's citations onto its guide item. Jurisdiction-specific wording is kept in this guide adapter rather than React; regulatory thresholds are not embedded in UI components.

The deterministic evaluator, three-valued conditions, conflict behavior, question planner, municipal schema, migrations, and GIS artifacts are unchanged. Unknown rules can support carefully worded conditional options; they never become an automatic “allowed” conclusion merely because no prohibition matched.

## Resident sections

### WHAT YOU CAN DO

This section presents useful supported options such as ordinary front and side/rear limits. Conditional qualifications remain visible. Topics without useful structured support are omitted rather than padded with generic advice.

### BEFORE YOU BUILD

Matched result-only duties explain the permit, applicable plan/review path, and final inspection using stored outcome messages. The resident is not asked whether a permit or inspection already exists.

### CHECK THIS

This section holds conditions the stored profile cannot locate safely, including the sight-visibility area. It uses ordinary language and asks the resident to confirm exact applicability with Clearwater; internal evaluator states never appear.

## Optional refinement

“Check my fence” deliberately sits after the full guide. It preserves the live question planner and evaluator for a resident with a proposed location, height, and material. It is never opened automatically and is not required to read the primary guidance.

## Sight-visibility explanation

The React component draws an original, minimal inline SVG of a street, driveway, and shaded triangular clear-view area. It is enabled only by the structured `clearwater_sight_visibility_triangle_v1` asset identifier. Both 20-foot legs, the non-opaque requirement, and 30-inch maximum are interpolated from outcome parameters. The caption states that the drawing is explanatory and that Clearwater must confirm the exact location.

## Citations

Each substantive guide item retains its rule citations. The UI shows the source title and section and, when the stored citation has a URL, a restrained “View official rule” link. It does not show database identifiers or long source excerpts.

## Mobile and visual behavior

The single-column guide uses large type, generous spacing and touch targets, navy/near-black text, restrained green, and neutral borders. At phone widths the address form stacks, the diagram scales to its container, and the optional-check panel reaches the viewport edges without creating a desktop dashboard.

## Pilot limitations and remaining work

Only trusted CLEAN addresses in the stored Clearwater pilot are supported. The canonical property currently contributes zoning, not proposal geometry, waterfront status, easements, frontage classification, or official decisions. Supabase or rule-loading failures receive a simple retry message. The guide is planning help, not a permit or approval. Additional guide topics should be added only when structured data supports concise, honest resident guidance.

## Abi validation recommendation

- Route: `/clearwater/fence`
- Canonical address: `1950 DREW PLZ`
- Sequence: enter address → Continue → Build or replace a fence → read guide; optionally choose Check my fence.
- Validate that the answer feels immediate, the three sections are understandable without regulatory literacy, source links feel available but quiet, and the visibility diagram is legible on an iPhone.
- Keep in mind that pilot coverage is limited, exact fence geometry is not automated, and the optional detailed check may still surface City-confirmation needs.

READY FOR ABI VALIDATION
