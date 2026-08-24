# Clearwater fence resident flow V1 — minimum-question audit

## Executive decision

For a known, ordinary residential property, the smallest useful interaction is **three
resident questions**: location, planned height, and material. A material answer can set
several existing atomic facts; chain-link adds one coating question and may require a
plain-language placement clarification. Pool is not an implemented input and cannot be
quietly treated as resolved.

This is a workflow audit, not new law or evaluator logic. It does not change, discard, or
weaken any of the 44 runtime rules. “Default out of the ordinary flow” below means hide an
exception rule from the initial resident conversation unless trusted property data or a
resident answer triggers it; it does **not** mean evaluate an unknown fact as false.

## 1. Current-state verification

### Material inspected

The audit inspected the two Clearwater research packages, both question-flow and property-
lookup architecture documents, the Clearwater rule and CLEAN-property seed migrations,
the stored pilot profile/QC evidence, property lookup and fact-adapter code, planner,
evaluator types/implementation, presentation helper, Clearwater server actions/workflow,
and the relevant tests. The seed contains 44 published runtime rule versions, 60 input
definitions, and 59 definitions linked through `rule_version_inputs`; the sixtieth,
`project.applicable_maximum_height`, is referenced indirectly by a structured outcome.

### Stop-gate result

Required pilot data is present, so the audit may proceed:

* The committed profile for **1950 DREW PLZ** has `status: "clean"`, no issues, an
  authoritative-identifier parcel match, raw zoning `LMDR`, and normalized zoning `lmdr`.
* The profile and QC sample both expose exactly
  `property.zoning_district = "lmdr"`.
* The CLEAN-only seed contains that address, and the adapter emits zoning only for a CLEAN
  stored profile. The lookup rejects non-CLEAN or non-unique results and the server overlays
  the derived fact after browser answers, so a resident cannot replace it.
* Important boundary: this address currently supplies **zoning only**. It does not supply
  waterfront, frontage, easement/right-of-way, principal-structure, attached-dwelling,
  vacancy, subdivision, or other property facts.

## 2. Primary normal-residential scenario

| Item | Audit assumption |
|---|---|
| Property | 1950 DREW PLZ (trusted CLEAN pilot property) |
| Trusted fact | `property.zoning_district = "lmdr"` |
| Intent | Build a new ordinary residential fence (not a wall or retaining wall) |
| Not presumed present | Pool, waterfront, public property, construction-site fence, cemetery, city infrastructure, recreation facility, nonconforming use, special approval, industrial use, barbed wire, unusually long street plane, entry structure, berm/retaining-wall combination |

“Not presumed present” is a presentation/workflow scope, not a batch of evaluator facts.
Where an exception matters, Groundrule must trigger a question, derive it, or identify a
City/property check—not manufacture a negative answer.

## 3. Complete input audit

### How to read the inventory

* **Class:** `P` GIS/property-derived; `R` resident-answerable; `A` administrative/City
  review; `D` construction/design detail; `S` special-case only; `M` maintenance/post-
  construction. Multiple codes are intentional.
* **Ordinary:** relevant to an ordinary new residential fence planning answer.
* **First:** eligible for the initial ordinary interaction. “Combined” means collect it
  through one curated human question that maps to multiple machine keys.
* **Disposition:** `Ask`, `Defer`, `Never ask`, or `Derive`. “City check” means present a
  check/review item, not a resident yes/no compliance attestation.
* **Rules** counts active runtime rules linked in `rule_version_inputs`. The `0*` input is
  nevertheless used as `value_fact` in the combined-height outcome.

