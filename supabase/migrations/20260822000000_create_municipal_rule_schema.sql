-- Groundrule generalized municipal rule schema v1.
-- This migration intentionally leaves public.municipalities unchanged.

create extension if not exists btree_gist with schema extensions;

create function public.groundrule_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.groundrule_valid_expression(expression jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  child jsonb;
  operator text;
  keys text[];
begin
  if jsonb_typeof(expression) <> 'object' then
    return false;
  end if;

  select array_agg(key order by key) into keys
  from jsonb_object_keys(expression) as object_keys(key);

  if expression ? 'all' or expression ? 'any' then
    if keys && array['fact', 'not'] or (expression ? 'all' and expression ? 'any') then
      return false;
    end if;
    child := coalesce(expression -> 'all', expression -> 'any');
    if jsonb_typeof(child) <> 'array' or jsonb_array_length(child) = 0
       or not (keys <@ array['all'] or keys <@ array['any']) then
      return false;
    end if;
    for child in select value from jsonb_array_elements(child)
    loop
      if not public.groundrule_valid_expression(child) then return false; end if;
    end loop;
    return true;
  end if;

  if expression ? 'not' then
    return keys <@ array['not'] and public.groundrule_valid_expression(expression -> 'not');
  end if;

  if not (expression ? 'fact' and expression ? 'op')
     or jsonb_typeof(expression -> 'fact') <> 'string'
     or jsonb_typeof(expression -> 'op') <> 'string'
     or length(expression ->> 'fact') = 0 then
    return false;
  end if;

  operator := expression ->> 'op';
  if operator in ('is_true', 'is_false', 'is_known', 'is_unknown') then
    return keys <@ array['fact', 'op'];
  elsif operator in ('eq', 'neq', 'lt', 'lte', 'gt', 'gte') then
    return expression ? 'value' and keys <@ array['fact', 'op', 'value', 'unit'];
  elsif operator in ('in', 'not_in') then
    return expression ? 'values'
      and jsonb_typeof(expression -> 'values') = 'array'
      and jsonb_array_length(expression -> 'values') > 0
      and keys <@ array['fact', 'op', 'values', 'unit'];
  elsif operator = 'between' then
    return expression ? 'values'
      and jsonb_typeof(expression -> 'values') = 'array'
      and jsonb_array_length(expression -> 'values') = 2
      and expression ? 'lower_inclusive'
      and expression ? 'upper_inclusive'
      and jsonb_typeof(expression -> 'lower_inclusive') = 'boolean'
      and jsonb_typeof(expression -> 'upper_inclusive') = 'boolean'
      and keys <@ array['fact', 'op', 'values', 'unit', 'lower_inclusive', 'upper_inclusive'];
  end if;

  return false;
end;
$$;

create table public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  jurisdiction_type text not null check (jurisdiction_type in ('municipality', 'county', 'state', 'agency')),
  state_code text,
  parent_jurisdiction_id uuid references public.jurisdictions(id) on delete restrict,
  reference_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(reference_metadata) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (state_code is null or state_code ~ '^[A-Z]{2}$'),
  check (parent_jurisdiction_id is null or parent_jurisdiction_id <> id)
);
create index jurisdictions_parent_type_idx on public.jurisdictions (parent_jurisdiction_id, jurisdiction_type);

create table public.project_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (key ~ '^[a-z][a-z0-9_]*$')
);

create table public.rule_sets (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  project_type_id uuid not null references public.project_types(id) on delete restrict,
  key text not null,
  title text not null,
  scope_description text not null,
  coverage_status text not null check (coverage_status in ('incomplete', 'limited', 'complete')),
  research_status text not null default 'draft' check (research_status in ('draft', 'in_review', 'verified', 'superseded', 'rejected')),
  effective_from date,
  effective_to date,
  verified_at timestamptz,
  published_at timestamptz,
  known_gaps jsonb not null default '[]'::jsonb check (jsonb_typeof(known_gaps) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jurisdiction_id, project_type_id, key),
  check (key ~ '^[a-z][a-z0-9_.-]*$'),
  check (effective_to is null or effective_from is not null),
  check (effective_to is null or effective_to > effective_from),
  check (published_at is null or (research_status = 'verified' and verified_at is not null and effective_from is not null))
);
create index rule_sets_candidate_idx on public.rule_sets (jurisdiction_id, project_type_id, research_status, effective_from);
create index rule_sets_published_idx on public.rule_sets (jurisdiction_id, project_type_id, effective_from, effective_to)
  where published_at is not null and research_status = 'verified';

