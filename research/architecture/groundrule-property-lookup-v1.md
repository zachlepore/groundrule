# Groundrule property lookup V1

## Scope and repository evidence

The committed Clearwater residential pilot contains 126 profiles: 110 `clean` and 16 `review`. Its validation report records zero unmatched or duplicate/ambiguous address matches and seven parcels with ambiguous zoning. The CLEAN QC sample includes `1950 DREW PLZ` with evaluator fact `property.zoning_district = "lmdr"`. V1 is intentionally limited to this committed snapshot and does not make GIS network calls.

## Minimal schema

`properties` stores a jurisdiction FK, parcel/source identifiers, raw and normalized zoning, validation status, snapshot provenance, and timestamps. Parcel identity is unique within a jurisdiction. `property_addresses` stores the property and jurisdiction FKs, display and normalized address, source address ID, authoritative match method, active state, and timestamps. Its partial unique index makes an active normalized address unique per jurisdiction. No generic EAV warehouse is introduced.

Parcel geometry is deferred. Exact address lookup, zoning retrieval, and evaluator integration use no geometry, so PostGIS would add storage and operational complexity without helping this slice.

## Trust and ingestion

The schema preserves `clean` versus `review`, while the separate deterministic seed contains only the 110 CLEAN profiles (106 parcels). REVIEW data is not copied into production tables. The seed retains source address and parcel identifiers, authoritative match method, and address/parcel/zoning snapshot timestamps and SHA-256 hashes. It is idempotent for the committed snapshot.

## Normalization and lookup behavior

Normalization trims leading/trailing whitespace, collapses internal whitespace, and uppercases text. `findPropertyByAddress(jurisdiction, address)` calls an exact-match RPC scoped to the active jurisdiction and active address. The RPC filters to CLEAN properties and returns a row only when exactly one match exists. Empty, unknown, REVIEW, or unexpectedly ambiguous results return not found; V1 deliberately has no fuzzy matching or autocomplete.

## Property facts and evaluator boundary

The adapter returns `property.zoning_district` only when a CLEAN stored profile has a normalized zoning value. It fabricates no missing facts. The server action looks the property up again on every evaluation and overlays server-derived property facts after browser-submitted answers, so a client cannot replace zoning. Regulatory citations remain attached to regulatory outcomes; GIS provenance is retained only for audit/debugging and is not presented as legal authority.

The browser receives only the display address, derived facts needed by the question flow, and evaluator result. It receives no parcel/source IDs or snapshot metadata. The request path uses the stored Supabase pilot only and contains no external GIS request.

## RLS and public access

RLS is enabled on both tables. There are no public table policies, no table privileges, and no public writes. `anon` and `authenticated` can execute only the security-definer exact lookup RPC, whose narrow result contains property ID, display address, normalized zoning, and trust status for server-side adaptation. The application uses the publishable key; no service-role secret is introduced or sent to the client.

## Resident experience and limitations

`/clearwater/fence` begins with a plain address field and identifies the experience as a limited Clearwater pilot. A trusted match starts the existing dynamic question flow with zoning prepopulated. A miss explicitly says the address was not evaluated. Parcel IDs, GIS terms, and zoning codes are not displayed.

## Manual Supabase application after merge

1. In Supabase SQL Editor, apply `20260824000000_create_property_lookup_schema.sql`.
2. Apply `20260824000001_seed_clearwater_residential_pilot.sql`.
3. With the production publishable-key configuration, verify `1950 DREW PLZ` resolves and an address outside the pilot does not.

Do not apply either migration from Codex and do not apply the seed before the schema.

## Manual Vercel verification

1. Deploy the merged commit with the existing Supabase URL and publishable key variables.
2. Open `/clearwater/fence`, enter `1950 DREW PLZ`, and confirm the property-found message leads to the existing questions.
3. Repeat with casing/spacing changes.
4. Enter a non-pilot address and confirm the page states it was not evaluated.
5. Complete enough questions to view guidance and confirm regulatory sources remain the only legal citations.

## Future citywide path

A future reviewed ETL can validate a citywide snapshot and upsert the same explicit tables, retaining the CLEAN gate and provenance. Geometry or PostGIS should be added only when a separately scoped feature requires spatial queries. REVIEW records need an operational review/promotion process before they can ever become evaluator inputs.

Smallest sequence: merge → apply property schema migration → apply residential pilot seed → verify address lookup → deploy/test `/clearwater/fence`

READY TO APPLY PROPERTY MIGRATIONS
