# Clearwater Shed V1 research and implementation

## Scope and resident question

This workflow answers the ordinary call: **“What are the basic rules for putting a detached storage shed here?”** It provides answers immediately after address and topic selection. It does not attempt complete accessory-building design, determine a surveyed placement, or ask project questions.

## Authoritative sources and finding status

The City of Clearwater Community Development Code is the controlling City source already committed from the City's code publication. The implemented, verified zoning findings are:

- **§ 3-203.A:** an accessory structure ordinarily cannot be between a right-of-way and the principal structure.
- **§ 3-203.B:** an accessory structure follows the setbacks of its zoning district.
- **§ 3-203.C:** accessory structures cumulatively cannot exceed 25 percent of principal-use gross floor area.
- **§ 3-203.D:** the residential base maximum is 15 feet; Level One flexible approval may allow 20 feet, but never above the principal structure.
- **§ 2-202:** LMDR detached-dwelling minimum setbacks are 25 feet front, five feet side, and ten feet rear. The waterfront rear condition is not asserted for the pilot property.

The initial planner lead said “anything under 100 SF no permit required,” while narrow research did **not** locate an accessible City primary-source provision establishing whether the exemption was `< 100` or `<= 100`. On August 27, 2026, Clearwater planner contact Abi directly validated that exactly 100 square feet remains exempt, measurement uses the pad or footprint's exterior dimensions, and ordinary zoning/setback rules still apply. This is **planner-validated**, not independently verified published-Code or web guidance. The structured rule now represents **100 square feet or smaller / larger than 100** and distinguishes the **building permit** exemption from continuing City development standards. Structure qualifiers, anchoring/foundation treatment, and utility trade permits remain unresolved.

## Rule classification

### A. Primary answers

1. Planner-validated building-permit threshold and precise inclusive boundary.
2. Property-specific LMDR front, side, and rear minimum setbacks, measured from property lines.
3. Residential base maximum shed height of 15 feet.

### B. Specific situations

- Larger than 100 square feet: use the City building-permit path under the complementary planner-validated boundary.
- Electricity or plumbing: confirm separate trade permits.

These are conditional statements, never required questions. The optional flexible-height process, waterfront rear-setback alternative, cumulative size cap, flood requirements, easements, and impervious capacity are not promoted into basic answers.

### C. Property-derived

Zoning district is already provided by `propertyProfileToFacts`. For **1950 DREW PLZ**, the sole trusted resident-facing property fact is `property.zoning_district = "lmdr"`. No corner, flood, waterfront, easement, frontage, parcel-size, principal-building-area, or impervious-capacity fact is invented.

### D. City review

City review is appropriate for trade permits, flexible height above 15 feet, uncertain legal property-line placement, waterfront/flood conditions, and unusual structures. The permit boundary itself is planner-validated.

### E. Deferred / outside V1

Exact cumulative accessory floor area, remaining impervious-surface ratio, flood construction, easement conflicts, waterfront setback selection, principal-structure height, nonresidential sheds, attached structures, accessory dwellings, and Level One flexibility are deferred.

## Property-data audit

| Fact | Classification | V1 treatment |
| --- | --- | --- |
| Zoning district | Already available | Drives LMDR rule |
| Parcel/address geometry | Already available internally | Lookup only; not presented as a survey |
| Parcel size | Derivable from current geometry | Not necessary for basic V1 |
| Zoning setbacks | Already available as rules | Evaluated from zoning |
| Corner-lot/frontage status | Potentially derivable, not trusted today | Not necessary for base LMDR values |
| Flood status | Requires new authoritative GIS source | Deferred |
| Waterfront status | Requires new authoritative GIS classification | Conditional/deferred |
| Easements | Requires new authoritative source | City review |
| Impervious coverage | Requires land-use designation and existing coverage | Separate future problem, deferred |
| Principal-building area/height | Not in trusted property facts | Cumulative-size and absolute-height caveats deferred |

No GIS layer or property schema was added.

## Architecture and migration

`20260826000000_seed_clearwater_shed_rules.sql` is the immutable original publication. `20260827000002_validate_clearwater_shed_permit_threshold.sql` adds forward-only Version 2 records for the two threshold rules because their published outcomes lacked measurement semantics and accurate planner provenance. It leaves the already-correct inclusive number intact, preserves Version 1 history, and does not revise `permit.utilities`, setbacks, or height. No generalized schema or evaluator change was required.

The workflow reuses the trusted address lookup, clean-profile gate, property fact adapter, generalized loader/evaluator, `Facts`/outcome/citation contracts, Beta V1 CSS, answer cards, trust strip, compact citations, Specific Situations grammar, and safe unsupported-address behavior. The only new workflow-specific modules are the Shed action, adapter, route/workflow composition, rule package, research record, and tests. Fence's currently route-local presentation components remain a candidate for extraction before workflow #3; a broad rewrite was deliberately avoided.

## Canonical output

For **1950 DREW PLZ** (trusted zoning: LMDR), the guide returns:

- Building permit: not required for sheds 100 sq ft or smaller. Measure the shed footprint using exterior dimensions. Setback and zoning rules still apply.
- Setbacks: at least 25 ft from the front property line, 5 ft from a side property line, and 10 ft from the rear property line; not between the right-of-way and principal structure.
- Height: 15 ft maximum base shed height.
- Specific situations: larger sheds and utility work receive concise City handoffs.

If trusted zoning is absent or unsupported, the adapter does not invent generic setbacks. The property lookup rejects non-clean profiles before evaluation.

## Reusability assessment

At least **nine existing modules/patterns** were directly reused: property lookup, property fact adapter, rule loader, evaluator, rule types, address/project/answer flow, property trust strip, answer-card/citation grammar, and Specific Situations styling. No genuinely new cross-workflow architecture, schema change, evaluator, questionnaire, or GIS expansion was necessary. The most substantial work was regulatory interpretation and separating verified accessory-structure standards from the unresolved permit lead—not application engineering.

Shed was materially simpler than inventing Fence from scratch: its implementation is a rule package, a small presentation adapter, and a thin route over existing infrastructure. Exact developer hours are not measurable. Before workflow #3, the duplicated route-local `Source`, answer-card, Specific Situations, address lookup, and project-selection presentation should become shared typed components without making regulatory adapters generic.

## Remaining minimum gap

The exact boundary, footprint/exterior-dimension measurement, and continued zoning/setback applicability are now formally planner-validated. Published primary-source confirmation remains unavailable, and covered shed types plus the effects of anchoring, foundations, electricity, and plumbing remain unresolved.

SHED V1 PERMIT THRESHOLD PLANNER-VALIDATED; TARGETED LIMITS REMAIN
