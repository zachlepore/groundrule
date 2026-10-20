# Rule 005 — unsupported Clearwater population and ranked response opportunities

**Investigation/QC preparation only; zero new approvals.** Baseline: validated Rules 001–004 at `15ed2eb`, hosted run https://github.com/zachlepore/groundrule/actions/runs/39038131922 and artifact https://github.com/zachlepore/groundrule/actions/runs/39038131922/artifacts/12103396272 . This export is on the approved-static branch; it is **not assumed merged into main**. Latest fetched main remains the PR #100 merge.

## Exact reconciliation

63,430 original profiles = 43,092 original CLEAN + 20,338 original REVIEW. The unchanged approved scopes are 1,967 + 262 + 731 + 364 = **3,324**. Remaining unapproved REVIEW: **17,014**. **2,832** remaining addresses have the original `unsupported_zoning_code` flag (16.645116% of the remaining population), associated with **2,676 parcel IDs / 1,077 normalized geometry groups**. NCOD: **2,524 addresses / 2,492 IDs / 965 groups**. Standalone OS/R source classification: **308 / 184 / 112**. No missing primary code is inferred within this unsupported population: each has a recorded source code.

All 11 frozen source files, the immutable Release archive, all 61 approved-export output checksums, and every original field across 63,430 profiles were verified. The approved lookup SHA-256 remains `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`. Large generated data are kept outside Git. No new lookup, confidence classification or production row is written.

| Exact source primary | Addresses | Parcel IDs | Geometry groups | Unit-labelled addresses | Technical screen apart from unsupported |
|---|---|---|---|---|---|
| HDR-NCOD Island Est | 1385 | 1365 | 43 | 1349 | 1364 |
| LMDR-NCOD Island Est | 565 | 564 | 564 | 0 | 564 |
| OS/R | 308 | 184 | 112 | 132 | 76 |
| MHDR-NCOD Island Est | 266 | 255 | 83 | 203 | 227 |
| LMDR-NCOD Coachman R | 242 | 242 | 242 | 0 | 241 |
| MDR-NCOD Island Est | 52 | 52 | 19 | 51 | 51 |
| LDR-NCOD Coachman R | 13 | 13 | 13 | 0 | 10 |
| I-NCOD Island Est | 1 | 1 | 1 | 0 | 1 |


A normalized geometry group is an exact, orientation-normalized **horizontal footprint proxy**, not a surveyed legal parcel or proof of condominium/common ownership. There are 1735 unit/apt-labelled addresses and 86 footprint groups containing multiple parcel IDs. 1783 addresses belong to those shared-footprint groups. For example, HDR-NCOD Island Est's 1,385 addresses span only 43 distinct outlines; many are unit identities, not independent physical boundary decisions. Raw land-use codes, unit labels, source parcel OBJECTIDs and STRAPs are retained; no legal ownership type is invented from them. No title/declaration evidence was available.

## Measurements and technical exceptions

The original ambiguity diagnostic is reused unchanged for **1,621 parcel IDs**. Missing diagnostics are supplemented for **1,055 IDs**, requiring only **626 distinct raw-geometry computations**. The existing Turf intersection helper (historically named `measureOsrParcel`) measures **all positive-area district codes without a code filter**. It does not strip NCOD suffixes or change classifications. Supplemented evidence remains separately identified; its rounding convention is six decimals while frozen diagnostics retain their original precision. Positive-area floor is the existing 0.000001 m² convention, not a legal tolerance. A single recorded source code need not mean complete coverage.

**2534 addresses** pass the research technical screen *apart from* the unresolved unsupported-code issue; **298** have additional holds. This is not eligibility, certification or approval. Original flags remain exactly as recorded; research holds are additive. The screen permits only unsupported/ambiguity issues for research and still enforces original geometry, repeated/overlapping polygons, total coverage 99.9–100.1%, jurisdiction, authoritative identity, representative/address location and registered human holds. Parcel-peer holds propagate conservatively. Source geometry is never repaired. Supplementary point and topology observations retain explicit source/projection limitations.

| Additional research hold (overlapping address counts) | Addresses |
|---|---|
| address_point_primary_inconsistency | 175 |
| address_point_outside_authoritative_parcel | 70 |
| existing_cross_code_overlap_diagnostic | 61 |
| coverage_outside_existing_tolerance | 28 |
| invalid_zoning_geometry | 18 |
| parcel_peer_hold | 8 |
| repeated_same_code_polygons | 8 |
| parcel_geometry_quality_hold | 5 |
| nonfinal_human_primary_candidate_requires_review | 1 |


Registered human evidence within this population: [('471 PALM IS NE', ['R001-27'], ['nonfinal_human_primary_candidate_requires_review'])]. R001-27 is a **nonfinal family-level primary candidate**, not confirmation of the full NCOD subtype or legal applicability; its hold remains. No other registered true-split/staff/unclear hold was found in the unsupported subset. This is not evidence that unreviewed properties have no real splits. Five historically unpushed Batch 5A reviews remain unavailable and are not inferred. Rules 003/004 approved members are excluded before this population is reconstructed.

## Exact combination ranking

All **52 exact source-primary / mapped-combination groups** are in `combination-ranking.csv` and `ranking.json`, with separate counts, holds, source-described base, subtype, section references and current/future response readiness. They partition 2,832 addresses; geometry counts should not be treated as legal ownership counts.