| Machine key | Current human label | Rules | Class | Ordinary | First | Deferrable / never-direct disposition |
|---|---|---:|---|---|---|---|
| `project.structure_type` | Proposed structure type | 2 | R,S | No (intent fixes fence) | No | Derive `fence` from selected workflow; ask only wall/retaining-wall branch |
| `project.material` | Primary proposed material | 3 | R,D | Yes | **Combined** | Ask in plain material question |
| `project.is_wire_fence` | Wire fence proposed | 1 | R,D | Conditional | **Combined** | Derive from material answer; never duplicate |
| `project.has_exposed_top_points` | Exposed top points, wires, or prongs | 1 | R,D,S | Conditional chain-link | No | Ask only if chain-link/top treatment is not otherwise clear |
| `project.in_required_setback` | Located in a required setback | 3 | P,R,A | Yes | No | Never use technical label; derive from mapped segment or City/property check |
| `project.supports_face_inward` | Posts and stringers face inward | 1 | R,D | Yes as guidance | No | Do not ask as pass/fail; state installation requirement |
| `project.finished_side_faces_outward` | Finished side faces the right-of-way or adjoining property | 1 | R,D | Yes as guidance | No | Do not ask as pass/fail; state installation requirement |
| `project.street_plane_length` | Uninterrupted length along street right-of-way | 1 | R,D,S | Unusual only | No | Ask only for a fence along a street that may exceed 100 ft |
| `project.long_plane_treatment_reviewed` | Long-plane treatment accepted | 1 | A,S | Unusual only | No | Never ask; City/design review after length trigger |
| `project.location_zone` | Fence segment location zone | 7 | R,P | **Yes** | **Ask** | Plain location choices; multiple segments may need separate evaluation |
| `project.height` | Proposed fence or wall height | 14 | R,D | **Yes** | **Ask** | Ask feet; describe highest planned portion |
| `project.landscape_strip_width` | Right-of-way-side landscape strip width | 1 | R,D | Conditional front >3 ft | No | Ask/measure only after front and height trigger; preferably present requirement |
| `project.landscape_strip_waived` | Landscape strip waived by Coordinator | 1 | A,S | Conditional exception | No | Never ask as ordinary fact; record an actual City decision |
| `property.zoning_district` | Zoning district | 2 | P | Yes | No | **Property-derived**; never display code as a question |
| `property.is_water_adjacent` | Property is adjacent to water | 3 | P | Potentially material | No | Property-derived; if unavailable, plain property/City check rather than first question |
| `project.in_waterfront_protected_area` | Within waterfront line/setback protected area | 2 | P,A | Waterfront only | No | Never ask resident; derive geometry or defer to City |
| `project.is_opaque` | Fence is opaque | 1 | R,D | Waterfront only | No | Derive from material/design if possible; ask plain “can you see through it?” only after waterfront trigger |
| `property.is_attached_dwelling_lot` | Attached-dwelling lot | 1 | P | Potentially material | No | Property-derived; do not ask zoning/lot terminology |
| `project.uniform_boundary_exception_approved` | Uniform boundary exception is applicable | 1 | A,S | Exception only | No | Never ask; actual approval/official determination |
| `project.is_detention_pond_retaining_wall` | Retaining wall is associated with detention pond | 1 | R,P,S | No | No | Retaining-wall branch only |
| `project.engineering_height_exception_approved` | Greater retaining-wall height approved | 1 | A,S | No | No | Never ask; engineering/City decision |
| `project.combined_height` | Combined fence, wall, berm, and retaining-wall height | 1 | R,D,S | Unusual design only | No | Ask only when resident reports combined components |
| `project.applicable_maximum_height` | Applicable maximum combined height | 0* | D,derived | Unusual design only | No | Never ask; evaluator/system-derived value |
| `project.entry_component_type` | Entry component type | 3 | R,D,S | Optional design | No | Ask only if gate/arbor/trellis/pergola-like overhead component is reported |
| `project.entry_component_height` | Entry component overall height | 1 | R,D,S | Optional design | No | Triggered by entry component |
| `project.entry_side_extension` | Entry component extension on either side | 1 | R,D,S | Optional design | No | Triggered by entry component |
| `project.entry_face_projection` | Entry component projection from fence face | 1 | R,D,S | Optional design | No | Triggered by entry component |
| `project.is_chain_link` | Chain-link fence proposed | 14 | R,D | Conditional/common | **Combined** | Derive from material answer; never ask twice |
| `property.is_downtown` | Property is in Downtown District | 2 | P | Conditional | No | Property-derived from district; for known LMDR it should be system-resolved if supported |
| `property.has_principal_structure` | Parcel has a principal structure | 1 | P | Yes for chain-link location | No | Property-derived; avoid “principal structure” question |
| `project.is_rear_of_front_building_line` | Fence is rear of front building line | 1 | P,R,D | Chain-link only | No | Translate and ask only if chain-link placement cannot be mapped from location |
| `project.adjacent_to_public_row` | Segment side or rear line is adjacent to public right-of-way | 1 | P,A | Chain-link only | No | Never ask technical label; property/City determination |
| `project.vinyl_color` | Chain-link vinyl color | 4 | R,D | Chain-link only | No | Ask only after chain-link: green, black, other, none |
| `property.is_vacant_lot` | Property is vacant | 2 | P,S | No for homeowner scenario | No | Property-derived; special-case filter |
| `property.is_public_landbank` | Property is publicly owned and landbanked | 2 | A,S | No | No | Never ask; authoritative special classification |
| `project.is_developed` | Vacant lot has been developed | 1 | P,S,M | No | No | Property-derived; vacant-lot/removal branch only |
| `project.intersects_prohibited_access_area` | Fence intersects right-of-way, drainage easement, meter, or manhole area | 1 | P,A | **Yes as placement check** | No | Never ask composite technical fact; derive/map, then City check if unknown |
| `project.city_engineer_authorized` | City Engineer authorization obtained | 1 | A,S | Exception only | No | Never ask prospectively; record authorization only after triggered conflict |
| `project.in_utility_easement` | Fence is in a utility easement | 1 | P,A | **Yes as placement check** | No | Never ask technical fact; derive from records or City/utility check |
| `project.utility_access_approved` | Suitable utility access approved | 1 | A,S | Utility-easement only | No | Never ask; official/utility review |
| `property.is_residential_subdivision_perimeter` | Residential subdivision perimeter | 2 | P,A,S | No for ordinary lot fence | No | Property/plan-derived; special perimeter branch |
| `project.subdivision_plan_compliance_approved` | Subdivision plan compliance confirmed | 2 | A,S | Special only | No | Never ask; City/approved-plan review |
| `project.lean_angle` | Fence lean or sag from vertical | 1 | R,M | No for new planning | No | Maintenance/inspection branch only |
| `project.designed_lean_permitted` | Nonvertical angle is designed and permitted | 1 | A,M,S | No | No | Never ask; permit/official record |
| `project.maintenance_review_passed` | Qualitative maintenance inspection passed | 1 | A,M | No | No | Never ask; inspection outcome |
| `project.work_type` | Fence work type | 2 | R | Intent-level | No in stated new scenario | Set from intent; ask build/replace/repair only at workflow entry when intent is not known |
| `property.is_legal_nonconforming_fence` | Fence is legally nonconforming | 1 | A,S,M | Repair only | No | Never ask; official legal status |
| `project.replaces_posts` | Project replaces fence posts | 1 | R,D,M | Board-only repair only | No | Ask only after repair/nonconforming branch |
| `project.adjacent_to_street_alley_sidewalk` | Barbed-wire fence is adjacent to street, alley, or sidewalk | 1 | A,S | Barbed wire only | No | City determination after barbed-wire trigger; do not ask composite legal conclusion |
| `project.material_appropriateness_approved` | Material appropriateness confirmed | 1 | A | Broad but discretionary | No | Never ask; present City confirmation where material is not clearly handled |
| `project.decorative_finish_approved` | Decorative wall finish confirmed | 1 | A,D | Wall only | No | Never ask; wall branch/City review |
| `project.safety_material_review_passed` | Injurious, hazardous, or noxious material review passed | 1 | A | Broad but discretionary | No | Never ask; City/safety review, especially after unusual material |
| `project.maintenance_access_approved` | Maintenance opening or gate accepted | 1 | A,D | Required-setback only | No | Never ask as “approved”; explain gate/opening duty and defer acceptance |
| `property.lot_frontage_type` | Lot frontage type | 3 | P,A | Potentially material | No | Property-derived; never require resident to classify lot |
| `property.rear_orientation_conditions_met` | Double-frontage rear-orientation conditions met | 2 | P,A,S | Double-frontage only | No | Property/pattern-derived; City check |
| `property.rear_abuts_arterial_or_collector` | Rear abuts arterial or collector right-of-way | 2 | A,P,S | Double-frontage only | No | Never ask resident to classify road; City/property-derived |
| `project.chain_link_landscaping_approved` | Chain-link landscaping approved | 1 | A,D | Chain-link only | No | Never ask as approval; explain hedge/vine requirement and City confirmation |
| `property.is_recreational_facility` | Listed or officially similar recreational facility | 4 | A,S | No | No | Never ask in homeowner flow; special-use classification |
| `project.temporary_construction_fence` | Temporary construction-site fence proposed | 1 | R,S | No | No | Ask only when temporary/construction intent is selected |
| `project.building_official_approval` | Building Official approval and conditions obtained | 1 | A,S | No | No | Never ask prospectively; approval pathway result |

