# Clearwater unresolved population audit

Read-only analysis of merged PR #100 (`ee1ce8a`, export implementation `77ef7fc`). No new approvals or policy changes. Frozen Release: https://github.com/zachlepore/groundrule/releases/tag/clearwater-gis-2026-09-28 . Archive SHA-256 `174c46ea4fca085a3ec81d443e003fa9abc0747741188bfbcc264b717af8a902`; approved lookup `cdb14957486a6665cd4367edce9136df8bf2f01053fc2c0ea62ef4ee0cbbbbb2`. All 11 source-file and 38 export-file checksums verified; every original field compared against all frozen profiles. Current six-percent Rule 003 output is used, not the earlier Rule 002 remaining-population file.

## Reconciliation

63,430 = 43,092 original CLEAN + 20,338 original REVIEW. 20,338 = 1,967 Rule 001 + 262 Rule 002 + 731 Rule 003 + **17,378 still-unapproved REVIEW**. All 2,960 approvals remain excluded from this analysis. Notice totals are verified: Rule 001 762 prominent / 1,205 non-prominent; Rule 002 4 / 258; Rule 003 0 / 731. Zero original-field changes or duplicate address identities. Remaining: **11568 non-null parcel IDs**, and 112 unlinked profiles with null parcel IDs (null is not a parcel). No new legal eligibility is established.

## Mutually exclusive primary accounting

| Primary cause (first matching blocker/pattern) | Addresses | Parcel IDs | % remaining |
|---|---|---|---|
| Near-complete primary with secondary intersections | 4000 | 2673 | 23.0176% |
| Unsupported classification | 2832 | 2676 | 16.2965% |
| Incomplete/excess summed coverage | 2507 | 1243 | 14.4263% |
| Material mapped multi-district / unresolved ambiguity | 2401 | 1694 | 13.8163% |
| Invalid source zoning geometry | 2354 | 1620 | 13.5459% |
| Measured cross-code polygon overlap | 1875 | 798 | 10.7895% |
| Overlapping same-code polygons | 531 | 531 | 3.0556% |
| Repeated non-overlapping same-code polygons | 492 | 134 | 2.8312% |
| Existing primary differs from area dominant | 197 | 168 | 1.1336% |
| Address/parcel link failure | 112 | 0 | 0.6445% |
| Missing primary zoning | 57 | 20 | 0.3280% |
| Human interpretation hold | 17 | 9 | 0.0978% |
| Invalid parcel geometry | 3 | 2 | 0.0173% |

**Near-complete primary with secondary intersections** — dominant combinations [['i + mhdr', 376], ['hdr + lmdr', 365], ['c + hdr', 340], ['i + mdr', 308], ['c + i + mdr', 260]]; retained flags (overlapping address counts) {'near_complete': 4000, 'parcel_peer_hold': 43, 'address_point_outside_linked_parcel': 37}.

**Unsupported classification** — dominant combinations [['hdrncodislandest + p', 726], ['hdrncodislandest', 397], ['lmdrncodislandest + p', 303], ['lmdrncodislandest', 261], ['lmdrncodcoachmanr', 228]]; retained flags (overlapping address counts) {'near_complete': 1324, 'parcel_peer_hold': 2832, 'unrelated_profile_issue': 2832, 'unsupported': 2832, 'coverage_failure': 28, 'cross_code_overlap_measured': 61, 'invalid_zoning': 18, 'repeated_code': 8, 'primary_mismatch': 173, 'address_point_outside_linked_parcel': 70, 'invalid_parcel': 5}.

**Incomplete/excess summed coverage** — dominant combinations [['p + us19', 539], ['irt + lmdr + mdr + mhdr + o', 478], ['mdr + o', 298], ['i + mdr', 196], ['c + lmdr + mdr + mhp', 170]]; retained flags (overlapping address counts) {'coverage_failure': 2507, 'near_complete': 1569, 'primary_mismatch': 5, 'address_point_outside_linked_parcel': 60, 'parcel_peer_hold': 63}.

