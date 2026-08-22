# Groundrule Generalized Municipal Rule Schema v1

## 1. Decision summary and design principles

This document proposes a normalized, practical Postgres/Supabase model for municipal
property rules. It is an architecture proposal, not migration SQL or executable rule
logic. The Clearwater fence package's 37 candidates are the first acceptance test,
not the schema's vocabulary.

The repository currently has a small Next.js server-side integration that reads
`name,state` from `public.municipalities`; it has no rule, parcel, GIS, or regulatory
schema. The implementation should preserve that working boundary while introducing
the generalized model incrementally. In particular, clients should not receive a
service-role key and the browser should not become the rule engine.

The design follows these principles:

1. **No permission by silence.** No matching prohibition is not an approval. A result
   is complete only when the relevant rule set and required authorities are complete.
2. **Facts are typed; expressions are generic.** Stable inputs are relationally
   defined, while each versioned rule condition is a constrained JSONB expression.
3. **Rules report findings, not one universal verdict.** Multiple applicable rules
   produce independently cited findings that are combined conservatively.
4. **Authority and interpretation are separate.** Source provisions preserve what an
   authority says; rule versions preserve Groundrule's interpretation of it.
5. **Unknown is first-class.** Missing facts, unavailable external authority,
   discretion, conflicts, and unsupported geometry never collapse to `false`.
6. **Published versions are immutable.** Corrections create versions and preserve the
   source/version basis of prior answers.
7. **A deliberately small vocabulary.** Municipal concepts live in data and input
   values, not new tables or code branches.

## 2. Core entities

The smallest coherent model has the following entities.

| Entity | Why it exists | Why it is (or is not) separate |
|---|---|---|
| `jurisdictions` | Identifies the authority/geographic scope whose law can apply, including municipality now and county/state/agency later. | Generalizes the existing municipality concept; parentage supports nested authority without municipality-specific columns. |
| `project_types` | Stable product taxonomy such as `fence`, `shed`, or `pool`. | Rules can be selected generically and projects can grow without tables per use case. |
| `rule_sets` | A publishable coverage package for one jurisdiction/project pair, with scope, completeness, and currency. | This is the unit for candidate selection and “absence is not permission.” It also holds research publication state. |
| `regulatory_sources` | Identifies a document/edition: code, ordinance, plan, standard, policy, or external code. | Document metadata should not be duplicated across provisions. |
| `source_provisions` | Addressable excerpts such as § 3-804.B within a specific source edition. | Supports many-to-many provenance and precise citations. |
| `rules` | Stable identity and machine key for a legal proposition through revisions. | Separates identity from immutable interpretation versions. |
| `rule_versions` | One immutable condition, evaluation classification, message, and lifecycle state. | Holds the JSONB rule expression and lightweight history. |
| `rule_outcomes` | One or more structured effects/findings produced by a rule version. | Rows are useful because a provision can produce multiple independent effects (height plus opacity, obligation plus warning). |
| `input_definitions` | Reusable typed fact vocabulary independent of municipality. | Prevents every rule from inventing labels, units, validation, or fact semantics. |
| `input_options` | Allowed categorical values, optionally scoped to a jurisdiction. | Keeps global input identity stable while allowing Clearwater/Tampa zoning vocabularies. |
| `rule_version_inputs` | Declares a version's required/optional facts and role. | Enables questionnaires, GIS requests, completeness checks, and static validation without parsing JSON for every query. |
| `rule_citations` | Many-to-many link between rule versions and provisions. | A rule can depend on several provisions and a provision can support many rules. |
| `rule_relationships` | Typed, directed links for exceptions, dependencies, conflicts, and narrow precedence. | Avoids separate exception/dependency/precedence tables and avoids pretending to model all legal reasoning. |

There is no separate table for atomic conditions: the JSONB expression tree is their
natural aggregate and must be loaded together. There is no generic entity-attribute-
value table for project answers in this design; runtime facts may initially be a
typed in-memory fact map. Persisted projects/answers/audit snapshots are a later
feature. There is also no `confidence`, `exception`, or `administrative_rule` table:
those are version attributes, expression branches, relationships, or outcomes.

## 3. Rule representation

### 3.1 Hybrid model (recommended)

Use **C: a hybrid approach**:

* relational rows for identity, jurisdiction/project selection, lifecycle,
  input definitions, outcomes, citations, and inter-rule relationships;
* one constrained JSONB abstract syntax tree (AST) in `rule_versions.condition` for
  nested applicability logic; and
* JSONB only for structures whose shape genuinely varies (`validation`, structured
  outcome parameters, and source metadata), never as an ungoverned document dump.

Fully normalized condition rows make nested `(A AND B) OR (C AND NOT D)` trees
awkward: they require group identifiers, ordering, recursion, and multi-row edits for
one semantic object. Pure JSONB hides foreign keys, typed input discovery,
provenance, and candidate selection. The hybrid stores expression ergonomically but
duplicates every referenced input in `rule_version_inputs`; publication validation
must reject a mismatch, unknown operator, wrong operand type, or unknown input key.

### 3.2 Expression DSL

The MVP AST has only these nodes:

