# Bounded implementation roadmap and validation specification

All tasks below require subsequent implementation authorization. No migrations, rules, facts, approvals or cards are implemented in this architecture delivery. Proposed paths are concrete work targets, not newly existing modules.

## Stage A — typed representation and exact mapping registry

- Scope: pure document contract, explicit eight-entry source crosswalk and validation; no fact emission or changed property lookup behavior.
- Files: extend `lib/properties/types.ts`; add `lib/properties/zoning-interpretation.ts`, `research/gis/clearwater-ncod-mappings.v1.json`, `tests/zoning-interpretation.test.ts`. Reuse `rule005-regulatory-evidence.v1.json` without modifying pinned research evidence.
- Database: none. Inputs: Rule 005 crosswalk, frozen manifest, raw feature descriptions/SPECIAL, cited base/overlay Code. Dependence: owner authorization for A; archived identity evidence is sufficient for source-mapping tests, not guidance applicability.
- Tests: exact eight mappings, altered jurisdiction/snapshot/raw code/feature attributes rejected, no suffix parser, OS/R not NCOD, unknown/conflicting/multiple/absent states, deterministic hashes, no source mutation or approval generation.
- Manual work: review mapping scope/evidence; no redundant unit atlas. Acceptance: original code untouched; no interpretation equals approval; explicit source-version bounds.
- Rollback: remove unconsumed module/manifest; no production state affected.

## Stage B — complete offline Clearwater interpretation

- Scope: all 63,430 profiles; each relevant intersection and point/link quality; separate primary-code unsupported census from secondary-overlay census. Never replace original exporter or create a second canonical property store.
- Files: add `scripts/gis/interpret-clearwater-zoning.mjs`, `scripts/gis/verify-clearwater-zoning-interpretation.mjs`, `tests/clearwater-zoning-interpretation.test.mjs`; additive workflow step only after local output is verified. Reuse existing GIS helpers, source verifier and approved Rule 004 JSONL.
- Database: none. Inputs: Stage A manifest/types, pinned Release and 61-file Rule 004 artifact, prior human holds and source diagnostics. Dependencies: A; reproducible existing outputs.
- Tests: all source joins and original fields equal, immutable approvals exact equality, partition totals, geometry/link exceptions, input-change reassessment, twice-run semantic hash equality, no absent inference from primary alone. Include corrupted/checksum mismatch inputs.
- Manual work: inspect only newly discovered conflicting/secondary NCOD cases and relevant existing QC maps; do not silently widen 227 cohort. Acceptance: 63,430 original profiles, 3,324 approvals, 17,014 remaining REVIEW; no new approvals; NCOD/OSR primary census reproduced; complete secondary census and exceptions published. Unexpected overlap with prior approval halts release.
- Rollback: discard new derived artifact; original lookup untouched. Publish large files as downloadable workflow artifacts, never Git data commits.

## Stage C — versioned regulatory conditions and safe precedence

- Scope: first CRNCOD residential fence scope, independently IENCOD district/use scopes as reviewed; three-valued scoped exceptions and effective-result trace in the existing engine. Do not activate incomplete rule bundles.
- Files: `lib/rules/types.ts`, `evaluate.ts`, `loader.ts`, `questions.ts`; new focused tests in `tests/evaluator.test.ts` / `tests/ncod-precedence.test.ts`; proposed future seed migration only after separate database authorization. Existing input/provision/rule tables reused.
- Database: later source/provision/input/rule/version/citation/relationship seed rows; no new overlay tables. API may need version/effective-date fields in loaded relationships, using existing columns and metadata. No schema edits now.
- Inputs/dependencies: A+B evidence, accepted current legal sources, resolution of regulatory matrix questions; project input definitions/units and explicit scope semantics. CR and IE legal completeness are separate gates.
- Tests: truth-table scenarios below; date/version bindings, missing endpoints/cycles, relationship scope UNKNOWN, ordering permutation invariance, non-deterministic source cannot authorize definitive result, distinct subject suppression, two incompatible overlays block, missing-input and citation trace preserved.
- Manual work: legal-source/provision-to-condition review and targeted site-fact interpretation; no generic threshold transfer. Acceptance: no contradictory effective permission, no unknown-as-permission, original ordinary fixtures remain stable. Publish unactivated rule bundle for review before any activation.
- Rollback: revert active rule/version pointers and engine release together using tested prior bundle; never leave overlay-normalized facts feeding an old generic ruleset. No raw zoning/approval edits.

