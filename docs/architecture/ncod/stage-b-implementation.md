# Stage B — citywide offline source interpretation

Stage B only, based on Stage A `10036f8`. No regulatory activation, guidance approval, database writes, runtime integration or Guide changes. The interpreted-address file is an **additive sidecar**, keyed by existing source address and parcel IDs. It does not replace the validated Rule 004 lookup.

## Reconciliation

| Item | Result |
|---|---:|
| Original profiles / unique source address IDs | 63,430 |
| Existing Rule 001 / 002 / 003 / 004 approvals retained | 1,967 / 262 / 731 / 364 |
| Existing approvals total | 3,324 |
| Unapproved REVIEW retained | 17,014 |
| Unsupported source-primary addresses | 2,832 |
| NCOD source-primary / OS/R source-primary | 2,524 / 308 |
| Any mapped NCOD intersection | 2,583 addresses / 2,551 parcel IDs / 970 normalized footprints |
| NCOD secondary positive intersection | 226 addresses |
| NCOD secondary-only positive intersection | 59 addresses |
| Boundary-only NCOD contact / multiple NCOD identities | 0 / 0 addresses |
| Unexpected approved-population NCOD contact | 0 |
| New approvals / trusted evaluator facts | 0 / 0 |

All eight unsupported source-primary address / parcel / footprint partitions match the committed Rule 005 research, including **2,832 / 2,676 / 1,077** overall. Source-primary partition and complete intersection census are different denominators. A property can intersect several overlay/base combinations; subtype/base rows below are non-additive.

| NCOD | Underlying district of intersected source feature | Addresses | Parcel IDs | Footprint groups |
|---|---|---:|---:|---:|
| CRNCOD | LDR | 15 | 15 | 15 |
| CRNCOD | LMDR | 248 | 248 | 248 |
| IENCOD | HDR | 1,401 | 1,380 | 48 |
| IENCOD | I | 11 | 11 | 5 |
| IENCOD | LMDR | 565 | 564 | 564 |
| IENCOD | MDR | 244 | 243 | 23 |
| IENCOD | MHDR | 402 | 390 | 85 |

Subtype totals: **CRNCOD 257 addresses / 257 parcel IDs / 257 footprints**; **IENCOD 2,326 / 2,294 / 713**. CRNCOD has 255 primary and eight secondary intersections; IENCOD has 2,269 primary and 218 secondary. Six CR and 161 IE addresses occur in both primary and secondary sets, so these columns cannot be added.

The 59 secondary-only additions comprise **two ordinary LDR primary addresses with CRNCOD**, and **one C plus 56 ordinary HDR primary addresses with IENCOD**. Examples: 2327 CAMPBELL RD; 1735 N OLD COACHMAN RD; 205 WINDWARD PSGE; 202 WINDWARD PSGE and its separately retained unit identities. These are new census observations, **not** approval candidates or legal overlay determinations. Full membership and mapped percentages are in `secondary-ncod.json`.

## Exceptions and interpretation semantics

19,717 records have more than one source-derived base district across linked parcel intersections and primary evidence. They use `base.state: conflicting` to indicate that the sidecar cannot select one exclusive base; this includes legitimate mapped splits and does not assert that the GIS is erroneous. Among NCOD records, 1,519 have this multi-base condition, 61 have address points outside the linked parcel and one carries a nonfinal human primary-candidate hold. No NCOD geometry was repaired or erased.

Across the complete city source, 11,800 address records touch invalid source zoning polygons, 1,744 have address points outside linked parcels, 112 have no linked parcel feature, and 11,912 have incomplete geometry-based overlay inventory. Counts overlap. The 110 `address_multiple_parcels` original issues and two `address_without_parcel` issues are preserved. Source/human flags remain independent of interpretation; no newly derived flag modifies original QA.

`complete_for_source` means the frozen zoning layer was checked across all geometries for the linked parcel identity, not that legal applicability or correct legal ownership was established. Address-link/source/human holds remain visible and every new project-readiness field remains unresolved. Empty overlay arrays never assert legal absence. Every overlay legal applicability remains `unknown`, including identified CRNCOD/IENCOD.

Supplemental percentages are **planar longitude/latitude intersection-area ratios rounded to nine decimal places**, clearly named `percentOfParcelPlanar`. They do not replace original spherical/frozen diagnostic percentages, QA thresholds, prior notice policies or legal boundaries. Full frozen profile/approval hashes and source references preserve original evidence; repeated-unit footprints do not establish shared rights. Footprint groups use normalized Shapely WKB, the existing Big Fish convention.

## Implementation and output contract