```json
{"all": [EXPR, EXPR]}
{"any": [EXPR, EXPR]}
{"not": EXPR}
{"fact": "project.material", "op": "eq", "value": "corrugated_sheet_metal"}
{"fact": "project.height", "op": "lte", "value": 4, "unit": "ft"}
{"fact": "property.zoning_district", "op": "in", "values": ["irt"]}
{"fact": "property.waterfront", "op": "is_true"}
{"fact": "project.segment_distance_to_water_line", "op": "lte_fact_max",
 "facts": ["constant.20_ft", "property.required_waterfront_setback"]}
{"fact": "official.city_engineer_authorization", "op": "is_unknown"}
```

Supported comparisons are `eq`, `neq`, `in`, `not_in`, `lt`, `lte`, `gt`, `gte`,
`between` (explicit inclusive flags), `is_true`, `is_false`, `is_known`, and
`is_unknown`. MVP should prefer a derived fact for spatial or cross-fact calculations
(for example `project.in_required_setback`) rather than make the DSL a GIS language.
`lte_fact_max` above illustrates a later typed fact-to-fact comparison; for MVP the
same waterfront test should be supplied as the derived boolean
`project.in_waterfront_protected_area` with derivation provenance.

Evaluation uses four internal states: **true, false, unknown, error**. `unknown`
propagates through three-valued Boolean logic and means “cannot establish,” never
“does not apply.” `error` means invalid rule/fact data and blocks a supported answer.
Units are canonicalized before evaluation (feet/inches to a configured canonical
length); unit conversion is generic application logic.

### 3.3 Applicability versus compliance

`condition` answers only whether the rule applies. Outcomes express what follows:

```json
{
  "outcome_type": "maximum",
  "subject_key": "project.height",
  "parameters": {"value": 4, "unit": "ft", "inclusive": true},
  "severity": "requirement"
}
```

The evaluator compares the subject fact to parameters for recognized objective
outcome types. MVP outcome types are:

* `prohibition`, `permission_pathway` (never a global permission), and `exemption`;
* `maximum`, `minimum`, `range`, and `required_value`;
* `obligation` (structured where possible, explanatory otherwise);
* `approval_required`, `external_authority_required`, `manual_review_required`;
* `information` and `warning`.

`subject_key` references an input key where the effect tests a fact. Multiple outcome
rows allow CLR-FENCE-009 to emit both a four-foot maximum and required non-opacity.
Outcome `parameters` are validated by outcome type. `message_template` is reviewed
language, not executable code. Templates interpolate only allowlisted fact/result
tokens.

### 3.4 Exceptions, dependencies, and information

* An objective conditional exception is an `any`/`not` branch in the same condition
  when it changes applicability.
* A separately meaningful exception is its own rule version and an `excepts`
  relationship to the baseline (CLR-FENCE-035 versus CLR-FENCE-015/016). This keeps
  both citations and findings visible.
* `depends_on` means a rule cannot be concluded until another named rule/finding is
  evaluated. `incorporates` marks external authority. Neither silently imports text.
* `overrides`/`more_specific_than` may resolve only an explicitly researched pair.
* Administrative approval is an `approval_required` outcome, optionally alongside
  an objective maximum. Qualitative judgment yields `manual_review_required`.
* Informational rules use `evaluation_mode = 'informational'`: they are selected and
  cited but never treated as pass/fail.

Rule-to-rule references use stable `rules.id`, plus an optional version constraint in
relationship metadata. Publishing checks prevent cycles for relationships with
evaluation semantics; explanatory `related_to` cycles are harmless.

## 4. Input system

### 4.1 Definition shape

Each input is defined once with a namespaced stable key such as
`property.zoning_district`, `project.height`, or
`official.city_engineer_authorization`. Recommended fields are:

* `key`, `label`, `description`;
* `data_type`: `boolean`, `integer`, `decimal`, `text`, `enum`, `date`, `geometry`,
  or `json` (JSON is exceptional and requires a schema);
* `unit_dimension` and `canonical_unit` (for example `length`/`ft`,
  `angle`/`degree`), nullable;
* `value_scope`: `global` or `jurisdiction` for enums;
* `default_source_class`: `property_derived`, `user_provided`, `official_decision`,
  `derived`, or `either`;
* `gis_derivable`, `user_input_allowed`, `authoritative_source_required`;
* `validation` JSONB (min/max, precision, regex, geometry type/SRID), and lifecycle
  status.

An actual fact must carry value, input definition, source class, provenance/reference,
observed/effective time, and confidence/verification. That fact envelope can remain
in server memory for MVP; storing only a naked value would make GIS and user claims
indistinguishable.

### 4.2 Property-derived versus user-provided

The Clearwater package suggests these reusable families (not an exhaustive seed
list):

| Property/official-derived | User/project-provided |
|---|---|
| jurisdiction; zoning district; overlay/design district | work type (new, repair, board replacement, temporary) |
| parcel/lot/frontage type; attached dwelling; addressed frontage | structure/fence/wall type and material |
| parcel, structure, setback, water-line, ROW, easement, facility, and official sight-triangle geometry | proposed segment geometry and height |
| waterfront and subdivision perimeter status | finish, opacity/open style, cladding/color, top treatment |
| street classification and public-ROW adjacency | gate/opening and entry-component dimensions |
| vacant/developed, ownership/landbank, recreational use | landscape design and orientation of finished side/posts/stringers |
| approved subdivision plan and existing official approvals | purpose (pool, security, recreation, construction, etc.) |
| neighboring/across-street orientation (often manual official fact, not reliable GIS) | requested approval pathway and any approval document supplied |