## Stage D — reusable information-card integration and future persistence

- Scope: one fence Guide builder, subject-level effective outcomes, conditional citations/prompts. Informational ambiguous response retains known zoning. No duplicated neighborhood Guide sets.
- Files: `lib/guides/fence.ts`, `lib/rules/presentation.ts`, `lib/properties/facts.ts`, `types.ts`, `lookup.ts`, corresponding fence/property/resident tests. Existing RPC migration would be extended only with explicit database/runtime approval; narrowly project interpreted fields.
- Database: optional nested JSONB document and RPC exposure, no new property/overlay tables. Inspect deployed state first. Source QA remains REVIEW even if a later offline guidance approval exists.
- Inputs/dependencies: tested Stage C effective results, approved content/source currency, accepted overlay applicability policy, and project-specific readiness adapter contract. Do not merge offline approval authorization with property informational resolution.
- Tests: each existing generic card ordinary snapshot unchanged; suppression eliminates contradictory outcomes/citations; unknown project facts show qualified/pending content; user cannot inject property-derived facts; unsupported project cannot unlock by base alias; HOA separate.
- Manual work: owner review of ordinary vs CR-LDR/CR-LMDR/IE examples and missing-fact prompts. Acceptance: side-by-side prohibited/permitted contradiction impossible; no claim of City certification or legal exemption. UI/production changes need separate explicit scope authorization.
- Rollback: disable new adapter/document read and revert Guide/rule activation together; retain safe REVIEW gate. Restore prior metadata pointer if persisted, leaving source evidence intact.

## Stage E — separately approved Rule 005 cohort

- Scope: only 227 investigated sole-code LMDR-NCOD Coachman R membership, if each passes all source/human/regulatory checks. No recovery of the one coverage hold or 14 Institutional-intersection addresses.
- Files: proposed `research/gis/rule005-approval.v1.json`, `rule005-membership.v1.json`, `rule005-human-qc.v1.json`; extend existing offline exporter architecture through a bounded next-stage exporter and verifier, plus hosted workflow artifact step. Do not alter exporters/configs for Rules 001–004.
- Database: none for offline approval. Inputs/dependencies: accepted A–D policy and source currency, exact membership/geometry/evidence hashes, completed owner QC and explicit final authorization. If runtime D rollout is deferred, reviewed/tested D behavior must still exist in isolated fixtures before claiming fence readiness; no production activation is implied.
- Tests: 227 ceiling, candidate failures reported not forced, no double approvals, all earlier fields/approvals/notices preserved, exclusion retention and evidence-change rejection. Expected maximum total 3,551 approvals and 16,787 remaining REVIEW only if all 227 pass and owner authorizes.
- Manual work: eight candidate/three excluded maps and genuine legal/site exceptions; no inference that map approval establishes fence line or legal rights. Acceptance: owner-approved bounded scope and complete audit, artifacts/checksums/provenance, hosted checks pass. No automatic approval in this plan.
- Rollback: revert new approval/config export version only; continue using validated Rule 004 artifact.

## Stage F — further NCOD classes

- Scope: research next exact code/base/use combinations, independently for IENCOD including multi-unit/shared-site evidence; no automatic promotion of 2,524 NCOD addresses.
- Files: new research/QC artifacts and later bounded configs, same interpreter/engine/cards. No second pipeline.
- Database: none during research. Inputs/dependencies: A–E architecture evidence and district-specific legal completeness; distinct geographic/tract/use review.
- Tests: reuse full regression suite plus new exact membership and overlay interaction fixtures. Manual QC selects unique physical geometry/exception patterns without collapsing units. Acceptance: explicit bounded owner decision and unchanged prior approvals; each additional project scope needs its own coverage evidence.
- Rollback: discard research artifact / revert later independently versioned scope. No impact to earlier approvals.

