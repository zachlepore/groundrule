# Architecture-delivery validation

Executed October 20, 2026 against the `aa8e096` investigation branch plus documentation only.

- `./node_modules/.bin/tsx --test tests/evaluator.test.ts tests/fence-guide.test.ts tests/resident-flow.test.ts`: **20 passed**, zero failed/skipped.
- `NODE_OPTIONS='--conditions=react-server' ./node_modules/.bin/tsx --test tests/property-lookup.test.ts`: **8 passed**, zero failed/skipped.
- New read-only spatial audit: all 3,324 approved address rows, every linked source parcel feature, all 10 raw NCOD features, both address/representative points and raw primary codes; **zero NCOD overlaps**, including boundary touches. 770 distinct approved raw geometries cached without merging address identities. Source hashes and per-rule counts in `approved-separation.json`.
- Original validated Rule 004 lookup remains SHA-256 `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`.
- Documentation relative links checked; staged whitespace checks passed.

## Reproduce separation audit

Use the frozen Release `parcels.geojson`, `zoning.geojson` and validated Rule 004 `clearwater-approved-address-lookup.jsonl`; assert their recorded SHA-256 identities before running. Python/Shapely 2.1.2 read-only pseudocode matches the executed audit:

```python
ncod = [f for f in zoning["features"] if "NCOD" in str(f["properties"].get("ZONING", "")).upper()]
# Map each PARCELID to ALL source features; do not collapse repeated IDs.
for row in approved_lookup:
    if row["approvedPrimaryGuidance"]["status"] != "GUIDANCE_READY_APPROVED":
        continue
    assert "NCOD" not in str(row["zoningCode"]).upper()
    for parcel in parcels_by_id[row["parcelIdentifier"]]:
        for zone in ncod:
            assert not shape(parcel["geometry"]).intersects(shape(zone["geometry"]))
    for xy in [row.get("addressCoordinates"), row.get("parcelRepresentativePoint")]:
        if xy:
            for zone in ncod:
                assert not shape(zone["geometry"]).covers(Point(xy))
```

Also assert total 3,324 and per-rule counts 1,967 / 262 / 731 / 364; use Shapely `shape` and `Point`. This conservative audit includes zero-area contact and does not establish legal absence beyond the frozen GIS evidence.

No future overlay fixtures were executed; no live database correctness or legal currency is claimed. No runtime application files, rule seeds, schema migrations, previous approval policies or datasets were modified.