“Property-derived” does not imply trustworthy automation. Easements, setbacks,
frontage, subdivision plans, and sight triangles may require surveys or official
records. A user can be allowed to supply a tentative value while the fact envelope
marks it unverified; a rule can require authoritative provenance through
`rule_version_inputs.authority_requirement`.

### 4.3 Jurisdiction-specific zoning

`property.zoning_district` is one global enum input. `input_options` supplies rows
such as `irt` with `jurisdiction_id = Clearwater`, local display label, validity
dates, and optional metadata. Tampa may use completely different option keys without
changing the input or evaluator. Rules compare stable option IDs/keys, not display
text. A separate global `property.use_category` should represent normalized use
concepts when needed; never pretend local zoning districts are globally equivalent.

## 5. Regulatory provenance

`regulatory_sources` records jurisdiction, source type, title, issuing body, canonical
URL, edition/supplement label, publication/effective/repeal dates, retrieved and
verified dates, checksum, and document-level notes. A new official compilation is a
new source row rather than an in-place overwrite.

`source_provisions` records the source, normalized locator (`3-804.B.3`), display
locator (`§ 3-804.B.3`), heading/title, exact or bounded excerpt, page/anchor, direct
URL when available, verification date, excerpt checksum, and notes. Copyright and
storage policy may require retaining only a bounded excerpt plus checksum/locator.

`rule_citations` connects a rule version to every supporting provision with
`citation_role` (`primary`, `definition`, `exception`, `cross_reference`,
`conflicting`, `external_dependency`) and an explanatory note. Thus CLR-FENCE-029 can
cite both § 3-802.E and Code § 28.06, while either provision can support other rules.
Displayed findings cite these provision records, never just the rule's prose.

## 6. Research state versus runtime rule state

These are different axes:

* **Research state** answers whether an interpretation is ready to publish:
  `draft`, `in_review`, `verified`, `superseded`, `rejected`. Package-level coverage
  is `incomplete`, `limited`, or `complete`, with explicit scope/gaps. HIGH/MEDIUM/LOW
  confidence belongs here as `research_confidence`, because it affects whether a rule
  can be published or what caveat is shown. Notes and unresolved gaps also belong to
  rule versions/rule sets, not source documents alone.
* **Runtime state** answers how published content behaves:
  `evaluation_mode` = `deterministic`, `partial`, `discretionary`, `external`, or
  `informational`; and lifecycle = `active`, `superseded`, `withdrawn`. A runtime
  evaluation produces applicable/not-applicable/unknown/error and finding statuses
  such as satisfied/violated/review-required.

Confidence is not a probability and must never turn a legal result true or false.
Only `verified` versions may become active. Low-confidence horizontal geometry in
CLR-FENCE-021/022 is represented as an unresolved required input/external dependency,
even though the cited vertical standard itself can remain high-confidence.

Avoid importing scratch chronology, discarded keyword hits, duplicate prose, or
researcher task lists into runtime rows. Preserve concise review notes and gaps only
where they explain publication, coverage, or a user-facing limitation.

## 7. Precedence, conflicts, and conservative aggregation

Candidate selection first applies jurisdiction, project type, rule-set coverage, and
effective date. All applicable rules are evaluated; database ordering is not legal
precedence. `rule_relationships` supports only researched pairwise statements:

* `more_specific_than` or `overrides`, with scope/condition and supporting citation;
* `excepts` or `exempts_from`;
* `depends_on`/`incorporates`;
* `potentially_conflicts_with` when the interaction is unresolved.

`priority` may order presentation or evaluation but must not decide law. “More
restrictive controls” is used only if an authority expressly supplies that combining
principle; otherwise numeric minima/maxima are not automatically merged as legal
truth.

When applicable findings differ, the engine should:

1. apply an explicit, in-scope, cited relationship if all its conditions are known;
2. retain independent compatible requirements (a four-foot maximum and non-opacity);
3. report the stricter result only when an encoded authority/relationship supports
   that method; otherwise
4. return `conflict_review_required`, show both findings and citations, identify the
   missing interpretation/authority, and avoid “allowed.”

CLR-FENCE-029 is the model: the barbed-wire allowance and exposed-top restriction
remain an unresolved conflict, not an inferred exception.

## 8. Determinism model

| Mode | Runtime behavior | Clearwater example |
|---|---|---|
| Deterministic | If applicability and authoritative facts are known, compare the structured outcome and return a supported finding. Missing data remains unknown. | Four-foot ordinary front maximum (005). |
| Partial | Evaluate objective branches; separately emit approval, external-source, or manual-review findings. Never let a pathway erase the baseline automatically. | 18-inch retaining-wall baseline plus City Engineer exception (011). |
| Discretionary | Select and surface the rule, relevant facts, decision maker, and citation; do not manufacture pass/fail. | Appropriate/hazardous materials (028), subdivision uniformity (036). |
| External | Report the known municipal portion and identify the named missing authority/fact. | Pool technical barrier requirements (023). |
| Informational | Surface cited legal consequence or warning, but perform no compliance comparison. | Utility removal/no-restoration warning in 020. |

A partially deterministic rule can have multiple outcomes: an objective maximum,
`approval_required`, and a warning. This avoids downgrading useful objective content
merely because one exception requires an official.

## 9. Lightweight versioning and answer reproducibility