## Required deterministic scenarios

These are **test specifications**, not executed new overlay behavior. Existing rules do not yet implement them.

| Scenario | Expected behavior / reason |
|---|---|
| Ordinary LMDR, evidence-confirmed no NCOD | Existing ordinary fence outputs unchanged subject to existing project facts; explicit absence/inventory policy, not omitted overlay list |
| LMDR, overlay inventory unknown | No assumption of ordinary applicability; affected guidance ambiguous, missing applicability evidence retained |
| LMDR + verified CR, chain-link in side yard | CR prohibition effective; coated/uncoated generic permissive height/coating cards suppressed; retain §2-1601.J.1 citation |
| LMDR + verified CR, front prohibited interval | CR location restriction effective, ordinary 4ft front permission absent; §2-1601.J.2.b citation |
| LDR + verified CR, front interval | Qualified ≤3ft nonopaque/design provision, never LMDR location prohibition or generic 4ft permission; compatibility unknown requires review |
| LMDR + verified IE, single-family scope confirmed | Scoped ≤6ft side provision; applicable rear-setback-to-seawall nonopacity; generic side+rear overgeneralization absent |
| HDR + verified IE, use/rights unknown | Preserve HDR+IENCOD facts, no automatic multifamily project permission; require relevant use/site/ownership evidence |
| HDR + verified IE, relevant multifamily scope verified | Apply H.2 scoped conditions and citations; unit identity does not establish sole development rights |
| Explicit absence of CR, presence of IE | CR rules FALSE; IE evaluated independently; generic NCOD boolean cannot substitute |
| Source base LMDR conflicts with mapped HDR/overlay evidence | No trusted single-base permission fact; designation 3 with both source facts and conflict |
| Multiple verified overlays | Combine independent restrictions only under a reviewed complete interaction bundle; unresolved contradiction blocks affected subject and records both citations |
| Unknown/unsupported overlay code | Preserve raw identity and known district, block affected guidance; no ordinary-base fallback |
| Generic permission TRUE, overlay prohibition TRUE | Explicit scoped exception resolves to prohibition; no contradictory permission in final card; raw truth trace retained |
| Generic permission TRUE, relevant overlay scope UNKNOWN | Pending affected subject, no affirmative permission; prohibition not falsely asserted |
| Missing fence-location fact | UNKNOWN where needed; ask registered relevant input, retain unconditional material prohibition if independently known |
| Missing building-line fact in CR | Do not infer from “front yard”; location-sensitive permission withheld |
| Missing setback/seawall fact in IE | Do not equate waterfront flag to exact statutory interval; ask/site confirmation; no unsupported opacity conclusion |
| Relationship scope FALSE although source rule TRUE | No suppression outside scope; verify current ignored-scope defect is corrected before activation |
| Same graph in reversed rule/edge order | Identical effective outcomes, conflicts, citations and prompts |
| Stale mapping/source/geometry or changed candidate list | Hard validation failure; no inheritance of prior QC/approval |

Additional tests: absent→unknown transition, inventory incomplete with known CR, untrusted facts overriding derived facts rejected, conditional source-discretionary rule, overlay rule matching but relationship future-dated/expired, version mismatch, graph cycle, missing relation endpoint, raw truth TRUE but suppressed status, whole-Guide/citation snapshots, no duplicate property records, multiple source parcel features and unit peers, all human holds retained.

## Validation commands and evidence

Use existing repository targets as relevant: `npm run test:evaluator`, `npm run test:questions`, `npm run test:property`, `npm run test:guide`, `npm run test:gis`, plus future targeted tests. Run broader Guide suites only if shared behavior changes. Do not query live Supabase or publish rules as a “test”. Stage B/E hosted workflows must verify immutable source archive, checksums, complete output reconciliation and artifact publication on the same reviewed commit.

For this documentation delivery, only the read-only approved-population separation audit and current existing evaluator/property/Guide regression tests are executed. They establish baseline behavior, **not** future overlay implementation correctness. New scenarios above remain planned tests until authorized implementation.
