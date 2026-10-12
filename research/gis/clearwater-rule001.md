# Clearwater Rule 001 — provisional Preservation overlap

`CLR-Z-001` is a research candidate, **not an approved resolver rule**. No production classifier, database, Supabase, Guide, or resident UI changes are included.

## Completed human QC — latest assessment

The October 12 consolidation records all 30 supplied observations in [the human review session](zoning-gold/rule001-qc-observations.json), with the [updated evidence assessment](rule001-qc-assessment/assessment.md) and machine-readable [pair/scope impact counts](rule001-qc-assessment/assessment.json). This assessment is the current approval recommendation; the original packet and citywide outputs below remain frozen historical candidate evidence.

Outcomes are 2 CONFIRMED historical controls, 23 PRIMARY CANDIDATE observations, 4 UNCLEAR interpretations and 1 TRUE SPLIT. OWEN DR is also a repeat of a gold parcel, so only 27 parcels are independent new evidence; there are no new unqualified confirmations. The original 25 gold records remain intact and index the separate review session. All original quality flags and NCOD qualifiers are retained.

The recommendation is additional targeted primary-applicability confirmation followed by separately approved district-pair rules, beginning with LMDR/P as a potential scope. Conditional REVIEW ceilings are 256 for LMDR/P, 1,150 for LMDR/MDR/HDR/LDR together, and 2,178 for all existing qualifiers. None is approved; currently trusted additional addresses are zero. The P/LMDR TRUE SPLIT is excluded by the existing quality safeguards and remains a counterexample to an unconditional structural-only shortcut. Park and marina applicability requires specific review.

The approved **design direction only** for a primary Guide plus Preservation context is saved in [the locked design note](../product/preservation-primary-guidance-design.md). No resident-facing implementation is authorized. Proposed Rule 002 priorities are documented in the assessment; no additional rule or geometry feature was implemented.

The candidate generator, its frozen QC selection, and production code are unchanged by consolidation. Any later approval/promotion must explicitly consider the registered new human session; running the historical generator alone is not evidence that these observations were incorporated or that a scope was approved.

## Frozen evidence

