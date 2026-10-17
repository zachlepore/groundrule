# Rule 003 manual QC and presentation sensitivity

Evidence preparation only. This work does not change any approved classification or notice policy. The 731 original-REVIEW/existing-MDR members and 146 authoritative parcel IDs are reconciled with the pinned investigation allowlist and verified offline three-rule export before sampling. The current strict >0% OS/R notice recommendation remains intact. All 2 address-link holds, 3 unsupported OS/R-primary addresses and 148 additional-district exclusions remain outside this cohort.

Reproduce with Node and the existing frozen September 28 Release source and verified approved three-rule export:

```bash
npm ci --cache "$QC_WORK/npm-cache"
node --test tests/clearwater-rule00*.test.mjs tests/clearwater-gis-pilot.test.mjs tests/clearwater-gis-full.test.mjs
node --max-old-space-size=4096 scripts/gis/prepare-clearwater-rule003-qc.mjs \
  "$FROZEN_SOURCE" "$APPROVED_RULES_001_002_003" "$FRESH_PREPARED_OUTPUT"
MPLCONFIGDIR="$QC_WORK/matplotlib-cache" python3 scripts/gis/render-clearwater-rule003-qc.py \
  "$FRESH_PREPARED_OUTPUT" "$FRESH_REVIEW_PACKAGE"
```

The renderer requires matplotlib; input/output directories must be separate and fresh. Reconstruct missing source/export inputs with `unpack-rule001-release.py` and the unchanged source-to-approved chain documented in `../clearwater-rule003-approved.md` and `.github/workflows/clearwater-rule003.yml`. The package was generated after rerunning that full chain locally, not from invented or changed approvals.

The preparer verifies all source hashes, recursively verifies every approved-export checksum, compares all 63,430 originals with frozen profiles, pins the approval config and all 731 address/parcel identities, then checks the exact 1,967 / 262 / 731 approval counts. It retains raw diagnostic warnings, original REVIEW flags, registered eligibility flags, all addresses, parcel and zoning geometry. Sampling is deterministic: 5 / 2 / 2 / 5 / 0 / 5 / 6 / 0 parcel IDs across the requested percentage bands, totaling 25. Duplicate footprints are removed only from sample selection using exact coordinate/ring/polygon canonicalization; source parcel identities and all full-population counts remain unchanged. A separate six-decimal bounding-box context key avoids near-identical unit-footprint panels in the sample only; this is a sampling aid, not a topology or ownership determination. Empty bands are reported, not filled.

Maps show faint surrounding source zoning, solid actual parcel intersections, source parcel boundaries and address points. Each full map and selected 20 m OS/R edge detail has a metre scale bar and north arrow. Map axes use a local approximate equirectangular conversion, not survey coordinates. Areas use frozen Turf measurements converted to international square feet. Polygon outlines improve visibility and do not represent measured strip widths. No aerial, land-use, tenure, hydrology or current legal boundary verification is inferred.

Generated deliverables (kept outside Git): indexed contact sheet, 26-page detailed atlas, individual vector PDFs and 250-dpi PNGs for 25 cases, blank review worksheet CSV, case index, full-population CSV, sensitivity tables, area distribution, percentage-suppression outliers, illustrative combined percentage/area tables, decision report, complete prepared JSON and provenance/checksums.

Percentage thresholds are hypothetical strict >0, >0.5, >1, >2, >3 and >5%. Combined examples retain a notice when percentage > threshold OR absolute area > threshold; none is adopted. The 250 sq ft outlier marker and 100/250/500/1,000 sq ft illustrative area guards are analysis choices, not statutory or approved significance thresholds. Human QC and notice-decision fields remain blank. Small intersections may be real, applicable zoning boundaries.

Review the large-denominator/large-area properties first, then available cases nearest threshold boundaries and all >3% cases. There are no eligible >2–3% or >10% cases. Actual use, project location, waterfront context, shared-land rights and boundary interpretation require human/City evidence. No final notice threshold is selected or implemented.