`rules` is stable; every substantive interpretation edit inserts `rule_versions`
with an increasing version number. A published version is immutable. Activation sets
its effective interval and supersedes (but does not delete) the preceding version.
Each version has its own citations, input declarations, outcomes, relationships, and
verification timestamp. Corrections to provision excerpts likewise create a new
source edition/provision where the authoritative content changed; metadata typo
policy can permit audited nonsemantic fixes.

For future persisted answers, store an evaluation snapshot containing rule-version
IDs, source-provision IDs/checksums, input values and provenance, evaluation time,
engine version, findings, and rule-set coverage. That table is later/optional, but
the v1 IDs make it possible. Effective-time selection can answer “under rules known
and effective on date X” without implementing a full bitemporal database.

## 10. All 37 Clearwater candidates as a stress test

Abbreviations: `P` property/official fact; `U` user/project fact; `O` official
decision; `AND/OR` describes applicability; “multi” means multiple outcome rows.

| Rule ID | Rule type | Inputs required | Condition complexity | Outcome type | Determinism | Proposed representation | Schema problem |
|---|---|---|---|---|---|---|---|
| CLR-FENCE-001 | material ban | U material | equality | prohibition | deterministic | `eq` condition + prohibition | None |
| 002 | wire/top design | U wire type, exposed top | AND; conflict exception | required value + warning | partial | objective outcomes + conflict link to 029 | Unresolved source interaction is surfaced |
| 003 | orientation/design | P setback/obstruction; U faces/posts | AND + conditional exception | obligation + review | partial | expression plus qualitative review outcome | “Blocked”/finished side needs official/manual fact |
| 004 | long-frontage design | U/P length/alignment; U inset/opening design | threshold AND alternatives | minimums/obligation | partial | `gt` + multi outcomes; alternative design branch | “Similar feature” remains review |
| 005 | ordinary front height | U type/location/height; P geometry | AND + exception links | maximum | deterministic | baseline rule; exceptions separate/links | None once geometry known |
| 006 | front landscaping | U height/strip; P ROW | threshold AND | obligation + approval exception | partial | minimum width + Coordinator pathway | Landscape compliance partly qualitative |
| 007 | ordinary side/rear height | U type/height; P geometry | AND + exclusions | maximum | deterministic | baseline + specific-rule relationships | Requires curated exception links, supported |
| 008 | IRT height | P local zoning; U geometry/height | AND | maximum | deterministic | jurisdiction-scoped enum option | None |
| 009 | waterfront | P water/protected-area geometry; U opacity/height | AND + max-distance derivation | maximum + required value | deterministic | derived spatial fact + two outcomes | Derivation provenance required, supported |
| 010 | attached dwelling | P lot/dwelling; U height/uniform boundary design | AND + exception | maximum + review | partial | baseline and conditional exception/pathway | “Uniform design” manual fact |
| 011 | retaining wall | U function/location/height; P pond; O engineer | AND + exception | maximum + approval | partial | objective baseline + approval-required outcome | None |
| 012 | combined height | U component heights; derived applicable max | fact-to-fact aggregate | maximum | deterministic | derived combined height and dependency on controlling height rule | Requires derived fact, not special code |
| 013 | entry component | U type and three dimensions | category AND | three maxima + review | partial | multi outcome rows | “Similar” classification manual |
| 014 | Downtown chain-link | P district; U type | AND | prohibition | deterministic | local option + prohibition | None |
| 015 | chain-link front | P building-line geometry; U segment | AND + exemption | prohibition/required location | deterministic | baseline + exemption link to 035 | None |
| 016 | chain-link side/rear | P geometry/ROW; U height/cladding/color | nested AND/OR | maximum + prohibition | deterministic | split into atomic rule versions or multi findings | One package candidate should normalize into 2–3 atomic rules |
| 017 | vacant-lot chain-link | P vacant/district; U cladding/height/landscape | AND | permission pathway + max + removal obligation | partial | multi outcomes + dependency on 034 | Development-triggered future duty is informational until event |
| 018 | public landbank | P ownership/landbank; U coating/height/location | AND | permission pathway + exemption | deterministic | outcomes + `exempts_from` 034 | “Landbanked” authoritative classification |
| 019 | ROW/easement/facility | P surveyed intersection; O engineer | OR + unless | prohibition + approval pathway | partial | spatial derived booleans + approval outcome | No numeric geometry invented |
| 020 | utility easement | P geometry/facilities; U opening; O permission | AND | permission pathway + obligation + warning | partial | multi outcomes | Suitability remains review; removal right informational |
| 021 | sight triangle | P official geometry/grade; U elevations; O engineer | spatial AND range | prohibition + approval | partial | derived `inside_triangle`; vertical range outcome | Official horizontal geometry is external dependency |
| 022 | waterfront triangle | P official geometry; U opacity/height | spatial AND | exception/required value/max | partial | derived fact + two outcomes | Same unavailable geometry, explicitly unknown |
| 023 | pool enclosure | U pool relation/height; external code facts | AND | maximum/permission + external authority | partial/external | objective CDC outcome plus external-authority outcome | Must not imply complete pool compliance |
| 024 | subdivision perimeter | P perimeter/plan; U material/height | AND + dependencies | maximum | partial | outcome + dependencies on 036/005 | Potential conflicts stay unresolved |
| 025 | maintenance | P/U existing condition, lean, permit | OR of six duties + exception | max angle + obligations/review | partial | preferably split six atomic rules in one group | Candidate is composite; schema supports normalization |
| 026 | nonconforming repair | P legal status; U work scope | AND | permission pathway/limited scope | deterministic | structured permission pathway + warning | Does not imply post replacement forbidden |
| 027 | barbed wire adjacency | U work/material; P adjacency | AND | prohibition | partial | condition + prohibition | Unquantified “adjacent” is manual/unknown fact |
| 028 | general materials | U type/material/finish/purpose/safety | AND with qualitative predicates | obligations/prohibition | discretionary | review-required outcomes, with objective sheet-metal ban remaining 001 | Do not encode subjective adjectives as booleans without official fact |
| 029 | barbed wire pathway | U design/purpose; P use/zoning/adjacency | many AND + conflict | conditional pathway + conflict review | discretionary | expression, multi citations, conflict relationships | Deliberately unresolved, cleanly represented |
| 030 | maintenance access | P setback; U opening/access; O Coordinator | AND + exception | obligation + approval exception | discretionary | obligation plus review/approval | “Wide enough” not numeric |
| 031 | front exception pathways | P zoning/use/subdivision/design area; U design/height/landscape; O approvals | nested OR paths | maxima + approvals | partial | normalize each materially distinct pathway as sibling rules/group | One candidate is too compound, but no new schema needed |
| 032 | corner/multi-frontage | P frontage/neighbors/street class; U segment/style/height/landscape; O determinations | nested AND/OR | classification + max/obligation | partial | derived segment classification + dependencies on 005/007/006 | Derived legal classification must retain provenance |
| 033 | double-frontage | P frontage/orientations/street class; U segment/height | nested AND/OR | classification + maximum | partial | derived classification + linked baseline/special rules | Neighbor orientation likely manual official fact |
| 034 | chain-link landscape | U planting/coverage; P exemption | AND + exception | obligation | partial | obligation + exemption links | Qualitative plant adequacy review |
| 035 | recreation exemption | P/U facility classification | category + “similar” | exemption | partial | `exempts_from` selected 805 rules only | Explicitly does not wildcard all chain-link rules |
| 036 | approved subdivision plan | P plan; U design; O purpose/uniformity | AND qualitative | prohibition/manual review | discretionary | manual-review outcome + provision citation | Plan document may be external fact attachment |
| 037 | temporary construction | U temporary purpose; O official approval/conditions | AND | approval required + obligations | discretionary | approval outcome; conditions as project-specific official facts | No default dimensions encoded |