**Material mapped multi-district / unresolved ambiguity** — dominant combinations [['lmdr + mdr', 208], ['hdr + os/r', 166], ['c + mdr', 149], ['c + hdr + p', 129], ['c + hdr', 127]]; retained flags (overlapping address counts) {'address_point_outside_linked_parcel': 107, 'parcel_peer_hold': 210}.

**Invalid source zoning geometry** — dominant combinations [['lmdr + mdr', 640], ['lmdr + mhdr', 334], ['i + lmdr', 235], ['hdr + lmdr + mdr + mhdr', 183], ['lmdr + p', 176]]; retained flags (overlapping address counts) {'invalid_zoning': 2354, 'near_complete': 1358, 'coverage_failure': 621, 'repeated_code': 271, 'primary_mismatch': 41, 'cross_code_overlap_measured': 218, 'same_code_overlap': 105, 'address_point_outside_linked_parcel': 4, 'parcel_peer_hold': 23}.

**Measured cross-code polygon overlap** — dominant combinations [['i + irt + p', 397], ['c + hdr + i + lmdr', 276], ['os/r + p + t', 245], ['mdr + p + us19', 133], ['hdr + os/r + p', 113]]; retained flags (overlapping address counts) {'cross_code_overlap_measured': 1875, 'near_complete': 1114, 'address_point_outside_linked_parcel': 23, 'parcel_peer_hold': 23, 'coverage_failure': 206, 'primary_mismatch': 10}.

**Overlapping same-code polygons** — dominant combinations [['p + us19', 361], ['i + lmdr + us19', 170]]; retained flags (overlapping address counts) {'near_complete': 170, 'repeated_code': 531, 'same_code_overlap': 531, 'cross_code_overlap_measured': 361}.

**Repeated non-overlapping same-code polygons** — dominant combinations [['i + os/r + p + us19', 265], ['c + irt + mdr', 110], ['lmdr + os/r + us19', 40], ['i + p + us19', 19], ['c + mhp', 14]]; retained flags (overlapping address counts) {'near_complete': 169, 'repeated_code': 492, 'coverage_failure': 63, 'cross_code_overlap_measured': 299}.

**Existing primary differs from area dominant** — dominant combinations [['mdr + p', 64], ['mdr + mhdr', 53], ['lmdr + mdr', 17], ['hdr + os/r', 15], ['d + mdr + o', 13]]; retained flags (overlapping address counts) {'primary_mismatch': 197, 'address_point_outside_linked_parcel': 10, 'parcel_peer_hold': 10}.

**Address/parcel link failure** — dominant combinations [['(no measured intersection)', 112]]; retained flags (overlapping address counts) {'link_failure': 112, 'missing_primary': 112, 'unrelated_profile_issue': 112}.

**Missing primary zoning** — dominant combinations [['p + us19', 37], ['(no measured intersection)', 14], ['c + mdr', 2], ['us19', 1], ['i + p', 1]]; retained flags (overlapping address counts) {'address_point_outside_linked_parcel': 46, 'missing_primary': 57, 'parcel_peer_hold': 57, 'representative_point_inconsistent': 57, 'unrelated_profile_issue': 54, 'coverage_failure': 42, 'primary_mismatch': 43, 'invalid_zoning': 1, 'cross_code_overlap_measured': 3, 'repeated_code': 1}.

**Human interpretation hold** — dominant combinations [['d + p', 8], ['c + lmdr', 3], ['lmdr + mdr', 3], ['lmdr + p', 1], ['mhdr + p', 1]]; retained flags (overlapping address counts) {'human_hold': 17, 'parcel_peer_hold': 17, 'primary_mismatch': 3, 'coverage_failure': 1, 'invalid_zoning': 2, 'cross_code_overlap_measured': 1, 'repeated_code': 1, 'same_code_overlap': 1}.

**Invalid parcel geometry** — dominant combinations [['i + us19', 2], ['c + d + i + irt + mdr + o + os/r', 1]]; retained flags (overlapping address counts) {'address_point_outside_linked_parcel': 1, 'coverage_failure': 2, 'invalid_parcel': 3, 'near_complete': 2, 'parcel_peer_hold': 2, 'cross_code_overlap_measured': 1, 'repeated_code': 1}.

