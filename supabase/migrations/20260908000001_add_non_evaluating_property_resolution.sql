-- Informational exact-address resolution. Unlike find_trusted_property_by_address,
-- this function deliberately retains REVIEW and duplicate matches so callers can
-- explain a safe stop. It does not authorize evaluation.
create function public.resolve_property_address_state(jurisdiction_slug text, lookup_address text)
returns table (
  property_id uuid,
  display_address text,
  normalized_zoning_code text,
  validation_status text,
  jurisdiction_key text,
  jurisdiction_authority_name text,
  jurisdiction_source text,
  jurisdiction_source_updated_at timestamptz,
  jurisdiction_derived_at timestamptz,
  match_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with matches as (
    select p.id, a.display_address, p.normalized_zoning_code, p.validation_status,
      p.jurisdiction_key, p.jurisdiction_authority_name, p.jurisdiction_source,
      p.jurisdiction_source_updated_at, p.jurisdiction_derived_at
    from public.property_addresses a
    join public.properties p on p.id = a.property_id and p.jurisdiction_id = a.jurisdiction_id
    join public.jurisdictions j on j.id = p.jurisdiction_id
    where j.slug = jurisdiction_slug
      and j.active
      and a.active
      and a.normalized_address = public.normalize_property_address(lookup_address)
  )
  select matches.*, count(*) over () as match_count
  from matches;
$$;

revoke all on function public.resolve_property_address_state(text, text) from public;
grant execute on function public.resolve_property_address_state(text, text) to anon, authenticated;