Every candidate fits. The stress test does require **content normalization**, not a
schema revision: 016, 025, and 031 should become several atomic rules tied by a
`group_key`; the public candidate ID can be retained in `legacy_key`/research notes.
Similarly, derived spatial/legal facts need provenance and unknown state. Neither
need is Clearwater-specific.

## 11. Five concrete representations

The UUIDs below are illustrative aliases, not production IDs or insert statements.

### 11.1 Simple deterministic threshold — CLR-FENCE-005

```text
rules:          clr005 | key=clearwater.fence.front_height_baseline | set=cw_fence
rule_versions:  clr005v1 | version=1 | mode=deterministic | status=active
condition:
{"all":[
  {"fact":"project.structure_type","op":"in","values":["fence","wall"]},
  {"fact":"project.is_chain_link","op":"is_false"},
  {"fact":"project.segment_location","op":"eq","value":"between_principal_structure_and_front_line"}
]}
rule_outcomes: maximum | subject=project.height |
               {"value":4,"unit":"ft","inclusive":true}
rule_citations: clr005v1 -> provision CDC § 3-804.A (primary)
relationships: specific front-pathway rules more_specific_than clr005
```

Height is an input because compliance comparison needs it; applicability itself does
not. `rule_version_inputs.role` distinguishes `applicability`, `compliance`, and
`context`.

### 11.2 Material restriction — CLR-FENCE-001

```json
{
  "rule_key": "clearwater.fence.corrugated_sheet_metal_prohibited",
  "condition": {
    "fact": "project.material",
    "op": "in",
    "values": ["corrugated_metal", "sheet_metal"]
  },
  "evaluation_mode": "deterministic",
  "outcomes": [{"type": "prohibition", "subject": "project.material"}],
  "citation": "CDC § 3-802.C"
}
```

Material option keys are global when semantics are truly shared; municipality-local
labels or concepts can instead be jurisdiction-scoped options.

### 11.3 Location-dependent multi-outcome — CLR-FENCE-009

```json
{
  "condition": {"all": [
    {"fact": "property.waterfront", "op": "is_true"},
    {"fact": "project.in_waterfront_protected_area", "op": "is_true"},
    {"fact": "project.is_chain_link", "op": "is_false"}
  ]},
  "outcomes": [
    {"type": "maximum", "subject": "project.height",
     "parameters": {"value": 4, "unit": "ft"}},
    {"type": "required_value", "subject": "project.opacity",
     "parameters": {"value": "non_opaque"}}
  ]
}
```

The protected-area fact is derived from the greater of 20 feet and the required
setback. Its fact envelope must identify parcel geometry, setback source, algorithm,
and observation date. Unknown setback/geometry makes applicability unknown.

### 11.4 Explicit exception — CLR-FENCE-035 and CLR-FENCE-015

```text
rule clr015: chain-link front-location prohibition
rule clr035: recreational chain-link exemption

clr035 condition = facility_use in [tennis_court, golf_course, driving_range,
                                    athletic_field, play_court, batting_cage]
clr035 outcome   = exemption
relationship     = clr035 exempts_from clr015
relationship scope = {"source_scope":"section_3_805_B_only"}
```

