-- Forward-only trusted jurisdiction extension. Classification is produced during GIS ingestion,
-- never from postal text, and read at runtime without a live GIS dependency.
alter table public.properties
  add column jurisdiction_key text not null default 'unknown'
    check (jurisdiction_key in ('clearwater', 'unincorporated_pinellas', 'other_pinellas_municipality', 'unknown', 'ambiguous')),
  add column jurisdiction_authority_name text,
  add column jurisdiction_source text not null default 'Pinellas County municipal boundary GIS',
  add column jurisdiction_source_updated_at timestamptz,
  add column jurisdiction_derived_at timestamptz not null default now();

-- The committed pilot parcel footprint was matched to the committed authoritative county address-point MUNICIPALITY records
-- during this refresh. This is data provenance, not an inference from postal text.
update public.properties
set jurisdiction_key = 'clearwater',
    jurisdiction_authority_name = 'City of Clearwater',
    jurisdiction_source = 'Pinellas County Enterprise GIS Parcels address layer, MUNICIPALITY field',
    jurisdiction_source_updated_at = '2026-08-26T00:00:00Z',
    jurisdiction_derived_at = '2026-08-26T00:00:00Z'
where jurisdiction_id = (select id from public.jurisdictions where slug = 'clearwater-fl');

alter table public.properties alter column jurisdiction_key drop default;

drop function public.find_trusted_property_by_address(text, text);

create function public.find_trusted_property_by_address(jurisdiction_slug text, lookup_address text)
returns table (property_id uuid, display_address text, normalized_zoning_code text, validation_status text,
  jurisdiction_key text, jurisdiction_authority_name text, jurisdiction_source text,
  jurisdiction_source_updated_at timestamptz, jurisdiction_derived_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with matches as (
    select p.id, a.display_address, p.normalized_zoning_code, p.validation_status,
      p.jurisdiction_key, p.jurisdiction_authority_name, p.jurisdiction_source,
      p.jurisdiction_source_updated_at, p.jurisdiction_derived_at
    from public.property_addresses a
    join public.properties p on p.id = a.property_id and p.jurisdiction_id = a.jurisdiction_id
    join public.jurisdictions j on j.id = p.jurisdiction_id
    where j.slug = jurisdiction_slug and j.active and a.active and p.validation_status = 'clean'
      and a.normalized_address = upper(trim(regexp_replace(lookup_address, '\\s+', ' ', 'g')))
  )
  select * from matches where (select count(*) from matches) = 1;
$$;
revoke all on function public.find_trusted_property_by_address(text, text) from public;
grant execute on function public.find_trusted_property_by_address(text, text) to anon, authenticated;
