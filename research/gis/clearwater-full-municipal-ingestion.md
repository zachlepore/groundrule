# Clearwater municipality-wide GIS ingestion audit and runbook

## Current architecture and pilot limitation

The existing offline pipeline queries three authoritative ArcGIS feature layers, writes immutable source snapshots and metadata, normalizes addresses, matches an address to a parcel by authoritative identifier (with point-in-polygon fallback), conservatively joins parcel geometry to zoning, resolves jurisdiction from the county `MUNICIPALITY` attribute, and emits canonical profiles. Only profiles with no validation issue receive evaluator facts. Runtime lookup reads the internal PostgreSQL tables through security-definer RPCs; it does not call external GIS.

The pilot was limited solely by `CLEARWATER_RESIDENTIAL_BBOX`: every source query used the same small envelope. Its preprocessing also performed repeated linear parcel scans, which was acceptable for 126 addresses but unsuitable municipality-wide. The property schema already has a jurisdiction-scoped unique parcel key, an exact active-address index, a partial trigram autocomplete index, and CLEAN-only runtime RPC predicates. No index or schema migration is justified before measuring a staged full load.

Authoritative sources remain:

1. Pinellas County Enterprise GIS Parcels MapServer layer 0 (site address points, including `PIN_NUM` and authoritative `MUNICIPALITY`).
2. Pinellas County Enterprise GIS Parcels MapServer layer 1 (parcel polygons and identifiers).
3. City of Clearwater `Zoning_WGS84` MapServer layer 1 (zoning polygons/codes).

The earlier committed pilot and production seed are retained unchanged.

## Municipality-wide extraction and trust controls

Run `npm run gis:clearwater:full` with the three layer URL environment variables documented by the pilot. The full extractor:

- selects candidate addresses with the source-side predicate `MUNICIPALITY = 'CLEARWATER'`, not postal city text;
- derives a padded envelope from those authoritative address points and bulk-pages parcel features intersecting it (neighboring parcels may be retrieved but cannot become Clearwater-confirmed without address attribution);
- bulk-pages the complete Clearwater zoning layer;
- checks live field contracts, geometry types through preprocessing, deterministic pagination support, preflight counts, and post-download counts;
- records URL, predicate/envelope, retrieval timestamp, service edit date/version when exposed, fields, counts, and SHA-256;
- refuses to overwrite an existing full snapshot directory; and
- writes through a temporary directory and promotes it atomically only on success.

Identifier matching now uses a parcel map rather than a per-address full scan. Conservative spatial fallback and zoning checks remain unchanged: no nearest/largest match is selected. Any missing/duplicate identity, no/multiple parcel, no/conflicting zoning, unsupported zoning, invalid geometry, or municipality conflict remains REVIEW and has no evaluator facts.

## Outputs and staged database process

The run creates raw GeoJSON, all canonical profiles, a CLEAN-only import candidate, a separate REVIEW ledger, source metadata, machine-readable QA, human-readable QA, and a deterministic 24-record geographic sample. Boundary entries are extent proxies and must be checked manually; the available source data does not identify corner lots or waterfront status, so the report does not pretend that it does.

Do not replace production data directly. First load `database-import.clean.json` into an isolated Supabase/staging project with the existing idempotent parcel/address upsert pattern. Preserve the current pilot rows during this validation. Reconcile counts, manually complete every sample comparison, run `ANALYZE`, execute the performance queries below, and verify the canonical regression. Promotion requires an independently reviewed change with observed insert/update counts; REVIEW records remain in the ledger and must never be promoted as trusted.

Representative staging checks:

```sql
select validation_status, count(*) from properties group by validation_status;
select pg_size_pretty(pg_total_relation_size('properties')) properties_size,
       pg_size_pretty(pg_total_relation_size('property_addresses')) addresses_size;
explain (analyze, buffers) select * from find_trusted_property_by_address('clearwater-fl', '1950 DREW PLZ');
explain (analyze, buffers) select * from search_trusted_municipality_addresses('clearwater-fl', '1950 DREW', 5);
select * from find_trusted_property_by_address('clearwater-fl', '1950 DREW PLZ');
```

Acceptance requires the final query to return exactly one CLEAN Clearwater row with parcel `122915557820250300` (verified separately against `properties`) and zoning `lmdr`. Test a known REVIEW address through `resolve_property_address_state`; it must return `review`, while trusted lookup and Guide evaluation remain blocked.

## Current stop condition (2026-09-25)

This environment cannot reach the authoritative Pinellas endpoint: its network proxy returns HTTP 403 (`CONNECT tunnel failed`). Consequently no truthful full source counts, CLEAN/REVIEW percentages, database write counts, geographic manual comparisons, or full-dataset timings can be reported, and no production or staging load was attempted. This is an authoritative-source access constraint and a required stop condition. Re-run from a network allowed by the agencies, then review the generated artifacts before any database operation.

## Manual GitHub extraction

In GitHub, open **Actions → Clearwater full GIS extraction → Run workflow**. The manually triggered workflow runs the same full extractor against the authoritative endpoints and, on success, provides a `clearwater-full-gis-snapshot` download on the workflow run's **Artifacts** section. Successful extraction does **not** authorize a production database load: review the QA JSON, QA Markdown, REVIEW ledger, CLEAN candidates, and geographic sample before any staging or import work.
