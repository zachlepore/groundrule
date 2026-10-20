# Rule 004 — bounded condominium HDR guidance

Owner authorization covers only the 364 investigated address/parcel identities from commit `20d69ff`, one development at 880 Mandalay Avenue. `rule004-membership.v1.json` preserves all 364 individual identities and two exact geometry groups (363 + 1). `rule004-human-qc.v1.json` records both owner-reviewed cases and the development/beach-context product decisions without claiming legally established ownership, boundaries or development rights. Historical QC worksheets and evidence remain unchanged.

The additive offline exporter consumes the unchanged approved Rules 001–003 lookup, verifies the pinned September 28 Release/source files and all preceding export checksums, reconstructs the unresolved population, and reuses the Rule 004 source/identity/geometry QC reconciliation. The versioned approval config pins membership, source archive, prior lookup and relevant investigation, shared-site and human evidence. Source, geometry, membership or shared-site changes fail closed for reassessment. Candidate-level failures retain the preceding row and are reported; the CLI exits nonzero. No unapproved substitution is permitted.

Only `approvedPrimaryGuidance` changes for eligible exact members. Original HDR and REVIEW, all source QA, research evidence, individual parcel IDs, LMDR geometry, source polygon references and viewer access remain. HDR is non-exclusive starting guidance. This cohort's owner-reviewed LMDR boundary strip receives no prominent recommendation; there is **no reusable percentage threshold** and no legal exemption or boundary correction. Other independent notice conditions remain untouched.

Structured condominium metadata records owner visual-review association with the development and beach-area source record. The latter's OS/R and P remain separate source evidence; they are not assigned to unit zoning, nor automatically propagated as unit notices. Legal common ownership and individual development rights are explicitly unverified. Raw CU land-use code differences remain. An association/management advisory is metadata for future integration only; no resident UI, Guide, runtime or schema changes occur.

## Verified local reconciliation

| Metric | Count |
|---|---:|
| Original profiles | 63,430 |
| Original CLEAN / original REVIEW | 43,092 / 20,338 |
| Rule 001 / 002 / 003 | 1,967 / 262 / 731 |
| New Rule 004 | 364 |
| Combined approvals | 3,324 |
| Remaining unapproved REVIEW | 17,014 |
| Rule 004 prominent / non-prominent | 0 / 364 |
| Candidate failures / double approvals | 0 / 0 |
| Original zoning, QA, prior approval changes | 0 |

All 133 other exact-pair records remain excluded: 129 invalid-source geometries (66 also have coverage failures) and four existing-LMDR records. The two unmatched units and separate four-district site record remain outside Rule 004. Rules 001–003 retain their policies and prominent/non-prominent totals: 762/1205, 4/258 and 0/731.

## Reproduce and validate

Use Node 22 (hosted), frozen npm dependencies and Python 3.11 with Shapely 2.1.2. `.github/workflows/clearwater-rule004.yml` regenerates Rules 001–003 directly from the immutable Release, runs all Node and focused Python regression tests, reconstructs Big Fish diagnostics, exports Rule 004, independently verifies all 63,430 serialized records against originals and prior approvals, then repeats the export and compares every generated file before artifact publication. Permissions remain `contents: read`; there is no PR-creation job.

```sh
python3 scripts/gis/analyze-clearwater-big-fish.py SOURCE APPROVED003 SOURCE_ZIP NEW_ANALYSIS
node scripts/gis/export-clearwater-approved-rule004.mjs SOURCE APPROVED003 NEW_ANALYSIS NEW_APPROVED004 SOURCE_ZIP
node scripts/gis/verify-rule004-output.mjs SOURCE APPROVED003 NEW_APPROVED004
```

Large lookup/source data remain downloadable artifacts, never repository commits. The artifact contains the full new lookup, audit, approval config, pinned membership, human findings, complete QC geometry/evidence, preceding policy evidence, provenance and recursive checksums. The old root Rule 003 lookup is omitted from the evidence copy; its checksum and pinned Release regeneration remain available. No Supabase, production deployment or merging is authorized.
