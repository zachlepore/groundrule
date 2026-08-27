-- Forward-only, deterministic enrichment from the committed Pinellas address snapshot.
-- All 126 address records agree on MUNICIPALITY=CLEARWATER; these 106 parcels are the CLEAN stored subset.
do $$
declare matched_count integer; enriched_count integer;
begin
  create temporary table expected_clearwater_pilot_parcels (parcel_identifier text primary key) on commit drop;
  insert into expected_clearwater_pilot_parcels values
    ('122915557820210060'),
    ('122915557820210070'),
    ('122915557820210080'),
    ('122915557820210090'),
    ('122915557820210100'),
    ('122915557820210101'),
    ('122915557820210130'),
    ('122915557820210140'),
    ('122915557820210141'),
    ('122915557820210150'),
    ('122915557820210170'),
    ('122915557820210180'),
    ('122915557820220010'),
    ('122915557820220030'),
    ('122915557820220040'),
    ('122915557820220050'),
    ('122915557820220060'),
    ('122915557820220070'),
    ('122915557820220071'),
    ('122915557820220090'),
    ('122915557820220100'),
    ('122915557820220101'),
    ('122915557820220120'),
    ('122915557820220130'),
    ('122915557820220140'),
    ('122915557820250010'),
    ('122915557820250050'),
    ('122915557820250080'),
    ('122915557820250110'),
    ('122915557820250140'),
    ('122915557820250170'),
    ('122915557820250210'),
    ('122915557820250240'),
    ('122915557820250270'),
    ('122915557820250300'),
    ('122915826380010010'),
    ('122915826380010020'),
    ('122915826380010030'),
    ('122915826380010040'),
    ('122915826380010050'),
    ('122915826380010060'),
    ('122915826380010070'),
    ('122915826380010080'),
    ('122915826380010090'),
    ('122915826380010100'),
    ('122915826380010110'),
    ('122915826380010120'),
    ('122915826380020010'),
    ('122915826380020030'),
    ('122915826380020040'),
    ('122915826380020050'),
    ('122915826380020060'),
    ('122915826380020070'),
    ('122915826380020080'),
    ('122915826380020090'),
    ('122915826380020100'),
    ('122915826380030010'),
    ('122915826380030080'),
    ('122915826380040010'),
    ('122915826380050010'),
    ('122915826380050020'),
    ('122915826380050030'),
    ('122915826380050040'),
    ('122915826380050050'),
    ('122915826380060010'),
    ('122915826380060020'),
    ('122915826380060030'),
    ('122915826380060040'),
    ('122915826380060050'),
    ('122915826380060060'),
    ('122915826560070010'),
    ('122915826560070020'),
    ('122915826560070030'),
    ('122915826560070040'),
    ('122915826560070050'),
    ('122915826560070060'),
    ('122915826560080010'),
    ('122915826560080020'),
    ('122915826560080030'),
    ('122915826560080040'),
    ('122915826560080050'),
    ('122915826560090010'),
    ('122915826560100010'),
    ('122915826560100020'),
    ('122915826560100030'),
    ('122915826560100040'),
    ('122915826560100050'),
    ('122915826560100060'),
    ('122915826560100070'),
    ('122915826560100080'),
    ('122915826560100090'),
    ('122915826560100100'),
    ('122915826560100110'),
    ('122915826560100120'),
    ('122915826560110010'),
    ('122915826560110020'),
    ('122915826560110030'),
    ('122915826560110040'),
    ('122915826560110050'),
    ('122915826560110060'),
    ('122915826560110090'),
    ('122915826560110110'),
    ('122915826560110120'),
    ('122915826560110130'),
    ('122915826560110140'),
    ('122915826560110150');

  select count(*) into matched_count
  from expected_clearwater_pilot_parcels e
  join public.properties p on p.parcel_identifier=e.parcel_identifier
  join public.jurisdictions j on j.id=p.jurisdiction_id and j.slug='clearwater-fl'
  where p.validation_status='clean';
  if matched_count <> 106 then raise exception 'Jurisdiction enrichment expected 106 uniquely matched CLEAN pilot properties, matched %', matched_count; end if;

  update public.properties p set
    jurisdiction_key='clearwater', jurisdiction_authority_name='City of Clearwater',
    jurisdiction_source='Pinellas County Enterprise GIS Parcels address layer, MUNICIPALITY field',
    jurisdiction_source_updated_at='2026-08-23T23:49:35.559Z', jurisdiction_derived_at='2026-08-27T00:00:00Z',
    source_snapshot_metadata=jsonb_set(p.source_snapshot_metadata, '{jurisdiction}',
      '{"rawMunicipality":"CLEARWATER","normalizedJurisdiction":"clearwater","derivationMethod":"authoritative_municipality","validationStatus":"confirmed","addressSnapshotSha256":"f00b66631849c9e5654158a25568143a15eb5b70b84e470dbdb6b79ba66506f1"}'::jsonb, true)
  from expected_clearwater_pilot_parcels e
  where p.parcel_identifier=e.parcel_identifier
    and p.jurisdiction_id=(select id from public.jurisdictions where slug='clearwater-fl');

  select count(*) into enriched_count from expected_clearwater_pilot_parcels e join public.properties p using (parcel_identifier)
  join public.jurisdictions j on j.id=p.jurisdiction_id and j.slug='clearwater-fl'
  where p.validation_status='clean' and p.jurisdiction_key='clearwater'
    and p.source_snapshot_metadata->'jurisdiction'->>'rawMunicipality'='CLEARWATER';
  if enriched_count <> 106 then raise exception 'Jurisdiction enrichment validation expected 106 properties, found %', enriched_count; end if;
end $$;
