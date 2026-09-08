-- Search the existing canonical address records; no parallel address dataset is introduced.
create extension if not exists pg_trgm with schema extensions;

create or replace function public.normalize_property_address(value text)
returns text language sql immutable strict parallel safe as $$
  select trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
      ' ' || trim(regexp_replace(regexp_replace(upper(value), '[^A-Z0-9]+', ' ', 'g'), '\s+', ' ', 'g')) || ' ',
      ' STREET ', ' ST ', 'g'), ' ROAD ', ' RD ', 'g'), ' AVENUE ', ' AVE ', 'g'), ' DRIVE ', ' DR ', 'g'),
      ' PLACE ', ' PL ', 'g'), ' PLAZA ', ' PLZ ', 'g'), ' COURT ', ' CT ', 'g'), ' LANE ', ' LN ', 'g'),
      ' BOULEVARD ', ' BLVD ', 'g'), ' HIGHWAY ', ' HWY ', 'g'), ' PARKWAY ', ' PKWY ', 'g'),
      ' CIRCLE ', ' CIR ', 'g'), ' TERRACE ', ' TER ', 'g'));
$$;

create or replace function public.find_trusted_property_by_address(jurisdiction_slug text, lookup_address text)
returns table (property_id uuid, display_address text, normalized_zoning_code text, validation_status text,
  jurisdiction_key text, jurisdiction_authority_name text, jurisdiction_source text,
  jurisdiction_source_updated_at timestamptz, jurisdiction_derived_at timestamptz)
language sql stable security definer set search_path = public as $$
  with matches as (
    select p.id, a.display_address, p.normalized_zoning_code, p.validation_status,
      p.jurisdiction_key, p.jurisdiction_authority_name, p.jurisdiction_source,
      p.jurisdiction_source_updated_at, p.jurisdiction_derived_at
    from public.property_addresses a
    join public.properties p on p.id=a.property_id and p.jurisdiction_id=a.jurisdiction_id
    join public.jurisdictions j on j.id=p.jurisdiction_id
    where j.slug=jurisdiction_slug and j.active and a.active and p.validation_status='clean'
      and a.normalized_address=public.normalize_property_address(lookup_address)
  ) select * from matches where (select count(*) from matches)=1;
$$;

create index property_addresses_active_trigram_idx
  on public.property_addresses using gin (normalized_address extensions.gin_trgm_ops)
  where active;

create or replace function public.search_trusted_municipality_addresses(
  jurisdiction_slug text, search_query text, result_limit integer default 5
)
returns table(property_id uuid, display_address text, match_type text, match_score double precision)
language sql stable security definer set search_path = public, extensions as $$
  with input as (select public.normalize_property_address(search_query) query), ranked as (
    select p.id property_id, a.display_address,
      case when a.normalized_address = i.query then 'exact'
           when a.normalized_address like i.query || '%' or a.normalized_address like '%' || i.query || '%' then 'prefix'
           else 'fuzzy' end match_type,
      case when a.normalized_address = i.query then 1000
           when split_part(a.normalized_address, ' ', 1) = split_part(i.query, ' ', 1) then 300 else 0 end
        + case when a.normalized_address like i.query || '%' then 200 when a.normalized_address like '%' || i.query || '%' then 100 else 0 end
        + similarity(a.normalized_address, i.query) * 100 match_score
    from public.property_addresses a
    join public.properties p on p.id=a.property_id and p.jurisdiction_id=a.jurisdiction_id
    join public.jurisdictions j on j.id=a.jurisdiction_id cross join input i
    where j.slug=jurisdiction_slug and j.active and a.active and p.validation_status='clean'
      and p.jurisdiction_key = split_part(j.slug, '-', 1)
      and (a.normalized_address like '%' || i.query || '%' or a.normalized_address % i.query)
  )
  select * from ranked where match_score >= 25 order by match_score desc, display_address, property_id
  limit greatest(1, least(coalesce(result_limit, 5), 8));
$$;

revoke all on function public.search_trusted_municipality_addresses(text,text,integer) from public;
grant execute on function public.search_trusted_municipality_addresses(text,text,integer) to anon, authenticated;
