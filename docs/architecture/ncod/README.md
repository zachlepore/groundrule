# NCOD architecture extension — decision record

Status: design only, October 20, 2026. Investigation baseline: `aa8e096`. No schema, runtime, Guide, rule, approval or production changes are authorized by this document. Proposed names below do not describe implemented behavior.

## Decision and smallest first step

Recommend **Option A: a versioned interpreted-zoning document alongside existing raw property evidence**, initially offline. Reuse the canonical property/address identities, existing deterministic engine and existing fence cards. Do not create an overlay database or evaluator.

The smallest first implementation task, requiring separate authorization, is Stage A: define TypeScript document types and a jurisdiction/snapshot-pinned, eight-entry mapping manifest with tests. It must generate no facts, approvals or database writes. Stage B then validates a derived interpretation for all 63,430 profiles. Regulatory and card activation follow separately; identifying a base district never unlocks guidance.

Read [data and backfill design](data-and-backfill.md), [regulatory evaluation and card design](evaluation-and-cards.md), and [bounded roadmap and acceptance tests](roadmap-and-tests.md).

## Mandatory separation verification

A new read-only spatial audit checked all **3,324 approved addresses** against all **10 frozen NCOD zoning features**: all linked source parcel geometries, raw primary code, address point and parcel representative point. Shapely `intersects` includes boundary contact, not just positive area. There were **zero unexpected NCOD overlaps**. All 770 distinct approved raw geometries were tested. Counts: Rule 001 1,967; Rule 002 262; Rule 003 731; Rule 004 364. See [machine-readable evidence](approved-separation.json).

The lookup SHA-256 is `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`; zoning and parcel hashes are recorded in the evidence. This establishes separation under the frozen source, not surveyed legal overlay absence or absence under future source versions.

Code inspection: `scripts/gis/clearwater-pilot.mjs:normalizeZoning` lowercases/removes separators; it does **not** remove NCOD suffixes to return base districts. Composite values remain unsupported. Rule 001 imports the explicit `allowedZoning` allowlist; Rules 002–004 enforce their exact district pairs and bounded membership/quality checks. `export-clearwater-approved-rule004.mjs` asserts unchanged earlier approvals and raw evidence. No NCOD-to-base normalization was found in these pipelines. Do not edit their pinned implementations, evidence/config hashes, allowlists or approvals. Future NCOD artifacts must compare complete prior approval objects byte-for-byte after canonical serialization and keep the existing lookup itself unchanged.

## Current architecture assessment