Primary precedence is implemented in `primary_category`: human hold → address link → unsupported → missing primary → parcel validity → source zoning validity → supplemental topology validity → representative point → same-code overlap → repeated code → measured cross-code overlap → summed coverage → primary/area disagreement → near-complete primary → remaining ambiguity. An address with multiple failures appears once, at its first category; all original issues and secondary flags remain in the downloadable inventory. These are verified blocker/pattern categories, not proof of the legal cause of a boundary disagreement. Near-complete means existing primary equals area dominant and covers at least 99%; it is an analytical bin, not a new cutoff for approval. Parcel IDs can occur in more than one category, so parcel counts are not additive.

## Secondary mechanisms and source limitations

| Flag | Addresses |
|---|---|
| near_complete | 9706 |
| coverage_failure | 3470 |
| parcel_peer_hold | 3280 |
| unrelated_profile_issue | 2998 |
| unsupported | 2832 |
| cross_code_overlap_measured | 2819 |
| invalid_zoning | 2375 |
| repeated_code | 1305 |
| same_code_overlap | 637 |
| primary_mismatch | 472 |
| address_point_outside_linked_parcel | 358 |
| missing_primary | 169 |
| link_failure | 112 |
| representative_point_inconsistent | 57 |
| human_hold | 17 |
| invalid_parcel | 8 |


All 1,200 profiles absent from the original ambiguity diagnostic are retained. Complete supplemental intersections were attempted against frozen parcels/zoning, retaining failures; these are separately identified Shapely measurements, never silently substituted into original Turf diagnostics. Unsupported codes remain unsupported. Their original-code distribution is {'LMDR-NCOD Island Est': 565, 'LMDR-NCOD Coachman R': 242, 'HDR-NCOD Island Est': 1385, 'OS/R': 308, 'MHDR-NCOD Island Est': 266, 'I-NCOD Island Est': 1, 'MDR-NCOD Island Est': 52, 'LDR-NCOD Coachman R': 13}. The 1073 profiles whose only original issue is unsupported zoning are a discrete source-support research lead, **not** confirmed clean topology or safe base-code aliases. Full NCOD subtype and overlay obligations must survive any future resolver.

Coverage failures (secondary, before primary precedence): 3470, comprising 3117 below 99.9% and 353 above 100.1% summed coverage. Cross-code intersections >0.01 m²: 2819 addresses. A summed total near 100 can conceal an overlap and a compensating gap. `unionCoveragePercentApprox` is recorded wherever all indexed source geometry is valid. Repeated same-code and overlapping same-code flags are distinct; repeated disjoint polygons are not necessarily duplicates. No deduplication, union replacement or repair is performed. Source-wide canonical comparison found 761 distinct footprints among 761 zoning polygons: **zero exact duplicate geometry groups**. Repeated district codes therefore do not justify blindly deleting identical polygons. There are 4 Shapely-invalid zoning features (a different validity test from the original Turf flags, which remain intact). Among measured valid-source cases, 0 addresses passed summed coverage while falling below 99.9% union coverage; the theoretical cancellation concern is not asserted as a measured recovery population.

Representative-point zoning is rechecked against all frozen zoning polygons. 57 addresses disagree with exactly-one/source-ID correspondence; 358 address points fall outside their authoritative linked parcel. Neither observation proves an authoritative link wrong (units/shared land and geocoding can differ). Those addresses and their parcel peers fail the enhanced research screen. Existing human true-split/staff/unclear vetoes remain; conflicting confirmed codes are flagged separately. Five historical unpushed Batch 5A reviews are unavailable and are not inferred.

Technical vs regulatory: link failures, invalid geometries, repeated polygon identities and coverage defects are primarily technical investigation leads, but correcting them still needs authoritative evidence. Unsupported NCOD and OS/R codes mix application support and regulatory scope. Area-primary disagreements, real interior splits and human holds require regulatory/human interpretation. Near-complete-primary boundary patterns are genuinely uncertain until physical context and legal applicability are checked; technical quality is not approval.

## Citywide secondary-area distribution

