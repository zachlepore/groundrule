create table public.properties (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  parcel_identifier text not null,
  source_parcel_identifier text not null,
  zoning_code text not null,
  zoning_description text,
  normalized_zoning_code text not null,
  validation_status text not null check (validation_status in ('clean', 'review')),
  source_snapshot_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_snapshot_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jurisdiction_id, parcel_identifier),
  unique (id, jurisdiction_id),
  check (normalized_zoning_code = lower(normalized_zoning_code))
);

create table public.property_addresses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  jurisdiction_id uuid not null,
  display_address text not null,
  normalized_address text not null,
  source_address_identifier text not null,
  match_method text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (property_id, jurisdiction_id) references public.properties(id, jurisdiction_id) on delete cascade,
  unique (property_id, source_address_identifier),
  check (normalized_address = upper(normalized_address) and normalized_address !~ '\\s{2,}')
);

create unique index property_addresses_active_lookup_idx
  on public.property_addresses (jurisdiction_id, normalized_address) where active;

create trigger properties_set_updated_at before update on public.properties
for each row execute function public.groundrule_set_updated_at();
create trigger property_addresses_set_updated_at before update on public.property_addresses
for each row execute function public.groundrule_set_updated_at();

alter table public.properties enable row level security;
alter table public.property_addresses enable row level security;

-- Tables intentionally have no anon/authenticated policies or grants. The narrowly
-- shaped RPC is the only public lookup surface; all writes remain migration-only.
revoke all on public.properties, public.property_addresses from anon, authenticated;

create function public.find_trusted_property_by_address(jurisdiction_slug text, lookup_address text)
returns table (property_id uuid, display_address text, normalized_zoning_code text, validation_status text)
language sql
stable
security definer
set search_path = ''
as $$
  with matches as (
    select p.id, a.display_address, p.normalized_zoning_code, p.validation_status
    from public.property_addresses a
    join public.properties p on p.id = a.property_id and p.jurisdiction_id = a.jurisdiction_id
    join public.jurisdictions j on j.id = p.jurisdiction_id
    where j.slug = jurisdiction_slug
      and j.active
      and a.active
      and p.validation_status = 'clean'
      and a.normalized_address = upper(trim(regexp_replace(lookup_address, '\\s+', ' ', 'g')))
  )
  select id, display_address, normalized_zoning_code, validation_status
  from matches
  where (select count(*) from matches) = 1;
$$;

revoke all on function public.find_trusted_property_by_address(text, text) from public;
grant execute on function public.find_trusted_property_by_address(text, text) to anon, authenticated;