create table public.regulatory_sources (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  source_type text not null check (source_type in ('code', 'ordinance', 'plan', 'standard', 'policy', 'external_code', 'other')),
  title text not null,
  issuing_body text not null,
  edition_label text,
  canonical_url text,
  published_on date,
  effective_from date,
  effective_to date,
  retrieved_at timestamptz,
  verified_at timestamptz,
  content_checksum text,
  notes text,
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_from is not null),
  check (effective_to is null or effective_to > effective_from)
);
create unique index regulatory_sources_identity_idx on public.regulatory_sources (jurisdiction_id, title, coalesce(edition_label, ''));
create unique index regulatory_sources_checksum_uidx on public.regulatory_sources (jurisdiction_id, content_checksum) where content_checksum is not null;
create index regulatory_sources_lookup_idx on public.regulatory_sources (jurisdiction_id, source_type, effective_from);

create table public.source_provisions (
  id uuid primary key default gen_random_uuid(),
  regulatory_source_id uuid not null references public.regulatory_sources(id) on delete restrict,
  locator text not null,
  display_locator text,
  title text,
  excerpt text,
  page_ref text,
  anchor text,
  source_url text,
  verified_at timestamptz,
  excerpt_checksum text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (regulatory_source_id, locator),
  check (length(btrim(locator)) > 0),
  check (excerpt is not null or source_url is not null or anchor is not null or page_ref is not null)
);

create table public.input_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  data_type text not null check (data_type in ('boolean', 'integer', 'decimal', 'text', 'enum', 'date', 'geometry', 'json')),
  unit_dimension text,
  canonical_unit text,
  value_scope text not null default 'global' check (value_scope in ('global', 'jurisdiction')),
  default_source_class text not null check (default_source_class in ('property_derived', 'user_provided', 'official_decision', 'derived', 'either')),
  gis_derivable boolean not null default false,
  user_input_allowed boolean not null default false,
  authoritative_source_required boolean not null default false,
  validation jsonb not null default '{}'::jsonb check (jsonb_typeof(validation) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (key ~ '^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$'),
  check ((unit_dimension is null) = (canonical_unit is null)),
  check (unit_dimension is null or data_type in ('integer', 'decimal')),
  check (data_type = 'enum' or value_scope = 'global'),
  check (data_type <> 'json' or validation ? 'schema')
);
create index input_definitions_active_source_idx on public.input_definitions (default_source_class) where active;

create table public.input_options (
  id uuid primary key default gen_random_uuid(),
  input_definition_id uuid not null references public.input_definitions(id) on delete restrict,
  jurisdiction_id uuid references public.jurisdictions(id) on delete restrict,
  key text not null,
  label text not null,
  description text,
  valid_from date,
  valid_to date,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (key ~ '^[a-z][a-z0-9_.-]*$'),
  check (valid_to is null or valid_from is not null),
  check (valid_to is null or valid_to > valid_from)
);
create unique index input_options_global_uidx on public.input_options (input_definition_id, key) where jurisdiction_id is null;
create unique index input_options_jurisdiction_uidx on public.input_options (input_definition_id, jurisdiction_id, key) where jurisdiction_id is not null;
create index input_options_scope_idx on public.input_options (input_definition_id, jurisdiction_id);
create index input_options_jurisdiction_idx on public.input_options (jurisdiction_id) where jurisdiction_id is not null;

create function public.groundrule_validate_input_option()
returns trigger
language plpgsql
set search_path = ''
as $$
declare definition_type text; definition_scope text;
begin
  select data_type, value_scope into definition_type, definition_scope
  from public.input_definitions where id = new.input_definition_id;
  if definition_type <> 'enum' then raise exception 'input options require an enum input definition'; end if;
  if definition_scope = 'jurisdiction' and new.jurisdiction_id is null then
    raise exception 'jurisdiction-scoped enum options require a jurisdiction';
  end if;
  if definition_scope = 'global' and new.jurisdiction_id is not null then
    raise exception 'global enum options cannot specify a jurisdiction';
  end if;
  return new;
