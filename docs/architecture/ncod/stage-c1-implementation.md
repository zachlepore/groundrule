# Stage C1 — deterministic regulatory precedence foundation

Review-ready implementation based on Stage B `91a71f4`. No Coachman Ridge/Island Estates provisions, database writes/migrations, rule activation, property fact changes, Guide redesign, deployment or new approvals.

## Audit and resulting behavior

The original evaluator suppressed targets for matching `excepts`/`exempts_from` edges without checking `scopeCondition`; the loader discarded every finite-ended relationship and did not load relationship dates or provision/version evidence. `more_specific_than` was descriptive, and potential conflicts were only reported. `condition.ts` already implemented the required three-valued operators; those truth tables remain unchanged.

The existing schema in `20260822000000_create_municipal_rule_schema.sql` already has relationship effective dates, scope JSON, metadata and source-provision FK. Existing provisions have `excerpt_checksum`; sources have edition/effective dates. C1 reuses these columns and adds no schema.

| Relationship | C1 semantics |
|---|---|
| `excepts`, `exempts_from` | From-rule controls named to-rule only when its effective result is deterministic MATCHED and scope TRUE. FALSE scope has no effect. UNKNOWN scope/source applicability withholds the affected outcome and records pending reasons/missing facts |
| `more_specific_than` | Descriptive only; never infers an override. Specificity cycles are invalid |
| `potentially_conflicts_with` | Explicit possible conflict establishes pending/conflicting results before override traversal; affected outcomes withheld. Scope FALSE or either raw condition FALSE makes the conflict inactive |
| `depends_on` | From-rule requires to-rule's effective deterministic match within scope. Unsatisfied prerequisite suppresses; unresolved applicability qualifies. No exemptions inferred |

Override controllers resolve before their targets using an acyclic dependency traversal. A suppressed controller cannot suppress another rule downstream. Unknown controllers cannot establish definitive legal outcomes. Ordering is never legal priority. Results, traces, missing-input choices and citations use stable ordering; input rule/relationship arrays are not mutated.

**Conservative compatibility limit:** more than one non-FALSE override controller for the same target is rejected with `PrecedenceValidationError`; C1 does not assume their restrictions are compatible. Disjoint known scopes and independent atomic targets work. Compatible simultaneous replacements require separately reviewed composition support, not arbitrary iteration order. Explicit conflict plus override on the same pair is invalid. Invalid graphs return no partial evaluation result.

## Version, dates and source bindings

New relationships must provide:

```json
{
  "metadata": {
    "fromVersionNumber": 1,
    "toVersionNumber": 1,
    "sourceProvisionId": "ACTUAL_SOURCE_PROVISION_ID",
    "sourceProvisionChecksum": "64_LOWERCASE_HEX_CHARACTERS",
    "sourceEditionLabel": "EXACT_REVIEWED_EDITION"
  }
}
```

The loader reads the actual FK, stored excerpt checksum and joined provision/source citations. Bindings must match those loaded values and both active endpoint version numbers; rationale is required. Source dates must cover the evaluation date where known. C1 compares the publisher's recorded checksum with the declared binding; it does not independently authenticate a legal source or recalculate an excerpt's checksum. Verified legal text/checksum publication is a C2 prerequisite.

Exactly six existing unscoped, unbound Clearwater fence edges from `20260823000000_seed_clearwater_fence_rules.sql` have an explicit `reviewed_clearwater_seed_v1` compatibility policy in `precedence.ts`. Both endpoints must remain version 1; scope must remain null; dates must be absent or the original August 23 start with no end. It is not a generic legacy fallback. Changed scopes/versions or new edges require full bindings. Every returned active edge identifies its validation policy.

Relationships use `[effective_from, effective_to)` date semantics: start inclusive, end exclusive, null open bounds. Inactive historical/future edges do not control current results or require current endpoint pins, but malformed date intervals are rejected. Active missing endpoints, duplicates, unsupported types, stale bindings, contradictory edges and cycles fail closed. New overrides targeting rules with multiple distinct outcome subjects are rejected; split those rules into atomic targets first. Joint outcomes with one subject (including null/unmodeled subject) still require publisher review of atomicity.

`evaluateProjectRules` captures one ISO `asOfDate` for loading/evaluation. The default remains the existing UTC day; callers can supply an explicit civil date. The loader checks publication, verification, lifecycle and version dates. It does not reconstruct historical rule versions from an active-version pointer; a requested date outside that version fails rather than guessing. Rule-version dates loaded into results are also checked by the in-memory evaluator. A jurisdictional civil-date policy can be supplied explicitly before future regulatory rollout.

