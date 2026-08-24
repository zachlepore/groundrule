# Clearwater resident fence rule update V1

## 1. Scope and repository stop gate

This is the final narrow regulatory-data pass before the resident workflow. It adds one
forward-only migration and evaluator fixtures; it does not change the generic evaluator,
property/GIS code, UI, or any applied migration. The inspected repository is consistent
with the approved architecture: the committed pilot and property tests identify **1950
DREW PLZ** as `clean` and expose only trusted `property.zoning_district = "lmdr"`. They do
not establish corner-lot, driveway, right-of-way, proposed-segment, height, or material
facts.

## 2. Source findings incorporated

Only the authoritative Clearwater evidence recorded in the approved research package is
used. The ordinary permit chain is CDC §§ 4-203 and 8-102; permit review and applicable
plans are distinguished from substantive zoning permission. The final-inspection duty is
Code § 47.111. The sight rule is the text of §§ 3-803.F, 3-807.B, and 3-904.A plus the
manually recovered authoritative figure captioned **“Sight Visibility Triangle”** and
associated with § 3-904.A. No GIS source is treated as law.

The recovered figure supplies two 20-foot legs at the depicted street/right-of-way and
driveway/right-of-way intersection corners, creating the depicted **20 ft × 20 ft
triangle**. Within that triangle it permits only a **non-opaque fence not exceeding 30
inches**. The independently supported text protects the view from 30 inches through eight
feet above grade. Those are retained as complementary figure and text facts, not collapsed
into a fabricated geometry interpretation. The City Engineer's exception authority is
retained separately.

## 3. Permit rules

Three atomic rules are added:

* `permit.building_required` — result-only obligation: permit required before construction;
* `permit.review_path` — informational application/applicable-plan, Community Development
  Coordinator development-standard review, and Building Official building-code review;
* `permit.final_inspection` — result-only obligation to request final inspection after
  completion (without inventing intermediate inspections).

All are triggered by `project.structure_type = fence`, which the application derives when
the resident selects the fence workflow. There is deliberately no `permit_obtained` fact.
The existing `project.building_official_approval` remains scoped to temporary construction
fencing and is not reused or deleted.

## 4. Sight-visibility rules

The update resolves held candidate `CLR-FENCE-021` with atomic rules:

* `visibility.triangle_restriction` carries the two 20-foot horizontal legs, the 30-inch
  maximum, required non-opacity, and the supported presentation hook;
* `visibility.triangle_conflict` deterministically identifies a known in-triangle opaque
  fence or height above 30 inches, while preserving the separate 30-inch-through-eight-foot
  protected band and not claiming a permit decision;
* `visibility.applicability_review` produces a City check when a normal-human location
  answer indicates a nearby driveway/corner but exact intersection is unavailable;
* `visibility.city_engineer_exception` represents only a documented official approval.

`project.in_sight_visibility_triangle` is authoritative and not resident-answerable.
`project.near_sight_visibility_intersection` is only a coarse warning trigger. No fence,
driveway, curb, right-of-way, grade, alignment, vertex, or parcel geometry is invented.

## 5. Resident question mapping

The later presentation adapter should ask approximately three questions and derive the
following machine facts.

| Human answer | Machine facts | Rules affected |
|---|---|---|
| Front yard / along the street | `project.location_zone=front`; proximity remains false/unknown unless the resident separately says it is near a corner/driveway | front height/design rules; possible conditional visibility check |
| Side yard | `project.location_zone=side` | side/rear height rules |
| Back yard | `project.location_zone=rear` | side/rear height rules |
| Near a driveway | segment location (`front`/`side`/`rear`) **plus** `project.near_sight_visibility_intersection=true` | ordinary location rules plus visibility review |
| Near a street corner | segment location plus `project.near_sight_visibility_intersection=true` | ordinary location/frontage rules plus visibility review |

“Near” must never derive `project.in_sight_visibility_triangle=true`; it triggers a check.
Multiple segments should be evaluated separately. A plain front/side/back answer can derive
`project.near_sight_visibility_intersection=false` only when the answer wording expressly
confirms it is not near either location; absence of that confirmation remains unknown.

### Height

Ask for the highest planned fence portion in feet/inches, normalize to
`project.height` in feet, and display familiar dimensions. `30 in → 2.5 ft` is exact and
affects the sight restriction; ordinary whole-foot values affect §§ 3-804/3-805 height
rules. Do not request precision beyond inches or infer combined-component height.

### Material

| Human answer | Derived machine facts |
|---|---|
| Wood privacy fence | `project.material=wood`, `project.is_chain_link=false`, `project.is_wire_fence=false`, `project.is_opaque=true` when the selected design is expressly privacy/solid |
| Vinyl privacy fence | current enum lacks vinyl; use `project.material=other`, derive opaque only when expressly solid, and route material appropriateness to City review |
| Chain-link | `project.material=chain_link`, `project.is_chain_link=true`, `project.is_wire_fence=true`, `project.is_opaque=false`; conditionally ask coating/color and exposed-top treatment only where unresolved |
| Other non-opaque | use the supported underlying enum (`other_wire` or `other`) and `project.is_opaque=false`; unusual material review remains conditional |
| Unusual/special | `project.material=other`; do not guess opacity, safety, or approval |

Opacity is a design fact, not an invented material law. A generic “wood” or “vinyl” answer
must be clarified only when sight/waterfront opacity is outcome-determinative.

## 6. Conditional questions and hidden inputs

