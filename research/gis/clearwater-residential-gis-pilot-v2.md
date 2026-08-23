# Clearwater residential GIS pilot v2

## Status, scope, and selected extent

This iteration preserves the proven v1 address → parcel → zoning → profile architecture and only makes the pilot definition, validation, and QC output explicit. It creates no Supabase migration or upload and changes no evaluator, regulatory rule, fence workflow, question planner, or UI.

The implementation environment could not route to the authoritative ArcGIS hosts (`ENETUNREACH`). It was therefore not possible to identify and verify a predominantly residential extent here without inventing coordinates. The explicit configuration in `scripts/gis/clearwater-residential-pilot.json` intentionally has a `null` bounding box and requires `CLEARWATER_RESIDENTIAL_BBOX` at execution. This is a safety gate, not a placeholder claim. Select a compact envelope in the authoritative viewers that is clearly inside Clearwater, avoids waterfront/downtown/airport/industrial/institutional/major-multifamily areas, and returns 75–150 parcel polygons. Record the verified WGS84 `[west, south, east, north]` in the config after review.

The output target is `research/gis/data/clearwater-residential-pilot-v2/`. No v2 live output or count is committed because acquisition could not run. The committed `clearwater-pilot-v1` files remain validation evidence, not acquisition fixtures.

## What the successful v1 evidence demonstrates

The eight address points all received a single parcel through boundary-inclusive spatial coverage; none was unmatched or duplicated. The three CLEAN profiles had one representative-point zoning match, one zoning code across the parcel-vertex diagnostic, an accepted evaluator enum (`I` or `IRT`), and complete identities. Four represented parcels touched more than one normalized zoning district and stayed REVIEW with no evaluator facts. The airport profile also retained raw `OS/R`; because a slash is not case/format normalization to the approved `osr` enum, it was marked unsupported rather than guessed. V2 keeps these conservative outcomes, while recognizing `PIN_NUM` as the address layer's identifier-first parcel candidate when it exactly equals a parcel identifier.

## Authoritative layers and minimal fields

Use only the already validated services and allow-lists:

| Layer | Authoritative service | Requested fields |
|---|---|---|
| Pinellas site addresses | `https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer/0` | `OBJECTID,PIN_NUM,SITEADDID,ADDPTKEY,FULLADDR,MUNICIPALITY,POSTCODE,STATUS` |
| Pinellas parcel polygons | `https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer/1` | `OBJECTID,PARCELID,STRAP,SITE_ADDRESS,SITE_CITY,SITE_STATE,SITE_ZIP,LAND_USE_CODE` |
| Clearwater zoning polygons | `https://gis.myclearwater.com/arcgis/rest/services/ArcGISMapServices/Zoning_WGS84/MapServer/1` | `OBJECTID,ZONING,ZONING_DESC,SPECIAL` |

The script validates field and geometry contracts against live metadata, queries only the configured envelope, requests WGS84 GeoJSON, pages deterministically, and retains URL, timestamp, source metadata, record count, requested fields, bounding box, and SHA-256. A process-specific temporary directory is promoted as a complete output directory only after all six machine-readable/human-readable products are ready.

## Matching and ambiguity policy

1. Normalize full address text only for duplicate detection; preserve raw display text and units.
2. Prefer an exact authoritative address parcel identifier match. If unavailable or not found, use boundary-inclusive point coverage. Never use nearest parcel.
3. Require exactly one parcel. Zero, multiple, duplicate address text, or missing identity becomes REVIEW.
4. Compute a deterministic interior parcel representative point and require exactly one covering zoning polygon.
5. Conservatively compare zoning codes covering parcel exterior vertices. Multiple representative polygons or multiple vertex-covered codes becomes REVIEW; largest overlap is never silently selected.
6. Keep raw zoning code and description. Normalization only lowercases and removes spaces, underscores, and hyphens. Accepted values remain the evaluator's existing `ldr`, `lmdr`, `mdr`, `mhdr`, `hdr`, `mhp`, `c`, `t`, `o`, `i`, `irt`, `osr`, `p`, `d`, and `us19`. Slash compounds, overlays, nulls, and unknown values are not coerced.
7. Emit `{ "property.zoning_district": normalizedCode }` only for a profile with no issue. REVIEW profiles have `evaluatorFacts: null`.