- `scripts/gis/interpret-clearwater-zoning.mjs`: verifies Release/source files and latest Rule 004 artifact checksums; reconciles every original profile; validates all registered features through Stage A; joins every parcel intersection, source-primary evidence and human review; emits typed, source-only sidecars.
- `scripts/gis/measure-clearwater-zoning-interpretation.py`: pinned Shapely 2.1.2 STRtree over the **entire** frozen zoning layer. Tests all linked source parcel features, including boundary contacts; memoizes raw geometry computation without merging parcel/address identities. Invalid intersections remain uncertain/errors, never repaired.
- `scripts/gis/verify-clearwater-zoning-interpretation.mjs`: re-verifies all inputs, independently reruns geometry computation, rejoins and recomputes every interpretation, source/approval hash, exception inventory, registry, human evidence and census. Reconciles source-primary partitions with independently committed research.
- `lib/properties/types.ts`, `zoning-interpretation.ts`: only permit `originalSourceZoning: null` for genuinely missing classifications. No invented sentinel/base code; existing Stage A resolution and registry pins remain unchanged.
- `.github/workflows/clearwater-ncod-stage-b.yml`: dedicated push/manual workflow; regenerates the validated Rules 001–004 baseline using existing scripts, then tests, generates, verifies and repeats Stage B. Earlier workflows/exporters/configurations are untouched. Read-only GitHub contents permissions retained.

The eight NCOD/OSR source definitions use the unmodified exact Stage A registry. Ordinary source districts use the existing supported-district registry, with the frozen `US 19` spelling explicitly mapped to existing `US19`; no NCOD parser or speculative suffix removal is introduced.

Artifacts contain `interpreted-addresses.jsonl`, `parcel-evidence.json`, `census.json`, `exceptions.json`, `secondary-ncod.json`, `human-evidence.json`, `mapping-registry.json`, `provenance.json`, `report.md`, and `checksums.json`. Each address carries its full baseline-profile hash, complete prior-approval hash, original QA, source code and evidence references. Actual prior approval objects remain in the unchanged baseline rather than being copied into a new authorization channel. All source legal uncertainty and unavailable unpushed reviews remain unresolved.

## Reproduce and validate

Use existing frozen npm dependencies and Shapely 2.1.2. Download the permanent September 28 Release asset, then use the existing unpacker and approved Rule 004 workflow to reconstruct the pinned baseline. No expiring source Actions artifact is needed.

```sh
node --max-old-space-size=4096 scripts/gis/interpret-clearwater-zoning.mjs SOURCE APPROVED004 SOURCE_ZIP NEW_FIRST
node --max-old-space-size=4096 scripts/gis/verify-clearwater-zoning-interpretation.mjs SOURCE APPROVED004 SOURCE_ZIP NEW_FIRST
node --max-old-space-size=4096 scripts/gis/interpret-clearwater-zoning.mjs SOURCE APPROVED004 SOURCE_ZIP NEW_REPEAT
diff -qr NEW_FIRST NEW_REPEAT
```

Source archive SHA-256: `174c46ea4fca085a3ec81d443e003fa9abc0747741188bfbcc264b717af8a902`.
Baseline lookup SHA-256: `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`.
Registry canonical SHA-256 remains `fbdc5988be614857615e832b0cf4501997f699aeaf4f44973df73ff284239734`.

Tests: **186 passed** (14 Stage B JS, two geometry, 33 Stage A, 137 prior regression tests); TypeScript, targeted lint, syntax checks and workflow YAML parsing passed. Test boundary contacts, invalid polygons, missing links, unit identities, human holds, conflicting bases, multiple overlays, changed versions/evidence, no facts/approvals and non-regression. Complete repeat-export/source-rejoin evidence is recorded in the adjacent compact research validation files after execution.

## Hosted publication and Stage C decisions

The dedicated workflow publishes `clearwater-ncod-stage-b-offline-interpretation` only after verification and byte-identical full repeat outputs. Large datasets remain artifacts, not Git commits. Git pushes are available; direct GitHub REST/GraphQL reads return **Forbidden** in this environment. Public GitHub Actions HTML is accessible and can be used to observe the workflow run, job/step results and artifact publication. A push trigger alone is not evidence of successful completion; the verified run and artifact URLs are reported after observation.

Before Stage C, separately authorize regulatory implementation, establish acceptable current Code/Planning verification, and resolve the CR street-side/building-line and IE use/tract/seawall applicability questions in `evaluation-and-cards.md`. The 59 secondary-only cases require scoped applicability review before being used for guidance; they are not added to the 227-address Rule 005 cohort. Source-only base identity does not unblock cards, facts or approvals. Stage B stops here.