Chain-link coating/color, top treatment, and placement are triggered only by chain-link.
Opacity clarification is triggered only when the chosen material does not determine it and
a visibility/waterfront rule needs it. Near-driveway/corner clarification is triggered by
the location response; exact legal triangle classification remains a City/property check.
Entry structures, combined components, long street planes, waterfront, repairs, and other
special branches remain conditional.

| Problematic input/class | Presentation behavior |
|---|---|
| `project.maintenance_review_passed`, `project.lean_angle` | INTERNAL ONLY (maintenance workflow) |
| `project.building_official_approval` | CITY REVIEW (temporary construction fence only) |
| `project.safety_material_review_passed`, `project.material_appropriateness_approved` | CITY REVIEW after unusual material; never an attestation question |
| `project.designed_lean_permitted` | CONDITIONAL SPECIAL CASE (maintenance/nonvertical design) |
| `project.sight_visibility_exception_approved`, `project.city_engineer_authorized` | INTERNAL ONLY official decisions; distinct authorities/rules |
| `project.in_sight_visibility_triangle` | DERIVED FROM PROPERTY DATA or City determination; not resident-entered |
| support orientation, finished side, permit, plans, inspection duties | RESULT ONLY |
| public land, cemetery/City facility, construction, recreation/institutional, subdivision perimeter | CONDITIONAL SPECIAL CASE or DERIVED FROM PROPERTY DATA |

No obscure special-use or inspection input is promoted into the ordinary planner.

## 7. Human-facing result groups

No evaluator return type changes. Outcome `parameters.presentation_group` provides a light
adapter hint while existing outcomes/citations remain authoritative:

1. **WHAT YOU CAN DO** — matched substantive limits/requirements, including the 30-inch,
   non-opaque in-triangle standard.
2. **BEFORE YOU BUILD** — permit, review/application/plans, and final inspection.
3. **CHECK THIS** — unknown exact triangle applicability, conflicting known designs, City
   Engineer exception, and other official/discretionary review.

The later adapter must translate evaluator states and never expose `MATCHED`, `UNKNOWN`,
`REVIEW_REQUIRED`, “unresolved input,” or “atomic rule.” Unknown rules cannot become an
“allowed” conclusion.

## 8. Explanatory-diagram hook

The relevant outcome parameters reference
`presentation_asset_id: clearwater_sight_visibility_triangle_v1`. This uses existing JSON
metadata and creates no asset system. No image was copied, traced, embedded, or added. The
legal values and citation remain structured independently, and the identifier is only a
future presentation lookup.

## 9. Migration strategy and application

The single forward-only migration is
`supabase/migrations/20260824000002_update_clearwater_resident_fence_rules.sql`. It checks
for the published rule set, exactly 44 active prerequisite rules, required provisions, and
required inputs, failing loudly on mismatch. It targets new provisions, inputs, rules,
outcomes, manifests, and citations rather than reseeding. Previously published rule
versions and applied migration files are untouched.

Exact Supabase SQL Editor order:

1. Confirm these are already applied, in order:
   `20260822000000_create_municipal_rule_schema.sql`,
   `20260823000000_seed_clearwater_fence_rules.sql`,
   `20260823000001_grant_groundrule_public_read_privileges.sql`,
   `20260824000000_create_property_lookup_schema.sql`, and
   `20260824000001_seed_clearwater_residential_pilot.sql`.
2. Paste the complete contents of
   `20260824000002_update_clearwater_resident_fence_rules.sql` into one SQL Editor query.
3. Run it once without splitting its transaction; any prerequisite mismatch must abort.
4. Verify 51 active Clearwater rules, primary citations on all seven new rules, and no
   `permit obtained` input. Then verify the exact lookup for `1950 DREW PLZ` remains CLEAN
   with zoning `lmdr`.

## 10. Canonical scenarios

All scenarios explicitly add resident answers to the sole trusted pilot zoning fact:

* **A:** rear/side, ordinary opaque material and ordinary height: ordinary substantive
  rules remain conservative; permit/review/final-inspection guidance matches without a
  permit-status question.
* **B:** exact in-triangle fact supplied by authoritative determination, opaque and above
  30 inches, no exception: restriction and conflict match.
* **C:** exact in-triangle determination, non-opaque and at/below 30 inches: restriction
  matches and conflict does not; other unresolved rules still prevent a universal allowed
  verdict.
* **D:** resident says near driveway/corner but exact intersection is unknown: City check
  matches, restriction remains unknown, and the planner cannot ask the authoritative exact-
  geometry input.

## 11. Validation

The completed pass ran `npm run test:evaluator`, `npm run test:questions`, `npm run
test:property`, `npm run test:gis`, the focused resident rule fixture, `npm run lint`, `npm
run build`, and `git diff --check`. It also confirmed the applied-migration baseline via
Git diff, that zoning still reaches the evaluator through the CLEAN-only adapter, and that
no municipal figure or UI asset was added.

## 12. Remaining limitations and exact next task

Groundrule still lacks authoritative right-of-way, driveway/access-opening, grade, parcel,
and proposed fence-segment geometry, so it cannot calculate intersection automatically.
The sources do not establish a fence-specific form/checklist, fee, intermediate inspection
sequence, opacity percentage, alley triangle, or general material equivalence. Current
property data supplies zoning only. These limitations are checks, not manufactured facts.

After applying this migration, the exact next task is **BUILD CLEARWATER RESIDENT FENCE
FLOW V1**: implement address confirmation, approximately three plain-English questions,
triggered special branches, grouped results, official links, and a new Groundrule-authored
sight explanation/diagram. This update confirms that task can proceed directly; it does
not begin it.

READY TO APPLY RESIDENT FENCE RULE UPDATE