Secondary is the sum of all non-area-dominant districts; it is not necessarily the secondary to the stored primary when those disagree. Multi-district rows only, with failed-source measurements retained and explicitly flagged. Percentages may exceed 100 under overlap. Missing measurements are never imputed as zero.

| Summed secondary % | Addresses | Parcel IDs | Enhanced QC-pass |
|---|---|---|---|
| >0–0.1 | 2442 | 1871 | 1177 |
| >0.1–0.5 | 4411 | 2435 | 1638 |
| >0.5–1 | 3104 | 2073 | 1207 |
| >1–3 | 2325 | 1759 | 1093 |
| >3–6 | 206 | 131 | 138 |
| >6–10 | 336 | 93 | 146 |
| >10–25 | 1996 | 1247 | 423 |
| >25–50 | 1252 | 823 | 455 |
| >50–100 | 7 | 6 | 1 |
| >100–inf | 0 | 0 | 0 |


## Systemic geometry and address amplification

9706 addresses have same-primary dominance ≥99% before exclusions; only 6278 addresses pass the enhanced technical/human/link/topology screen across all combinations. Of measured near-complete cases, 7749 addresses have all measured secondary geometry within 1 m of the parcel boundary; 587 have secondary area extending beyond that band. Other cases lack complete/valid morphology and are not labelled slivers. The 1 m band and 0.01 m² computation tolerance are investigation diagnostics, never legal tolerances or policy changes. Percentages from established Turf evidence are unchanged; approximate geometry areas use local equirectangular scaling at 27.97°N (Shapely 2.1.2). Invalid source geometries are not repaired. Tiny below-tolerance conflicts remain recorded as numeric values.

| Largest identical canonical footprint | Addresses | Parcel IDs | Combination |
|---|---|---|---|
| 2720 REGENCY OAKS BLVD | 397 | 1 | i + irt + p |
| 880 MANDALAY AVE UNIT C-609 | 363 | 363 | hdr + lmdr |
| 2620 BUTTERFLY DR | 303 | 17 | p + us19 |
| 2225 NURSERY RD UNIT 4-105 | 297 | 297 | mdr + o |
| 1099 MCMULLEN BOOTH RD | 276 | 1 | c + hdr + i + lmdr |
| 2545 NE COACHMAN RD | 265 | 1 | i + os/r + p + us19 |
| 2965 FLINT DR N | 261 | 260 | irt + lmdr + mdr + mhdr + o |
| 2625 SR 590 UNIT 2814 | 245 | 245 | os/r + us19 |
| 440 S GULFVIEW BLVD UNIT 304 | 235 | 235 | os/r + p + t |
| 3021 SR 590 | 229 | 1 | c + irt + mhdr |

Canonical normalized geometry equality identifies repeated footprints across distinct parcel IDs; it does not merge ownership or assert shared-land rights. Repeated condominiums can make one investigation unusually valuable. Regency Oaks' 397 records on one I + IRT + P parcel, for example, have measurable cross-code overlap and a substantial secondary region beyond the boundary band; they fail the enhanced screen despite passing older summed coverage. No blanket recovery is justified.

Boundary-alignment patterns are consistent with possible artifacts but do not prove survey error. No authoritative parks inventory, survey, land-rights records or current legal interpretation was supplied; proximity to OS/R is not proof of park use or misalignment. A presentation-only future policy could retain REVIEW plus non-exclusive primary guidance, all secondary restrictions and viewer access. Existing Rules 001–003 remain untouched; their notice cutoffs do not generalize automatically.

## Files and reproduction

`summary.json`, `categories.csv`, `combinations.csv`, `opportunities.csv` are compact committed summaries under `research/gis/big-fish-results/` (along with ranking, topology, notice reconciliation and Rule 004 samples). Full `unresolved-addresses.csv/json` in the downloadable analysis package retain every address ID, parcel, original classification/status, all flags, percentages, areas, polygon references and supplemental geometry metrics. `analysis-checksums.json` covers every raw analysis output. See ranking/recommendation reports for the next bounded investigation. Run the commands in the recommendation report against the pinned Release and validated approved export; fresh output directories are mandatory.
