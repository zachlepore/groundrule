# Overlay applicability, precedence and reusable cards

## One engine; trusted scalar facts

Proposed fact adapter remains `lib/properties/facts.ts`, with types in `types.ts` and a pure interpretation validator in `zoning-interpretation.ts`. Keep jurisdiction, property lookup and source-quality gates. Preserve existing clean-only behavior until a separately approved adapter change supports offline-approved readiness without relabeling source REVIEW as CLEAN. Client answers must never override property-derived zoning, applicability or approval facts.

Proposed flat scalar inputs:

| Fact | Values / source |
|---|---|
| `property.zoning_district` | Existing lowercase base fact only when regulatory context is trusted; never raw composite aliasing |
| `property.overlay_inventory_complete` | true only under accepted evidence policy; absent when unknown |
| `property.overlay.crncod.applicability` | verified / absent / conflicting; **omit for unknown**, so ordinary comparisons return UNKNOWN |
| `property.overlay.iencod.applicability` | Same independent treatment |
| `property.overlay.unsupported_present` | Trusted true/false only if inventory assessed |
| `property.regulatory_context_supported` | Trusted true only for reviewed base/overlay/project-rule bundle and accepted source version; not inferred from presence of a base |
| `fence.between_front_building_and_property_line` | Project fact; missing remains unknown |
| `fence.between_side_building_and_street_property_line` | Project fact, including corner frontage; missing remains unknown |
| `fence.between_structure_and_side_lot_line` | Distinct from a generic side/rear enum |
| `fence.between_rear_setback_line_and_seawall` | Project fact requiring appropriate site evidence; not just waterfront yes/no |
| Existing material/height/opacity inputs | Reuse registered input definitions where meanings match; never substitute a broad yard label for building-line evidence |

Persistent enums may include unknown; adapter must not send the string `unknown` into an `eq verified` predicate and mistake FALSE for known absence. For unknown/invalid/conflicting/unsupported context, omit readiness permission facts, retain diagnostic facts in the information response and route affected project guidance to designation 3. Confirmed absence is explicit, not default false.

The existing condition language can express CR applicability without extension:

```json
{"all":[
  {"fact":"property.zoning_district","op":"eq","value":"lmdr"},
  {"fact":"property.overlay.crncod.applicability","op":"eq","value":"verified"},
  {"any":[
    {"fact":"fence.between_front_building_and_property_line","op":"is_true"},
    {"fact":"fence.between_side_building_and_street_property_line","op":"is_true"}
  ]}
]}
```

This is a **design example**, not a new rule or legal applicability determination. AND/OR retain existing Kleene-style truth tables: known FALSE can settle AND; known TRUE can settle OR. Missing unrelated facts should not block an independently established prohibition; missing necessary facts never grant permission. Register project inputs and dependency prompts in existing input tables/`questions.ts`; missing-input discovery currently collects unavailable keys and must not offer impossible irrelevant questions after a decisive branch.

## Explicit precedence contract

Prefer existing **`excepts` relationships**, with cited §3-803.A overlay precedence and §2-1601.C / §2-1602.C, plus subject-specific scope predicates. `more_specific_than` remains explanatory and never alone grants suppression. Do not use broad “minimum height wins” arithmetic: an overlay may impose location/material/opacity constraints rather than a competing numeric maximum.

Required bounded engine work before activation:

1. Evaluate each rule condition once from the same trusted facts; retain raw truth, declared outcomes and missing-input trace.
2. Select relationships for the evaluation as-of date and active rule versions. `loader.ts` must honor effective_from AND effective_to (exclusive end) instead of only null end. For new overlay edges, bind expected from/to version numbers and cited provision version/hash in existing metadata; reject stale endpoints. Preserve existing unversioned edges by explicit legacy policy, not by guessing new overlay compatibility.
3. For `excepts`, direction is **overlay source → named generic target**. Compute `effectiveScope = source condition AND relationship.scopeCondition` (null scope means TRUE). A deterministic matched source and TRUE scope suppress only the named target's relevant permission. FALSE scope has no effect. UNKNOWN scope or unresolved applicable source blocks an unqualified affected permission and records a pending replacement/review reason; it does not fabricate a prohibition. Review-required/non-deterministic sources cannot establish permission or definitive legal prohibition.
4. Use a two-pass resolved graph, not mutable rule iteration. Compute all decisions from original truth/status, validate no cycles/missing endpoints, and reject incompatible simultaneous replacements. Relationships must target atomic rule outcomes. If a generic rule mixes overridden and unaffected topics, split that rule into existing atomic rule architecture first; do not suppress unrelated requirements.
5. Preserve `truth` as evaluated. Proposed additive result metadata: `resolution: {state: "effective"|"suppressed"|"pending"|"conflicting", byRuleKeys, relationshipEvidence, missingFactKeys}`. Existing status may expose suppressed matches as NOT_MATCHED for compatibility, but the trace must explain TRUE+suppressed. No missing-input/citation loss when an unknown scope rather than unknown rule creates uncertainty.
6. `potentially_conflicts_with` must prevent contradictory definitive answers for the affected subject and require review. It currently only reports conflicts. Multiple verified overlays are permitted only where a complete reviewed bundle explicitly resolves their interactions; otherwise block affected guidance. An unknown/unsupported overlay is not ignored because a known overlay also matches.
7. Build effective citations after resolution: include controlling rule/provision, precedence citation and pending/review sources as qualified context. Preserve suppressed source trace for audit; do not present a suppressed generic provision as current permission.

For new overlay-compatible generic provisions, add explicit regulatory-context applicability guards as appropriate rather than globally changing every historical ordinary rule immediately. Ordinary no-overlay inputs and existing clean pilot fixtures must retain their existing outputs; missing overlay inventory for a newly interpreted NCOD property must fail closed. Version rollout must identify legacy ordinary-property evidence explicitly—never default all missing overlay facts to absent.

Do not change rule evaluation order to obtain precedence. Do not rely solely on exceptions suppressing MATCHED records while Guides still read their outcomes. Both engine resolution and card consumption are release gates.

## Source-versioned regulatory integration matrix

All rows below refer to archived CDC Volume II, Supplement 55 July 2026 (ordinances through 9857-25 enacted December 4, 2025), **not confirmed current law**. Exact excerpts, printed sections, line spans, hashes and GIS crosswalks: `research/gis/rule005-regulatory-evidence.v1.json`. Live City/Municode retrieval was denied by CONNECT proxy HTTP 403 on October 20, 2026. No Planning contact occurred.

| Overlay / Code section / evidence ID | Required scope/facts | Existing support and proposed integration | Unresolved legal gate |
|---|---|---|---|
| CR §2-1601.B–D / CR-BASE | LDR or LMDR; verified CR boundary | Explicit base+overlay identity; scope all CR rules; separate flexible/minimum standard tables for other projects | Current boundary, plans, amendments and parcel applicability |
| CR §2-1601.J.1 / CR-CHAIN | CR verified; chain-link or vinyl-coated chain-link material | New versioned material prohibition; replace applicable `chain_link.*` permissions and compatibility explanations | Current exceptions/variance/nonconforming status; do not invent one |
| CR §2-1601.J.2.a / CR-LDR | LDR; front-building-line or street-side-building-line interval; opacity/height/material/design | Conditional nonopaque ≤3ft provision; replace generic front/street-side permission; compatible design may require REVIEW_REQUIRED | “May be permitted” and compatibility cannot become automatic entitlement |
| CR §2-1601.J.2.b / CR-LMDR | LMDR; same specific project intervals | Location prohibition; replaces ordinary front/street-side permissions where applicable | J.2/J.3 interaction, corner frontage and site lines |
| CR §2-1601.J.3 / CR-SIDE | Side/rear, after J.1/J.2 checks | Reuse Division 8 general rules where overlay silent; never restore banned chain-link | Street-adjacent side limits and any City interpretation |
| CR §2-1601.G–K / CR-EXTERIOR | Project-specific driveway/parking/equipment | Record future project coverage gaps; no automatic shed/setback/pool unlock | Complete relevant exterior standards before expanding project coverage |
| IE §2-1602.A–C / IE-BASE | Actual geographic applicability and tract exclusions; district-specific scope | Separate IENCOD identity and source applicability gate | Four tract exclusions, current plans/atlas; GIS label not conclusive legal finding |
| IE §2-1602.D–F / IE-LMDR-USE | Exact use/base district and table/footnotes | Project coverage registry records supported scopes; no ordinary-base blanket readiness | Waterfront footnotes, density/use/shared rights |
| IE §2-1602.G.2 / IE-LMDR-FENCE | Single-family LMDR; structure-to-side lot line; rear setback-to-seawall interval | Side provision ≤6ft; require nonopaque fence in stated seawall interval; replace affected generic numeric/opacity guidance | Use eligibility; actual setback line/seawall/project position, not water proximity |
| IE §2-1602.H.2 / IE-MULTI-FENCE | Multifamily MDR/MHDR/HDR/C scope; same site facts | Independently scoped side-height and seawall-opacity requirements | Source HDR/condo identity alone cannot establish use, rights or individual project applicability |
| IE §2-1602.I / IE-INSTITUTIONAL | Institutional project/landscaping | Preserve known information and unsupported-project hold | Do not certify residential fence guidance on I merely by identifying overlay |
| IE §2-1602.G–I / IE-EXTERIOR | Parking/landscape/equipment/institutional scope | Versioned future coverage gaps/cards per project; not generic NCOD rule | Landscape exceptions and relevant use/project conditions |
| §3-803.A / FENCE-PRECEDENCE | Applicable overlay fence standards | Cited exception relationships; general Division 8 fills silence | Exact overlap with any other controlling provisions |
| §4-608.A / NCOD-PRIVATE | Municipal designation vs private restrictions | Keep HOA/covenant advisory separate | No assertion that City enforces private covenants |
| §2-1401 / OSR-SCOPE | OS/R district, not NCOD | Separate spatial district evidence and project suitability hold | Countywide land-use/project applicability; no residential alias |

