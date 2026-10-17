# Rule 004 visual QC evidence — HDR + LMDR

Investigation only. All human conclusions are blank. Basis: Big Fish commit `1c33794`, frozen September 28 Release and the validated PR #100 approved lookup. No Rule 004 approval, notice threshold or legal finding is created.

## Reconciliation and indexed map cases

| Case | Representative | Parcel ID | Addresses / parcel IDs | Footprint m² | HDR m² / % | LMDR m² / % |
|---|---|---|---|---|---|---|
| R004-01 | 880 MANDALAY AVE UNIT C-609 | 322815740740030609 | 363 / 363 | 24192.099 | 24169.340 / 99.905922 | 22.759 / 0.094078 |
| R004-02 | 880 MANDALAY AVE UNIT N-1005 | 322815740740141005 | 1 / 1 | 24192.099 | 24169.340 / 99.905922 | 22.759 / 0.094078 |


All **364 address identities / 364 distinct parcel IDs** match the committed investigation membership hash `20b609d478773b645c6f840735c6d23de9ec129a75cebe5d789c78283529d903`. Every original field is compared across all 63,430 profiles; existing approvals remain 1,967 + 262 + 731 = 2,960, leaving 17,378 unresolved original REVIEW profiles. Every candidate retains HDR / REVIEW and `parcel_ambiguous_zoning`, with no new approval. All 11 frozen source-file and 38 approved-output checksums and the pinned Release archive/lookup hashes pass.

Indexed maps: `maps/R004-01.png` and `.pdf`, `maps/R004-02.png` and `.pdf`; 300-dpi PNGs (2550 × 3300) and vector PDF. `qc-atlas.pdf` has two pages; `contact-sheet.pdf` is one page. Full-site maps show a larger un-unitized source record as dotted grey context, actual HDR/LMDR clips in blue/orange, and its OS/R/P clips in faint green/purple. Each case includes the whole LMDR strip and a 3 × 3 m close-up, north arrow, approximate metre axes and scale bars. Source zoning outlines are blue/brown; dashed black is the unit-record footprint. No aerial imagery, survey or building/floorplan is supplied. Do not infer the legal boundary from the color fills.

## Why so many geometrically coincident parcel records?

The **frozen source itself** contains 364 separately identified parcel features, one per candidate identity, with site address `880 MANDALAY AVE`. The workflow does not join or dissolve them into a common outline. All 364 raw address `PIN_NUM` values match the unique parcel `PARCELID`; every address OBJECTID, full unit address, parcel OBJECTID, source profile parcel reference and authoritative-identifier match agrees. All address points lie inside the linked horizontal footprint. The repeated outlines therefore arise upstream in the source representation, consistent with separately identified units represented by a site-level horizontal footprint. This is an interpretation of the GIS representation, **not proof of deeded condominium boundaries, shared rights or ownership**. Unit identifiers and address points do not provide floor elevations or unit polygons.

The primary normalized footprint is repeated across 363 different parcel features. The N-1005 outlier has 49 exterior vertices including closure versus 51 in the primary group; it omits two almost-collinear western-edge vertices. Exact topological equality is false. Approximate symmetric-difference area is **0.000618898555 m²**, Hausdorff separation **0.000015490977 m**. Source coordinates and both hashes are preserved; no snapping, equality tolerance or boundary repair is applied. These differences are below map-scale visibility and do not establish a second physical site or different ownership relationship. Both diagnostic footprint areas round to 24,192.099 m², and district measurements match at recorded precision.

## Secondary LMDR morphology

Both groups intersect the same zoning features: **HDR OBJECTID 10707, source index 224; LMDR OBJECTID 10764, source index 281** (September 28 `zoning.geojson`). LMDR forms one connected narrow strip along the **southern footprint boundary**, rather than a detached interior region. Its recorded area is 22.759 m² (about 244.98 ft²), 0.094078%; HDR is 24,169.340 m² / 99.905922%. Approximate maximum LMDR inward depth from the parcel boundary is **0.553635 m**; measured LMDR area beyond a 1 m boundary band is zero for both groups. The 1 m band is diagnostic, not a notice cutoff or legal exemption. A true boundary strip can remain legally applicable. Nothing here determines whether prominent notices should be suppressed.

Original diagnostic area/percentage values are retained rather than replaced by local projection areas. Supplemental widths and tiny variant differences use an approximate local metre plane at 27.97°N; they are not survey measurements. All raw polygons/intersections are preserved in `geometries/` with source references.

## Unit-type evidence and ownership uncertainty

| Address prefix | Recorded land-use code | Addresses |
|---|---|---|
| C | 04 | 114 |
| N | 04 | 115 |
| S | 04 | 118 |
| CU | 09 | 12 |
| CU | 17 | 5 |


All 347 C/N/S-prefixed addresses carry raw code `04`; 17 CU-prefixed records carry `09` (12) or `17` (5). These are verified raw field differences; their code descriptions, legal unit types and permitted uses are **not independently confirmed**. Do not label all 364 residential units or assume CU means a particular ownership or commercial entitlement. Five parcel `SITE_CITY` values are null, while all 364 authoritative address records state CLEARWATER and have matching source identities. Those null property attributes are retained, not rewritten. Representative prompts sharing the primary geometry:

| Prompt | Address | Parcel ID | Raw land-use code |
|---|---|---|---|
| R004-01-CU09 | 880 MANDALAY AVE UNIT CU-16 | 322815740743210160 | 09 |
| R004-01-CU17 | 880 MANDALAY AVE UNIT CU-13 | 322815740743210130 | 17 |


Live verification attempts to the Pinellas parcel-layer metadata and Property Appraiser detail page returned **HTTP 403 on October 17, 2026**. Frozen property attributes contain STRAP, site/parcel identifiers and raw land-use codes, but no owners, declarations, deed descriptions, floor plans or common-area allocations. Property-level identity consistency is verified; legal ownership relationships remain unverified. No website text or code taxonomy is invented.

## Larger site record and two unresolved units — separate from both cohorts

There are **367** frozen address profiles beginning `880 MANDALAY AVE`: 364 proposed candidates plus these three records, all unresolved:

| Address | Parcel ID | Disposition |
|---|---|---|
| 880 MANDALAY AVE UNIT N-1003 | (unresolved) | Outside candidate scope: multiple parcel matches; no resolved parcel |
| 880 MANDALAY AVE UNIT S-905 | (unresolved) | Outside candidate scope: multiple parcel matches; no resolved parcel |
| 880 MANDALAY AVE | 322815740740000001 | Outside candidate scope: four mapped districts; cross-code overlap retained |


The un-unitized site record `322815740740000001` carries mapped **HDR 76.752867%, OS/R 18.778423%, P 4.396145%, LMDR 0.072679%**. Its original diagnostic and all intersections accompany the packet. It is not assumed to be legally owned in common with any candidate; no title relationship is present in the frozen schema. It does show why a tiny LMDR portion on a unit-record footprint cannot establish that all project areas or shared land are exclusively HDR. The two unmatched units remain link holds and are not added to the 364. Their raw address PINs have no exact parcel record in this frozen snapshot: N-1003 reports `322815740740141003`; S-905 reports the shorter `322815740190905`. Spatial fallback cannot distinguish coincident unit footprints. The exact source values and counts of site-address polygon features covering each point are retained in `site-context-exclusions.json`; no PIN is guessed or corrected. These three records are **not part of the 133 exact HDR + LMDR exclusions** below.

Starting guidance can mislead if it implies exclusive zoning, parcel-wide project permission, residential use rights for every unit, transferable density or entitlement over shared land. Any future interpretation must distinguish unit interior work from exterior/association/site projects and retain district evidence, original REVIEW and project-location applicability. Geometry alone cannot resolve ownership, association restrictions or density/setback calculations.

## The 133 other exact HDR + LMDR unresolved addresses

497 exact-pair unresolved addresses = **364 bounded candidates + 133 excluded addresses**. Exclusions are mutually exclusive by the reason below; secondary flags overlap.

| Primary exclusion | Addresses | Distinct parcel IDs |
|---|---|---|
| EXISTING_PRIMARY_LMDR_OUTSIDE_HDR_SCOPE | 4 | 4 |
| INVALID_SOURCE_ZONING_GEOMETRY | 129 | 58 |


Of 129 source-geometry exclusions, 123 have existing HDR and six existing LMDR; **66 also have coverage failures**, retained as secondary flags, not added again. These are future source-correction/topology research leads, not threshold-based recoveries. The four otherwise screened LMDR-primary profiles are outside the explicitly existing-HDR scope: 1630 FULTON AVE, 916 ELDORADO AVE, 803 FAIRMONT ST and 3132 SAN JOSE ST. Three have a more material secondary intersection; the fourth has near-complete LMDR. They would require a separate LMDR-specific investigation; no existing classification is changed. Complete addresses, parcel IDs, intersections and flags are in `outside-cohort-133.csv`. Total excluded parcel IDs: 62; parcel counts across reasons may overlap in general.

## Reproduction

Use existing Node GIS dependencies, Python 3, Shapely 2.1.2 and matplotlib. Keep outputs outside Git and use fresh directories:

```sh
PYTHONPATH=/path/to/shapely python3 scripts/gis/prepare-clearwater-rule004-qc.py SOURCE APPROVED_EXPORT BIG_FISH_ANALYSIS SOURCE_ZIP NEW_PREPARED
XDG_CACHE_HOME=/writable/cache PYTHONPATH=/path/to/shapely python3 scripts/gis/render-clearwater-rule004-qc.py NEW_PREPARED NEW_MAPS
PYTHONPATH=/path/to/shapely python3 tests/clearwater-rule004-qc.test.py
```

Frozen Release: https://github.com/zachlepore/groundrule/releases/tag/clearwater-gis-2026-09-28 . Validated approved baseline: https://github.com/zachlepore/groundrule/actions/runs/39030680013/artifacts/12100112777 . Big Fish address analysis is in the prior downloadable package and can be regenerated with its read-only scripts. `provenance.json` pins source/archive/lookup, scripts, input analysis, membership and library version. Prepared/render checksum manifests cover their outputs. All reviewer fields remain blank. No Rules 001–003, Supabase, Guides, UX, production or deployment changes.
