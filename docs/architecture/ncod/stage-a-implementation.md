# Stage A implementation evidence

Stage A only; based on `05b5fe9`. The architecture remains the roadmap; this file records what is actually implemented. No Stage B profile generation, runtime integration, rules, migrations or approvals.

## Files and public API

- `lib/properties/types.ts`: additive `ZoningEvidence`, `InterpretedBaseZoning`, `InterpretedOverlay`, `ZoningInterpretation`. Existing `StoredPropertyProfile`, facts and resolution types are unchanged. Base is a discriminated identified/unknown/conflicting union. Overlay identity, legal applicability and inventory completeness are separate. All project readiness values are unresolved/ambiguous only; approval IDs/ready states are not accepted.
- `lib/properties/zoning-interpretation.ts`: pure, synchronous Node helpers; depends only on Node crypto, types and the reviewed JSON registry. No database, network, evaluation or resident request dependencies.
- `research/gis/clearwater-ncod-mappings.v1.json`: eight exact entries, 102 source polygon identities with ZONING/ZONING_DESC/SPECIAL and complete feature hashes; snapshot/archive/zoning-file/regulatory-evidence pins, registry version and citations. OS/R is explicitly a district without an NCOD mapping.
- `tests/zoning-interpretation.test.ts`: focused contract/adversarial tests.
- `tests/fixtures/clearwater-ncod-source-features.json`: eight small, unchanged representative frozen features, one per entry (48 KiB); not a generated citywide dataset. All other polygon hashes were separately checked against the frozen source.

Exports:

| Function | Contract |
|---|---|
| `canonicalZoningJson` / `zoningEvidenceHash` | Deterministic sorted-key JSON / SHA-256; array order retained; non-JSON/nonfinite/undefined/sparse inputs rejected. Uses ECMAScript JSON numeric representation, not a claim of RFC 8785 implementation |
| `validateZoningRegistry` | Asserts exact reviewed registry canonical hash. Modified content, even under the same caller-supplied version, is rejected. New versions require code review/pin update |
| `getClearwaterZoningRegistry` | Returns validated defensive copy |
| `resolveExactZoningMapping` | Checks exact jurisdiction, snapshot, registry version, archive and layer hashes, raw code, polygon ID/attributes and full feature hash; returns identified / unsupported / conflicting. No prefix/suffix parsing |
| `validateZoningInterpretation` | Strict structural assertion, rejects missing/extra fields and guidance-ready/approval/fact payloads; validates hashes, evidence, distinct overlay identities and state-specific fields. Structural validation does not verify a legal assertion |
| `validateInterpretationRegistryCompatibility` | Adds pinned registry/source/version and identified base/source-overlay compatibility checks. Does not assert that external legal evidence is true or overlay inventory complete |
| `interpretSourceZoning` | Single-feature metadata construction only; preserves raw source code, copies holds, identifies source base/overlay, always leaves inventory unknown and legal applicability unknown; fence readiness unresolved. No trusted facts or approvals |

`profileEvidenceSha256` in a constructed document hashes the supplied source-mapping context (including the complete source feature); it does not claim that a complete address profile was provided. `spatialEvidenceRef` and `sourceQaRef` are references supplied by an offline caller; neither grants trust or overrides holds. Full parcel/profile joins belong to Stage B.

An OS/R result has no overlay records but retains **unknown** overlay inventory. An empty array never proves absence. Externally supplied explicit absent/verified applicability requires separate evidence; representability does not authorize guidance. Multiple overlay types and conflicting bases can be represented without selecting a winning classification. No default false or base-rule fallback is emitted.

## Validation executed

- Focused Stage A tests: **33 passed**, zero failed/skipped.
- Existing evaluator/question/Guide/resident-flow tests: **26 passed**.
- Existing property/jurisdiction tests: **17 passed**.
- Existing GIS and Rules 001–004 tests: **94 passed**.
- Total: **170 tests passed**; TypeScript `--noEmit --incremental false` and targeted ESLint passed.
- All **102** registered complete-feature hashes independently checked against frozen `zoning.geojson`.
- Registry regulatory-evidence SHA and all exact crosswalk attributes/citation IDs checked against committed Rule 005 evidence.
- Rule 004 lookup remains SHA-256 `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`. Its 63,430 profiles / 3,324 approvals and the zero-NCOD separation audit remain the unchanged baseline; no citywide derived dataset was generated.
- No Rules 001–004 exporter/config/membership, evaluator/fact/lookup/Guide file or schema was modified. Existing source QA, notice policies and approvals remain unchanged.

Reproduce tests with:

```sh
./node_modules/.bin/tsx --test tests/zoning-interpretation.test.ts tests/evaluator.test.ts tests/question-flow.test.ts tests/fence-guide.test.ts tests/resident-flow.test.ts
NODE_OPTIONS='--conditions=react-server' ./node_modules/.bin/tsx --test tests/property-lookup.test.ts tests/jurisdiction-guardrail.test.ts
node --test tests/clearwater-gis-pilot.test.mjs tests/clearwater-gis-full.test.mjs tests/clearwater-rule001*.test.mjs tests/clearwater-rule002*.test.mjs tests/clearwater-rule003*.test.mjs tests/clearwater-rule004.test.mjs
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/eslint lib/properties/types.ts lib/properties/zoning-interpretation.ts tests/zoning-interpretation.test.ts
```

## Review boundary

Appropriate PR base is `codex/clearwater-rule005-ncod-investigation` at `05b5fe9`, isolating Stage A from previously delivered investigation/design. The dedicated implementation branch must not merge automatically. Current Code currency and legal applicability remain unresolved, but neither blocks source-identity-only Stage A. Stage B and all later activation need separate authorization. No owner policy decision is required to finish this foundation.
