# CLR-Z-002 — approved offline LMDR + OS/R static export

The owner has approved the bounded offline scope of exactly 262 original-REVIEW addresses with existing LMDR classifications. The final exporter produces 2,229 approved guidance records across Rules 001 and 002. Rule 002 uses LMDR primary starting guidance for parcels with exactly the two distinct positive-area districts LMDR and OS/R, after source-quality and human-review exclusions. It retains OS/R and its measured coverage and provenance. It preserves original zoning/source QA and does not implement resident UI. The provisional analysis below remains preapproval evidence; the final bounded export and authorization are documented in the final section. No area-dominance cutoff applies.

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

Ten confirmed historical LMDR/OS/R cases remain regression evidence; the source-invalid 1C-03 control remains excluded. Five new owner-reported inspections are preserved verbatim in `rule002-qc-observations.json`, registered by checksum in `rule002-presentation-policy.json`. Their IDs, exact percentages and feature evidence are checked against the immutable `rule002-qc-initial.json` packet. Inspection dates were not supplied and remain null; the recording date is separate. No final rule approval or legal split determination is inferred.

R002-01 and R002-02 support LMDR primary starting guidance **with substantively meaningful secondary OS/R**, including the owner's waterfront-strip observation. R002-03–05 report negligible OS/R. These are human contextual labels, not percentage-derived legal conclusions. `secondaryOsrRelevance`, nullable `substantiveSecondaryOsr`, and exact `humanReviewReferences` preserve the distinction. Uninspected properties remain `NOT_HUMAN_ASSESSED`; no neighbor inherits a legal or contextual finding. Actual splits preventing confident primary guidance and uncertainty continue to veto proposals at every percentage.

Proposed presentation policy (version 1.1.0-provisional): OS/R **<=3%** receives no prominent notice; OS/R **>3%** recommends the contextual notice for relevant physical-project Guides. All districts, exact coverage, source evidence, source references and viewer access remain available at every percentage. This threshold never changes primary eligibility or zoning applicability and is not a legal exemption. Rule 001's separate strict >2% P policy is unchanged. No Guide/UX code is added.

Notice wording: “Part of this parcel is mapped Open Space/Recreation (OS/R). Check the mapped district at your project location and confirm applicable requirements with Clearwater before proceeding.”

`presentation-analysis.json` compares strict >2%, >3%, >5% notice counts over the same qualifying population. `human-review-regression.json` checks the five exact new observations without re-requesting inspection. The active `qc-batch.json` contains five completed records plus at most three targeted, unreviewed >3% to <=17.5% records. The initial ten-case packet remains archived; its five other unreviewed examples are not another mandatory QC batch. The sole qualifying parcel in the >3% to <=17.5% range is 3045 PIN OAK DR at 3.112170% OS/R, already confirmed gold case 1C-05. No additional inspection is needed; the report preserves that existing evidence instead of reopening it. Nearby 3412 BRAESIDE PL remains unassessed with a notice recommendation, without inventing a human observation or requesting redundant neighbor review.

The small `rule002-results` files preserve audit, completed evidence and targeted QC identities for review. Full lookup, parcel/feature evidence, source verification, incremental audit and checksums are published as `clearwater-rule002-provisional-combined`; the unchanged Rule 001 baseline is a separate artifact in the same run. Both have 90-day retention. No large GIS data is committed. No Supabase or production behavior changes.

**Five new inspections are recorded. No additional inspection was performed. Explicit final bounded-scope authorization is recorded below; merging this code does not deploy Guide or UX changes.**


## Final bounded offline approval — October 16, 2026

The owner explicitly authorized exactly 262 qualifying original-REVIEW profiles with existing LMDR primary codes and exactly LMDR + OS/R. `rule002-approval.same-code-v1.json` records the authorization, approved version, basis commit, source snapshot, evidence/implementation SHA256 pins, exclusions and strict >3% presentation policy. Rule 001 is not modified.

The provisional processor and its research objects remain immutable preapproval evidence. `export-clearwater-approved-rule002.mjs` validates those outputs and every original, then updates only `approvedPrimaryGuidance` for the authorized 262 profiles. The existing 1,967 Rule 001 approval objects are preserved exactly. Approved Rule 002 records include both mapped districts, retained OS/R coverage and viewer links, explicit non-exclusive zoning semantics, and the substantive secondary annotations/quotes for R002-01/02. Source `status`, original zoning, evaluator facts and research evidence remain unchanged.

Append this command after the reproduction chain above (fresh approved output directory):

```bash
node scripts/gis/export-clearwater-approved-rule002.mjs "$RULE002_SOURCE" "$RULE002_OUTPUT/rule001-approved" "$RULE002_OUTPUT/provisional" "$RULE002_OUTPUT/approved"
```

The exporter first runs the independent existing provisional/source verifier, reconciles exactly 63,430 profiles / 2,229 approved guidance records (1,967 + 262), verifies 4/258 OS/R notices, all 94 exact-pair and 173 additional-district exclusions, known human exceptions, zero original changes, and zero Rule 001 approval changes. Every serialized final row is read back against its frozen original and approved contract, and every output checksum is verified. Rule 001's 201 changed-code and one unclassified proposal remain pending. No new manual QC or zoning resolver is introduced.

The workflow publishes `clearwater-approved-rules-001-002-static-lookup` with the complete lookup, approved audit, both approval configs, original research inventories, human evidence, source verification and checksums (90-day retention). The provisional combined artifact remains separately available as preapproval evidence. No large data is committed and no Supabase, production Guide or UX changes are included.

The approved artifact's `remaining-review-population.json` partitions all 18,109 remaining REVIEW profiles using existing verified diagnostics. It makes no new zoning assignments. MDR + OS/R has 736 remaining REVIEW addresses, 733 passing the existing geometry/coverage/profile-issue screen, the largest such screened population. It is the recommended next cleanup class. These are descriptive diagnostic counts, not automatic eligibility or approved recoveries; no next rule is implemented here.