A “similar use” is not guessed; it creates a manual-review finding. The relationship
does not exempt Downtown, ROW, landscape, material, visibility, or easement rules.

### 11.5 Administrative/discretionary — CLR-FENCE-019

```json
{
  "condition": {"any": [
    {"fact": "project.intersects_public_row", "op": "is_true"},
    {"fact": "project.intersects_row_easement", "op": "is_true"},
    {"fact": "project.intersects_drainage_easement", "op": "is_true"},
    {"fact": "project.encloses_meter_or_manhole", "op": "is_true"}
  ]},
  "evaluation_mode": "partial",
  "outcomes": [
    {"type": "prohibition", "parameters": {"unless": "specific_authorization"}},
    {"type": "approval_required",
     "parameters": {"authority": "city_engineer", "approval": "specific_authorization"}}
  ]
}
```

If a verified authorization fact exists, the result is “baseline prohibition
exception documented,” not an unconditional permit. Other applicable rules remain.

### 11.6 Conditional approval plus objective portion — CLR-FENCE-011

This sixth example illustrates why determinism is not Boolean. The condition selects
a non-detention retaining wall between the structure and a line. One outcome tests
the 18-inch maximum; a second says City Engineer determination is required for the
greater-height environmental/engineering pathway. The engine can report “18-inch
baseline exceeded; a cited approval pathway may exist; approval not established.”

## 12. Proposed future evaluation flow and responsibilities

```text
property/address
  -> jurisdiction resolution (with confidence/boundary provenance)
  -> project type
  -> effective published rule set(s) and candidate rules
  -> declared property/official facts + provenance
  -> declared user/project facts
  -> four-state condition evaluation
  -> structured outcome comparison
  -> explicit exception/dependency/precedence pass
  -> conflicts, missing facts, external authority, and discretionary review
  -> conservative result + coverage statement
  -> provision-level citations and reproducibility snapshot
```

### Postgres/Supabase

Store normalized definitions, immutable published versions, citations, source
metadata/excerpts, relationships, and rule-set coverage. Enforce foreign keys,
uniqueness, lifecycle constraints, and RLS. Candidate queries filter indexed
jurisdiction/project/status/effective dates. PostGIS may later derive spatial facts,
but raw parcel/GIS layers and legal source data should remain separable. Database
functions may validate JSON shape, but v1 should not hide the rule engine in SQL.

### Application/server logic

Resolve the property and jurisdiction; assemble typed fact envelopes; validate units,
options, and provenance; request missing inputs; evaluate the small DSL; compare
known structured outcomes; traverse explicit relationships; aggregate conservatively;
and create cited result DTOs. Pin an engine version. This is generic logic driven by
data—no `if Clearwater` branches.

### Frontend

Collect only declared missing user-allowable facts, explain why each is needed,
display fact source/verification, and render findings, unknowns, conflicts, approval
paths, coverage limitations, and citations. It must not evaluate rules or portray a
permission when the server reports incomplete coverage.

## 13. MVP versus later architecture

### MVP required

* The 13 tables listed in § 14, with UUIDs, timestamps, constraints, RLS, and audited
  write access.
* Jurisdiction/project rule sets with explicit limited coverage.
* Typed inputs, jurisdiction-scoped enum options, rule input declarations.
* Immutable rule versions, validated minimal AST, structured multi-outcomes.
* Provision-level many-to-many citations.
* The limited relationship types `excepts`, `exempts_from`, `depends_on`,
  `more_specific_than`, and `potentially_conflicts_with`.
* Draft/review/verified publishing workflow and deterministic/partial/discretionary/
  external/informational modes.
* A seed/content validator run before publication (schema/operator/type/reference,
  input-declaration parity, relationship cycles, active-version overlap, citation
  presence).

### Later / optional

* Persisted properties, projects, fact observations, evaluation sessions/snapshots,
  user answers, and official approval uploads.
* PostGIS parcel overlays and a derivation catalog/lineage table.
* Source document object storage, OCR coordinates, automated amendment monitoring,
  researcher assignment/workflow, and richer audit event tables.
* Translations, jurisdiction inheritance, reusable cross-jurisdiction rule templates,
  rule bundles beyond one project type, and formal unit/controlled-vocabulary tables.
* More expression operators only after a second municipality proves the need.

Do not build a universal ontology, generic EAV store, legal inference graph, or full
temporal database for MVP.

## 14. Recommended Supabase schema

All primary keys are UUID unless stated. Every mutable research row has
`created_at`, `updated_at`; published version rows additionally have `published_at`.
Enums may be Postgres enums or constrained text; constrained text is easier to
extend early, but every value must have a check constraint.

### `jurisdictions`

**Purpose:** Geographic/regulatory authority; generalized successor to the existing
`municipalities` concept. **Key columns:** `slug`, `name`, `jurisdiction_type`,
`state_code`, `parent_jurisdiction_id`, optional boundary/reference metadata,
`active`. **Primary key:** `id`. **Foreign keys:** parent self-reference.
**Important constraints:** unique `slug`; no self-parent; valid type. **Indexes:**
unique slug; parent/type. During implementation, preserve compatibility with the
existing `public.municipalities` read via a staged rename/view or initially use that
table as the municipal subset—do not break the current application in the schema
task.

### `project_types`

