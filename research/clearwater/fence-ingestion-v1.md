# Clearwater Fence Ingestion v1

## Ingestion decision

This ingestion converts the supported portion of
`research/clearwater/fence-rule-package-v1.md` into the implemented generalized
municipal-rule schema. It is a limited-coverage dataset, not a complete statement
that a fence is permitted. It does not resolve permits, private restrictions,
special-district design documents, pool-barrier technical law, missing sight-triangle
geometry, or parcel-specific official facts.

Repository prerequisites were checked before authoring. All four required files are
present and readable. The schema architecture concludes **READY FOR SCHEMA
IMPLEMENTATION**, and the fence package concludes **READY WITH LIMITED OPEN
DEPENDENCIES**. The seed targets the columns, checks, triggers, and controlled values
in `20260822000000_create_municipal_rule_schema.sql`; it does not target an earlier
conceptual design.

## Implemented schema inspected

The migration implements exactly 13 content tables:

| Table | Important implemented fields used or considered |
|---|---|
| `jurisdictions` | `slug`, `name`, `jurisdiction_type`, `state_code`, parent, metadata, active state |
| `project_types` | reusable `key`, label, description, active state |
| `rule_sets` | jurisdiction/project FKs, key, scope, coverage/research status, effective/publication dates, gaps |
| `regulatory_sources` | jurisdiction, controlled source type, title/body, edition and currency dates, URL/checksum/metadata |
| `source_provisions` | source FK, locator/display locator, title, excerpt, URL/anchor/page/checksum, verification notes |
| `input_definitions` | global key, type/unit, enum scope, source class, GIS/user/authority flags, validation |
| `input_options` | definition FK, optional jurisdiction scope, option key/label, validity and metadata |
| `rules` | rule-set FK, stable key/title/group, legacy traceability key, active-version pointer |
| `rule_versions` | version number, validated condition AST, evaluation/research/lifecycle state, summary/notes, effective/publication fields |
| `rule_outcomes` | ordered controlled outcome type, optional subject input, structured parameters, severity and message |
| `rule_version_inputs` | version/input manifest, applicability/compliance role, required/authority metadata |
| `rule_citations` | version/provision join, controlled citation role, pinpoint note and ordering |
| `rule_relationships` | directed rule pair, controlled relationship type, optional validated scope, authority/rationale and effective interval |

The publication constraints require verified and effective active versions, at least
one outcome, and at least one primary citation. Published versions and their child
rows are immutable. The seed therefore creates version 1 without publication,
creates its outcomes/input manifests/citation, and publishes it only afterward.

## Package structure and status

The migration creates:

* jurisdiction `clearwater-fl` (`Clearwater, Florida`), independently of the legacy
  `municipalities` table;
* reusable project type `fence`;
* limited rule set `clearwater_fence_v1`;
* 44 atomic runtime rules, each with one initial version, at least one structured
  outcome, a complete condition/input manifest, and a primary provision citation;
* six supported precedence, exemption, or conflict relationships; and
* 60 reusable input definitions with 47 options across eight enums.

The rule set and versions use **2026-08-23** as the initial dataset applicability
and publication anchor. This is deliberately not presented as the enactment date of
every underlying provision and does not create fake history. The source compilation's
supported December 4, 2025 ordinance cutoff is retained separately as source
metadata. Version number `1` is used consistently, with no historical or overlapping
versions.

## Regulatory sources and provisions

### Sources

1. **Clearwater Community Development Code** — `code`; City of Clearwater; Volume
   II, Supplement No. 55 (July 2026); package-supported compilation statement through
   Ordinance No. 9857-25, enacted December 4, 2025.
2. **Clearwater Code of Ordinances** — `code`; City of Clearwater; deliberately no
   fabricated edition, date, or URL. Its currentness limitation is explicit.

The repository package provides no supported canonical URL, so neither source nor
provision rows fabricate one.

### Provisions

The migration creates minimally sufficient, review-oriented provision rows for CDC
§§ `3-801`, `3-802`, `3-803`, `3-804`, `3-805`, `3-806`, `3-807`, `3-808`, `3-904`,
`3-1202.F`, and `8-102`, plus Code of Ordinances § `28.06`. Excerpts are concise
reconstructions from the research package rather than large code dumps, and their
notes require consultation of official text before legal reliance.

## Input definitions