### Input-option audit

The seeded enums provide only these choices: structure (`fence`, `wall`,
`retaining_wall`); material (corrugated metal, sheet metal, chain-link, barbed wire,
other wire, masonry, wood, other); location (`front`, `side`, `rear`, `other`);
Clearwater zoning districts; entry-component types; chain-link vinyl (`green`, `black`,
`other`, `none`); work type; and lot-frontage type. The proposed ordinary questions below
use only those existing options. There is **no pool input**, no visibility-triangle input,
and no permit-requirement input.

## 4. Runtime-rule workflow classification (all 44)

Each rule appears once under its primary workflow home. “Property-derived” means its first
gate should come from trusted parcel/municipal information; it does not imply that the
current adapter supplies the fact.

### A. Normal residential core (10)

1. `material.metal_prohibition`
2. `material.wire_chain_link_required`
3. `design.finished_side`
4. `design.support_orientation`
5. `height.front_baseline`
6. `design.front_landscape_strip`
7. `height.side_rear_baseline`
8. `height.combined_components` (ordinary only when combined components are proposed)
9. `materials.appropriateness_review`
10. `materials.safety_review`

These supply the ordinary material, orientation, location, and height framework. The two
qualitative material rules belong in a “City may need to confirm” result, not the interview.

### B. Conditional residential (12)