## Result contract and downstream consumption

`types.ts` adds optional fields for backward-compatible manually constructed fixtures; the evaluator always emits:

- `truth`: unchanged raw condition truth; `rawStatus` and `rawOutcomes`: original match/mode and declared outcomes.
- `resolution.state`: effective / suppressed / pending / conflicting.
- Sorted reasons, controlling rule keys, relationship evidence (including version/date/source binding) and controlling citations.
- `evaluatedAsOf`, missing scope/controller facts and registered required-input prompts.

For a withheld target, effective `outcomes` is empty. Raw evidence remains separately available. Suppression maps to NOT_MATCHED, pending to UNKNOWN, conflict to REVIEW_REQUIRED. Unrelated rules retain their original semantics. Ordinary nonmatched/unknown contextual outcomes are retained for current Guide compatibility; C1 is not a comprehensive Guide renderer rewrite.

**Do not activate new overlay rules yet.** Existing `lib/guides/fence.ts` sometimes reads every status bucket and contains fixed explanatory text. Clearing withheld numeric outcomes prevents reuse of those values, but cannot make every existing card status-aware. C2/content and subsequent card integration must consume effective statuses/resolution, preserve pending explanations, and avoid reading raw outcomes as permissions. No Guide files were changed here.

## Files and validation

- `lib/rules/precedence.ts`: pure graph/date/version/source validation, explicit seed compatibility policy and scoped fact helpers.
- `lib/rules/evaluate.ts`: deterministic resolution, effective outcome withholding, raw evidence/provenance and missing inputs.
- `lib/rules/loader.ts`: reads existing date/checksum/citation fields, validates active versions and finite-ended relationships.
- `lib/rules/index.ts`: one evaluation date shared across loader/evaluator.
- `lib/rules/types.ts`: additive result/relationship/version-date fields.
- `lib/rules/condition.ts`: runtime AST guard matching existing SQL grammar (depth capped at 128) and own-property known-fact helper; three-valued operators unchanged.
- `tests/ncod-precedence.test.ts`: 35 synthetic tests; no municipal overlay regulatory content.
- `tests/ncod-precedence-loader.test.ts`: five mocked read-only loader integration tests, including finite-ended relationships and unavailable versions.

**259 tests passed, zero failed/skipped:** 143 engine/question/Guide/resident tests; 22 loader/property/jurisdiction tests; 94 GIS/Rules 001–004 regression tests. TypeScript and targeted ESLint passed. Fixtures cover TRUE/FALSE/UNKNOWN scope, missing facts, different bases, effective/expired edges, version/source mismatches, missing endpoints, cycles, competing controllers, chain resolution, source dates, scope validation, input/citation traces and whole-result permutation invariance.

The original Rule 004 lookup remains SHA-256 `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`; no exporter/config/membership or approval datasets changed. Its 63,430 profiles and 3,324 approvals remain the immutable baseline. No citywide export rerun or new GIS dataset is necessary for C1.

Reproduce:

```sh
npx tsx --test tests/ncod-precedence.test.ts tests/evaluator.test.ts tests/question-flow.test.ts tests/*guide.test.ts tests/resident-flow.test.ts tests/clearwater-resident-fence-rules.test.ts tests/clearwater-resident-shell.test.ts
NODE_OPTIONS='--conditions=react-server' npx tsx --test tests/ncod-precedence-loader.test.ts tests/property-lookup.test.ts tests/jurisdiction-guardrail.test.ts
node --test tests/clearwater-rule001*.test.mjs tests/clearwater-rule002*.test.mjs tests/clearwater-rule003*.test.mjs tests/clearwater-rule004.test.mjs tests/clearwater-gis-pilot.test.mjs tests/clearwater-gis-full.test.mjs
npx tsc --noEmit --incremental false
```

## Before Stage C2

1. Separately authorize C2 and establish current legal sources/applicability; C1 contains no NCOD content or approvals.
2. Publish explicit version/provision/checksum/edition bindings and complete atomic conditions/required inputs for any new relationships. Validate against the actually published rule graph before activation; tests here inspect checked-in fixtures and mocked reads, not live Supabase.
3. Keep source/overlay facts gated. Add status-aware card handling in its separately authorized stage; do not activate rules while contradictory hardcoded cards remain possible.
4. Use independent atomic targets or obtain explicit legal/composition review for simultaneous replacements. Do not bypass graph rejection to make coverage counts rise.

No owner clarification is needed to finish C1. Draft review should target the existing Stage B branch so the C1 diff is isolated. No merge or deployment is performed.