The input keys below are the complete created set. `property.*` facts are generally
property-derived or official; `project.*` facts are user-provided, derived, or
official as indicated in SQL. Spatial facts are marked GIS-derivable only where that
is conceptually possible, while authoritative-source flags prevent GIS availability
from being mistaken for legal reliability.

### Proposal, material, and design

`project.structure_type`, `project.material`, `project.is_wire_fence`,
`project.has_exposed_top_points`, `project.in_required_setback`,
`project.supports_face_inward`, `project.finished_side_faces_outward`,
`project.street_plane_length`, `project.long_plane_treatment_reviewed`,
`project.location_zone`, `project.height`, `project.landscape_strip_width`,
`project.landscape_strip_waived`, `project.is_opaque`,
`project.combined_height`, `project.applicable_maximum_height`,
`project.entry_component_type`, `project.entry_component_height`,
`project.entry_side_extension`, and `project.entry_face_projection`.

### Property and special location

`property.zoning_district`, `property.is_water_adjacent`,
`project.in_waterfront_protected_area`, `property.is_attached_dwelling_lot`,
`project.uniform_boundary_exception_approved`,
`project.is_detention_pond_retaining_wall`,
`project.engineering_height_exception_approved`, `property.is_downtown`,
`property.has_principal_structure`, `property.is_vacant_lot`,
`property.is_public_landbank`, `property.is_residential_subdivision_perimeter`,
`property.lot_frontage_type`, `property.rear_orientation_conditions_met`,
`property.rear_abuts_arterial_or_collector`, and
`property.is_recreational_facility`.

### Chain-link, access, approvals, maintenance, and work scope

`project.is_chain_link`, `project.is_rear_of_front_building_line`,
`project.adjacent_to_public_row`, `project.vinyl_color`, `project.is_developed`,
`project.intersects_prohibited_access_area`, `project.city_engineer_authorized`,
`project.in_utility_easement`, `project.utility_access_approved`,
`project.subdivision_plan_compliance_approved`, `project.lean_angle`,
`project.designed_lean_permitted`, `project.maintenance_review_passed`,
`project.work_type`, `property.is_legal_nonconforming_fence`,
`project.replaces_posts`, `project.adjacent_to_street_alley_sidewalk`,
`project.material_appropriateness_approved`,
`project.decorative_finish_approved`, `project.safety_material_review_passed`,
`project.maintenance_access_approved`, `project.chain_link_landscaping_approved`,
`project.temporary_construction_fence`, and `project.building_official_approval`.

Enums have only source-useful options: structure type, material, segment location,
Clearwater zoning district, entry component type, vinyl color, work type, and lot
frontage type. No input for unresolved pool hardware, invented street-side rules,
or unsupported permit logic was added.

## Candidate classification and traceability

“Runtime” below means a published version that can yield a requirement, limitation,
warning, permission pathway, exemption, approval requirement, or manual-review
finding. A manual-review runtime rule does **not** automatically pass or fail the
proposal. Held and informational candidates create no rule/version rows.

