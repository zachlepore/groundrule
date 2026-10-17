# Rule 004 recommendation — bounded HDR + LMDR investigation

**Research recommendation only. No approval requested or implemented.** Existing Rules 001–003, notice policies, raw zoning and QA remain unchanged.

Exact definition: remaining original-REVIEW and unapproved; existing primary `HDR`; exactly the positive-area district set `HDR + LMDR`; existing HDR equals area-dominant district at ≥99% diagnostic coverage; complete summed coverage 99.9–100.1%; valid parcel and source zoning; no repeated/same-code overlap, measurement error, measured cross-code overlap >0.01 m², unsupported/unrelated source issue, human veto or conflicting confirmation; consistent representative source ID; address point inside linked parcel; no such profile hold among parcel peers. These are proposed investigation bounds, not new guidance eligibility or legal thresholds. Full observed secondary geometry remains retained even where it extends inward.

**364 addresses / 364 parcel IDs / 2 normalized identical-footprint groups** satisfy this definition. The broader exact HDR + LMDR unresolved population is 497; 133 lie outside this proposed scope. Existing primaries in the broader population: {'HDR': 487, 'LMDR': 10}. Exclusion flags overlap: {'invalid_zoning': 129, 'near_complete': 129, 'coverage_failure': 66}. A valid existing LMDR primary is excluded from this HDR scope rather than silently changed. Multi-district parcels, unsupported codes and all earlier human/source exclusions remain outside.

## Measured distribution

LMDR percent quantiles (address weighted, nearest-rank-index round): {'0': 0.094078, '25': 0.094078, '50': 0.094078, '75': 0.094078, '90': 0.094078, '95': 0.094078, '99': 0.094078, '100': 0.094078}. LMDR area m² quantiles from original diagnostic: {'0': 22.759, '25': 22.759, '50': 22.759, '75': 22.759, '90': 22.759, '95': 22.759, '99': 22.759, '100': 22.759}. These are address-weighted; repeated footprints can dominate the distribution. `rule004-summary.json` includes one-per-parcel and one-per-exact-footprint quantiles. No notice threshold is proposed on geometry alone and no 1%, 2%, 3% or 6% presentation rule is inherited.

| LMDR overlap range | Addresses | Parcel IDs | Footprints |
|---|---|---|---|
| >0–0.1% | 364 | 364 | 2 |
| >0.1–0.25% | 0 | 0 | 0 |
| >0.25–0.5% | 0 | 0 | 0 |
| >0.5–1% | 0 | 0 | 0 |


## Proposed manual QC packet and plan

| Proposed QC example (unreviewed) | Parcel ID | LMDR % | LMDR m² | Addresses sharing exact footprint |
|---|---|---|---|---|
| 880 MANDALAY AVE UNIT C-609 | 322815740740030609 | 0.094078 | 22.759 | 363 |
| 880 MANDALAY AVE UNIT N-1005 | 322815740740141005 | 0.094078 | 22.759 | 1 |

These are **new unreviewed analytical examples**, not gold cases or owner-confirmed observations. Exact footprint equivalence just reduces redundant map inspection; every distinct parcel identity and shared-land relationship still needs reconciliation. Inspect every distinct geometry group if ≤12; otherwise start with 12 stratified groups (largest address concentration, minimum/median/maximum overlap, maximum secondary area, any secondary region beyond the 1 m boundary band), extending only for contradictory findings. Current packet has 2 distinct groups. Within each multi-ID footprint check a residential unit and any commercial/common-unit address if present, source zoning boundaries and representative-point identity. Review single-property outliers separately. Do not ask the owner to review hundreds of identical maps.

Approval-supporting findings would be consistent existing HDR starting guidance, no substantive project-area LMDR region that makes HDR guidance misleading, verified shared-footprint linkage, retained LMDR details/viewer/caveats and no new contradictions. Disqualify or narrow for a real interior split, different primary applicability, density/setback implications that cannot be described safely, mismatched ownership geometry, unsupported shared-land inference or regulatory uncertainty. A percentage-only suppression policy cannot be assumed. Legal density/lot-area calculations and project location may require City interpretation even if the visible secondary strip is small.

Conditional maximum recovery is **364**; a conservative implementation commitment is **zero until manual QC and explicit owner authorization**. Successful approval of every candidate would reduce unresolved REVIEW from 17,378 to 17014, without changing original REVIEW or raw zoning. Broader residential near-complete cohorts are separate subsequent investigations.

## Reproduce

Use Node (existing GIS dependencies) and Python 3 with Shapely 2.1.2; obtain the Release directly and verify the manifest archive hash. Validated baseline artifact: https://github.com/zachlepore/groundrule/actions/runs/39030680013/artifacts/12100112777 . Use the complete PR #100 validated export, lookup SHA `cdb14957486a6665cd4367edce9136df8bf2f01053fc2c0ea62ef4ee0cbbbbb2`. The approved exporter/workflow remains the authority; no new exporter is introduced.

```sh
PYTHONPATH=/path/to/shapely python3 scripts/gis/analyze-clearwater-big-fish.py SOURCE APPROVED_EXPORT clearwater-full-gis-snapshot.zip NEW_ANALYSIS
PYTHONPATH=/path/to/shapely python3 scripts/gis/summarize-clearwater-topology.py SOURCE NEW_ANALYSIS NEW_ANALYSIS/topology-summary.json
python3 scripts/gis/report-clearwater-big-fish.py NEW_ANALYSIS NEW_REPORTS
PYTHONPATH=/path/to/shapely python3 tests/clearwater-big-fish.test.py
```

Both scripts refuse existing output directories. Input checksums and all original fields are verified; script hash/source/lookup provenance are recorded. Generated full address-level data stays outside Git; compact reports, samples and summaries are version controlled. No new approval config, UI, Supabase, deployment or merge is part of this investigation.