1. `material.exposed_top_prohibition`
2. `design.long_street_plane`
3. `waterfront.opacity`
4. `waterfront.height`
5. `entry.height`
6. `entry.side_extension`
7. `entry.face_projection`
8. `chain_link.front_location`
9. `chain_link.side_rear_base_height`
10. `chain_link.side_rear_vinyl_height`
11. `chain_link.public_row_prohibition`
12. `chain_link.landscaping`

These should enter only after a simple trigger such as chain-link, waterfront data, a long
street run, or an entry structure. The package contains no runtime pool rule.

### C. Property-derived (8)

1. `height.irt_side_rear`
2. `height.attached_dwelling`
3. `chain_link.downtown_prohibition`
4. `access.prohibited_area`
5. `access.utility_easement`
6. `frontage.corner_multi_review`
7. `frontage.double_rear_four`
8. `frontage.double_rear_six`

Zoning resolves the IRT/Downtown gates in principle, but the current adapter sends only the
zoning key and does not derive redundant booleans. The other rules require parcel,
instrument, frontage, roadway, or segment-placement facts that residents should not be
expected to classify.

### D. Administrative / human review (3)

1. `design.maintenance_access`
2. `subdivision.perimeter_height`
3. `subdivision.plan_uniformity`

These are best presented as targeted confirmation tasks after property/design triggers,
not questions asking residents whether an official review “passed.”

### E. Non-normal / special case (11)

1. `height.retaining_wall`
2. `chain_link.vacant_lot_height`
3. `chain_link.vacant_lot_removal`
4. `chain_link.public_landbank`
5. `maintenance.lean`
6. `maintenance.condition`
7. `repair.nonconforming_boards`
8. `barbed_wire.street_adjacency`
9. `materials.wall_finish_review`
10. `chain_link.recreation_exemption`
11. `construction.temporary_approval`

They remain valid rules, but public landbank, vacant lot, retaining wall, repair/maintenance,
barbed wire, recreation, wall finish, and construction-site branches should not clutter a
new ordinary homeowner fence flow.

## 5. Minimum resident questions

### Always asked for the stated new-fence scenario

| Plain-English question | Exact machine key(s) | Existing answer options | Why necessary / unresolved rules resolved |
|---|---|---|---|
| **Where will the fence go?** “In front of the house,” “Along a side,” “Behind the house,” “Somewhere else / more than one area” | `project.location_zone` | `front`, `side`, `rear`, `other` (plain labels replace seeded technical labels) | Selects ordinary front versus side/rear height rules and chain-link location/ROW branches: `height.front_baseline`, `design.front_landscape_strip`, `height.side_rear_baseline`, `height.irt_side_rear`, `chain_link.side_rear_base_height`, `chain_link.side_rear_vinyl_height`, `chain_link.public_row_prohibition`. “Other/more than one” goes to clarification or separate segment evaluation. |
| **About how tall will the highest part be?** | `project.height` | Number in feet | Needed by 14 linked rules; in the normal branch it makes the front or side/rear maximum useful and triggers the front landscape-strip rule. It also feeds conditional height rules if property/material facts trigger them. |
| **What kind of fence are you planning?** | `project.material`, `project.is_chain_link`, `project.is_wire_fence` (one answer mapped deterministically) | Existing material values: wood, masonry, chain-link, corrugated metal, sheet metal, barbed wire, other wire, other | Resolves the metal prohibition, wire-to-chain-link requirement, barbed-wire branch, and ordinary-versus-chain-link height regime. Selecting chain-link sets material `chain_link`, `is_chain_link=true`, `is_wire_fence=true`; clearly non-wire choices set both booleans false; other/ambiguous material may require clarification rather than invented mapping. |

