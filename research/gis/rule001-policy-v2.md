# Rule 001 simplified Preservation policy — v2 provisional

October 14, 2026. **NOT APPROVED / NOT ACTIVATED.** This implements the requested offline proposal fields only. No source classification, production CLEAN/REVIEW status, Supabase record, Guide, or resident-facing notice changed.

## Policy and evidence

Exactly two distinct positive-area mapped districts, P and one supported non-P district, can qualify for proposed primary guidance under the existing quality safeguards. All original mapped zones, percentages, raw feature identifiers, source QA and metadata are retained. NCOD codes are never flattened. Repeated/overlapping polygons, unsupported combinations, material coverage inconsistencies, invalid/missing geometry, unrelated profile failures and source errors remain exclusions. Three-or-more districts are not simplified. Historical and newly registered true splits, staff-review / unclear-primary results and conflicting human interpretations also prevent assignment.

The completed 30-case session is now consumed by the processor, with its registered checksum and frozen case identity checksum verified. R001-14 and R001-21 are excluded for unclear primary applicability, removing 9 original-REVIEW, already-matching address proposals. R001-29 stays excluded as a true split; all five prior source-quality exceptions remain excluded. R001-17 retains candidate wording and uncertain marina context without inventing a legal confirmation. No geometry feature, shape classifier, topology engine, or GIS re-extraction was added.

The exact measured P percentage controls only an offline presentation recommendation:

- **P ≤2%:** `NOT_PROMINENT_IN_ORDINARY_GUIDES`. P remains in backend/property details and official viewer access remains required; no legal exemption is implied.
- **P >2%:** `RECOMMENDED_PHYSICAL_PROJECT_GUIDES`, using the unchanged [locked notice](../product/preservation-primary-guidance-design.md) for relevant physical work.
- **Excluded:** `UNRESOLVED_NO_PRIMARY_PROPOSAL`; the notice threshold never bypasses an exclusion or creates a primary district.

The 2% threshold is not a legal tolerance and does not change resolution counts. Exact 2%, 3%, 5% and 10% band boundaries and strict `>2%` prominence are tested without rounding coverage to whole percentages.

## Verified citywide results

The complete frozen 63,430-address population / 47,716 address-linked parcels is retained. Source metadata, all 11 source-file hashes, canonical layer hashes, human evidence hashes and full output conservation were verified. Raw unaddressed/neighboring P parcels remain separate because Clearwater membership is not established by these address sources.

Current qualifiers: **1,839 parcels / 2,498 addresses**. Potential REVIEW recovery: **2,169** (1,967 same existing code; 201 different code; 1 unclassified). Original CLEAN proposals: **329**, excluded from recovery counts. Original REVIEW records without a qualifying proposal: **18,169**. All source QA statuses remain unchanged; actual activated/guidance-ready additional addresses: **0**.

At 2%, 1,162 qualifying parcels / 1,205 addresses are non-prominent; 677 parcels / 1,293 addresses recommend the notice. All 1,205 low-P addresses are original REVIEW records already matching their proposed primary. Among higher-P qualifiers another 762 REVIEW addresses already match, while all 202 changed/new-code REVIEW proposals have P >10%. This does not make high-P proposals invalid or low-P designations legally irrelevant.

Raising the notice threshold to 3% removes prominence for only 16 additional addresses; 5% removes it for only 24. Both leave the same 2,169 conditional recovery opportunities. **Retain 2%**: these changes affect less than 1% of qualifying addresses and have no validated usability benefit. Do not choose a threshold to increase recovery counts.

The [full report](rule001-policy-v2-results/report.md) and [machine-readable analysis](rule001-policy-v2-results/policy-analysis.json) include mutually exclusive five-band counts, original CLEAN/REVIEW splits, qualifying versus excluded counts, code-change categories, per-pair populations and individual known human uncertainty/splits. Excluded hypothetical code matches are diagnostic only, never recovery opportunities. The [human regressions](rule001-policy-v2-results/human-review-regression.json) preserve historical 25 records plus all 30 session outcomes without counting repeats as independent confirmations.

## Small focused check

