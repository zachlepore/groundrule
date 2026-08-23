# Groundrule question flow v1

## Workflow architecture

`/clearwater/fence` is the first product workflow over the generic evaluator. The server-rendered route performs the initial read-only evaluation for `clearwater-fl` and `fence`. A small client component displays one metadata-driven question at a time. Every submitted answer invokes a server action, which merges facts and calls the live Supabase-backed evaluator again. There is no fixture fallback and no regulatory logic runs in the browser.

## Temporary mock property context

The workflow starts with a fictional residential parcel context made only from machine keys present in the published Clearwater input definitions. It supplies zoning, water adjacency, lot/frontage, principal-structure, vacant-lot, subdivision, public-right-of-way, prohibited-access, and utility-easement facts that GIS or parcel sources should eventually provide. This is explicitly an internal temporary context, not an address-derived representation and not a regulatory conclusion.

## Question planning and prioritization

The generic planner consumes evaluator `missingInputs`, the complete known-fact map, unresolved-rule missing keys, and each live input definition's source and permission metadata. It rejects already answered inputs, unsupported/malformed controls, enums without options, and inputs for which user input is not allowed. This excludes property-only, derived, and official-decision facts. Eligible inputs are ranked by the number of unresolved rules they affect, then applicability role, then label for deterministic ordering. The flow is therefore not a hardcoded questionnaire.

## Input rendering and UNKNOWN

Boolean metadata renders Yes/No, enum metadata renders its live option keys and labels, numeric metadata renders a numeric control with the canonical unit, and text is available only when metadata requires it. “I don't know” records an explicit `null`. The evaluator consequently continues to see the fact as unknown, while the planner recognizes that the resident already addressed the question and does not ask it repeatedly.

## Stopping conditions

The flow moves to results when no useful user-answerable question remains. That includes cases where remaining facts are GIS/property-derived, derived by the system, require an official decision, or only support administrative review. Residents may also choose to see a useful provisional result at any point. This prevents an endless questionnaire without converting uncertainty to falsehood.

## Result presentation

The result groups atomic rules by their live group key (falling back to the rule-key topic), removes identical presentation messages, and displays live outcome messages rather than reinterpreting rules. Matched rules, review-required rules, important unresolved inputs, citations, and evaluator-reported conflicts have separate resident-facing sections. The page never says a project is legal or approved.

## Server/client boundary and failures

Supabase loading and evaluation remain server-only. The client stores answers and navigation snapshots, sends fact maps through a server action, and renders returned results. The initial route and subsequent evaluations show controlled failure messages without stack traces. The route performs no database writes.

## Limitations before GIS

- The parcel is fictional and cannot represent a resident's address.
- Property, geometry, easement, right-of-way, and official-decision unknowns remain unresolved unless included in the mock context.
- Results are guidance from the currently published rule set, not permitting or legal determinations.
- Question counts are intentionally not promised because each answer can change the unresolved set.

## Manual production verification

1. Deploy with the production Supabase read credentials and open `/clearwater/fence`.
2. Confirm the initial question appears without client-side Supabase access or fixture data.
3. Answer a boolean, enum, and numeric question and confirm each Continue triggers a server re-evaluation and changes the next data-ranked question.
4. Choose “I don't know”; confirm the same question is not immediately repeated and its issue remains under “What we still don't know.”
5. Use Back and confirm the previous evaluated state is restored.
6. Choose “See results” and verify matched guidance, review warnings, unresolved material facts, and source title/section/title are concise and non-duplicative.
7. Simulate unavailable Supabase credentials and verify a controlled user-facing error appears.
8. Confirm conflicts, if returned by the evaluator, appear prominently as requiring city review.

The smallest next GIS step is a read-only Clearwater parcel adapter that resolves the existing property-derived input keys for a selected parcel, then replaces the mock fact map without changing the evaluator or question planner.

READY FOR GIS INTEGRATION