end;
$$;
create trigger input_options_validate before insert or update on public.input_options
for each row execute function public.groundrule_validate_input_option();

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.rule_sets(id) on delete restrict,
  key text not null,
  title text not null,
  group_key text,
  legacy_key text,
  active_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_set_id, key),
  check (key ~ '^[a-z][a-z0-9_.-]*$')
);
create unique index rules_legacy_key_uidx on public.rules (rule_set_id, legacy_key) where legacy_key is not null;
create index rules_group_key_idx on public.rules (rule_set_id, group_key) where group_key is not null;

create table public.rule_versions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.rules(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  condition jsonb not null check (public.groundrule_valid_expression(condition)),
  evaluation_mode text not null check (evaluation_mode in ('deterministic', 'partial', 'discretionary', 'external', 'informational')),
  research_status text not null default 'draft' check (research_status in ('draft', 'in_review', 'verified', 'superseded', 'rejected')),
  lifecycle_status text not null default 'withdrawn' check (lifecycle_status in ('active', 'superseded', 'withdrawn')),
  research_confidence text check (research_confidence in ('low', 'medium', 'high')),
  summary text not null,
  explanation_template text,
  research_notes text,
  effective_from date,
  effective_to date,
  verified_at timestamptz,
  published_at timestamptz,
  supersedes_id uuid references public.rule_versions(id) on delete restrict,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_id, version_number),
  check (supersedes_id is null or supersedes_id <> id),
  check (effective_to is null or effective_from is not null),
  check (effective_to is null or effective_to > effective_from),
  check (lifecycle_status <> 'active' or (research_status = 'verified' and verified_at is not null and published_at is not null and effective_from is not null)),
  check (published_at is null or (research_status = 'verified' and verified_at is not null and effective_from is not null)),
  exclude using gist (
    rule_id with =,
    daterange(effective_from, effective_to, '[)') with &&
  ) where (lifecycle_status = 'active' and published_at is not null)
);
create index rule_versions_published_idx on public.rule_versions (rule_id, effective_from, effective_to)
  where lifecycle_status = 'active' and published_at is not null;

alter table public.rules
  add constraint rules_active_version_fk foreign key (active_version_id)
  references public.rule_versions(id) on delete restrict deferrable initially deferred;

create function public.groundrule_validate_active_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.active_version_id is not null and not exists (
    select 1 from public.rule_versions
    where id = new.active_version_id and rule_id = new.id and lifecycle_status = 'active' and published_at is not null
  ) then
    raise exception 'active_version_id must identify this rule''s published active version';
  end if;
  return null;
end;
$$;
create constraint trigger rules_validate_active_version
after insert or update of active_version_id on public.rules deferrable initially deferred
for each row execute function public.groundrule_validate_active_version();

create table public.rule_outcomes (
  id uuid primary key default gen_random_uuid(),
  rule_version_id uuid not null references public.rule_versions(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  outcome_type text not null check (outcome_type in ('prohibition', 'permission_pathway', 'exemption', 'maximum', 'minimum', 'range', 'required_value', 'obligation', 'approval_required', 'external_authority_required', 'manual_review_required', 'information', 'warning')),
  subject_input_id uuid references public.input_definitions(id) on delete restrict,
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  severity text not null check (severity in ('requirement', 'advisory', 'warning')),
  message_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_version_id, sequence),
  check (outcome_type not in ('maximum', 'minimum', 'range', 'required_value') or subject_input_id is not null),
  check (outcome_type not in ('maximum', 'minimum', 'range') or parameters ? 'value' or parameters ? 'values')
);

create table public.rule_version_inputs (
  rule_version_id uuid not null references public.rule_versions(id) on delete restrict,
  input_definition_id uuid not null references public.input_definitions(id) on delete restrict,
  role text not null check (role in ('applicability', 'compliance', 'context', 'output')),
  required_when_applicable boolean not null default true,
  authority_requirement text not null default 'none' check (authority_requirement in ('none', 'verified', 'authoritative')),
  prompt_override text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (rule_version_id, input_definition_id, role)
);
create index rule_version_inputs_reverse_idx on public.rule_version_inputs (input_definition_id, rule_version_id);