| Candidate | Production rule ID(s) | Classification/status | Primary source provision(s) |
|---|---|---|---|
| CLR-FENCE-001 | `material.metal_prohibition` | INGEST AS ATOMIC RULE | § 3-802 |
| CLR-FENCE-002 | `material.wire_chain_link_required`; `material.exposed_top_prohibition` | SPLIT INTO MULTIPLE ATOMIC RULES; top rule remains partial and warns of conflict | §§ 3-802.F–G |
| CLR-FENCE-003 | `design.finished_side`; `design.support_orientation` | SPLIT INTO MULTIPLE ATOMIC RULES; blocked-access exception requires review | §§ 3-803.B–C |
| CLR-FENCE-004 | `design.long_street_plane` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED | § 3-803.D |
| CLR-FENCE-005 | `height.front_baseline` | INGEST AS ATOMIC RULE | § 3-804.A |
| CLR-FENCE-006 | `design.front_landscape_strip` | INGEST AS ATOMIC RULE; official waiver input supported | §§ 3-804.A, 3-804.C.4 |
| CLR-FENCE-007 | `height.side_rear_baseline` | INGEST AS ATOMIC RULE | § 3-804.B |
| CLR-FENCE-008 | `height.irt_side_rear` | INGEST AS ATOMIC RULE | § 3-804.B.1 |
| CLR-FENCE-009 | `waterfront.opacity`; `waterfront.height` | SPLIT INTO MULTIPLE ATOMIC RULES | § 3-804.B.3 |
| CLR-FENCE-010 | `height.attached_dwelling` | INGEST AS ATOMIC RULE; official exception fact required | § 3-804.E |
| CLR-FENCE-011 | `height.retaining_wall` | INGEST AS ATOMIC RULE; official exception fact required | § 3-804.F |
| CLR-FENCE-012 | `height.combined_components` | INGEST AS ATOMIC RULE; depends on separately derived applicable maximum | § 3-804.G |
| CLR-FENCE-013 | `entry.height`; `entry.side_extension`; `entry.face_projection` | SPLIT INTO MULTIPLE ATOMIC RULES; “similar” classification remains official | § 3-804.H |
| CLR-FENCE-014 | `chain_link.downtown_prohibition` | INGEST AS ATOMIC RULE | § 3-805.A |
| CLR-FENCE-015 | `chain_link.front_location` | INGEST AS ATOMIC RULE | § 3-805.B |
| CLR-FENCE-016 | `chain_link.side_rear_base_height`; `chain_link.side_rear_vinyl_height`; `chain_link.public_row_prohibition` | SPLIT INTO MULTIPLE ATOMIC RULES | § 3-805.C |
| CLR-FENCE-017 | `chain_link.vacant_lot_height`; `chain_link.vacant_lot_removal` | SPLIT INTO MULTIPLE ATOMIC RULES; vacancy/development classification remains authoritative | § 3-805.F |
| CLR-FENCE-018 | `chain_link.public_landbank` | SPLIT INTO MULTIPLE STRUCTURED OUTCOMES in one atomic applicability rule | § 3-805.G |
| CLR-FENCE-019 | `access.prohibited_area` | INGEST AS ATOMIC RULE with prohibition and approval-required outcomes | §§ 3-806.A–B |
| CLR-FENCE-020 | `access.utility_easement` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED | § 3-806.C |
| CLR-FENCE-021 | — | HOLD — EXTERNAL AUTHORITY REQUIRED (official horizontal sight-triangle geometry) | §§ 3-803.F, 3-904.A |
| CLR-FENCE-022 | — | HOLD — EXTERNAL AUTHORITY REQUIRED (official waterfront triangle geometry) | § 3-904.B |
| CLR-FENCE-023 | — | INFORMATIONAL / NON-EVALUATIVE for CDC text; HOLD — EXTERNAL AUTHORITY REQUIRED for pool-barrier answer | § 3-807.A |
| CLR-FENCE-024 | `subdivision.perimeter_height` | INGEST AS ATOMIC RULE with plan-conflict review | § 3-807.C.2 |
| CLR-FENCE-025 | `maintenance.lean`; `maintenance.condition` | SPLIT INTO MULTIPLE ATOMIC RULES; qualitative duties require inspection | §§ 3-808.A.1–6 |
| CLR-FENCE-026 | `repair.nonconforming_boards` | INGEST AS ATOMIC RULE / permission pathway | § 3-808.B |
| CLR-FENCE-027 | `barbed_wire.street_adjacency` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED for unquantified “adjacent” | Code § 28.06 |
| CLR-FENCE-028 | `materials.appropriateness_review`; `materials.wall_finish_review`; `materials.safety_review` | SPLIT INTO MULTIPLE ATOMIC RULES; HUMAN / ADMINISTRATIVE REVIEW REQUIRED | §§ 3-802.A–D |
| CLR-FENCE-029 | — | HOLD — RESEARCH GAP (barbed-wire/top-wire interaction); no approval inferred | § 3-802.E; Code § 28.06 |
| CLR-FENCE-030 | `design.maintenance_access` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED | § 3-803.E |
| CLR-FENCE-031 | — | HOLD — EXTERNAL AUTHORITY REQUIRED (approvals and incomplete special-district/Beach by Design standards) | §§ 3-804.A.1–4 |
| CLR-FENCE-032 | `frontage.corner_multi_review` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED | § 3-804.C |
| CLR-FENCE-033 | `frontage.double_rear_four`; `frontage.double_rear_six` | SPLIT INTO MULTIPLE ATOMIC RULES; authoritative orientation/street classification needed | § 3-804.D |
| CLR-FENCE-034 | `chain_link.landscaping` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED | §§ 3-805.D, 3-1202.F |
| CLR-FENCE-035 | `chain_link.recreation_exemption` | INGEST AS ATOMIC RULE / exemption; “similar use” remains official | § 3-805.E |
| CLR-FENCE-036 | `subdivision.plan_uniformity` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED | § 3-807.C.1 |
| CLR-FENCE-037 | `construction.temporary_approval` | HUMAN / ADMINISTRATIVE REVIEW REQUIRED / approval pathway | § 3-807.D |