Use the permanent [September 28 release](https://github.com/zachlepore/groundrule/releases/tag/clearwater-gis-2026-09-28), asset `clearwater-full-gis-snapshot.zip`. Do not use expiring Actions artifacts as the source. The archive SHA-256 is `174c46ea4fca085a3ec81d443e003fa9abc0747741188bfbcc264b717af8a902`. This archive hash was pinned on download; no separate publisher archive digest was supplied. Six contained files independently match the pre-existing human-reference checksums.

`scripts/gis/clearwater-rule001-source.json` pins all 11 raw file hashes and byte lengths. The processor verifies these, the canonical JSON hashes in source metadata for all three GIS layers, profile/source lineage, address identity, validation counts, and human-reference source-file hashes before processing. Expected counts are 63,430 addresses/profiles, 112,466 raw parcel features, 761 zoning features, 47,716 address-linked parcel IDs, 43,092 CLEAN profiles, and 20,338 REVIEW profiles. The raw county parcel extent includes neighbors. Only address-linked parcels have source-confirmed Clearwater membership; additional P-intersecting raw parcels are inventoried separately with unverified membership.

The five files under `zoning-gold/` were incorporated verbatim from `work` commit `1e5e45f450cdc0b8423a44025829d55ff7e64703`. All 25 human-reviewed decisions and notes remain intact. The five unpushed Batch 5A cases are not reconstructed or inferred and do not block this research.

## Candidate and exclusions

When there are exactly two distinct positive-area zoning codes, one P and one supported non-P code, propose the non-P code as **primary guidance zoning**, independently of P percentage. Preserve P and every source intersection. P remains legally substantive; this proposal does not remove Preservation restrictions or infer that P means water.

No proposal is assigned when there is invalid/missing parcel or intersecting-zone geometry, an intersection calculation error, duplicated parcel identity, nonfinite/invalid district coverage, total summed coverage outside the existing diagnostic range 99.9–100.1%, repeated same-code polygons (whether overlapping or disjoint), overlapping same-code polygons, an unsupported code/NCOD combination, an unrelated source-profile issue, unconfirmed municipality membership, a contradictory human confirmation, or a human split/staff-review label. These are conservative **candidate quality exclusions**, not approved legal or production thresholds. A multipart parcel is recorded; multipart alone does not override a human result or exclude an otherwise valid two-code candidate.

P-only parcels retain P. P plus two or more non-P codes receives no single primary proposal. Every original profile is preserved byte-for-byte at the JSON-value level, including its original zoning, status, issues, and evaluator facts; research annotations are added under `researchRule001`. No candidate is promoted to CLEAN. Eligible proposals are `PENDING_QC` and `productionEligible: false`.

Exact area evidence from the verified frozen diagnostic is reused. Supplemental intersections use the same Turf exact-area method and >0.000001 m² cutoff, with errors surfaced. An R-tree only limits polygon comparisons; this is not a new topology resolver. All raw parcel bounding boxes are screened against all P features, including CLEAN and unaddressed parcels. Missing positive-area P evidence is measured on four or fewer workers. Summed percentages retain source-polygon behavior; repeated polygons are flagged, not silently unioned. Non-P source intersections are retained when available in frozen diagnostics. A null intersection list elsewhere means not measured, not zero coverage or complete evidence.

## Browser workflow and outputs

The new **Clearwater Rule 001 candidate and QC** manually triggered GitHub Actions workflow downloads the release directly, checks the pinned archive, safely unpacks the exact expected members, runs research tests, generates full outputs, validates conservation/audit counts and all hashes, and uploads two downloadable artifacts. It uses Node 22, the existing lockfile, and no database credentials. The workflow must be present on the selected GitHub branch before it can be run. Workflow execution/publication is distinct from successful local generation.

Large files stay in runner temporary storage or outside the checkout. Download `clearwater-rule001-pending-qc` for:

- `citywide-provisional.jsonl`: the entire original address population plus separate research proposals and retained intersections where available.
- `changed-record-audit.jsonl`: exactly one audit entry per proposed address, with original classification, intersections, proposal, rule ID, reason and snapshot lineage.
- `p-parcel-inventory.json`: all detected P-area intersections, explicit exceptions, original feature IDs/percentages, and municipality membership distinctions.
- `source-verification.json` and `output-checksums.json`: pinned lineage and artifact integrity.
- `summary.json`, `report.md`, and `gold-comparison.json`: parcel/address populations, pair-specific and coverage breakdowns, exceptions, and every human-reference comparison.
- `qc-batch.json`, `qc-reviewer.md`, and `qc-with-proposals.md`: 30 distinct parcels in six groups of five. The first 25 are candidates; the last five are quality exceptions. The reviewer packet omits model proposals to reduce anchoring; the separate audit packet includes them. Waterfront evidence is attributed to earlier human notes; new waterfront/inland interpretation is left to the reviewer rather than invented from P.

`clearwater-rule001-reviewer-packet` contains just the small review/report files. Artifacts are retained for 90 days; the permanent source release remains the regeneration source. If durable derived-output preservation is later desired, publish a separately reviewed release asset; do not commit large data.

Local equivalent, for developers (the human reviewer need not use Terminal):

```sh
python3 scripts/gis/unpack-rule001-release.py /path/to/source.zip /path/to/new-source
node --test tests/clearwater-rule001.test.mjs
node scripts/gis/clearwater-rule001.mjs /path/to/new-source /path/to/new-output
node scripts/gis/verify-rule001-output.mjs /path/to/new-source /path/to/new-output
```

Both source extraction and generation refuse existing destinations. Regenerate from the verified frozen source; never patch a previous classification output. No source refresh, GIS extraction, database load, or deployment is part of this workflow.

An optional third processor argument can reuse `supplemental-intersections.json`, an immutable set of raw area measurements, **not classifications**. The source-file hashes, intersection-algorithm hash, and complete screened parcel-ID list must match. This avoids repeating valid geometry calculations while still verifying all original source files and regenerating every classification/proposal from original profiles. Keep this large observation file with the downloadable outputs, not in Git.

## First completed citywide candidate pass

The small [report](rule001-results/report.md), [summary](rule001-results/summary.json), [gold comparison](rule001-results/gold-comparison.json), and [30-case reviewer packet](rule001-results/qc-reviewer.md) are retained for review. [Proposals](rule001-results/qc-with-proposals.md) are in a separate packet. Large citywide records, exact audit records, full P inventory, and supplemental measurements stay outside the checkout and in the workflow artifact.

The verified address-linked population contains 4,779 P-overlap parcels / 7,381 addresses: 3,612 parcels / 5,157 addresses have P plus exactly one other code; 1,167 parcels / 2,224 addresses have multiple other codes; no address-linked parcel is P-only. There are additionally 336 raw P-overlap parcels without source-confirmed Clearwater address membership, including 41 P-only parcels; these are inventoried but not asserted to be Clearwater.

The [generated report](rule001-results/report.md) now partitions all 2,507 candidates into mutually exclusive outcomes:

| Original status | Code relationship | Addresses |
|---|---|---:|
| REVIEW | Already matched the proposed primary code | 1,976 |
| REVIEW | Different existing code | 201 |
| REVIEW | Previously unclassified | 1 |
| CLEAN | Already matched the proposed primary code | 325 |
| CLEAN | Different existing code | 4 |
| CLEAN | Previously unclassified | 0 |

The REVIEW resolution opportunity is 2,178 addresses: 1,976 already carried the proposed code but were still blocked by REVIEW status; 202 need a different/new primary code. The 329 original CLEAN candidates are separate and are not recovered REVIEW records. These are pending QC opportunities, not approved resolutions or promotions to CLEAN. Do not add the already-matched REVIEW subset to the REVIEW total again.

Preservation validation re-downloaded the permanent release, checked its pinned archive and file hashes, and regenerated into a new output directory using source-matched immutable supplemental measurements. The complete candidate dataset, address audit, P inventory, gold comparison and existing QC packet are byte-identical to the prior outputs; only reporting and provenance changed. The workflow recomputes supplemental measurements from the release when a cache is absent. No manual decisions have been inferred or candidate conditions changed.

After exclusions, 1,841 parcels / 2,507 addresses receive PENDING_QC proposals: 2,178 were originally REVIEW and 329 CLEAN. The other 60,923 address records receive no proposal. Every original classification/status is unchanged; 18,160 original REVIEW records still have no candidate and all 2,507 proposals still need QC. Compared with original zoning values, 2,301 proposals have the same code, 205 have a different code, and one was previously unclassified. Proposal counts therefore are not claims that 2,507 zoning-code values changed.

Of the P-overlap addresses, 643 were CLEAN and 6,738 REVIEW. All five structurally applicable reviewed P cases agree with the non-P prediction, but OWEN DR is excluded for its coverage gap, leaving four eligible gold agreements. All four known true splits and the staff-review case retain their original outcomes. The new 30-case packet contains no new human decisions and does not approve any pairing. Its sampled addresses are at least 258 metres apart; known waterfront and interior-pond repeats are explicitly attributed and are not counted as new independent evidence.

Current-machine validation passed six candidate/exclusion/QC tests, 15 existing GIS regression tests, research-script lint, safe archive extraction, and full-output validation of all 63,430 retained profiles, every audited proposal, all output/source hashes, and 30 distinct unlabelled QC cases. This is local validation. GitHub API access returned proxy CONNECT HTTP 403, so the remote workflow was not dispatched and no hosted Actions artifact is claimed.

## Human decisions and later approval

Present five cases at a time. Record only explicitly supplied results and notes, exactly, in the existing `zoning-gold/reference-dataset.json`, with reviewer attribution/date, official-viewer method, source hashes and diagnostic evidence. Unanswered cases remain unlabelled. Compare every response against the recorded hypothetical proposal. Keep a true split distinct from staff review, and do not overwrite prior decisions.

After review, recommend accepting, narrowing, or rejecting CLR-Z-001. Separate pair-specific subrules if evidence differs; leave insufficiently reviewed classes in REVIEW. Only explicit approval authorizes an approved research-rule configuration in Git and a fresh regeneration from the original release. Production import or classifier/Guide changes remain separately unauthorized. No other ambiguity rule is implemented here.
