# Groundrule evaluator v1

## Purpose and boundaries

This evaluator is the first read-only, server-side proof that published municipal rule data can drive Groundrule logic. It does not perform GIS, parcel, address, authentication, permitting, or legal-compliance decisions. Absence of a matched rule is not permission.

## Architecture

`evaluateProjectRules` is the server-only entry point. It accepts a jurisdiction slug, project-type key, and a fact map. The loader resolves the currently effective verified/published rule set and active versions, then fetches outcomes, inputs/options, citations/provisions/sources, and relationships in batched queries. It normalizes database rows before the pure evaluator runs. The browser receives neither a Supabase client nor credentials.

The pure `evaluateLoadedRuleSet` function is separate from data access. This makes three-valued behavior testable without database writes and permits a read-only integration test to inject a Supabase client later.

## Condition AST

The implementation mirrors `groundrule_valid_expression` in the implemented migration and supports only:

- composition: `all`, `any`, and `not`;
- knowledge/boolean checks: `is_true`, `is_false`, `is_known`, and `is_unknown`;
- scalar comparisons: `eq`, `neq`, `lt`, `lte`, `gt`, and `gte`;
- categorical membership: `in` and `not_in`; and
- numeric `between` with explicit lower/upper inclusivity.

Units are preserved in stored expressions. V1 assumes supplied numeric facts are already expressed in the input definition's canonical unit; it does not silently convert units. Invalid numeric operand types evaluate as `UNKNOWN`.

## Three-valued logic

Facts distinguish present values (including `false` and zero) from absent or explicitly unknown (`null`/`undefined`). A leaf needing an absent fact is `UNKNOWN`, never `FALSE`. For `all`, any `FALSE` wins, all `TRUE` produces `TRUE`, and every other combination is `UNKNOWN`. For `any`, any `TRUE` wins, all `FALSE` produces `FALSE`, and every other combination is `UNKNOWN`. `not` reverses true/false and preserves unknown.

`is_known` and `is_unknown` intentionally resolve based on presence. They are the only operators for which an absent value is itself the answer.

## Rule classification

| Condition | Evaluation mode | Result |
| --- | --- | --- |
| `FALSE` | any | `NOT_MATCHED` |
| `UNKNOWN` | any | `UNKNOWN` |
| `TRUE` | `deterministic` or `informational` | `MATCHED` |
| `TRUE` | `partial`, `discretionary`, or `external` | `REVIEW_REQUIRED` |

Thus partial rules preserve their objective applicability result while refusing to imply that the remaining judgment has been completed.

## Outcomes, citations, and missing inputs

Matched and review-required rules retain ordered structured outcomes: type, subject key, JSON parameters, severity, and message template. They also carry normalized citations containing source title, human section identifier/title, excerpt, URL, edition, publication/effective metadata, role, and pinpoint note. A deduplicated top-level citation collection supports summary rendering without using database UUIDs as citation labels.

For each unknown condition, the evaluator finds absent AST fact keys and joins them to required rule-version inputs. The deduplicated missing-input result includes machine key, label, data type, canonical unit, categorical options, property-derived status, user-input permission, role, and required status. Inputs that did not prevent a condition from resolving are not requested.

## Relationships

V1 loads and surfaces every active relationship involving the loaded rules. It implements one narrow, objective behavior: a matching `excepts` or `exempts_from` rule suppresses an otherwise matched target. `more_specific_than` is exposed but does not automatically choose a winner because the schema does not encode a general precedence algorithm. When both ends of `potentially_conflicts_with` objectively apply, an explicit conflict with `requiresReview: true` is returned. Scope conditions and metadata remain available; unsupported or ambiguous resolution is never guessed.

## Example

Request:

```json
{
  "jurisdiction": "clearwater-fl",
  "projectType": "fence",
  "facts": {
    "project.is_chain_link": true,
    "project.location_zone": "rear",
    "project.vinyl_color": "black",
    "property.is_recreational_facility": false
  }
}
```

Abbreviated response shape:

```json
{
  "ruleSet": { "key": "clearwater_fence_v1", "coverageStatus": "limited" },
  "matchedRules": [{
    "key": "chain_link.side_rear_vinyl_height",
    "status": "MATCHED",
    "truth": "TRUE",
    "outcomes": [{ "type": "maximum", "parameters": { "value": 6, "unit": "ft" } }],
    "citations": [{ "sourceTitle": "Clearwater Community Development Code", "sectionIdentifier": "§ 3-805" }]
  }],
  "reviewRequiredRules": [],
  "unknownRules": [],
  "missingInputs": [],
  "conflicts": [],
  "citations": []
}
```

The example is illustrative output derived from the database model, not runtime branching.

## Test scenarios

The automated harness covers: insufficient facts and deduplicated questions; an ordinary non-chain-link fence; chain-link applicability loaded as fixture data; a discretionary administrative review; and exemption plus unresolved-conflict relationships. It also directly checks all logical operator families and unknown propagation. The fixture uses the seed migration's exact machine keys and expression shapes. Live integration verification remains manual when Supabase environment variables are unavailable.

## Known limitations and pre-GIS work

- V1 selects the first currently effective published rule set; future overlapping-set policy needs an explicit database contract.
- Supplied facts are trusted only as values, not as authoritative evidence. Authority requirements are loaded but evidence verification is future work.
- Units must already be canonical, and date/text ordering is not implemented because current seeded numeric comparisons do not need it.
- `more_specific_than`, scoped relationship precedence, and multi-rule outcome reconciliation are surfaced rather than generalized.
- The evaluator does not validate enum fact values against options before evaluation; request validation should be added at the server boundary.
- A live, read-only loader integration run is still required in an environment with configured Supabase variables and read policies.

Before GIS integration, the smallest next UI step is a server action or route handler that validates a fact-map request, invokes `evaluateProjectRules`, and renders its missing-input prompts and cited matched/review results in the existing interface.

READY FOR UI INTEGRATION
