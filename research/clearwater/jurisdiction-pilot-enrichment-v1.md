# Clearwater pilot jurisdiction enrichment v1

## Scope and committed evidence

This pass audited `clearwater-residential-pilot-v2`, not an assumed historical count. The committed snapshot contains **126 site-address points**, **123 parcel features**, **5 zoning polygons**, and **126 address-level property profiles representing 114 unique parcels**. Zoning validation leaves **110 CLEAN address profiles on 106 unique stored properties** and 16 REVIEW profiles on 8 parcels. Only CLEAN properties are in the existing production seed.

The authoritative Pinellas site-address layer is the pilot's `addresses.geojson`; its requested fields include `MUNICIPALITY`. The snapshot was retrieved `2026-08-23T23:49:35.559Z` and its SHA-256 is `f00b66631849c9e5654158a25568143a15eb5b70b84e470dbdb6b79ba66506f1`.

## Attribute audit and normalization

Exact raw address-level values:

| Raw `MUNICIPALITY` | Addresses |
|---|---:|
| `CLEARWATER` | 126 |
| `UNINCORPORATED` | 0 |
| Other named municipality | 0 |
| Null/blank | 0 |
| Unsupported/unexpected | 0 |

All addresses sharing a parcel agree. There are **0 conflicts**. The 114 parcel-level results are: Clearwater 114; unincorporated Pinellas 0; other Pinellas municipality 0; unknown 0; ambiguous 0. All use `authoritative_municipality`; geometry fallback was needed 0 times.

The recorded mapping is `CLEARWATER` → `clearwater`, `UNINCORPORATED` → `unincorporated_pinellas`, and the explicit list of Pinellas incorporated municipalities in the ingestion script → `other_pinellas_municipality`. Blank values remain unresolved for geometry fallback (or `unknown` without one); disagreement is `ambiguous`. An unsupported nonblank value throws rather than being silently normalized. These are exactly the existing schema-controlled values; this pass changes no schema constraint.

## Record-level QC

`research/gis/data/clearwater-residential-pilot-v2/jurisdiction-qc.json` is the machine-readable aggregate and record report. `jurisdiction-qc.md` is its human-readable table. Each record includes address, parcel ID, zoning, raw municipality, normalized jurisdiction, derivation method, jurisdiction validation status, and property validation status. Enriched profiles retain the source snapshot references already supported by ingestion. No jurisdiction data is added to resident UI.

## Canonical property

The committed source row for **1950 DREW PLZ**, parcel `122915557820250300`, has raw `MUNICIPALITY = CLEARWATER` and raw zoning `LMDR`. It therefore resolves to jurisdiction `clearwater`, zoning `lmdr`, by authoritative attribute—not by a hardcoded address expectation.

## Unincorporated negative validation

No real `UNINCORPORATED` record exists in this pilot snapshot, so none was fabricated. Existing fixture tests continue to prove that unincorporated, other-municipality, unknown, and ambiguous profiles cannot run either Clearwater Fence or Clearwater Shed. A planner-provided Clearwater-mailing/unincorporated address remains needed for real-world negative validation.

## Supabase enrichment and QC procedure

The forward-only migration `20260827000000_enrich_clearwater_pilot_jurisdiction.sql` keys deterministic updates to the 106 CLEAN parcel identifiers already seeded. It updates the existing jurisdiction columns and adds compact raw value, normalized result, derivation method, validation status, and address snapshot hash under existing `source_snapshot_metadata`. It does not recreate tables or seed rules.

The migration uses a temporary primary-keyed expected set, requires exactly 106 uniquely matched CLEAN Clearwater pilot properties before updating, and verifies exactly 106 enriched rows afterward. Re-running performs the same update and creates no rows, so it is idempotent. A missing or unexpectedly matched property raises and rolls back the transaction. QC compares source raw counts, unique parcel counts, CLEAN stored-property identities, canonical output, and migration expectations.

## Runtime and property-profile direction

Runtime remains lookup-only: normalized address → stored property RPC → stored jurisdiction → `requireClearwaterProperty` → evaluator. No live GIS or geometry call is introduced. Jurisdiction is a compact trusted safety fact alongside zoning. Future profiles can similarly accumulate only useful authoritative facts (future land use, parcel area, imperviousness, flood data), but none are added here.

## Limitations and refresh strategy

This geographically compact pilot contains only Clearwater municipality values and cannot provide a real-world outside-city case. REVIEW parcels are documented but remain deliberately absent from the trusted property table because their zoning validation is not CLEAN. On refresh, acquire a new authoritative snapshot, rerun deterministic preprocessing, review raw-value and parcel-consistency aggregates, invoke geometry only for unresolved/conflicting QA, regenerate both QC artifacts and a new forward-only count-checked migration, and never rewrite an applied migration.

CLEARWATER PILOT JURISDICTION ENRICHMENT READY
