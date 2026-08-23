# Clearwater GIS Phase 1: minimum property-data plan

## Decision and scope

This plan replaces the fictional property fact map for a small Clearwater residential
area; it does not attempt to build a general GIS platform. The three permitted source
layers are Pinellas County site-address points, Pinellas County parcel polygons, and
**City of Clearwater** zoning polygons. County unincorporated zoning is explicitly
out of scope inside Clearwater.

The minimum proof is deliberately narrow:

1. match a normalized address to a county address point;
2. associate that point to one county parcel and retain the parcel identifier;
3. spatially join that parcel to Clearwater zoning; and
4. emit only `property.zoning_district` to the existing evaluator.

This proves the complete address → parcel → zoning → Groundrule fact → evaluator
path with an objective, useful seeded fact. It does **not** turn absent data into
`false`. Every deferred fact remains unknown to the evaluator.

## Verified current project state

The seed creates 60 input definitions and 44 active, published rule versions. The
workflow's mock supplies 12 facts. The question planner will not ask for a fact when
its definition disallows user input; `Facts` itself is a machine-keyed JSON-value
map. Accordingly, integration must emit the exact seed keys, not UI labels.

For this inventory, “property-derived” means either (a) the seed's
`default_source_class` is `property_derived`, including three `project.*` segment
facts, or (b) a `property.*` fact is an official decision. This yields 17 relevant
inputs. Counts below are distinct active rules whose `rule_version_inputs` manifest
depends on the input; outcome references alone are not counted.

### Input inventory

| Machine key | Human label | Type | Active rules | In mock? | Proposed source and method | Confidence | Classification / MVP status |
|---|---|---:|---:|:---:|---|---|---|
| `property.zoning_district` | Zoning district | enum | 2 | yes | Clearwater zoning: parcel representative point within polygon; normalize official code to an existing enum option | High | **DIRECT GIS — MVP** |
| `property.is_water_adjacent` | Property is adjacent to water | boolean | 3 | yes | No permitted layer identifies authoritative water boundaries | Low | **DEFER** |
| `property.is_attached_dwelling_lot` | Attached-dwelling lot | boolean | 1 | yes | Parcel shape/address count cannot establish dwelling attachment or legal lot classification | Low | **POSSIBLY GIS / NEEDS RESEARCH — defer** |
| `property.is_downtown` | Property is in Downtown District | boolean | 2 | yes | Clearwater zoning code equals seeded `d`; derive from the same normalized zoning result | High | **DERIVED FROM GIS — post-MVP optional** |
| `property.has_principal_structure` | Parcel has a principal structure | boolean | 1 | yes | None of the three layers contains building footprints or establishes which structure is principal | Low | **DEFER** |
| `project.adjacent_to_public_row` | Segment side or rear line is adjacent to public right-of-way | boolean | 1 | yes | Requires proposed segment geometry plus authoritative ROW, neither is present | High confidence that unavailable | **DEFER** |
| `property.is_vacant_lot` | Property is vacant | boolean | 2 | yes | Parcel/address/zoning alone cannot prove absence of development | Low | **POSSIBLY GIS / NEEDS RESEARCH — defer** |
| `project.is_developed` | Vacant lot has been developed | boolean | 1 | no | Time-sensitive project/property state; three layers do not prove development | Low | **NOT GIS-DERIVABLE from current layers — defer** |
| `project.intersects_prohibited_access_area` | Fence intersects right-of-way, drainage easement, meter, or manhole area | boolean | 1 | yes | Requires proposed fence geometry and authoritative ROW/easement/meter/manhole layers | High confidence that unavailable | **DEFER** |
| `project.in_utility_easement` | Fence is in a utility easement | boolean | 1 | yes | Requires proposed fence geometry and recorded/utility easement geometry | High confidence that unavailable | **DEFER** |
| `property.is_residential_subdivision_perimeter` | Residential subdivision perimeter | boolean | 2 | yes | Parcels do not encode approved subdivision boundary or perimeter status | Low | **POSSIBLY GIS / NEEDS RESEARCH — defer** |
| `property.lot_frontage_type` | Lot frontage type | enum | 3 | yes | Parcel topology alone does not identify addressed/legal front lines or authoritative street frontage | Low | **POSSIBLY GIS / NEEDS RESEARCH — defer** |
| `property.rear_orientation_conditions_met` | Double-frontage rear-orientation conditions met | boolean | 2 | yes | Requires building orientation and adjoining/across-street property pattern review | Low | **NOT GIS-DERIVABLE from current layers — defer** |
| `property.is_public_landbank` | Property is publicly owned and landbanked | boolean | 2 | no | Seed marks this an official decision; ownership text, even if present, would not prove landbank status | High confidence that unavailable | **NOT GIS-DERIVABLE — defer** |
| `property.is_legal_nonconforming_fence` | Fence is legally nonconforming | boolean | 1 | no | Requires permit/code history or official determination | High confidence that unavailable | **NOT GIS-DERIVABLE — defer** |
| `property.rear_abuts_arterial_or_collector` | Rear abuts arterial or collector right-of-way | boolean | 2 | no | Seed marks this official; needs addressed rear determination, authoritative ROW, and City Engineer street classification | High confidence that unavailable | **DEFER** |
| `property.is_recreational_facility` | Listed or officially similar recreational facility | boolean | 4 | no | Seed marks this official; zoning alone does not establish use or “similar” determination | High confidence that unavailable | **NOT GIS-DERIVABLE — defer** |

