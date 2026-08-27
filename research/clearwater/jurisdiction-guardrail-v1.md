# Clearwater / Pinellas jurisdiction guardrail v1

## Problem statement

A postal city is delivery metadata, not a municipal boundary. Groundrule now treats current municipal jurisdiction as a required, separately sourced property fact and stops before loading Clearwater rules unless that fact is confirmed as Clearwater.

## Authoritative source and inspected contract

The county source used is the **Pinellas County Enterprise GIS, PublicWebGIS/Parcels** service (`https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer`). Its official site-address layer 0 exposes point geometry and the fields `PIN_NUM`, `FULLADDR`, `MUNICIPALITY`, `POSTCODE`, and `STATUS`; the parcel layer 1 exposes polygon geometry and `PARCELID`. The committed ArcGIS responses and service metadata are in `research/gis/data/clearwater-residential-pilot-v2/`.

The controlling imported value is the address layer's `MUNICIPALITY`, spatially associated to its `PIN_NUM` parcel. Inspection found uppercase municipality names, including `CLEARWATER`; ingestion normalization maps `CLEARWATER` to `clearwater`, `UNINCORPORATED` to `unincorporated_pinellas`, any other non-empty Pinellas municipality to `other_pinellas_municipality`, and absent/conflicting results to `unknown`/`ambiguous`. Exact source text remains in provenance rather than being used at runtime. `POSTCODE`, `FULLADDR`, parcel `SITE_CITY`, zoning, and utility data are expressly not jurisdiction evidence.

The county service was reachable when the committed 2026-08-23 snapshot was generated; this environment's network proxy denied a fresh service-directory request on 2026-08-26. Therefore layer metadata and the exact canonical response are reproducible from the committed snapshot, while a fresh county-wide negative-address extraction remains a targeted field-validation item.

## Geometry method

Ingestion joins the authoritative address point to the parcel identifier, then classifies parcel geometry against current municipal polygons. The small deterministic classifier samples every parcel vertex and edge midpoint (a conservative point-on-surface approximation). Exactly one polygon authority must contain all sampled evidence. Touching a municipal boundary, matching multiple authorities, a boundary-crossing parcel, or malformed/missing geometry yields `ambiguous` or `unknown`; neither is eligible. This is intentionally safer than a centroid-only answer. It is not a general cadastral overlay engine.

## Trusted property representation and provenance

A forward-only migration adds controlled `jurisdiction_key`, human-readable authority, source, source update timestamp, and derivation timestamp fields to `properties`. The narrow lookup RPC returns them with the existing CLEAN profile. The application represents them as `TrustedJurisdiction`. Jurisdiction is distinct from `normalized_zoning_code` and CLEAN alone is not enough.

## Canonical validation

The committed county record for parcel `122915557820250300`, **1950 DREW PLZ**, has authoritative `MUNICIPALITY = CLEARWATER`; its committed parcel polygon is present. The refreshed trusted profile is therefore `clearwater` / `City of Clearwater`, and the shared gate admits both Fence and Shed. No address text is consulted by the gate, and existing evaluator facts and outcomes are unchanged after admission.

## Negative and other-municipality behavior

Automated polygon fixtures cover an unincorporated parcel, another-municipality profile, a crossing parcel, a boundary-touching parcel, and missing geometry. A reliable real Clearwater-postal/unincorporated address was not derivable from the limited committed Drew Plaza extent; obtaining and planner-checking one is the remaining targeted real-world validation case. No address was fabricated.

An unincorporated profile displays “outside Clearwater city limits,” explicitly names Unincorporated Pinellas County, and provides no Clearwater guide. Another municipality names that municipality and likewise stops. Unknown or ambiguous jurisdiction displays that it could not be confirmed and stops. Confirmed Clearwater keeps the existing compact zoning context: jurisdiction remains an internal safety fact rather than another success-state chip.

## Agreement to Annex

Agreement-to-Annex is not a current municipal boundary. The annex layer is neither imported nor consulted. Even if such text/status accompanies a parcel, the current county classification controls, so an agreement cannot turn `unincorporated_pinellas` into `clearwater`.

## Runtime and workflow integration

Runtime remains address RPC → trusted profile → `requireClearwaterProperty` → evaluator → guide. There is no network call in the gate. Fence and Shed both use this shared admission boundary before `evaluateProjectRules`; future Clearwater actions inherit protection when they enter through this shared property boundary. They must call the boundary (as current actions do); direct raw calls to the generic evaluator are intentionally still available for tests and non-Clearwater jurisdictions.

## Refresh strategy

Refresh the municipal snapshot alongside the lightweight parcel/address GIS refresh and after known annexation publications. Re-run classification for every imported parcel, retain source retrieval/update and derivation timestamps, publish only after ambiguity checks, and atomically replace trusted facts. No scheduler is added. The timestamps permit stale classifications to be identified and regenerated without live resident-request GIS traffic.

## Schema decision and limitations

A generic JSON fact store does not exist in the current property schema, so explicit constrained columns are the smallest auditable extension. Historical and regulatory migrations are untouched. Limitations: the committed pilot does not include county-wide municipal polygons or a planner-validated unincorporated postal-Clearwater address; the lightweight sampler intentionally escalates unusual geometry; and ingestion still needs a fresh official county-wide boundary snapshot before expanding beyond the pilot.

CLEARWATER JURISDICTION GUARDRAIL NEEDS TARGETED DATA