create table public.rule_citations (
  rule_version_id uuid not null references public.rule_versions(id) on delete restrict,
  source_provision_id uuid not null references public.source_provisions(id) on delete restrict,
  citation_role text not null check (citation_role in ('primary', 'definition', 'exception', 'cross_reference', 'conflicting', 'external_dependency')),
  pinpoint_note text,
  sequence integer not null check (sequence > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (rule_version_id, source_provision_id, citation_role),
  unique (rule_version_id, sequence)
);
create index rule_citations_reverse_idx on public.rule_citations (source_provision_id, rule_version_id);

create table public.rule_relationships (
  id uuid primary key default gen_random_uuid(),
  from_rule_id uuid not null references public.rules(id) on delete restrict,
  to_rule_id uuid not null references public.rules(id) on delete restrict,
  relationship_type text not null check (relationship_type in ('excepts', 'exempts_from', 'depends_on', 'more_specific_than', 'potentially_conflicts_with')),
  scope_condition jsonb check (scope_condition is null or public.groundrule_valid_expression(scope_condition)),
  rationale text,
  source_provision_id uuid references public.source_provisions(id) on delete restrict,
  effective_from date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_rule_id <> to_rule_id),
  check (effective_to is null or effective_from is not null),
  check (effective_to is null or effective_to > effective_from),
  check (rationale is not null or source_provision_id is not null)
);
create unique index rule_relationships_active_uidx on public.rule_relationships (from_rule_id, to_rule_id, relationship_type)
  where effective_to is null;
create index rule_relationships_from_idx on public.rule_relationships (from_rule_id, relationship_type);
create index rule_relationships_to_idx on public.rule_relationships (to_rule_id, relationship_type);
create index rule_relationships_effective_idx on public.rule_relationships (effective_from, effective_to);

create function public.groundrule_validate_published_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare version_id uuid;
begin
  if tg_table_name = 'rule_versions' then
    version_id := coalesce(new.id, old.id);
  else
    version_id := coalesce(new.rule_version_id, old.rule_version_id);
  end if;
  if exists (select 1 from public.rule_versions where id = version_id and published_at is not null)
     and (not exists (select 1 from public.rule_outcomes where rule_version_id = version_id)
       or not exists (select 1 from public.rule_citations where rule_version_id = version_id and citation_role = 'primary')) then
    raise exception 'published rule version requires an outcome and a primary citation';
  end if;
  return null;
end;
$$;
create constraint trigger rule_versions_validate_publication
after insert or update of published_at on public.rule_versions deferrable initially deferred
for each row execute function public.groundrule_validate_published_version();
create constraint trigger rule_outcomes_validate_publication
after insert or update or delete on public.rule_outcomes deferrable initially deferred
for each row execute function public.groundrule_validate_published_version();
create constraint trigger rule_citations_validate_publication
after insert or update or delete on public.rule_citations deferrable initially deferred
for each row execute function public.groundrule_validate_published_version();

create function public.groundrule_prevent_published_version_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.published_at is not null
     and new is distinct from old
     and not (
       old.lifecycle_status = 'active'
       and new.lifecycle_status = 'superseded'
       and old.effective_to is null
       and new.effective_to is not null
       and (new.effective_to > old.effective_from)
       and (to_jsonb(new) - array['lifecycle_status', 'effective_to', 'updated_at'])
         = (to_jsonb(old) - array['lifecycle_status', 'effective_to', 'updated_at'])
     ) then
    raise exception 'published rule versions are immutable';
  end if;
  return new;
end;
$$;
create trigger rule_versions_immutable before update on public.rule_versions
for each row execute function public.groundrule_prevent_published_version_changes();

create function public.groundrule_prevent_published_child_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare version_id uuid := coalesce(old.rule_version_id, new.rule_version_id);
begin
  if exists (select 1 from public.rule_versions where id = version_id and published_at is not null) then
    raise exception 'children of published rule versions are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger rule_outcomes_immutable before insert or update or delete on public.rule_outcomes
