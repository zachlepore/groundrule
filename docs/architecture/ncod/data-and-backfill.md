# Property representation and offline interpretation

Proposed canonical location: `properties.source_snapshot_metadata.interpretedZoning`, read through a future narrow RPC and `StoredPropertyProfile.interpretedZoning`. Initially produce the same document only in a derived offline JSONL joined by existing source address ID and parcel ID. Do not create independent property identities. Parcel-level mapped evidence can be shared by reference, but preserve address-level link holds and project/condominium context.

## Proposed document contract

```json
{
  "schemaVersion": 1,
  "interpretationVersion": "clearwater-ncod-v1",
  "jurisdiction": "clearwater",
  "sourceIdentity": {
    "snapshotId": "FROM_PINNED_RELEASE_MANIFEST",
    "archiveSha256": "FROM_PINNED_RELEASE_MANIFEST",
    "profileEvidenceSha256": "COMPUTED",
    "mappingSha256": "COMPUTED"
  },
  "originalSourceZoning": "LMDR-NCOD Coachman R",
  "base": {
    "state": "identified",
    "code": "LMDR",
    "basis": "explicit_gis_description_and_cited_code",
    "evidenceRefs": ["zoning.geojson#OBJECTID=10947", "CR-BASE"]
  },
  "overlayInventory": {
    "state": "complete_for_source",
    "scope": "NCOD_in_frozen_Clearwater_zoning_layer",
    "legalApplicabilityConfirmed": false
  },
  "overlays": [{
    "type": "NCOD",
    "code": "CRNCOD",
    "name": "Coachman Ridge",
    "mappingState": "source_verified",
    "applicability": "unknown",
    "evidenceRefs": ["zoning.geojson#OBJECTID=10947", "CR-BASE"],
    "provisionRefs": ["CR-BASE", "CR-CHAIN", "CR-LMDR", "CR-SIDE"]
  }],
  "spatialEvidenceRef": "EXISTING_INTERSECTION_GEOMETRY_AND_VIEWER_REFERENCES",
  "sourceQaRef": "ORIGINAL_PROFILE_UNMODIFIED",
  "holds": [],
  "projectReadiness": {
    "fence": {
      "designation": "ambiguous",
      "approvalId": null,
      "reasons": ["overlay_rules_not_supported", "current_code_not_confirmed"]
    }
  }
}
```

The example deliberately distinguishes **source-verified identity** from legally/project-applicable overlay. The archived crosswalk alone does not justify `applicability: verified`. A later reviewed evidence policy may resolve applicability, with reviewer/source/version/reassessment record. Unknown/conflicting evidence must remain unknown/conflicting even if a candidate mapping exists.

Enums: base.state = identified/unknown/conflicting; overlayInventory.state = complete_for_source/unknown/conflicting; overlay applicability = verified/absent/unknown/conflicting, each scoped by evidence and date. Use one record per code, including an explicit absent determination when supported; an empty array alone never means no overlay. Multiple codes are allowed. Record candidate codes/evidence on conflicts without choosing one. An unknown additional overlay prevents complete regulatory coverage.

`complete_for_source` means all applicable frozen-layer features were considered, **not** all possible legal overlays are known. Confirmed no-NCOD requires validated geometry/location, complete relevant source inventory and a separately accepted legal applicability policy; ordinary primary LMDR alone is insufficient. Inventory absence is type/jurisdiction scoped, never a universal “no overlays”.

Keep original `zoningCode`, `normalizedZoningCode`, `status`, `issues`, `evaluatorFacts`, all source identifiers, geometries, intersections and `approvedPrimaryGuidance` unchanged. Proposed `base.code` is uppercase canonical registry identity; trusted fact adapter supplies lowercase only after readiness checks. Never assign it to original normalized code. Overlay notices are distinct from spatial split notices; an NCOD alone is not an additional split district.

## Exact mapping registry

Proposed file: `research/gis/clearwater-ncod-mappings.v1.json`. Runtime-independent interpreter proposed at `lib/properties/zoning-interpretation.ts`; GIS orchestration under `scripts/gis/interpret-clearwater-zoning.mjs` consumes it and existing exporter output. These files are not created by this design.

| Exact original source primary | Explicit source base | NCOD | Addresses / parcel IDs / footprint groups |
|---|---|---|---|
| HDR-NCOD Island Est | HDR | IENCOD | 1,385 / 1,365 / 43 |
| LMDR-NCOD Island Est | LMDR | IENCOD | 565 / 564 / 564 |
| MHDR-NCOD Island Est | MHDR | IENCOD | 266 / 255 / 83 |
| MDR-NCOD Island Est | MDR | IENCOD | 52 / 52 / 19 |
| I-NCOD Island Est | I | IENCOD | 1 / 1 / 1 |
| LMDR-NCOD Coachman R | LMDR | CRNCOD | 242 / 242 / 242 |
| LDR-NCOD Coachman R | LDR | CRNCOD | 13 / 13 / 13 |
| OS/R | OSR district identity | **not an NCOD** | 308 / 184 / 112 |

