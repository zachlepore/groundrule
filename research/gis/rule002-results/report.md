# Clearwater Rule 002 — LMDR + OS/R candidate

**NOT APPROVED.** Snapshot clearwater-gis-2026-09-28. Source -> regenerated approved Rule 001 -> provisional Rule 002. No original code, source GIS QA, approved Rule 001 field, Guide, UX or Supabase changes.

## Proposed interpretation and exceptions

Exactly two positive-area districts, LMDR and OS/R, can receive proposed LMDR primary guidance after existing quality and human-review safeguards. Retain OS/R, every original intersection, exact six-decimal diagnostic percentages, zoning feature IDs/indices and source hashes. No area-dominance cutoff. No legal exemption. Any P or other district, invalid/missing geometry, source error, coverage outside 99.9–100.1%, repeated/overlapping polygons, unrelated profile/jurisdiction issue, duplicate identity, true split, uncertainty or contradictory review blocks a proposal. Parcel/profile failures conservatively exclude all addresses on that parcel.

## Verified population and mutually exclusive address counts

| Measure | Parcels | Addresses |
|---|---:|---:|
| Exact LMDR + OS/R pair | 352 | 356 |
| Qualifying candidate | 259 | 262 |
| Exact pair excluded | 93 | 94 |
| LMDR + OS/R with additional districts (excluded separately) | 120 | 173 |

Exact-pair source QA: 0 CLEAN / 356 REVIEW. Across the entire exact-pair population, 348 existing primaries already match LMDR, 8 require a different code, and 0 are unclassified. Existing code distribution: {"LMDR":348,"OS/R":8}. Different-code records outside the qualifying set remain excluded, not code-change proposals. Eligible categories below are mutually exclusive; CLEAN rows never count as REVIEW recovery.

| Original QA / existing primary | Addresses |
|---|---:|
| REVIEW already LMDR | 262 |
| REVIEW different code | 0 |
| REVIEW unclassified | 0 |
| CLEAN already LMDR | 0 |
| CLEAN different code | 0 |
| CLEAN unclassified | 0 |

**Potential net incremental REVIEW recovery: 262. Actual newly approved Rule 002 records: 0.** Already approved Rule 001 overlap: 0. Combined currently approved guidance: 1967; combined potential after separate Rule 002 approval: 2229. Total citywide addresses: 63430. REVIEW still unresolved if every qualifying Rule 002 proposal were separately approved: 18109. No approval is implied by these hypothetical totals.

## Exclusions

- coverage_outside_99.9_to_100.1_percent: 11 parcels / 11 addresses
- unrelated_source_profile_issue: 8 parcels / 8 addresses
- invalid_zoning_geometry: 81 parcels / 82 addresses

Reason counts can overlap. exclusionCombinations in audit.json partitions the excluded population without double counting. Additional-district cases, including 70 with P, are separate from the exact-pair denominator; they never receive Rule 002 proposals.

## Human evidence and limits

Existing confirmed LMDR/OS/R gold cases: 10; supported eligible predictions: 9; interpretation contradictions: 0; gold quality exclusions: 1. 1C-03, 1400 W VIRGINIA LN, remains excluded for invalid_zoning_geometry despite its confirmed LMDR human label. Prior evidence is mostly LMDR-dominant and does not establish that large OS/R shares are harmless. 10 new independent QC parcels are selected by coverage, code mismatch and geographic separation, with pending human outcomes. No repeated inspection of gold cases is requested. Qualifying OS/R coverage ranges from 0.000333% to 30.946006%. There are 0 qualifying changed/new-code records; no such QC case is fabricated when that count is zero.

## OS/R contextual notice recommendation (pending QC)

Recommend a brief physical-project notice for mapped OS/R intersections, without inheriting the P 2% cutoff: “Part of this parcel is mapped Open Space/Recreation (OS/R). Check the mapped district at your project location and confirm applicable requirements with Clearwater before proceeding.” This is a proposed presentation policy, never an eligibility test or legal exemption. The current evidence does not justify suppressing OS/R by percentage; defer any suppression cutoff. Minimum fields: retained OS/R code, exact percent, source feature IDs/indices, parcel ID, snapshot ID/source hashes and official-viewer link. No UI is implemented. Rule 001 retains its separate strict >2% P prominence policy.

## Audit and reproduction

0 original zoning changes; 0 original QA changes; 0 changed Rule 001 evidence/approval objects. Rule 001 prominent/non-prominent notices remain 762/1205. Original profiles and source references are deeply compared with all 63430 frozen originals. Supplemental intersections screen only address-linked parcel boxes intersecting both LMDR and OS/R source boxes; existing frozen diagnostics are reused. 3641 missing diagnostics were measured; 0 supplemental parcels have measurement errors and remain in the evidence inventory. The numerical positive-area floor is the existing >0.000001 m² diagnostic convention, not a policy cutoff. Geometry validity is the existing Turf diagnostic, not a new topology guarantee.

Only address-linked parcels have authoritative Clearwater membership; neighboring/unaddressed raw parcels are outside the city address denominator. 660 such raw parcels passed the bounding-box screen, without being asserted to be Clearwater or positive-area pairs. Complete exact-pair and additional-district evidence, per-address incremental audit, lookup and hashes are downloadable workflow artifacts. Large GIS outputs are never committed. Five unavailable Batch 5A reviews are not inferred or used.

Run the dedicated clearwater-rule002 workflow, which downloads the permanent release directly, validates its pinned archive hash, regenerates Rule 001 and its approved export, then runs Rule 002 into a new directory. Optional local Rule 002 measurement reuse requires identical source hashes, algorithm hash and exhaustive screened IDs, and contains no prior classifications. **Stop for human QC; do not promote or merge Rule 002.**
