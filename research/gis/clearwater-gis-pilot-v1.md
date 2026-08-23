# Clearwater GIS acquisition pilot v1

## Status and scope

This is a local-only acquisition and preprocessing proof for the three layers authorized
by the Phase 1 plan: Pinellas County site addresses, Pinellas County parcels, and City
of Clearwater zoning. It does not touch Supabase, the evaluator, the fence workflow, or
application code. The only evaluator-ready output is the existing machine key
`property.zoning_district`.

The execution environment could not reach either ArcGIS Online or arbitrary HTTPS
hosts (the proxy returned HTTP 401/403 before a remote response). Consequently, no
endpoint, field name, record count, or pilot result is claimed as verified, and no
fabricated extracts are committed. Endpoint URLs must not be guessed. The script
therefore requires the three locally verified Feature Layer URLs and exact field
allow-lists as environment variables, validates them against live layer metadata, and
stops before writing a completed snapshot if any contract is false.

## Authoritative endpoint verification worksheet

Complete this table from each agency's current public ArcGIS REST layer page before
running. A URL must end in the numeric Feature Layer ID (for example `/FeatureServer/0`),
not merely a web map, item page, service root, or query URL.

| Source | Required environment variable | Service URL / layer ID | Metadata to record after local execution |
|---|---|---|---|
| Pinellas County site addresses | `PINELLAS_ADDRESSES_LAYER_URL` | **Not network-verifiable in this environment** | Point geometry; source ID, complete address components, optional parcel ID; query capability; source spatial reference; `maxRecordCount`; pagination; GeoJSON support; access limits |
| Pinellas County parcel polygons | `PINELLAS_PARCELS_LAYER_URL` | **Not network-verifiable in this environment** | Polygon geometry; authoritative parcel ID and source ID; query capability; source spatial reference; `maxRecordCount`; pagination; GeoJSON support; access limits |
| City of Clearwater zoning polygons | `CLEARWATER_ZONING_LAYER_URL` | **Not network-verifiable in this environment** | Polygon geometry; zoning code, description, source ID; query capability; source spatial reference; `maxRecordCount`; pagination; GeoJSON support; access limits |

The generated `source-metadata.json` preserves the exact layer/query URLs, geometry
type, spatial reference, requested fields, capabilities, maximum record count,
pagination declaration, retrieval time, returned count, and SHA-256 of each extract.
The fetcher proves GeoJSON support by requiring a valid GeoJSON `FeatureCollection`;
an ArcGIS JSON error or unsupported format fails the run loudly.

## Pilot extent

The provisional WGS84 bounding box is:

```text
west=-82.7605, south=27.9740, east=-82.7555, north=27.9790
```

This compact, non-person-based block-sized extent was selected as a prospective
residential Clearwater sample. Because the authoritative services and parcel count
could not be accessed here, incorporated-city coverage, residential predominance, and
the target of 75–150 parcels must be confirmed from the first local validation report.
If the parcel count falls outside that range, revise the single `BBOX` constant and
record the reviewed extent here; do not broaden the query to a countywide export.

## Acquisition and required source fields

`scripts/gis/clearwater-pilot.mjs` uses Node's built-in `fetch` and has no GIS runtime,
credentials, or API keys. For every layer it first requests `f=json` metadata and
validates that the URL is a Feature Layer and that every requested field exists. It
then queries only the bounding envelope, asks for WGS84 GeoJSON, selects only the
provided field allow-list, orders by the object ID when available, and pages up to the
advertised `maxRecordCount`. HTTP failures and ArcGIS error envelopes are fatal.

Set each `*_FIELDS` value to the exact, comma-separated service field names discovered
in metadata:

* addresses: stable object/global ID; full address (or all address components, including
  unit); authoritative parcel ID if published;
* parcels: authoritative parcel ID and distinct object/global ID; and
* zoning: zoning code, description/name, and object/global ID.

Geometry is requested for all three sources because the point-in-parcel and
parcel-in-zoning proof requires it. Source identifiers are retained without rewriting.
Reruns write into `.tmp` and promote the complete set only after all fetch and transform
steps succeed.

## Preprocessing and ambiguity policy

The preprocessing step normalizes an address only for duplicate detection (uppercase,
trimmed punctuation and whitespace); it preserves the display value. It first uses an
authoritative address-layer parcel identifier when present and equal to a parcel ID.
Otherwise it applies a boundary-inclusive point-in-polygon cover test. It never chooses
the nearest parcel.