| Rank | Exact source primary / mapped combination | Addresses / IDs / groups | Technical apart from unsupported | Score /100 | Volume-heavy / regulatory-heavy rank |
|---|---|---|---|---|---|
| 1 | LMDR-NCOD Coachman R / LMDR-NCOD Coachman R | 228 / 228 / 228 | 227 | 77.097 | 1 / 1 |
| 2 | LDR-NCOD Coachman R / LDR-NCOD Coachman R | 7 / 7 / 7 | 6 | 66.778 | 4 / 2 |
| 3 | LMDR-NCOD Island Est / LMDR-NCOD Island Est | 261 / 261 / 261 | 261 | 64.072 | 2 / 3 |
| 4 | HDR-NCOD Island Est / HDR-NCOD Island Est | 397 / 397 / 22 | 376 | 59.994 | 3 / 4 |
| 5 | MDR-NCOD Island Est / MDR-NCOD Island Est | 30 / 30 / 12 | 29 | 55.024 | 5 / 5 |
| 6 | MHDR-NCOD Island Est / MHDR-NCOD Island Est | 139 / 137 / 56 | 100 | 53.05 | 6 / 6 |
| 7 | HDR-NCOD Island Est / HDR-NCOD Island Est + P | 726 / 708 / 19 | 726 | 42.626 | 7 / 17 |
| 8 | HDR-NCOD Island Est / HDR-NCOD Island Est + MDR-NCOD Island Est + MHDR-NCOD Island Est + P | 135 / 134 / 1 | 135 | 41.867 | 8 / 7 |
| 9 | HDR-NCOD Island Est / HDR-NCOD Island Est + OS/R + P | 127 / 126 / 1 | 127 | 41.735 | 9 / 8 |
| 10 | LMDR-NCOD Island Est / LMDR-NCOD Island Est + P | 303 / 302 / 302 | 302 | 38.982 | 10 / 18 |


Scoring is research prioritization, not a probability of approval: address potential 20%, source confidence 15%, regulatory clarity 25%, human-QC ease 10%, card-extension ease 15%, residential-fence fit 15%. Scores are 0–5, weighted to 100. Volume = 5×sqrt(technical-screen count / 2,832), and source confidence = 5×technical-screen fraction; other scores are explicit expert judgments in the JSON. Single-code Coachman LMDR has a clear, bounded fence exception; Island Estates adds seawall/setback/use/shared-land dependencies; nonresidential OS/R/I and mixed-code parcels score lower for this residential MVP. Repeated condo footprints reduce map workload but do not remove shared-land/applicability questions.

Sensitivity uses volume-heavy 35/15/20/10/10/10 and regulatory-heavy 10/15/35/10/15/15. The exact single-code Coachman LMDR group remains **rank 1 under both**. LDR/CRNCOD is a small future sibling lead (7 single-code addresses, only 6 technically screened) and cannot be merged into the LMDR rule: its front-yard provision differs. Largest raw combination, HDR-NCOD Island Est + P (726), remains a separate overlay-plus-split investigation and receives no inherited Preservation notice threshold or code alias.

## Three internal response designations

These labels are Groundrule internal confidence designations, never municipal certification. **Currently recommended for research:** designation 1 = 0; designation 2 = 0; designation 3 = **2,832**. This is an assessment table, not a classification update. The current product adapter still rejects original REVIEW records; no ambiguous-response UI is implemented here.

- **1, certified starting guidance:** possible for a bounded cohort only after overlay-aware content/rule coverage, current-source acceptance/confirmation, technical checks, manual QC and explicit owner authorization. Base identification by itself is insufficient.
- **2, certified starting guidance with meaningful split notifier:** additionally requires a defensible primary *with its overlay provisions covered*, evidence of an actual relevant secondary mapped district and project-context review. A generic notifier cannot compensate for unsupported primary-overlay rules. An NCOD overlay alone is **not** a split between two spatial base districts.
- **3, ambiguous with known zoning information:** retain exact source label, source-described base/overlay, positive-area mapped codes and percentages **with measurement QA**, and the reason for staff review. For invalid geometry/coverage or point disagreement, describe them as source-record labels/diagnostics rather than confirmed property zoning or accurate legal acreage. Do not display a confidently derived district, permissions, frontage or numerical project answer.

The potential largest immediate response-completeness benefit is a future fact-rich ambiguous-response path for these 2,832 records, without lowering original REVIEW or certifying them. The proposed next **starting-guidance research** cohort is the narrower 227 below. These counts are different outcomes and must not be added as separate recovered properties.

## Exact Rule 005 recommendation

**Existing source code and sole positive-area combined code `LMDR-NCOD Coachman R`; 227 addresses / 227 IDs / 227 distinct footprints.** Raw original issues must be exactly `unsupported_zoning_code`, all additional source/identity/location/human checks must pass, and no generic LMDR alias is assigned. Every source description explicitly says Low Medium Density Residential — Coachman Ridge Neighborhood Conservation Overlay District; `SPECIAL=(CRNCOD)`, OBJECTID **10947**, corroborated by CDC §2-1601.C/D. The 227 recorded raw land-use codes are `01`, with no unit/apt label, but permitted residential use and street/building-line applicability still need review.

242 source-primary Coachman LMDR addresses = **227 candidates + 1 coverage hold + 14 with Institutional intersections**. The hold is **2384 STAG RUN BLVD**, parcel `072916168620001620`, measured coverage **99.818656%**; do not waive the inherited 99.9% minimum to recover it. The 14 LMDR/CRNCOD + I records require a separate split/primary review, even where I is small. Candidate combined-zone coverage is exactly 100% at six-decimal diagnostic precision; there is no independent overlay coverage percentage. Parcel-area quantiles m²: {'0': 887.842328, '25': 938.355829, '50': 1040.81076, '75': 1228.926414, '95': 1826.149791, '100': 5182.742443}.

Potential future designation-1 recovery ceiling: **227**, not a promised yield. Current certified readiness and approvals: **0**. If all gates later pass and owner approves, remaining REVIEW could be 16,787, combined approved guidance 3,551; neither change occurs here. No percentage notice threshold is proposed or imported from Rules 001–004.