Totals: **2,832 / 2,676 / 1,077**; NCOD **2,524 / 2,492 / 965**, OS/R **308 / 184 / 112**. These are unsupported source-primary populations, not the total number of all profiles touching NCOD features. Stage B must also census secondary NCOD intersections across all 63,430; do not silently equate primary-code counts with complete overlay applicability.

Eight enumerated entries are audited against `research/gis/rule005-regulatory-evidence.v1.json`: require exact jurisdiction, snapshot, raw code, source polygon ID, `ZONING_DESC`, `SPECIAL`, source feature hash and provision citations. OS/R entry explicitly has `type: district`, never overlay. Whitespace/case variants fail closed until separately evidenced; do not reuse separator normalization for mapping identity. Unknown new source classes generate exceptions. Registry values are not an alias allowlist for ordinary Guides.

## Offline process and reconciliation

1. Verify Release archive `174c46ea4fca085a3ec81d443e003fa9abc0747741188bfbcc264b717af8a902` and all 11 manifest file checksums/counts with existing `verifySource`. Verify validated Rule 004 lookup SHA from `approved-separation.json` and its 61 output checksums. Load explicit mapping/evidence hashes and archived Code hash `9745beac8988ab96c4b7bd67ce506d02d1bbd0a62ed0dc990e2abfa53d81b7a0` independently of legal currency.
2. Join by immutable source address ID + parcel ID, preserving every original profile. Validate all parcel features for an ID, address/parcel linkage, representative point, polygon validity, repeated/overlapping codes, additional districts and registered human holds. Cache geometry computation without collapsing unit/condo identities.
3. Interpret **each intersecting source feature**, not only primary code. Preserve each underlying district/overlay pair per feature; differing mapped bases stay a spatial split, not a single guessed base. Retain positive-area percentages and original diagnostics. Touch-only contacts remain diagnostic evidence; do not invent area applicability from a topological touch.
4. Produce additive interpretation document plus exceptions and before/after audit. Original document and approval objects are unchanged. For an approved Rules 001–004 member, carry approval unchanged; unexpected NCOD evidence is a hard release failure requiring investigation, never an automatic downgrade/reapproval.
5. Do not emit runtime-ready facts or approvals. Unknown legal currency, existing holds and unsupported rules remain project-readiness blockers even when mapping identity is verified. Maintain separate mapping confidence, applicability, source QA and guidance readiness.
6. Sort by source address ID; deterministic serialization, no unpinned wall-clock values in payload. Manifest includes source/mapping/tool versions, input/output hashes, regulatory citation version and predecessor checksum. Zip/build timestamp metadata must not alter semantic reproducibility. Fail on reused output directory and any input identity/membership/evidence change; reassessment required.

Expected baseline: 63,430 retained; 3,324 approved (1,967/262/731/364); 17,014 unresolved REVIEW; 2,832 unsupported; 2,534 pass the diagnostic screen apart from unsupported, **298 have additional holds**. Flags overlap and must not be summed. One nonfinal human primary-candidate case remains held; unavailable unpushed reviews are not inferred. Read-only Stage B changes **zero approvals** and **zero remaining REVIEW counts**.

Rule 005 candidate membership remains the investigated **227 sole-code LMDR-NCOD Coachman R addresses / IDs / footprints**. The raw 242 primary cohort includes 14 Institutional-intersection cases and one excluded single-code coverage hold (2384 STAG RUN BLVD, 99.818656%). Do not weaken 99.9% coverage screening or silently add them. If later separately approved, 227 is a ceiling, not a forced total. Unit labels, recorded land-use codes and repeated footprints are evidence, not legal use/ownership determinations.

## Persistence later

A future migration may constrain nested schemaVersion/JSON shape and extend the existing informational RPC projection without exposing unrestricted metadata. Keep property resolution separate from evaluation authorization. Validate nested documents in the ingestion/write path and read adapter; reject stale/unknown mapping versions. If address-specific holds cannot be represented on a shared property, keep them on existing address evidence and require them at the adapter; never certify sibling units by association.

No migration is proposed for execution now. Before persistence, inspect actual deployed schema/data and compare to checked-in migrations. Back up/version metadata; rollback removes only the newly added interpreted document or reverts its version pointer, leaving original profile and approval fields untouched.