**Purpose:** Reusable project taxonomy. **Key columns:** `key`, `label`,
`description`, `active`. **Primary key:** `id`. **Foreign keys:** none.
**Constraints:** unique stable key. **Indexes:** unique key.

### `rule_sets`

**Purpose:** Versioned/publishable coverage package for candidate selection and
coverage warnings. **Key columns:** `jurisdiction_id`, `project_type_id`, `key`,
`title`, `scope_description`, `coverage_status`, `research_status`, `effective_from`,
`effective_to`, `verified_at`, `published_at`, `known_gaps` JSONB/text.
**Primary key:** `id`. **Foreign keys:** jurisdiction, project type.
**Constraints:** unique `(jurisdiction_id, project_type_id, key)`; valid date range;
published requires verified timestamp and non-draft state. **Indexes:** composite
candidate lookup `(jurisdiction_id, project_type_id, research_status,
effective_from)`; partial active/published index.

### `regulatory_sources`

**Purpose:** One authoritative document edition. **Key columns:**
`jurisdiction_id`, `source_type`, `title`, `issuing_body`, `edition_label`,
`canonical_url`, `published_on`, `effective_from`, `effective_to`, `retrieved_at`,
`verified_at`, `content_checksum`, `notes`. **Primary key:** `id`. **Foreign keys:**
jurisdiction. **Constraints:** valid dates; uniqueness on jurisdiction/title/edition
or checksum where present. **Indexes:** jurisdiction/type/effective date; checksum.

### `source_provisions`

**Purpose:** Precisely citable unit in one source edition. **Key columns:**
`regulatory_source_id`, `locator`, `display_locator`, `title`, `excerpt`, `page_ref`,
`anchor`, `source_url`, `verified_at`, `excerpt_checksum`, `notes`.
**Primary key:** `id`. **Foreign keys:** regulatory source. **Constraints:** unique
`(regulatory_source_id, locator)`; excerpt or durable locator required.
**Indexes:** source/locator; optional full-text index for research search, not runtime.

### `rules`

**Purpose:** Stable proposition identity. **Key columns:** `rule_set_id`, `key`,
`title`, `group_key`, `legacy_key`, `active_version_id` (nullable convenience pointer).
**Primary key:** `id`. **Foreign keys:** rule set; active version deferred FK.
**Constraints:** unique `(rule_set_id, key)`; active version must belong to same rule.
**Indexes:** rule set/key; group key; unique non-null legacy key within rule set.

### `rule_versions`

**Purpose:** Immutable interpretation revision. **Key columns:** `rule_id`,
`version_number`, `condition` JSONB, `evaluation_mode`, `research_status`,
`research_confidence`, `summary`, `explanation_template`, `research_notes`,
`effective_from`, `effective_to`, `verified_at`, `published_at`, `supersedes_id`,
`schema_version`. **Primary key:** `id`. **Foreign keys:** rule, superseded version.
**Constraints:** unique `(rule_id, version_number)`; condition object conforms to
supported AST; published requires at least one citation/outcome, `verified` research
state and timestamps; no overlapping active effective intervals per rule; immutable
after publish. **Indexes:** rule/version; partial published/effective index; GIN on
condition only if later query evidence justifies it (not MVP-essential).

### `rule_outcomes`

**Purpose:** Structured effects from a version. **Key columns:** `rule_version_id`,
`sequence`, `outcome_type`, `subject_input_id`, `parameters` JSONB, `severity`,
`message_template`. **Primary key:** `id`. **Foreign keys:** version, optional subject
input. **Constraints:** unique `(rule_version_id, sequence)`; parameters validate by
type; subject required for numeric/required-value types. **Indexes:** version/sequence.

### `input_definitions`

**Purpose:** Global typed fact dictionary. **Key columns:** `key`, `label`,
`description`, `data_type`, `unit_dimension`, `canonical_unit`, `value_scope`,
`default_source_class`, `gis_derivable`, `user_input_allowed`,
`authoritative_source_required`, `validation` JSONB, `active`.
**Primary key:** `id`. **Foreign keys:** none. **Constraints:** unique key; unit only
for compatible types; enum requires appropriate scope/options; JSON needs schema.
**Indexes:** unique key; active/source class.

### `input_options`

**Purpose:** Controlled categorical values, global or jurisdiction-local.
**Key columns:** `input_definition_id`, `jurisdiction_id` nullable, `key`, `label`,
`description`, `valid_from`, `valid_to`, `metadata`, `active`. **Primary key:** `id`.
**Foreign keys:** input definition, jurisdiction. **Constraints:** enum definitions
only; unique option key within input and normalized scope (use two partial unique
indexes to handle nullable jurisdiction); valid date range. **Indexes:** input/scope;
jurisdiction.

### `rule_version_inputs`

**Purpose:** Declarative input manifest. **Key columns:** `rule_version_id`,
`input_definition_id`, `role`, `required_when_applicable`, `authority_requirement`,
`prompt_override`, `notes`. **Primary key:** composite
`(rule_version_id,input_definition_id,role)`. **Foreign keys:** version, input.
**Constraints:** valid role (`applicability`, `compliance`, `context`, `output`); every
AST fact and outcome subject appears here; no undeclared fact. **Indexes:** reverse
index on input/version for discovering dependent rules.

### `rule_citations`

**Purpose:** Auditable many-to-many support. **Key columns:** `rule_version_id`,
`source_provision_id`, `citation_role`, `pinpoint_note`, `sequence`.
**Primary key:** composite `(rule_version_id, source_provision_id, citation_role)`.
**Foreign keys:** version, provision. **Constraints:** valid role; primary citation
required to publish. **Indexes:** reverse provision/version; version/sequence.