The vertex test is deliberately conservative but is not a full polygon overlay. A zoning edge can cross a parcel without enclosing an exterior vertex; manual overlay inspection remains required, especially near district boundaries.

## Outputs and validation metrics

A successful live run atomically produces `addresses.geojson`, `parcels.geojson`, `zoning.geojson`, `property-profiles.json`, `validation-report.json`, `source-metadata.json`, plus `qc-sample.md`. The validation report includes addresses fetched, unique represented parcels, parcels fetched, zoning polygons, CLEAN/REVIEW profiles, unmatched addresses, duplicate-or-ambiguous address matches, parcels with no/ambiguous zoning, raw districts represented, evaluator-ready count and percentage, match-method counts, and issue counts by type.

The QC Markdown contains up to ten deterministic CLEAN rows sorted by normalized address and parcel ID. Each row has display address, parcel identifier, match method, raw code, description, normalized code, and exact evaluator facts. It never pads or fabricates the sample when fewer than ten profiles are CLEAN.

## Exact local selection and execution

1. In the Pinellas and Clearwater authoritative viewers, draw a compact ordinary single-family Clearwater envelope and read its WGS84 west/south/east/north coordinates.
2. Run a first acquisition and confirm `parcelsFetched` is 75–150 and map-inspect the three GeoJSON layers. If it is outside the range or not predominantly ordinary residential, adjust only the envelope and rerun.
3. Use this exact command from the repository root, substituting only the four verified coordinates:

```bash
CLEARWATER_RESIDENTIAL_BBOX='<west>,<south>,<east>,<north>' \
PINELLAS_ADDRESSES_LAYER_URL='https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer/0' \
PINELLAS_ADDRESS_FIELDS='OBJECTID,PIN_NUM,SITEADDID,ADDPTKEY,FULLADDR,MUNICIPALITY,POSTCODE,STATUS' \
PINELLAS_PARCELS_LAYER_URL='https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer/1' \
PINELLAS_PARCEL_FIELDS='OBJECTID,PARCELID,STRAP,SITE_ADDRESS,SITE_CITY,SITE_STATE,SITE_ZIP,LAND_USE_CODE' \
CLEARWATER_ZONING_LAYER_URL='https://gis.myclearwater.com/arcgis/rest/services/ArcGISMapServices/Zoning_WGS84/MapServer/1' \
CLEARWATER_ZONING_FIELDS='OBJECTID,ZONING,ZONING_DESC,SPECIAL' \
npm run gis:clearwater:pilot
```

No credentials or API keys are required by the validated public services. After the final extent is accepted, persist its array into the config so subsequent runs need no geographic environment variable.

## Manual QC and acceptance

Open all three GeoJSON outputs and compare every `qc-sample.md` row with the authoritative viewers: address text/point, parcel identifier/boundary, zoning code/description, representative point, and any nearby zoning boundary. Review 100% of exceptions. Confirm the area is inside Clearwater and predominantly ordinary residential, the parcel count is 75–150, at least ten CLEAN examples exist if the source permits, every CLEAN fact is reproducible, and no REVIEW record has evaluator facts. Actual residential codes encountered must be compared to the existing enum; add support only for a source value whose regulatory meaning is authoritatively established.

## Limitations and next architecture step

Live residential counts, districts, normalization observations, and examples remain unverified until the local run and manual inspection. Bounding-envelope queries also return features intersecting the edge, and multiple addresses may legitimately represent one parcel. This pilot does not infer land use, structure type, occupancy, water adjacency, frontage, easements, or other rule facts.

After acceptance, and not before, the sequence is: **Residential GIS pilot → manual spot-check against authoritative GIS → design minimal Supabase property/GIS ingestion → address lookup → replace mock property context in the Clearwater fence workflow.**

RESIDENTIAL GIS PILOT NEEDS REVISION