The mock also contains `project.adjacent_to_public_row`,
`project.intersects_prohibited_access_area`, and `project.in_utility_easement` because
their seed source class is property-derived despite their `project.*` prefix. Those
keys must not be renamed to make them look like parcel attributes.

## The three source-layer contracts

Actual service field names must be recorded during acquisition; they must not be
guessed from display labels. The import adapter should select only fields mapped to
these logical fields.

### 1. Pinellas County site addresses

Required fields only:

| Logical field | Why retained |
|---|---|
| source object/global ID | Stable provenance and duplicate diagnostics |
| full site address, or its house number/prefix/street/type/suffix/unit components | Display plus deterministic normalization/matching |
| parcel identifier, **if the source publishes one** | Preferred explicit address-to-parcel association |
| point geometry | Spatial fallback and validation against parcel |

If a unit field exists it must participate in the normalized match rather than be
dropped. If no parcel ID exists, use `ST_Covers(parcel, address_point)` (not merely
nearest parcel). Boundary points and points covered by zero or multiple parcels go
to manual review; nearest-neighbor guessing is prohibited.

### 2. Pinellas County parcel polygons

Required fields only:

| Logical field | Why retained |
|---|---|
| authoritative parcel identifier | Canonical cross-source property key |
| source object/global ID (when distinct) | Provenance and refresh diagnostics |
| parcel polygon | Address association, zoning join, and visual/manual validation |

Owner, assessed value, mailing address, land-use descriptions, and other appraisal
attributes are not needed. The site address remains the address source of record.

### 3. City of Clearwater zoning polygons

Required fields only:

| Logical field | Why retained |
|---|---|
| zoning code | Map to the seed's exact enum values |
| zoning description/name | Human inspection and mismatch review |
| source object/global ID | Provenance |
| zoning polygon | Spatial join to parcel |

The accepted normalization map is case/format normalization only, to the existing
options `ldr`, `lmdr`, `mdr`, `mhdr`, `hdr`, `mhp`, `c`, `t`, `o`, `i`, `irt`,
`osr`, `p`, `d`, and `us19`. An unknown, compound, overlay, null, or ambiguous code
must not be coerced; withhold the evaluator fact and flag the record for review.

## What Phase 1 can prove

Phase 1 should persist address identity, parcel identity, and Clearwater zoning,
then expose one evaluator fact: `property.zoning_district`. A second value,
`property.is_downtown`, is safely derivable as `zoning_district === "d"`, but should
be enabled only after confirming that the City's `D` polygon has the same regulatory
meaning as the seed input. It is not necessary to prove the architecture and a
residential pilot is unlikely to exercise it.

Parcel geometry and address points are supporting identity/join data, not invented
rule inputs. No seeded `property.parcel_id`, address, or geometry machine key exists,
so none is sent to the evaluator.

### Explicit evaluator mapping