### `rule_relationships`

**Purpose:** Narrow, explicit exception/dependency/precedence/conflict links.
**Key columns:** `from_rule_id`, `to_rule_id`, `relationship_type`, `scope_condition`
JSONB nullable, `rationale`, `source_provision_id`, `effective_from`, `effective_to`,
`metadata`. **Primary key:** `id`. **Foreign keys:** both rules and optional provision.
**Constraints:** no self-link; unique active tuple; semantic relationships require a
citation/rationale; AST validation for scope; acyclic dependency/override relations
at publication. **Indexes:** from/type, to/type, effective date.

### Relationship diagram

```text
jurisdictions 1---* rule_sets *---1 project_types
      |                  |
      |                  1
      |                  |
      |                  * rules 1---* rule_versions 1---* rule_outcomes
      |                            ^          |  |
      |                            |          |  * rule_version_inputs *---1 input_definitions
      |                            |          |
      |                            +-- rule_relationships
      |
      +---* regulatory_sources 1---* source_provisions
                                         |
rule_versions *---* source_provisions via rule_citations

input_definitions 1---* input_options *---0..1 jurisdictions
```

RLS recommendation: published active regulatory content is publicly readable;
draft/research notes and all writes are restricted to authenticated researcher/admin
roles. Excerpts may need a narrower read policy based on licensing. Never expose
private fact or evaluation records through these public-content policies when those
later tables are added.

## 15. Clearwater ingestion plan

### Can be imported directly (after deterministic parsing and verification)

* Package identity, Clearwater/fence scope, the 37 legacy IDs, titles/summaries,
  stated determinism and confidence.
* Exact source locators and the package's source-edition metadata.
* Numeric values and units (4/6/8 feet, 18/30/48 inches, 3/8/12 feet, 10 degrees,
  100 feet) as candidate structured outcome parameters.
* Explicit input lists as a starting manifest, exceptions/dependencies as candidate
  relationships, and user-facing caveats.

“Direct” means a staging/import transform, not blind publication. The Markdown is a
research package; authoritative excerpts/provision checksums should come from the
underlying source after verification.

### Needs normalization

1. Create/reconcile the Clearwater jurisdiction and fence project type, then a
   `limited` rule set whose known gaps are explicit.
2. Register each Community Development Code and Code of Ordinances edition as a
   separate regulatory source; split locators into provision rows.
3. Map prose input names to global stable definitions and local zoning options.
   Separate facts currently bundled as “geometry” and label tentative/user facts
   versus authoritative facts.
4. Convert `APPLIES IF` to the constrained AST and `THEN` to atomic outcomes. Split
   composite 016, 025, and 031 (and any other independently citable effects) while
   retaining legacy/group traceability.
5. Convert exceptions into in-expression branches or explicit relationships using
   the rule in § 3.4. Add dependencies for sight geometry, pool code, approved plans,
   and incorporated standards.
6. Link every version to provision-level citations, not just strings. Run the
   publisher validator and a fixture suite covering true/false/unknown/conflict for
   every rule.

### Requires manual legal/research review

* Recheck excerpts against the authoritative single-column/current sources and
  confirm effective dates and code-edition URLs.
* Decide atomic splits and the exact scope of every exception/precedence link.
* Review qualitative concepts, discretionary authority, front/side/rear derivation,
  adjacency, and whether user assertions can ever meet authority requirements.
* Resolve or explicitly preserve the barbed-wire conflict; do not encode an implied
  approval.
* Obtain/verify sight-triangle figures, zoning/overlay maps, street classifications,
  pool technical code, permit rules, easements, approved plans, and special-source
  dependencies before enabling affected automated findings.
* Have a domain-qualified reviewer approve production wording and coverage claims.

### Should not enter production yet

* Unverified horizontal sight-triangle dimensions or inferred geometries.
* A complete pool-barrier or ordinary permit answer not supported by the package.
* The likely § 28.95 silt-fence rule, incomplete § 32.284 details, Charter special
  case, private covenants, repealed provisions, keyword false positives, or old
  excerpts as active ordinary-fence rules.
* Scratch notes, discarded hypotheses, or a global “fence permitted” outcome.
* Any Clearwater candidate as executable active content before source validation,
  structured review, test fixtures, and a deliberately limited coverage statement.

## 16. Architecture decision and next task

**READY FOR SCHEMA IMPLEMENTATION**

The exact smallest implementation sequence for the next Codex task is:

1. Confirm how the existing `public.municipalities` table should transition to or
   coexist with `jurisdictions`, preserving the current `name,state,slug` read.
2. Write one reviewed migration for the 13 MVP tables, enums/check constraints,
   foreign keys, effective-date constraints, indexes, immutability trigger, and RLS;
   do not seed Clearwater rules in that task.
3. Add database-level JSON shape checks that are feasible, plus a generic TypeScript
   content validator for AST operators/types, input-manifest parity, outcome shapes,
   citations, active-version intervals, and relationship cycles.
4. Add schema/validator tests with synthetic municipality/project/rules only,
   including unknown propagation and an unresolved conflict; still do not implement
   end-user evaluation or production ingestion.
5. Only after that migration and validator are reviewed, perform Clearwater staging
   ingestion as a separate task with manual publication approval.