The known intent also supplies `project.structure_type = "fence"`,
`project.work_type = "new"`, and `project.temporary_construction_fence = false` as explicit
facts from what the resident selected before this question set—not as hidden assumptions.

### Conditionally asked

| Trigger | Plain-English question | Exact machine key(s) | Existing options | Why / rules resolved |
|---|---|---|---|---|
| Chain-link | **Will the chain-link have a green or black vinyl coating?** | `project.vinyl_color` | `green`, `black`, `other`, `none` | Selects the 4-ft base versus 6-ft vinyl side/rear pathways and the vacant/public special paths: four linked rules. |
| Chain-link and location still does not establish building-line relationship | **Will every part of it be behind the front edge of the house?** | `project.is_rear_of_front_building_line` | Yes / No / I do not know | Resolves `chain_link.front_location` without saying “front building line.” Prefer segment/property mapping first. |
| Chain-link with a top treatment | **Will the top have exposed points, wires, or prongs?** | `project.has_exposed_top_points` | Yes / No / I do not know | Resolves `material.exposed_top_prohibition`; ask only when chain-link/top design makes it relevant. |
| Trusted property data says waterfront and the proposed segment may be in the protected area | **Can you see through the fence, or is it solid?** | `project.is_opaque` | See-through / solid / I do not know | Resolves `waterfront.opacity`. `project.in_waterfront_protected_area` itself remains derived/City-confirmed. |
| Optional gate/arbor/trellis/pergola-like structure disclosed | Plain questions for its type, overall height, side extension, and projection | `project.entry_component_type`, `project.entry_component_height`, `project.entry_side_extension`, `project.entry_face_projection` | Existing type enum and numbers | Resolves three entry rules; never ask ordinary projects that do not disclose such a component. |

### Deliberately not asked

Do not ask the resident to certify setbacks, easements, rights-of-way, sight triangles,
official approvals, inspections, roadway class, lot frontage, subdivision-plan compliance,
or “material appropriateness.” These are derived facts, professional/City determinations,
or result-stage verification tasks. Also do not ask about a swimming pool in this seeded
flow: no existing input or runtime rule can consume the answer. The result should instead
state the package limitation if the resident identifies a pool elsewhere in project intake.

## 6. Minimal conditional decision tree

```text
trusted address already known: 1950 DREW PLZ
  -> trusted zoning already known: lmdr (never ask)
  -> intent already known: new ordinary fence (fence/new/non-temporary facts)
  -> Q1 Where will it go? [front | side | rear | other/multiple]
       -> other/multiple: clarify or evaluate each segment; do not guess one limit
  -> Q2 About how tall will the highest part be? [feet]
  -> Q3 What kind of fence? [existing material options]
       -> chain-link:
            -> Q4 vinyl coating? [green | black | other | none]
            -> Q5 only if needed: entirely behind front edge of house? [yes/no/unknown]
            -> top-points question only when a top treatment is disclosed/ambiguous
       -> barbed wire / other wire / metal / unusual material:
            -> exception or City-review branch; do not continue ordinary flow
       -> wood or other ordinary non-wire fence:
            -> no more ordinary resident questions
  -> property/City checks run outside resident interview
  -> grouped result
```

The ordinary non-chain-link path is three questions. The usual chain-link path is four;
five are needed only when the location answer cannot establish the front-of-house rule.
Entry structures, waterfront, long street frontage, repair, temporary construction, and
other exceptions are separate triggered branches rather than additions to the base count.

## 7. Bad current questions and required treatment

The generic planner correctly excludes `user_input_allowed=false`, but it still exposes
atomic labels for eligible design/compliance facts and ranks solely by affected-rule count.
It has no Clearwater-specific semantic bundling, no common/special filter, no trigger tree,
and no distinction between asking about a proposal and asking the resident to attest that
it complies. One material question can and should populate several facts instead of asking
“Wire fence proposed” and “Chain-link fence proposed” separately.

### NEVER ASK RESIDENT

All official-decision or derived labels below must remain outside direct resident UI:

* `project.long_plane_treatment_reviewed` — Long-plane treatment accepted
* `project.landscape_strip_waived` — Landscape strip waived by Coordinator
* `project.in_waterfront_protected_area` — Within waterfront line/setback protected area
* `project.uniform_boundary_exception_approved` — Uniform boundary exception is applicable
* `project.engineering_height_exception_approved` — Greater retaining-wall height approved
* `project.applicable_maximum_height` — Applicable maximum combined height
* `project.city_engineer_authorized` — City Engineer authorization obtained
* `project.utility_access_approved` — Suitable utility access approved
* `project.subdivision_plan_compliance_approved` — Subdivision plan compliance confirmed
* `project.designed_lean_permitted` — Nonvertical angle is designed and permitted
* `project.maintenance_review_passed` — Qualitative maintenance inspection passed
* `property.is_legal_nonconforming_fence` — Fence is legally nonconforming
* `project.adjacent_to_street_alley_sidewalk` — Barbed-wire fence is adjacent to street, alley, or sidewalk
* `project.material_appropriateness_approved` — Material appropriateness confirmed
* `project.decorative_finish_approved` — Decorative wall finish confirmed
* `project.safety_material_review_passed` — Injurious, hazardous, or noxious material review passed
* `project.maintenance_access_approved` — Maintenance opening or gate accepted
* `property.rear_orientation_conditions_met` — Double-frontage rear-orientation conditions met
* `property.rear_abuts_arterial_or_collector` — Rear abuts arterial or collector right-of-way
* `project.chain_link_landscaping_approved` — Chain-link landscaping approved
* `property.is_recreational_facility` — Listed or officially similar recreational facility
* `project.building_official_approval` — Building Official approval and conditions obtained

### PROPERTY-DERIVED

Never display these as resident questions: `property.zoning_district`,
`property.is_water_adjacent`, `property.is_attached_dwelling_lot`, `property.is_downtown`,
`property.has_principal_structure`, `project.adjacent_to_public_row`,
`property.is_vacant_lot`, `property.is_public_landbank`, `project.is_developed`,
`project.intersects_prohibited_access_area`, `project.in_utility_easement`,
`property.is_residential_subdivision_perimeter`, and `property.lot_frontage_type`.
Where unavailable, translate the consequence into a specific City/property-record check.

### TRANSLATE TO PLAIN LANGUAGE

* `project.location_zone` → “Where will the fence go?” with front/side/behind-house choices.
* `project.height` → “About how tall will the highest part be?”
* `project.material` → “What kind of fence are you planning?”
* `project.is_opaque` → “Can you see through it, or is it solid?”
* `project.is_rear_of_front_building_line` → “Will every part be behind the front edge of the house?”
* `project.finished_side_faces_outward` and `project.supports_face_inward` should normally
  become instructions (“put the finished side outward; posts/stringers inward”), not questions.
* `project.in_required_setback` must not say “setback”; if derivation is unavailable, tell the
  resident Clearwater must confirm whether the planned line is in the regulated yard area.

### ONLY ASK IF TRIGGERED

`project.has_exposed_top_points`, `project.street_plane_length`,
`project.landscape_strip_width`, `project.is_opaque`,
`project.is_detention_pond_retaining_wall`, `project.combined_height`, every entry-component
input, `project.is_rear_of_front_building_line`, `project.vinyl_color`,
`project.lean_angle`, `project.replaces_posts`, and
`project.temporary_construction_fence`. The trigger and plain wording are more important
than the planner's raw affected-rule count.

### DEFER TO CITY REVIEW

Long-plane treatment, waterfront protected-area geometry, prohibited-access/easement
intersection and authorization, utility access, subdivision-plan compatibility,
maintenance inspection, barbed-wire adjacency, material appropriateness/safety, required-
setback maintenance access, double-frontage orientation/road class, chain-link landscaping
acceptance, recreation similarity, and temporary-fence approval.

## 8. Useful resident-facing answer contract

### Exactly three result states

1. **Looks allowed based on what we know** — the modeled ordinary rules support the stated
   location/height/material combination, with concise requirements. This is guidance, not
   a permit or legal approval.
2. **Check this before building** — a City/property-record confirmation, unmodeled authority,
   discretionary standard, or triggered exception could change the answer.
3. **We still need information** — a genuinely resident-answerable fact needed for the
   selected ordinary/triggered branch is absent.

Never expose `MATCHED`, `UNKNOWN`, `REVIEW_REQUIRED`, truth values, rule matches, or a list
of atomic unknowns. The page should group outcomes into:

* **Bottom line:** one of the three states and one-sentence reason.
* **Where and height:** the applicable front or side/rear guidance for each segment.
* **Material and design:** prohibited/required material treatment plus finished-side and
  support orientation instructions.
* **Chain-link changes:** only when selected—front placement, coating-dependent height,
  public-ROW and landscaping checks.
* **Check before building:** only the material unresolved property/City items, stated as
  actions (for example, confirm the proposed line does not enter a right-of-way, drainage
  easement, meter/manhole area, or utility easement).
* **What this cannot answer:** permit requirements, pool-barrier details, sight-triangle
  geometry, private restrictions, or other known package gaps relevant to this project.
* **Official support:** deduplicated provision-level sources, expandable to atomic detail.

“Can I build it?” therefore cannot currently receive an unconditional yes. Groundrule can
say that the described fence fits a modeled baseline, followed by the smallest unresolved
checks that prevent an approval claim.

## 9. Hypothetical journey and mock result for 1950 DREW PLZ

### Example answers

This example chooses a deliberately ordinary non-chain-link branch:

1. Address: **1950 DREW PLZ** → trusted fact loaded:
   `property.zoning_district = "lmdr"`.
2. Intent: **Build a new fence** → `project.structure_type="fence"`,
   `project.work_type="new"`, `project.temporary_construction_fence=false`.
3. Where: **Behind the house / rear** → `project.location_zone="rear"`.
4. Height: **6 feet** → `project.height=6` ft.
5. Material: **Wood** → `project.material="wood"`,
   `project.is_chain_link=false`, `project.is_wire_fence=false`.

No pool, waterfront, public/special use, retaining wall, combined component, entry feature,
or unusual material is introduced. Their unknown atomic facts are not turned into false.

### Mock Groundrule result

> ## Check this before building
>
> **What the current Clearwater rules indicate**
>
> Your planned **6-foot wood fence behind the house** fits the modeled ordinary side/rear
> height baseline: a non-chain-link fence between the principal structure and a side or rear
> property line has a maximum of **6 feet**. Put the finished side toward the adjoining
> property or street view, with posts and stringers facing inward, subject to the code's
> blocked-access exception.
>
> **Material**
>
> Wood is not one of the package's express corrugated-metal or sheet-metal prohibitions,
> and this is not a wire/chain-link proposal. Clearwater still uses a qualitative standard
> that the material be appropriate for its purpose and location and prohibits potentially
> injurious, hazardous, or noxious materials or techniques; the current package treats
> those judgments as City review rather than asking you to certify them.
>
> **Chain-link**
>
> You selected wood, so the package's chain-link-specific location, coating, height,
> right-of-way, and landscaping rules are not the height path used for this result. If you
> change to chain-link, Groundrule needs the coating choice and may need to confirm that the
> fence is behind the front edge of the house.
>
> **Check before building**
>
> 1. Ask Clearwater to confirm that the exact fence line is not in a public right-of-way,
>    right-of-way or drainage easement, utility easement, or over a meter/manhole, and that
>    required utility and maintenance access is preserved.
> 2. Ask Clearwater whether a permit or other approval is required.
> 3. Confirm the fence will not obstruct a required sight-visibility triangle.
> 4. Check any private deed, HOA, or subdivision-plan restrictions that may apply.
>
> **What Groundrule cannot determine yet**
>
> * **CURRENT RULE PACKAGE CANNOT YET ANSWER THIS:** whether this ordinary fence requires a
>   permit or satisfies the complete approval process.
> * **CURRENT RULE PACKAGE CANNOT YET ANSWER THIS:** whether this exact proposed line enters
>   a sight-visibility triangle, because the official horizontal figure geometry is missing.
> * **CURRENT RULE PACKAGE CANNOT YET ANSWER THIS:** parcel-specific easement/right-of-way,
>   frontage, waterfront, attached-dwelling, and subdivision-plan facts for this address;
>   the trusted profile currently supplies zoning only.
> * **CURRENT RULE PACKAGE CANNOT YET ANSWER THIS:** complete swimming-pool barrier safety
>   requirements if the fence will enclose a pool.
>
> **Official rule support**
>
> Clearwater Community Development Code §§ **3-802** (materials), **3-803** (design),
> **3-804** (height), **3-806** (easements/right-of-way), and **3-904** (visibility). The
> current package is limited guidance and is not a permit, approval, or legal opinion.

The state is “Check this before building,” not “Looks allowed based on what we know,”
because material City/property checks that affect placement and approval remain unresolved.