| Stored value | Transformation | Evaluator fact |
|---|---|---|
| `property_profile.zoning_code = 'LDR'` (example source value) | validated normalization against seeded input options | `{ "property.zoning_district": "ldr" }` |
| normalized zoning code `d` (optional after semantic confirmation) | exact equality to `d` | `{ "property.is_downtown": true }` |
| any other validated zoning code (optional after semantic confirmation) | exact inequality to `d` | `{ "property.is_downtown": false }` |

Database identity and provenance fields never enter the fact map. Deferred inputs
are omitted, not emitted as `false` or `null`.

## Minimal property representation

Use four narrow concepts, not a universal GIS warehouse:

1. **`parcel`** — county parcel ID, source feature ID, polygon, source snapshot ID.
2. **`site_address`** — source feature ID, display address, normalized address,
   optional unit, point, resolved parcel ID, resolution method/status, snapshot ID.
3. **`property_profile`** — one row per parcel for the pilot, with parcel ID,
   Clearwater zoning source feature ID/code/description, join method/status, and
   timestamps. Address is not duplicated here because parcels may have multiple
   site addresses.
4. **`source_snapshot`** — source agency/layer name, ArcGIS service/layer URL,
   query parameters or geographic filter, spatial reference, retrieval timestamp,
   service metadata/update timestamp when available, and a checksum or retained raw
   filename.

A generic entity-attribute-value `property_facts` table is unnecessary for the
pilot. The adapter can deterministically create the fact map from typed profile
columns. Add a fact table only when multiple fact versions/sources or stored
decision facts create a demonstrated need.

### Geometry decision

Use **PostGIS geometry now** for parcel polygons, address points, and the temporary
zoning subset. The core claim being tested is spatial association; doing joins in
the database makes predicates and exception reports reproducible. Use a common
documented SRID appropriate to the source/export, preserve source SRIDs in metadata,
validate geometries, and create GiST indexes. Keep zoning polygons only as staging
or source features if profiles already carry the joined zoning result.

A simpler CSV with WKT/GeoJSON plus joins in Python would reduce initial schema work,
but would split the source of truth between preprocessing and the database and make
boundary-case reproduction harder. PostGIS is modest extra setup in an existing
PostgreSQL/Supabase environment and avoids a near-term re-import. This is still not
a warehouse: only the clipped pilot features and minimum attributes are stored.

## Pilot extent and size

Select a contiguous bounding box or hand-drawn polygon containing approximately
**75–150 residential parcels** and their site-address points. This is small enough
to inspect, but large enough to reveal missing, duplicate, unit, boundary, and
one-to-many address cases. Prefer an extent crossing two Clearwater zoning polygons
if a compact boundary can do so without cherry-picking nonresidential parcels. If
not, correctness in one zoning district is preferable to an artificial geography;
add a small adjacent test block for the second value. A named-neighborhood boundary
is not required.

## One-time acquisition and transformation

For a solo developer, use each ArcGIS REST layer's `query` endpoint:

1. inspect layer metadata to record exact fields, object ID, spatial reference,
   maximum record count, capabilities, and service update metadata;
2. query a small polygon/bounding envelope with `geometry`, `geometryType`, spatial
   relationship, `where=1=1`, an explicit `outFields` allow-list, `returnGeometry=true`,
   and a chosen `outSR`; request GeoJSON (`f=geojson`) where supported;
3. page by object IDs if the service limit is reached and verify returned counts;
4. retain the three small raw GeoJSON snapshots outside the application import,
   without editing attributes;
5. use a short, repeatable Python script (GeoPandas/Shapely or ArcGIS JSON plus
   equivalent spatial tooling) to normalize addresses and zoning codes, validate
   geometry, resolve address-to-parcel, calculate parcel-to-zoning joins, and emit
   import-ready CSV/GeoJSON plus exception reports; and
6. perform a one-time import into the narrow pilot tables.

ArcGIS Pro export is a reasonable manual fallback for a service that will not emit
usable GeoJSON, but it makes repeatability and field-selection review weaker. No
scheduler, incremental sync, tiles, geocoder, or production ETL is justified yet.

For parcel zoning, use a parcel `point_on_surface` covered by the Clearwater zoning
polygon as the normal rule and calculate parcel/polygon overlap percentages as a
quality check. A parcel spanning multiple districts is ambiguous and must be held
for review rather than assigned by largest overlap without a policy decision.