[Seven new properties](rule001-policy-v2-results/qc-reviewer.md) challenge the numeric boundary, 2–5% presentation tradeoff, unusually large nonresidential context, changed primary codes and large-P applicability. A geographically separated 3–5% case avoids repeating adjacent Sunset Drive properties. Four already-reviewed exclusion controls (MHDR/park, D/park, NCOD, true split) require no repeat inspection. There are no qualifying changed/new-code REVIEW addresses at P ≤2%, so that requested challenge was not fabricated. No second 30-case review project is generated.

Predictions are retained in [the audit packet](rule001-policy-v2-results/qc-with-proposals.md), separate from reviewer instructions. New observations are unanswered; old control notes remain historical evidence, not new independent confirmations. Presentation examples test whether retained details/viewer access are adequate, not whether P restrictions legally disappear.

## Reproduction and downloadable artifacts

The existing **Clearwater Rule 001 candidate and QC** workflow downloads `clearwater-full-gis-snapshot.zip` directly from the permanent [September 28 Release](https://github.com/zachlepore/groundrule/releases/tag/clearwater-gis-2026-09-28), safely unpacks the pinned archive and verifies all files, runs candidate/policy/human tests, regenerates the entire dataset and validates it, then uploads full and reviewer artifacts. No database credentials are needed. The workflow must be available on the default branch before browser dispatch; pushing this research branch does not execute or publish artifacts.

Tested local commands with existing installed dependencies:

```sh
python3 scripts/gis/unpack-rule001-release.py /path/to/source.zip /path/to/new-source
node scripts/gis/clearwater-rule001.mjs /path/to/new-source /path/to/new-output
node scripts/gis/verify-rule001-output.mjs /path/to/new-source /path/to/new-output
```

An optional third processor argument reuses immutable `supplemental-intersections.json` only when every frozen source hash, geometry-algorithm hash and screened parcel-ID list match. No previous proposed classifications are read. Current validation used this supported cache from the verified snapshot; the unchanged worker can recompute it when unavailable. Source extraction/generation refuse existing destinations.

Large `citywide-provisional.jsonl`, complete P inventory, address audit and supplemental measurements stay outside Git and in downloadable artifacts. Only small reports, metrics, regressions and the focused packet are committed. Historical v1 datasets and the original 30-case packet remain frozen.

## Proposed activation and final static lookup after authorization

Recommend keeping 2% and activating a first **same-code original-REVIEW** scope after the limited boundary/context check and explicit authorization: 1,967 addresses, including 1,205 low-P cases and 762 notice-recommended cases, without changing primary codes. Source-GIS QA remains REVIEW. The 202 changed/new-code proposals require a separately explicit scope; the 329 CLEAN proposals do not count as recovered REVIEW. Known exceptions are never swept into either scope.

After authorization:

1. Record a small approved research policy with rule version, approved scope, 2% presentation threshold, approval date/attribution, snapshot hash and human-evidence hashes. Do not infer approval from this document or simply rename a provisional status.
2. Regenerate from the original September 28 release into a new directory, consulting all registered human evidence and retaining current exclusions. Run the existing full conservation/notice/regression checks.
3. Add the separately authorized static export step. It must consume the recorded approval scope and export all 63,430 addresses, not just qualifiers: address/source identity, parcel ID, immutable original zoning/QA, approved guidance primary where in scope, complete retained zoning/P percentage, notice recommendation and approval/source/version provenance. Mark out-of-scope/exception records for review; source QA fields are never rewritten. Existing CLEAN code-change proposals cannot be adopted under a same-code-REVIEW-only authorization.
4. Reconcile the approved scope's row counts against this audit, verify all known splits/unclear decisions remain withheld, and generate checksums. Publish the full static lookup and audit as workflow or reviewed release assets, not large Git commits.

The current processor deliberately emits `NOT_APPROVED`, `productionEligible: false` and `PROVISIONAL_ELIGIBLE_AFTER_EXPLICIT_APPROVAL`. It does not implement the future approved exporter, source-QA promotion, Supabase ingestion or resident UX. Those actions require the explicit authorization and scope above.