| Existing component | Verified behavior | Reuse / required future change |
|---|---|---|
| `supabase/migrations/20260824000000_create_property_lookup_schema.sql` | `properties` owns parcel identity, raw/normalized code, QA and `source_snapshot_metadata` JSONB; `property_addresses` links source address identity; restrictive RLS/RPC surface | Reuse identities. Add nested interpreted document in existing JSONB only after offline review; no new table now |
| `20260826000001_add_property_jurisdiction_guardrail.sql` | Trusted jurisdiction evidence is independent of zoning | Require Clearwater jurisdiction and pinned source; never trust a user-entered municipality |
| `20260908000001_add_non_evaluating_property_resolution.sql` | Informational RPC retains REVIEW/multiple matches | Reuse safe-stop response; do not turn informational resolution into evaluation permission |
| `lib/properties/types.ts`, `lookup.ts`, `facts.ts` | Runtime profile is narrow; REVIEW produces no facts / untrusted result; clean maps only `property.zoning_district` | Introduce interpreted type and safe project-readiness adapter later. Existing offline approvals are **not** wired into runtime by this design |
| `scripts/gis/clearwater-pilot.mjs`, `clearwater-full.mjs`, `diagnose-clearwater-zoning.mjs` | Raw GIS classification and diagnostic evidence; separator normalization is not a legal crosswalk | Preserve outputs; proposed interpreter consumes existing profiles, never replaces ingestion |
| `scripts/gis/export-clearwater-approved-rule00{1,2,3,4}.mjs` | Versioned offline approval objects, evidence hashes and audit totals | Immutable baselines; separate additive interpretation output, no approval edits |
| `research/gis/rule005-regulatory-evidence.v1.json` | Eight exact research mappings, GIS descriptions/SPECIAL, versioned Code excerpts and unresolved currency | Promote only explicitly reviewed entries into a future mapping manifest; research identity is not legal/project applicability |
| `lib/rules/condition.ts`, `types.ts` | Flat fact keys; JSON values; all/any/not and three-valued evaluation; `in` tests scalar membership in constants, not membership inside a fact array | Reuse operators; flatten per-overlay applicability into trusted scalar facts; do not invent array semantics |
| `20260822000000_create_municipal_rule_schema.sql` | Versioned rules, inputs/outcomes, provisions/citations, rule relationships with scope/effective dates/metadata | Reuse tables and conditions. Version-pin relationship provenance in metadata; no parallel regulatory schema |
| `lib/rules/evaluate.ts` | `excepts`/`exempts_from` suppress matched target when source truth is TRUE; scopeCondition currently ignored; `more_specific_than` surfaced only; conflicts do not remove permissions | Requires bounded correction before any overlay rule activation; more-specific relation alone is insufficient |
| `lib/rules/loader.ts` | Loads published/effective rule set and active versions; relationships filtered by null effective_to, not full as-of interval | Resolve relationship effective dates and rule-version binding; fail closed on invalid/stale graph |
| `lib/rules/presentation.ts`, `questions.ts` | Grouping and missing-input discovery | Keep; grouping is not precedence. Require every missing overlay/project fact registered as required input where applicable |
| `lib/guides/fence.ts` | Combines all status buckets into a map; front/side cards consume outcomes without checking status; some permit cards do check MATCHED | Must distinguish informational baseline context from resolved permission. Suppressed/unknown outcomes cannot supply unqualified permission |

Assessment is of checked-in schema/seed/runtime code, not live Supabase contents. No database introspection or writes occurred.

## Alternatives

| Criterion | A — existing property JSONB | B — overlay definition / property-overlay tables |
|---|---|---|
| Migration | No Stage A/B migration; future bounded RPC exposure/JSON validation | New tables, joins, RLS, backfill, grants and RPC changes |
| Integrity | Typed/validated document plus manifest hash; JSONB shape checks later; no FK to overlay registry | Strong FK identity; version and spatial assertions still need validation |
| Performance | Current exact-address RPC returns one document; no new query/index needed until measured demand | Better cross-property overlay queries; joins add operational work |
| Regulatory versioning | Mapping version/source hashes distinct from existing provision/rule versions | Dedicated definition versions possible, but duplicates existing regulatory source infrastructure if poorly scoped |
| Audit | Immutable derived artifacts + lineage in document; original raw fields retained | Relationship history possible, requires temporal design and governance |
| Multiple overlays / municipalities | Namespaced array with explicit evidence/completeness per type and jurisdiction | Natural many-to-many, but premature for two overlays in one jurisdiction |
| Export / maintenance | Compatible with JSONL and solo-developer workflow | More ingestion/export adapters, migrations and test surfaces |

Choose A. Reconsider B only after demonstrated multi-jurisdiction query/index needs or write-time referential integrity requirements. Do not use JSONB to duplicate raw geometries: keep references/hashes to the existing evidence and preserve viewer access. Source metadata is not itself an authorization channel.

## Genuine owner decisions before implementation

1. Authorize Stage A only, or A+B, with no certification or runtime activation. Recommended: A first.
2. Before Stage C: establish acceptable current legal-source verification and resolve the Code/Planning questions in the regulatory matrix. Archived evidence alone is not represented as current law.
3. Before Stage E: review the existing 11-case packet (eight candidate, three excluded controls), approve regulatory/card completeness and explicitly authorize the exact 227-address membership. No approval is inherited from this architecture request.
4. Before any eventual database/runtime rollout: separately authorize the exposure, write/migration and resident-facing work. Those are outside this design request.

Technical choices (JSONB, scalar facts, guarded exception relationships, additive offline output) are recommendations resolved here, not questions deferred to the owner. Internal designation labels must not claim official municipal certification; HOA/deed restrictions remain separate from municipal overlay facts.