## Validation plan

Generate machine-checkable exception reports for zero/multiple matches, duplicate
normalized addresses, invalid geometries, unknown zoning codes, multi-zoned parcels,
and missing source IDs. Then manually spot-check **12–15 parcels**: at least eight
ordinary single-address parcels, two adjacent to the pilot boundary, every duplicate
or multi-address case found (up to three), every zoning-boundary case found (up to
three), and examples from each available zoning value.

For each sample:

- compare the address text and point with the Pinellas source and confirm the point
  is covered by the intended parcel (or the explicit parcel ID agrees);
- compare stored parcel ID and polygon with the county source;
- inspect parcel/zoning overlay and compare code/description with the Clearwater
  source, including overlap diagnostics near boundaries;
- assert one site-address feature resolves to no more than one parcel, while allowing
  multiple distinct address features on one parcel; normalized address duplicates
  must be exceptions, not silently deduplicated;
- run the adapter and assert the exact fact/value, for example
  `property.zoning_district = ldr`, reaches evaluator input; compare evaluation once
  with the fact omitted to show that the formerly unknown zoning-dependent rules are
  affected as expected; and
- trace address, parcel, zoning, and profile rows back to snapshot, layer URL, source
  feature ID, retrieval time, and transform version/checksum.

Acceptance requires 100% review of exceptions, no unexplained duplicate
address-to-parcel mappings, no unsupported zoning enum coercions, and all sampled
facts reproducible from retained snapshots.

## Deferred seeded inputs and eventual dependencies

| Input(s) not solved now | Additional authoritative dependency eventually required |
|---|---|
| `property.is_water_adjacent`, `project.in_waterfront_protected_area` | Authoritative shoreline/water boundary, applicable waterfront setback/line definition, and proposed fence geometry |
| `property.is_attached_dwelling_lot` | Building footprints plus authoritative use/dwelling or permitting records and legal interpretation |
| `property.has_principal_structure`, `property.is_vacant_lot`, `project.is_developed` | Current building footprints/permits or authoritative property-improvement/use data; principal-structure and development criteria |
| `property.lot_frontage_type` | Authoritative street/ROW geometry, addressed-front policy, parcel frontage topology, and possibly official determination |
| `property.rear_orientation_conditions_met` | Building footprints/orientation, neighboring parcels and addressed fronts, plus across-street topology/review |
| `property.rear_abuts_arterial_or_collector` | City Engineer street-classification layer, authoritative ROW, and established rear lot line |
| `project.adjacent_to_public_row` | Authoritative ROW boundaries, established side/rear lot lines, and proposed fence-segment geometry |
| `project.intersects_prohibited_access_area` | ROW/right-of-way-easement, drainage easement, water-meter, and manhole geometries plus proposed fence geometry |
| `project.in_utility_easement` | Recorded and utility easement geometries plus proposed fence geometry |
| `property.is_residential_subdivision_perimeter` | Approved subdivision plats/boundaries and plan records, with official perimeter interpretation |
| `property.is_public_landbank` | Authoritative City landbank inventory/decision, not merely owner name |
| `property.is_legal_nonconforming_fence` | Permit, enforcement, and code-history records or official determination |
| `property.is_recreational_facility` | Authoritative current land use/facility records and official “similar use” determination |

Sight/visibility triangles and required setbacks are relevant to the package but are
not property-derived inputs in the active seed (`project.in_required_setback` is an
`either` source). They remain outside Phase 1. Solving them later requires official
horizontal sight-triangle/ROW geometry or dimensional standards, setback rules,
principal-building geometry, and the proposed fence segment. No false machine keys
are introduced for them.

## Exact next implementation task

Create one reviewed migration for the four narrow PostGIS-backed pilot concepts
(`source_snapshot`, `parcel`, `site_address`, and `property_profile`) and a local,
one-time transformation specification that emits only validated Clearwater zoning
profiles and an exception report. Do **not** connect the application yet. After that
schema review, acquire a 75–150-parcel subset from the three ArcGIS REST layers and
produce import-ready data; evaluator wiring is the following, separately testable
task.

READY FOR GIS PILOT IMPLEMENTATION
