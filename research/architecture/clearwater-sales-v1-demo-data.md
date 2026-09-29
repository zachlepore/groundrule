# Clearwater Sales V1 curated demo data

## Boundary and current architecture

This dataset is a deliberately small, manually verified sales-demo set, not Clearwater production coverage. Its versioned source is `research/gis/data/clearwater-sales-v1/demo-properties.json`. An empty `records` array means no property has yet met the manual-verification contract; GIS output alone is not manual verification.

Canonical records continue to use `public.properties` and `public.property_addresses`, created by `20260824000000_create_property_lookup_schema.sql`. The original residential pilot was acquired by `scripts/gis/clearwater-pilot.mjs`, committed under `research/gis/data/clearwater-residential-pilot-v2`, and its CLEAN subset was loaded by `20260824000001_seed_clearwater_residential_pilot.sql`. Jurisdiction columns and provenance were subsequently added/enriched by the 2026-08-26 and 2026-08-27 migrations. In particular, `1950 DREW PLZ` came from that GIS pilot and remains unchanged; it is not relabeled as manually verified.

The existing `properties.source_snapshot_metadata` JSON object is the demo boundary. Generated rows carry `demoDataset.id`, `designation`, `ingestBatchId`, and manifest path plus the complete `manualVerification` object. No schema field is necessary. Querying `source_snapshot_metadata->'demoDataset'->>'id' = 'clearwater-sales-v1'` answers which canonical properties belong to this set. Raw GIS snapshots remain separate files, while future production imports can use their own metadata namespace/batch.

Runtime behavior is unchanged. `resolve_property_address_state` explains no-match, ambiguity, and REVIEW; `find_trusted_property_by_address` and municipality search are CLEAN-only. The shared TypeScript lookup converts a CLEAN canonical row to `property.zoning_district`, and the Clearwater gate requires confirmed Clearwater jurisdiction before any of the six Guide actions evaluate it.

## Add one verified property

1. Independently verify the canonical address, parcel identity, incorporated Clearwater jurisdiction, and zoning. Do not copy a zoning value merely because the polygon classifier emitted it.
2. Add one object to `records` with this shape (values below are field descriptions, not sample property facts):

```json
{
  "displayAddress": "<trusted display address>",
  "normalizedAddress": "<canonical uppercase address>",
  "parcelIdentifier": "<canonical parcel ID>",
  "sourceParcelIdentifier": "<source parcel ID>",
  "municipality": "Clearwater",
  "zoningCode": "<manually verified raw code>",
  "zoningDescription": "<official description>",
  "normalizedZoningCode": "<supported lowercase evaluator code>",
  "sourceAddressIdentifier": "<stable source address ID>",
  "ingestBatchId": "clearwater-sales-v1-<reviewed batch name>",
  "verification": {
    "status": "manually_verified",
    "verifiedOn": "YYYY-MM-DD",
    "zoningSource": "<authoritative source/reference>",
    "zoningMethod": "<how the parcel and zoning were manually checked>",
    "jurisdictionSource": "<authoritative municipality source/reference>",
    "notes": "<audit-ready verification notes>"
  }
}
```

3. Run `npm run demo:clearwater:validate`. It requires every trust input, explicit supported zoning, Clearwater municipality, canonical normalization, and unique address/parcel values within the manifest.
4. Run `npm run demo:clearwater:report` and review the property count, addresses, parcels, zoning coverage, dates/statuses, and batches.
5. Give each addition batch a new ID, then generate only that batch as a reviewable, timestamped migration: `node scripts/demo/clearwater-sales-v1.mjs sql research/gis/data/clearwater-sales-v1/demo-properties.json supabase/migrations/<timestamp>_seed_clearwater_sales_v1.sql <ingest-batch-id>`. The manifest remains cumulative for reporting, while already-applied batches are not emitted again.
6. Review the migration and apply it through the normal Supabase migration process. Its transaction rejects an inactive/missing Clearwater jurisdiction, an existing active canonical address, or an existing parcel. It never derives zoning and inserts CLEAN only because the manifest contract has already required explicit manual verification.
7. Run property, Guide, lint, and build checks before deployment. No service-role or ad hoc dashboard editing is part of this workflow.

## Inspect the demo set

The Git-controlled view is `npm run demo:clearwater:report`. After a generated seed has been applied, inspect the canonical database with:

```sql
select
  p.source_snapshot_metadata->'demoDataset'->>'id' as dataset_id,
  p.source_snapshot_metadata->'demoDataset'->>'ingestBatchId' as ingest_batch_id,
  a.display_address,
  p.parcel_identifier,
  p.normalized_zoning_code,
  p.source_snapshot_metadata->'manualVerification'->>'status' as verification_status,
  p.source_snapshot_metadata->'manualVerification'->>'verifiedOn' as verified_on
from public.properties p
join public.property_addresses a on a.property_id=p.id and a.jurisdiction_id=p.jurisdiction_id
where a.active and p.source_snapshot_metadata->'demoDataset'->>'id'='clearwater-sales-v1'
order by a.normalized_address;
```

## Production reconciliation

Stage a future authoritative citywide import before touching canonical rows. Match by jurisdiction plus parcel ID and by active normalized address. Exact overlaps update the single canonical property only after zoning comparison; conflicts go to review rather than silent overwrite. Preserve the demo metadata in audit history, add the production batch/source provenance, then archive the demo batch after reconciliation. Never create a second canonical property for an overlap. Because both datasets use the same tables, CLEAN gate, jurisdiction guardrail, and fact adapter, the Guides require no change.