Use existing `regulatory_sources`, `source_provisions`, `rule_versions`, `rule_citations`, `rule_version_inputs` and `rule_outcomes`. New legal verification produces new provision/rule versions, not overwritten excerpts. Mapping version, regulatory version and guidance approval version are independent. Unknown legal effective dates remain unknown; do not populate July compilation date as an ordinance effective date.

## Information-card change matrix

Keep one `buildClearwaterFenceGuide` and existing card identities/topics. Resolve generic/overlay variants from effective rule outcomes rather than duplicating an entire Guide per neighborhood. Proposed helper in `lib/guides/fence.ts`: resolve effective subject outcomes and return definitive/qualified/pending state with citations. It must be driven by evaluation result, not hard-coded overlay legal conclusions in JSX.

| Existing card/rule keys | Proposed conditional treatment |
|---|---|
| `height.front_baseline`, `design.front_landscape_strip` | Ordinary supported LMDR retains existing card. CR-LMDR prohibited interval gets cited location restriction, no 4ft permission or irrelevant buffer-to-maximum suggestion. CR-LDR gets qualified ≤3ft/nonopaque/design conditions. Unknown building line prompts confirmation |
| `height.side_rear_baseline` | Ordinary context unchanged. IE applicable side interval uses its scoped ≤6ft result; generic “side+rear” must not generalize an exclusively side provision to all rear locations |
| `chain_link.front_location`, `chain_link.side_rear_base_height`, `chain_link.side_rear_vinyl_height`, `chain_link.landscaping` | CR material prohibition replaces permissive chain-link/coating/landscaping answer. Conditions for ordinary zoning retained. No suggestion that coating cures CR prohibition |
| `waterfront.height`, `waterfront.opacity` | Keep general waterfront evidence; IE seawall interval adds controlling nonopacity. Missing setback/seawall line gives pending guidance, never an ordinary opaque-fence answer |
| `material.metal_prohibition` | Retain independent prohibition where applicable; do not suppress all material rules because one overlay prohibits chain-link |
| Visibility, `access.prohibited_area`, `access.utility_easement`, permits | Retain independent duties and unresolved inputs; overlay approval is not permission in easements/visibility areas or a permit waiver |
| Property context | Show known base and named overlay with source uncertainty, separately from spatial split notifier. HOA/private covenants use separate provenance and advisory |
| Ambiguous resolution / missing facts | Reuse informational resolution; retain exact code and mapped facts, explain affected unresolved topic and verified municipal referral. Do not supply uncited new referral claims |
| Other project Guides | No automatic base-code unlock for shed/pool/setbacks/ISR/STR; maintain per-project coverage gates until relevant overlay provisions are reviewed |

Readiness is project-specific: designation 1 requires complete relevant regulatory coverage and evidence; designation 2 additionally requires a meaningful actual secondary district with reliable primary starting guidance; designation 3 covers unavailable/conflicting/unsupported context. A known NCOD can modify designation 1 without creating designation 2. No new labels or card copy are shipped by this design.