## 10. Research and modeling gaps that block a clean common answer

### Genuinely missing legal authority (highest priority)

1. **Ordinary permit/approval requirements.** The package explicitly does not resolve
   whether a normal Clearwater residential fence needs a permit or what other approval is
   required. This blocks an unqualified answer to “Can I build it?”
2. **Official horizontal sight-visibility-triangle geometry.** Visibility applies to all
   fences, but the operative figures were not textually recovered. This blocks a clean
   location answer, especially near streets and driveways.
3. **Complete pool-barrier authority only for the pool branch.** § 3-807.A's four-foot
   statement is not a complete safety-barrier rule. It does not block the stated no-pool
   ordinary scenario, but it must block any pool result.

### Authority available but not yet modeled

* The package identifies special district/overlay standards and private/subdivision plan
  dependencies but does not model their content. For known LMDR, the named Downtown/US 19/
  Tourist/overlay regimes should be checked only if property data indicates one; do not
  reopen all of them for the primary scenario.
* § 3-904's vertical obstruction band is described in research but no visibility runtime
  rule exists because horizontal geometry is held.
* The package describes pool enclosure text but correctly holds it from runtime pending the
  complete external authority.

### Existing inputs that are poorly presented or not supplied

* Only zoning is adapted for 1950 DREW PLZ. Ordinary placement can still be affected by
  water adjacency, lot frontage, attached-dwelling status, principal structure, prohibited
  areas, utility easements, and right-of-way adjacency.
* Atomic duplicate inputs (`material`/`is_chain_link`/`is_wire_fence`) should be populated by
  one curated answer. Compliance attestations and official-decision labels must become
  guidance or City checks.
* `project.applicable_maximum_height` is an indirect outcome dependency, not a resident fact;
  combined-height automation remains incomplete.

### Special cases safe to defer

Barbed wire and its unresolved top-wire interaction; waterfront details when the property
is not waterfront; retaining walls/detention ponds; attached-dwelling uniform exceptions;
entry structures; fences over 100 feet along a street; public landbank/vacant lots;
recreation facilities; subdivision perimeters; nonconforming repair; maintenance; temporary
construction fencing; and City-engineer exceptions. Trigger them only when intent or trusted
property data indicates them.

### Minimum blocking research for an ordinary residential answer

Research only (1) Clearwater's ordinary residential fence permit/approval pathway and
(2) the authoritative, usable horizontal sight-visibility-triangle geometry and how to
apply it to a proposed fence location. Pool-barrier authority is the minimum additional
research only when Groundrule elects to support pool fences. Parcel-specific facts are a
data/modeling gap rather than missing law and can remain explicit City checks in the first
resident-flow implementation.

## 11. V1 product contract

### What Groundrule V1 may promise now

> For a trusted Clearwater pilot address, Groundrule can use the stored zoning fact and a
> few plain project questions to explain the currently modeled ordinary fence height,
> material, location, orientation, and chain-link rules, while clearly separating checks
> that still require property records or Clearwater review.

It may also promise that residents will not have to classify zoning, setbacks, easements,
rights-of-way, lot types, regulatory applicability, or approval status.

### What it must not promise

* That a fence is legal, approved, permit-free, or safe to build.
* That zoning alone resolves exact placement, easements/right-of-way, sight visibility,
  waterfront status, frontage, private restrictions, or subdivision-plan compliance.
* A complete pool-barrier answer.
* That an absent special-case answer means the legal fact is false.
* Coverage of every overlay, special district, unusual use, wall/retaining-wall design,
  repair, maintenance, public project, or construction-site fence.

## 12. Smallest next implementation after blocking research

After the two minimum ordinary-fence research gaps are resolved, implement one narrowly
scoped **curated Clearwater resident presentation layer** without changing evaluator
semantics:

1. map the three base questions to existing machine facts, including one-to-many material
   mapping and intent-derived facts;
2. add explicit common-versus-triggered-versus-special rule filtering for question planning
   (filtering presentation, never deleting rules or treating unknown as false);
3. add chain-link and other narrow conditional branches;
4. replace atomic/official labels with the plain-language mapping in this audit;
5. group evaluator results into the three human states and practical sections above, with
   compact official citations and explicit City/property checks.

Do not begin with more GIS. The current zoning vertical slice is sufficient to build and
test the curated interaction once the two legal blockers are known; additional property
facts can later reduce the “Check before building” list without changing the question
contract.

RESIDENT FENCE FLOW NEEDS MORE REGULATORY RESEARCH