for each row execute function public.groundrule_prevent_published_child_changes();
create trigger rule_version_inputs_immutable before insert or update or delete on public.rule_version_inputs
for each row execute function public.groundrule_prevent_published_child_changes();
create trigger rule_citations_immutable before insert or update or delete on public.rule_citations
for each row execute function public.groundrule_prevent_published_child_changes();

do $$
declare table_name text;
begin
  foreach table_name in array array['jurisdictions','project_types','rule_sets','regulatory_sources','source_provisions','input_definitions','input_options','rules','rule_versions','rule_outcomes','rule_version_inputs','rule_citations','rule_relationships']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.groundrule_set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.jurisdictions enable row level security;
alter table public.project_types enable row level security;
alter table public.rule_sets enable row level security;
alter table public.regulatory_sources enable row level security;
alter table public.source_provisions enable row level security;
alter table public.input_definitions enable row level security;
alter table public.input_options enable row level security;
alter table public.rules enable row level security;
alter table public.rule_versions enable row level security;
alter table public.rule_outcomes enable row level security;
alter table public.rule_version_inputs enable row level security;
alter table public.rule_citations enable row level security;
alter table public.rule_relationships enable row level security;

create policy jurisdictions_public_read on public.jurisdictions for select to anon, authenticated using (active);
create policy project_types_public_read on public.project_types for select to anon, authenticated using (active);
create policy rule_sets_public_read on public.rule_sets for select to anon, authenticated
  using (published_at is not null and research_status = 'verified');
create policy rules_public_read on public.rules for select to anon, authenticated using (
  active_version_id is not null and exists (
    select 1 from public.rule_sets where rule_sets.id = rules.rule_set_id
      and rule_sets.published_at is not null and rule_sets.research_status = 'verified'
  )
);
create policy rule_versions_public_read on public.rule_versions for select to anon, authenticated using (
  published_at is not null and lifecycle_status = 'active' and research_status = 'verified'
  and exists (select 1 from public.rules where rules.id = rule_versions.rule_id and rules.active_version_id = rule_versions.id)
);
create policy rule_outcomes_public_read on public.rule_outcomes for select to anon, authenticated using (
  exists (select 1 from public.rule_versions where rule_versions.id = rule_outcomes.rule_version_id
    and rule_versions.published_at is not null and rule_versions.lifecycle_status = 'active')
);
create policy rule_version_inputs_public_read on public.rule_version_inputs for select to anon, authenticated using (
  exists (select 1 from public.rule_versions where rule_versions.id = rule_version_inputs.rule_version_id
    and rule_versions.published_at is not null and rule_versions.lifecycle_status = 'active')
);
create policy rule_citations_public_read on public.rule_citations for select to anon, authenticated using (
  exists (select 1 from public.rule_versions where rule_versions.id = rule_citations.rule_version_id
    and rule_versions.published_at is not null and rule_versions.lifecycle_status = 'active')
);
create policy source_provisions_public_read on public.source_provisions for select to anon, authenticated using (
  exists (select 1 from public.rule_citations join public.rule_versions on rule_versions.id = rule_citations.rule_version_id
    where rule_citations.source_provision_id = source_provisions.id
      and rule_versions.published_at is not null and rule_versions.lifecycle_status = 'active')
);
create policy regulatory_sources_public_read on public.regulatory_sources for select to anon, authenticated using (
  exists (select 1 from public.source_provisions join public.rule_citations on rule_citations.source_provision_id = source_provisions.id
    join public.rule_versions on rule_versions.id = rule_citations.rule_version_id
    where source_provisions.regulatory_source_id = regulatory_sources.id
      and rule_versions.published_at is not null and rule_versions.lifecycle_status = 'active')
);
create policy input_definitions_public_read on public.input_definitions for select to anon, authenticated using (active);
create policy input_options_public_read on public.input_options for select to anon, authenticated using (active);
create policy rule_relationships_public_read on public.rule_relationships for select to anon, authenticated using (
  exists (select 1 from public.rules where rules.id = rule_relationships.from_rule_id and rules.active_version_id is not null)
  and exists (select 1 from public.rules where rules.id = rule_relationships.to_rule_id and rules.active_version_id is not null)
);

-- No INSERT/UPDATE/DELETE policies are created. Only trusted service-role or direct
-- database operations (which bypass RLS) can author regulatory content in MVP.
