-- Permit the public API roles to read published Groundrule reference data.
-- Row-level security remains responsible for filtering visible rows.

revoke insert, update, delete, truncate, references, trigger
on table
  public.jurisdictions,
  public.project_types,
  public.rule_sets,
  public.regulatory_sources,
  public.source_provisions,
  public.input_definitions,
  public.input_options,
  public.rules,
  public.rule_versions,
  public.rule_outcomes,
  public.rule_version_inputs,
  public.rule_citations,
  public.rule_relationships
from anon, authenticated;

grant select
on table
  public.jurisdictions,
  public.project_types,
  public.rule_sets,
  public.regulatory_sources,
  public.source_provisions,
  public.input_definitions,
  public.input_options,
  public.rules,
  public.rule_versions,
  public.rule_outcomes,
  public.rule_version_inputs,
  public.rule_citations,
  public.rule_relationships
to anon, authenticated;
