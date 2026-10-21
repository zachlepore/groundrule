# Stage C2: inactive archived Coachman Ridge fence bundle

C2 adds offline regulatory content, not resident readiness. The bundle is `coachman-ridge-fence-archived-v1`, based on C1 `c697027`. No rule publication, property fact adapter, approval, migration, Guide change or deployment is included. The 227 Rule 005 research candidates remain unapproved.

## Source and currency

Controlling current law **cannot be established**. On October 21, 2026, both the official [Municode Clearwater CDC](https://library.municode.com/fl/clearwater/codes/community_development_code) and [City Planning page](https://www.myclearwater.com/Business-Development/Planning-and-Zoning) returned CONNECT proxy HTTP 403 (`curl` exit 56). No text or amendment list was retrieved; these failures do not verify currency. No Planning communication was sent.

The only encoded legal edition is the repository's archived Volume II Supplement 55 (July 2026), ordinances through 9857-25 enacted December 4, 2025. Its SHA256 is `9745beac8988ab96c4b7bd67ce506d02d1bbd0a62ed0dc990e2abfa53d81b7a0`. CR pages retain Supplement 12 (2005) within this compilation. Neither that page vintage nor compilation month establishes the effective date or continuing currency of a provision.

[Evidence catalog](../../../research/rules/coachman-ridge-v1/evidence.json) contains original line spans, exact two-column source excerpts, excerpt checksums, immutable archive links and portable draft UUIDs. All source/rule/relationship legal effective dates remain null. October 21 is a **simulation as-of date**, not an ordinance date. General rules are literal reconstructions from the two pinned existing fence migrations, not a claim to have audited a live database. The legacy §28.06 rule retains its unverified Code of Ordinances provenance; it is not attributed to the CDC archive.

| Provision binding | Encoded significance |
| --- | --- |
| CR-BASE, §2-1601.B–D | LDR/LMDR base distinction and explicit overlay priority, limited to legally verified scope |
| CR-CHAIN, §2-1601.J.1 | Chain-link and vinyl-coated chain-link prohibited throughout CRNCOD |
| CR-LDR, §2-1601.J.2.a | Front/street-side intervals: nonopaque, at most three feet, compatible materials/design; **may be permitted**, never automatic permission |
| CR-LMDR, §2-1601.J.2.b | Prohibition in the front building-line/property-line interval and side building-line/street-adjacent property-line interval |
| CR-SIDE, §2-1601.J.3 | Article 3 Division 8 continues in side/rear; does not undo J.1/J.2 |
| FENCE-PRECEDENCE, §3-803.A | Overlay governs its subjects; Division 8 fills silence |
| GENERAL-DIV8 | Broader archived context for binding the original generic relationships; not new regulatory content |

## Reproduction and storage contract

```sh
python3 scripts/rules/extract-coachman-baseline.py --check
npx tsx scripts/rules/verify-coachman-draft.ts /tmp/coachman-draft
# Optional, verified existing lookup audit:
npx tsx scripts/rules/verify-coachman-draft.ts /tmp/coachman-draft /path/to/clearwater-approved-address-lookup.jsonl
npx tsx --test tests/coachman-ridge-draft.test.ts
```

The extractor reads literal SQL values only and never executes SQL. It snapshots all **51** checked-in generic fence rules (44 original plus seven resident permit/visibility rules), inputs, outcomes, citations and six relationships. It rejects a changed seed shape; `--check` fails if the checked-in snapshot differs. The builder checks both migration hashes, the extracted snapshot hash, the whole Code hash, every excerpt's bytes/line span/hash and Stage A's independently pinned canonical registry.

Outputs are the complete `coachman-ridge-fence.draft.json`, `before-after.json`, `validation.json` and `checksums.sha256`. Repeat runs have identical bytes and no generated timestamps/random IDs. These are regulatory artifacts; no generated GIS datasets enter Git. Before/after cases are synthetic projects, not legal findings about individual parcels.

The JSON uses existing `LoadedRuleSet`, `LoadedRule`, `RuleInput`, `Outcome`, `Citation`, `Condition` and `RuleRelationship` structures. Its storage mapping uses existing schema values: `research_status='draft'`, `lifecycle_status='withdrawn'`, `published_at=null`, and **rules.active_version_id=null**. There is no executable SQL or database client. Source UUIDs are reproducible **draft identifiers**, not claims that those UUIDs exist in Supabase. Any later publisher must reconcile canonical provision/version identities, verify legal dates/currency and obtain separate activation authorization. Never import this offline script or its fixture adapter into runtime.

## Rules and explicit precedence

Nine CR rules are added to the draft. Fifty-one original rules become **54** after two local atomic decompositions; the combined draft has **63 rules and 22 relationships** (six inherited, 16 new).

* `crncod.chain_link_prohibition` controls only seven generic chain-link height/exemption outcomes: ordinary/coated side-rear heights, vacant-lot height, recreation exemption and all three public-landbank atoms. Coating, recreation, vacancy or public landbank status cannot resurrect permission. Existing independent chain-link location prohibitions and conditional landscaping duties remain evidence, never a remedy for the ban.
* `crncod.interval_replacement` withdraws named numeric/landscape pathways in the prohibited/conditional interval. Its source-supported edges cite §2-1601.C, both J.2 district provisions and §3-803.A. Targets: front maximum, side/rear maximum, attached-dwelling maximum, landscape-strip pathway, waterfront maximum, two double-frontage maxima and subdivision perimeter height atom. There is **one** controller for these topics; separate LDR and LMDR controllers with unknown base would violate C1's competing-controller safety check.
* `crncod.lmdr_interval_prohibition` states the LMDR restriction. LDR height, nonopacity, compatibility review and conditional-pathway assessment remain separate. Height/opacity/compatibility completeness cannot turn “may be permitted” into entitlement. Even a complete qualifying LDR assessment is REVIEW_REQUIRED; missing necessary facts give UNKNOWN; excessive height/opacity cannot match the conditional pathway. Normative maximum/required-value outcomes describe restrictions, not completed compliance.
* `crncod.side_rear_general` preserves Division 8 and overlay caveats. Normal non-street side/rear maximum remains unchanged where its original conditions pass. Waterfront, access, visibility, finished-side, maintenance, safety and permit obligations remain independent.
* `crncod.wire_review` withdraws the generic wire-must-be-chain-link outcome when CR wire fencing is proposed. It requests review rather than inventing a new legal ban on every alternative wire material. The explicit chain-link prohibition remains separate.

Mixed `chain_link.public_landbank` is decomposed into maximum, vinyl-color requirement and landscaping-exemption atoms. Its inherited exemption edge now originates at the exemption atom. Mixed `subdivision.perimeter_height` becomes height and approved-plan review atoms; overlay withdrawal of its height **retains the independent plan review**. Conditions/outcome parameters are copied unchanged. No existing production keys are edited, and these draft decompositions are not a runtime migration.

Every edge binds exact version 1 endpoints, source provision UUID, excerpt SHA256 and edition. Publisher validation verifies pins against actual catalog excerpts before C1 checks the graph; matching forged pins are insufficient. C1 retains generic raw truth/outcomes/citations and adds suppression/pending traces. Invalid graphs, missing endpoints, version mismatch, cycles and competing controllers fail closed. Rule and relationship order does not control results.

## Minimum facts and questions

Evaluate each fence segment separately; a mixed project cannot flatten all locations into one favorable yard answer.

| Input | Authority and use |
| --- | --- |
| `property.zoning_district` | Trusted underlying LDR or LMDR; not suffix stripping |
| `property.overlay.crncod.applicability` | Trusted **legal** verified/absent determination. Stage A/B composite-code identity does not supply it |
| `project.is_chain_link`, `project.material`, `project.is_wire_fence` | Resident project material/type, including vinyl coating. Contradictory chain-link/material fixture facts are rejected |
| `fence.between_front_building_and_property_line` | Exact segment interval; site/building-line evidence required, unknown if unavailable |
| `fence.between_side_building_and_street_property_line` | Exact side interval **and** street adjacency; ask both location and whether that property line borders public street ROW. Not equivalent to generic side/rear |
| `project.location_zone` | Segment placement for the existing general rules; legal frontage may require City confirmation |
| `project.height`, `project.is_opaque` | Resident project dimensions/design; LDR pathway requires complete evidence |
| `project.crncod_architectural_compatibility_confirmed` | Official compatibility determination; not a resident yes/no certification |
| Existing general inputs | Waterfront interval, visibility triangle, utilities/easements, plans, special use/lot type and other existing conditions remain applicable |

The offline **fixture adapter** omits unknown/conflicting/unrecognized overlay states so they evaluate UNKNOWN instead of falsely implying absence. This does not implement a production adapter. Stage D must keep legal applicability, complete overlay inventory, source QA, human holds, project readiness and official decisions distinct. Missing/conflicting context cannot authorize ordinary permissions. Other overlays, unsupported bases and property holds require a routing gate, not a favorable CR evaluation. No building outlines, setbacks, legal frontage, resident fence locations or evaluator facts are derived from Stage B.

## Exact Stage D card requirements (not implemented)

All references below are to `lib/guides/fence.ts` and existing card keys. `allRules()` indexes every status bucket; merely finding a rule or reading its numeric outcome is insufficient. Status/resolution-aware consumption is a release gate.

| Existing card / generic source | CR treatment and effective status | Needed facts | Citation |
| --- | --- | --- | --- |
| `height.front_baseline` / `maximum project.height` | LMDR interval: replace four-foot answer with prohibition; LDR interval: qualified nonopaque ≤3ft REVIEW_REQUIRED; unknown scope: pending, no ordinary permission | Both building-line intervals, verified overlay/base; height/opacity and compatibility for LDR | §2-1601.J.2.a/b; §3-803.A |
| Front card's `design.front_landscape_strip` / `minimum project.landscape_strip_width` | Remove buffer-to-full-maximum suggestion when interval-controlled; a landscape strip cannot cure LMDR prohibition or enlarge LDR three-foot pathway | Interval and ordinary strip facts | Same J.2 clauses |
| `height.side_rear_baseline` / `maximum project.height` | Street-side interval gets the same LMDR/LDR treatment; verified non-street side/rear keeps general standard with J.1/J.2 caveats; unknown interval pending | Side street adjacency plus segment/building lines, water facts | §2-1601.J.2–3; §3-804.B |
| `specific.chain_link` / front-location, standard/coated height, landscaping | Replace permissive four/six-foot and coating text with CR material prohibition. Current string is assembled from outcomes across all buckets; do not retain a generic coating/landscaping workaround. Unknown overlay: unresolved material topic | Legal CR scope, material/type | §2-1601.J.1; §3-803.A |
| Recreation/vacant/public-landbank pathways | No CR exemption from the material prohibition; consume effective atom/exemption status, never raw outcome | Material and existing use facts | §2-1601.J.1; §3-805.E–G for raw trace |
| Subdivision/frontage numeric answers | Do not restore generic six-foot pathways inside controlled interval. Keep approved-plan and frontage review independently unresolved where applicable | Interval, lot type, City review/approved plan | §2-1601.J.2; §§3-804.C–D, 3-807 |
| `material.metal_prohibition` / sheet-metal outcome | Keep independent material restriction; current fixed answer runs on rule existence even NOT_MATCHED. Stage D must distinguish standing normative advice from project result and display CR ban separately | Project material plus effective status | §3-802; §2-1601.J.1 for CR-specific ban |
| `visibility.triangle_restriction` / maximum + opacity | Retain independent visibility constraints; current card reads outcomes without status. A compliant triangle fence is not permission in a prohibited CR interval | Trusted triangle intersection/exception plus project height/opacity and CR interval | §3-904.A **and** §2-1601.J.2 where relevant |
| `specific.water_adjacent` | Keep waterfront confirmation; current hardcoded card appears on rule existence. Never present four feet as an exception to CR restriction; preserve pending applicability | Waterfront line, setback, segment interval | §§3-804.B.3, 2-1601.J.2–3 |
| `specific.easement` / access rules | Preserve independent external review; current hardcoded text appears by rule existence, not status. CR guidance cannot authorize utility/ROW interference | Easement/ROW/utility geometry and official authorization | §3-806 |
| Permit cards | Existing MATCHED gate remains; no waiver based on overlay, QC or guidance approval | Structure type; existing review context | §4-203; §47.111 |
| `specific.government_adjacent` | Unconditional fixed text has no citations. Do not convert it into a CR legal claim; separately verify source and applicability before a definitive assertion | Government adjacency and applicable source | Existing card has none: unresolved source gate |
| `propertyContext` | Currently only `Zoning · BASE`. Add separately evidenced named overlay and applicability uncertainty; keep private covenants, split notifier and ownership caveats independent | Trusted interpretation and legal context | §2-1601.B–C; separate private-restriction sources |
| Unresolved/missing-fact topics | Suppressed/pending generic raw outcomes must never populate favorable cards; show exact needed confirmation and controlling citations, not an uncited new permission | Effective resolution plus required inputs | Controlling overlay and general provisions |

## Remaining interpretation and activation blockers

1. Obtain current official Code/amendments and reconcile the archived compilation; no claim of current regulatory completeness is made.
2. Confirm legal CR boundary and underlying district, official building/property lines and street frontage. A Stage B source-identified overlay is not a legal applicability decision.
3. Resolve LDR “may be permitted,” architectural compatibility and relevant approval procedure with the City. No automatic LDR entitlement is encoded, even if a fixture supplies compatibility=true.
4. Confirm treatment of walls/retaining walls/entry features, existing/nonconforming fences, special approvals, variances and J.2/J.3 corner/frontage interactions before exposing those project pathways. The draft does not invent an overlay exception for them or treat numeric general restrictions as a legal entitlement.
5. Reconcile any other overlay, incomplete inventory, shared ownership or human/source holds before readiness. CR content alone cannot certify a property or all exterior projects.
6. Stage D should be limited to status/resolution-aware fence cards and scoped prompts with synthetic fixtures. A separately authorized legal/fact/publication gate must still precede runtime NCOD facts or activation. No Island Estates content, information-card redesign for other projects or Rule 005 membership approval is part of this recommendation.

## Validation

See the committed [validation summary](../../../research/rules/coachman-ridge-v1/validation.json) and [before/after examples](../../../research/rules/coachman-ridge-v1/before-after-summary.json). The complete export has checksums and provenance. Focused tests cover ordinary/no-overlay Guides, LDR/LMDR differences, chain-link/coating, location unknowns, missing legal applicability, independent obligations, atomic exclusions, source tampering, graph failures and ordering. Broader suites cover C1, questions, properties, all existing Guides, Rules 001–004, GIS and Stage A/B.

**Final results:** 348 tests passed, zero failed/skipped (216 engine/questions/Guides/Stage A/C1 including 40 focused C2 tests; 22 loader/property/jurisdiction; 108 GIS/Rules 001–004/Stage B; two geometry tests). TypeScript and targeted ESLint passed. Eight synthetic before/after scenarios were exported. All four generated export files matched byte-for-byte on repeat. The frozen source ZIP and all nine Stage B output files were rehashed successfully.

| Immutable baseline | Verified |
| --- | ---: |
| Original profiles / unique address identities | 63,430 / 63,430 |
| Rule 001 / 002 / 003 / 004 approvals | 1,967 / 262 / 731 / 364 |
| Total prior approvals | 3,324 |
| Remaining unapproved REVIEW | 17,014 |
| New approvals / original zoning or QA changes | 0 / 0 |

These counts are read-only checks of the already validated export; C2 does not regenerate GIS classifications. Original lookup SHA256 is unchanged at `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`. Branch: `codex/ncod-stage-c2-coachman-draft`, intended draft-PR base: `codex/ncod-stage-c1-precedence`.
