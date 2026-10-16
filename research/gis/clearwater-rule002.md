# CLR-Z-002 — LMDR + OS/R (provisional)

Rule 002 proposes LMDR primary resident guidance for parcels with exactly the two distinct positive-area districts LMDR and OS/R, after source-quality and human-review exclusions. It retains OS/R and its measured coverage and provenance. It does not approve a rule, change original zoning/source QA, or implement resident UI. No area-dominance cutoff applies.

This branch starts from `d3be944` on main, after PR #97 merged. All Rule 001 implementation, configuration, human evidence, tests and workflow files remain unchanged. Rule 001's 1,967 approved same-code REVIEW addresses and its strict >2% P notice policy are preserved. Rule 002's disjoint exact-pair scope excludes all P intersections and every third code. A conflict with an approved Rule 001 record fails the run.

## Reproduction

Run the **Clearwater Rule 002 provisional LMDR OSR** Actions workflow on this branch. It downloads `clearwater-full-gis-snapshot.zip` directly from the permanent September 28 release, validates the pinned archive SHA256 and all source metadata/files/counts, regenerates Rule 001 from source, and produces its existing approved static export before applying Rule 002.

Local equivalents (Node 22, `npm ci`, source unpacked by `unpack-rule001-release.py` into `$RULE002_SOURCE`, fresh output directories):

```bash
node --test tests/clearwater-rule00*.test.mjs tests/clearwater-gis-pilot.test.mjs tests/clearwater-gis-full.test.mjs
node scripts/gis/clearwater-rule001.mjs "$RULE002_SOURCE" "$RULE002_OUTPUT/rule001-provisional"
node scripts/gis/verify-rule001-output.mjs "$RULE002_SOURCE" "$RULE002_OUTPUT/rule001-provisional"
node scripts/gis/export-clearwater-approved-rule001.mjs "$RULE002_OUTPUT/rule001-provisional" "$RULE002_OUTPUT/rule001-approved" "$RULE002_SOURCE"
node scripts/gis/clearwater-rule002.mjs "$RULE002_SOURCE" "$RULE002_OUTPUT/rule001-approved" "$RULE002_OUTPUT/provisional"
node scripts/gis/verify-rule002-output.mjs "$RULE002_SOURCE" "$RULE002_OUTPUT/rule001-approved" "$RULE002_OUTPUT/provisional"
```

Optional measurement reuse is limited to numerical intersections with matching exhaustive screened parcel IDs, source hashes and measurement algorithm hash. It never reads prior Rule 002 classifications. Rule 001's existing optional immutable measurement cache is unchanged. Never start with an old derived lookup in place of source regeneration.

## Contract and safeguards

The complete `clearwater-combined-address-lookup.jsonl` contains all 63,430 original profiles, unchanged `researchRule001` and `approvedPrimaryGuidance` objects, and a separate `researchRule002` object. Source GIS `status` and `zoningCode` stay unchanged. Rule 002 is always `NOT_APPROVED`, `productionEligible: false`, and `PENDING_QC` or excluded/not applicable. `potentialIncrementalReviewRecovery` is hypothetical and excludes original CLEAN records and prior approved guidance.

`rule002-incremental-audit.jsonl` includes only analyzed LMDR/OS/R parcels, including separately flagged additional-district exclusions. `audit.json` partitions original CLEAN/REVIEW, same/different/missing primary codes, eligible/excluded records and net recovery. Exclusion combinations are mutually exclusive; individual reason counts may overlap.

The population is independently screened over all address-linked parcels, using both LMDR and OS/R source bounding boxes. Frozen full-city exact diagnostics are reused; missing measurements use the same Turf intersection/validity and >0.000001 m² numerical floor as Rule 001. A bounding-box hit is never considered a positive-area district. This is a limited diagnostic, not a topology resolver. The diagnostic 99.9–100.1% total-coverage tolerance is a quality check, not a dominance or legal threshold. Repeated polygons are excluded rather than unioned. Duplicate parcel identities, invalid geometry, source/coverage issues, unrelated profile/jurisdiction issues, human splits, uncertainty and conflicting codes veto a proposal conservatively for the whole parcel.

Only address-linked parcels have confirmed Clearwater membership. Unaddressed/neighboring raw parcels are not silently added to the city denominator. Original frozen intersections, source references and full supplemental feature evidence remain available in the artifact. Diagnostic percentages retain the existing six-decimal precision; source geometry remains authoritative evidence, not a legal determination.

## QC and proposed notice

Ten confirmed historical LMDR/OS/R cases are regression evidence. New QC excludes every previously reviewed parcel. At most ten geographically varied independent parcels stress large/intermediate/small OS/R shares and existing-code mismatches. Human outcomes remain null. Present five at a time; do not request another inspection of confirmed gold cases. Gold agreement at mostly LMDR-dominant parcels does not validate every OS/R share.

Recommend a contextual physical-project notice for retained OS/R without adopting P's 2% policy: “Part of this parcel is mapped Open Space/Recreation (OS/R). Check the mapped district at your project location and confirm applicable requirements with Clearwater before proceeding.” This recommendation remains pending QC; no percentage suppression threshold is established and no Guide/UX code is added.

The small `rule002-results` files preserve audit and pending QC identities for review. Full lookup, parcel/feature evidence, source verification, incremental audit and checksums are published as `clearwater-rule002-provisional-combined`; the unchanged Rule 001 baseline is a separate artifact in the same run. Both have 90-day retention. No large GIS data is committed. No Supabase or production behavior changes.

**Stop for human QC before approval or merge.**