For zoning, it constructs a deterministic interior representative point for the parcel
and requires exactly one covering zoning polygon. As a conservative boundary diagnostic,
it also tests parcel exterior vertices: more than one zoning code marks the parcel
ambiguous rather than assigning the largest overlap. This avoids silently resolving a
multi-zone parcel, although it is deliberately not a full polygon-overlay area engine;
edge crossings without an exterior vertex inside each district remain a documented
limitation and should be inspected in the spot checks.

Records are labeled `review`, never `clean`, for missing identity, duplicate normalized
addresses, zero/multiple parcel matches, missing parcel IDs, zero/multiple zoning
matches, conflicting zoning vertex coverage, or an unsupported zoning value. Zoning
normalization is case/format-only and accepts exactly `ldr`, `lmdr`, `mdr`, `mhdr`,
`hdr`, `mhp`, `c`, `t`, `o`, `i`, `irt`, `osr`, `p`, `d`, and `us19` from the approved
plan. Compound, overlay, unknown, and null values are withheld.

## Outputs and schema

Successful execution creates these small files under
`research/gis/data/clearwater-pilot-v1/`:

* `addresses.geojson`, `parcels.geojson`, and `zoning.geojson` — separate, unmodified
  query feature collections;
* `source-metadata.json` — snapshot provenance and checksums;
* `property-profiles.json` — display/normalized address, address source ID, parcel ID,
  parcel source ID, match method, zoning code/description/source ID, `clearwater-fl`
  jurisdiction, snapshot references, coordinates/representative point, review status,
  issues, and evaluator facts only for clean records; and
* `validation-report.json` — fetched counts, clean count, unmatched/duplicate/no-zone/
  ambiguous-zone counts, represented zoning values, and the first eight deterministic
  clean profiles for manual checking.

No generic warehouse, database representation, or production import is created.
Inspect output sizes before committing them; countywide or unexpectedly large extracts
must remain uncommitted.

## Groundrule fact mapping

For a profile whose official source zoning code normalizes to `ldr` and has no issues,
the output contains exactly:

```json
{
  "property.zoning_district": "ldr"
}
```

The evaluator is not invoked. A review record has `evaluatorFacts: null`, so unknown or
ambiguous zoning cannot leak into rule evaluation.

## Validation and manual spot checks

No raw counts, zoning values, or properties can honestly be reported until local
network execution succeeds. The validation report automatically supplies:

1. addresses, parcels, and zoning polygons fetched;
2. clean profiles and unmatched addresses;
3. duplicate address matches;
4. profiles whose parcel has no zoning or ambiguous zoning; and
5. represented normalized zoning values.

Its eight spot-check rows include address and parcel/zoning source identifiers, address
coordinates, parcel representative coordinates, zoning code, snapshot hashes, and
status. Compare those rows to the three REST layer query pages. Include boundary and
exception cases manually if the deterministic clean sample does not contain them.
Acceptance also requires: every clean profile has both parcel IDs and supported zoning;
no record with issues is clean; every clean `evaluatorFacts` object has only
`property.zoning_district`; and the extent contains approximately 75–150 parcels.

## Exact local execution

After replacing the six angle-bracket values with metadata-verified URLs and field
names, run this **single shell command** from the repository root:

```bash
PINELLAS_ADDRESSES_LAYER_URL='<verified-feature-layer-url>' PINELLAS_ADDRESS_FIELDS='<id,address,optional-parcel-id>' PINELLAS_PARCELS_LAYER_URL='<verified-feature-layer-url>' PINELLAS_PARCEL_FIELDS='<parcel-id,source-id>' CLEARWATER_ZONING_LAYER_URL='<verified-feature-layer-url>' CLEARWATER_ZONING_FIELDS='<code,description,source-id>' npm run gis:clearwater:pilot
```

If actual fields use names outside the documented fallback aliases, also set the
corresponding `*_ID_FIELDS`, `*_TEXT_FIELDS`, `*_PARCEL_FIELDS`, `*_CODE_FIELDS`, or
`*_DESCRIPTION_FIELDS` variables shown in the script. This explicit configuration is
intentional: automatically guessing similarly named public layers or schema fields
would undermine authoritative provenance.

## Limitations

* Network restrictions prevented authoritative endpoint discovery, metadata capture,
  acquisition, output generation, count validation, and manual spot checks here.
* The extent is provisional until verified against city and parcel layers.
* The dependency-free zoning diagnostic is conservative but not a true overlap-area
  calculation. Any suspected boundary parcel requires GIS/manual review.
* The script does not infer jurisdiction, land use, ownership, development, frontage,
  water adjacency, easements, or any other rule input.

GIS PILOT NEEDS LOCAL EXECUTION
