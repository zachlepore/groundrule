# Clearwater Rule 003 — approved bounded offline static export

The owner approved up to 731 investigated original-REVIEW profiles with existing MDR primary codes and exactly MDR + OS/R. Approval is conditional on retained source/QC/human checks. This implementation does not change the investigation, original classifications, Rules 001/002, Supabase, production runtime, Guides or resident interfaces. It does not authorize deployment or merging.

`rule003-approval.bounded-v1.json` records authorization, version, September 28 source/archive hashes, investigation basis `c83bf91`, evidence pins, exclusions and the approved notice text. `rule003-membership.v1.json` pins all 884 investigated identities in four mutually exclusive categories: 731 candidates, two address-link holds, three unsupported OS/R-primary addresses and 148 additional-district addresses. The allowlist is not inferred from a target count; an equal-count address or parcel substitution fails reconciliation.

The read-only investigation is rerun against the freshly regenerated Rules 001/002 baseline. All source metadata/hashes/counts and original profiles are verified, all 149 exact-pair parcel IDs are remeasured, missing diagnostics are screened, registered human evidence is loaded, and the complete inventory must match its investigation checksum. Rule 003 rechecks each allowlisted record and parcel, including geometry/coverage/identity/profile flags, additional districts, human exceptions, address/representative-point evidence, cross-code overlap and strictly positive OS/R. Failed candidates remain unresolved with explicit reasons; they cannot be replaced with other addresses. Outputs are written before a nonzero exit if any candidate fails.

The exporter modifies only `approvedPrimaryGuidance` for passing members. Original REVIEW and MDR codes, research evidence, source references, GIS QC and all preceding approvals are retained. Original geometry and OS/R measurements accompany the lookup in `investigation/`; `rules001002-baseline/` preserves the complete verified preceding export, separate approval configs, evidence, checksums and provenance. Its remaining-population file describes that preceding baseline; the new root audit/report gives the current remaining REVIEW count.

Every strictly positive OS/R intersection receives the owner-approved contextual notice recommendation in relevant physical-project contexts, with presentation threshold >0%. No 2% or 3% threshold is imported. The metadata explicitly says MDR is non-exclusive starting guidance, OS/R does not automatically govern the entire parcel, and shared-land rights, density calculations, boundary disputes and project-specific applicability remain unresolved. No uninspected area is labelled negligible or human-confirmed. The notice is metadata for future integration only.

The dedicated `.github/workflows/clearwater-rule003.yml` downloads the permanent Release asset, verifies its archive, regenerates Rule 001 and Rule 002 unchanged using their established processors/exporters, and then runs the bounded Rule 003 exporter. It uses read-only repository permissions, has no PR-creation job, and publishes `clearwater-approved-rules-001-002-003-static-lookup` with 90-day retention. Tests and every inherited processing/validation/artifact step are preserved; the prior workflow is unchanged.

Reproduce after the established Rule 002 source-to-approved chain:

```bash
node --test tests/clearwater-rule00*.test.mjs tests/clearwater-gis-pilot.test.mjs tests/clearwater-gis-full.test.mjs
node --max-old-space-size=4096 scripts/gis/export-clearwater-approved-rule003.mjs \
  "$FROZEN_SOURCE" "$APPROVED_RULES_001_002" "$NEW_RULE003_OUTPUT" "$VERIFIED_RELEASE_ZIP"
```

The exporter requires fresh output and validates source/config/evidence/output hashes. It reads back all 63,430 serialized rows and compares them with the in-memory export, after comparing all original/research fields and prior approvals with the baseline. Its read-only investigation independently compares all originals with the frozen source. Checksums cover every output file recursively, including the baseline and original geometry inventories; provenance records the current exporter digest and all three approval policies.

Local validation: 73 tests passed. All 731 candidates passed; 1,967 Rule 001 + 262 Rule 002 + 731 Rule 003 = 2,960 approvals, 17,378 still REVIEW. Zero double approvals, original code/QA/research changes, changed preceding approvals or excluded Rule 003 approvals. Notices: Rule 001 762 prominent / 1,205 non-prominent; Rule 002 4 / 258; Rule 003 731 / 0. Holds/exclusions retained: 2 / 3 / 148. Hosted run evidence is supplied in the PR and completion report; local validation alone is not a hosted-success claim. Large generated GIS outputs remain outside Git.