## Conditions and outcomes

All conditions use only the implemented AST operators: `all`, `any`, `not`,
`is_true`, `is_false`, `is_known`, `eq`, `neq`, `gt`, `in`, and `not_in`.
Every fact key is declared in `rule_version_inputs`; comparison literals match their
input types, and numeric comparisons carry the canonical unit. No sight-triangle
geometry, variable-to-variable comparison operator, or undocumented evaluator
semantic was embedded.

Outcomes preserve structured distinctions among `prohibition`, `maximum`, `minimum`,
`required_value`, `obligation`, `permission_pathway`, `exemption`,
`approval_required`, `manual_review_required`, and `warning`. Numeric limits use
`parameters.value` plus a unit. The combined-height rule uses a documented
`value_fact` parameter because the schema accepts structured parameters but the MVP
condition AST cannot compare two facts; evaluator support for that outcome parameter
must precede automatic use of that particular rule.

## Relationships

The seed records only package-supported relationships: waterfront and chain-link
rules are more specific than ordinary height rules; vinyl chain-link is more
specific than its base height; recreation exempts the chain-link front restriction;
public landbank fencing is exempt from landscaping; and the exposed-top rule is
flagged as potentially conflicting with the unresolved barbed-wire treatment.

## Schema friction and safeguards

* The AST has no fact-to-fact comparison. `height.combined_components` therefore
  carries the applicable maximum as a structured outcome fact reference and is not
  silently encoded with a nonexistent operator.
* The schema has no candidate-status table. Candidate IDs and split annotations are
  preserved in `rules.legacy_key`, version research notes, citation pinpoint notes,
  relationship metadata, and this matrix. Held candidates remain report-only so
  they cannot leak into runtime selection.
* A published rule set requires an effective date even though the package supports
  a compilation cutoff, not a unique legal effective date for every provision. The
  seed uses its first publication/applicability date and preserves the older source
  cutoff only as metadata.
* Published-child immutability means an ordinary upsert is unsafe on re-run. Child
  inserts are gated to unpublished versions, publication updates are gated to rows
  with null `published_at`, and all stable parents use natural-key conflict handling.
* No source URL, retrieval date, exact Code of Ordinances edition, official figure,
  or legal effective date was invented.

## Validation summary

Static checks verify the 13 target table names and all referenced columns against the
implemented schema, parent-before-child FK ordering, enum/check values, condition
shapes, fact/input parity, citation coverage, and publication ordering. All 44
published versions receive at least one outcome and exactly one primary citation.
The five held candidates (21, 22, 23, 29, and 31, with 23 carrying two classifications)
have no rule/version row. The migration contains no write to `municipalities`, and
the repository change set contains no application or UI file.

## Manual Supabase SQL Editor steps after merge

1. Open the intended Supabase project and confirm it is the correct environment.
2. Confirm migration `20260822000000_create_municipal_rule_schema.sql` has already
   been applied and the 13 generalized tables exist.
3. Open `supabase/migrations/20260823000000_seed_clearwater_fence_rules.sql` from the
   merged commit and review it without editing identifiers, dates, or transaction
   boundaries.
4. In **SQL Editor**, create a new query, paste the entire migration, and select
   **Run** once. Do not split the transaction.
5. Confirm the query commits without a deferred constraint error.
6. Verify one `clearwater-fl` jurisdiction, one `fence` project type, one published
   `clearwater_fence_v1` rule set, 44 rules with 44 published active version-1 rows,
   no published version lacking an outcome or primary citation, and six active
   relationships.
7. Re-run the same complete SQL once in a review/staging project if an idempotence
   check is desired; row counts must remain unchanged.
8. Confirm the existing legacy `municipalities` row count and contents are unchanged.

READY TO APPLY CLEARWATER SEED MIGRATION
