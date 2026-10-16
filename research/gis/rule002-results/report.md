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

Existing confirmed LMDR/OS/R gold cases: 10; supported eligible predictions: 9; interpretation contradictions: 0; gold quality exclusions: 1. 1C-03, 1400 W VIRGINIA LN, remains excluded for invalid_zoning_geometry despite its confirmed LMDR human label. Prior evidence is mostly LMDR-dominant and does not establish that large OS/R shares are harmless. 5 new owner-reported inspections support LMDR primary starting guidance. R002-01 and R002-02 retain substantively meaningful secondary OS/R, including the reported waterfront strip; R002-03–05 report negligible overlaps without legal exemption. Exact observations and frozen packet identities are preserved separately. 0 additional targeted inspections are requested; the other five unreviewed initial examples are archived, not another mandatory batch. No repeated inspection of gold cases is requested. Qualifying OS/R coverage ranges from 0.000333% to 30.946006%. There are 0 qualifying changed/new-code records; no such QC case is fabricated when that count is zero.

## OS/R contextual notice recommendation (proposed; final scope unapproved)

Proposed policy: OS/R <=3% has no prominent notice; OS/R >3% recommends the contextual notice for relevant physical-project Guides. Always retain both mapped districts, exact percentages, feature evidence and viewer access. The threshold changes presentation only, never primary eligibility, legal applicability or source QA. Meaningful secondary OS/R may coexist with confident LMDR starting guidance; legally applicable split zoning is not erased. Known splits preventing confident primary guidance remain excluded. Rule 001 retains its separate strict >2% P prominence policy without modification. No UI is implemented.

“Part of this parcel is mapped Open Space/Recreation (OS/R). Check the mapped district at your project location and confirm applicable requirements with Clearwater before proceeding.”

| OS/R threshold (strict >) | Prominent parcels / addresses | No prominent notice addresses | Potential incremental REVIEW recovery |
|---|---:|---:|---:|
| 2% | 20 / 20 | 242 | 262 |
| 3% | 4 / 4 | 258 | 262 |
| 5% | 3 / 3 | 259 | 262 |

The >3% to <=17.5% range contains 1 qualifying parcel / 1 address and 1 excluded parcels / 1 addresses. Of the qualifying range, 1 address is already human-reviewed and 0 are unreviewed. 1C-05 remains existing evidence; no repeat inspection is requested. Only unreviewed qualifying range parcels could require targeted inspection; quality exclusions are not reopened. See qc-reviewer.md. This is a presentation proposal, not final Rule 002 approval.

## Audit and reproduction

0 original zoning changes; 0 original QA changes; 0 changed Rule 001 evidence/approval objects. Rule 001 prominent/non-prominent notices remain 762/1205. Original profiles and source references are deeply compared with all 63430 frozen originals. Supplemental intersections screen only address-linked parcel boxes intersecting both LMDR and OS/R source boxes; existing frozen diagnostics are reused. 3641 missing diagnostics were measured; 0 supplemental parcels have measurement errors and remain in the evidence inventory. The numerical positive-area floor is the existing >0.000001 m² diagnostic convention, not a policy cutoff. Geometry validity is the existing Turf diagnostic, not a new topology guarantee.

Only address-linked parcels have authoritative Clearwater membership; neighboring/unaddressed raw parcels are outside the city address denominator. 660 such raw parcels passed the bounding-box screen, without being asserted to be Clearwater or positive-area pairs. Complete exact-pair and additional-district evidence, per-address incremental audit, lookup and hashes are downloadable workflow artifacts. Large GIS outputs are never committed. Five unavailable Batch 5A reviews are not inferred or used.

Run the dedicated clearwater-rule002 workflow, which downloads the permanent release directly, validates its pinned archive hash, regenerates Rule 001 and its approved export, then runs Rule 002 into a new directory. Optional local Rule 002 measurement reuse requires identical source hashes, algorithm hash and exhaustive screened IDs, and contains no prior classifications. **Await explicit final bounded-scope authorization; do not promote or merge Rule 002.**
