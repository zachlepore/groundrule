# Groundrule public read permissions v1

## Incident and root cause

The deployed `/dev/rule-evaluator` route reached Supabase but returned
`permission denied for table rule_sets`. Manual inspection showed that the
`rule_sets_public_read` RLS policy existed for `anon` and `authenticated`, while
neither role had the table-level `SELECT` privilege on `public.rule_sets`.

PostgreSQL table privileges and row-level security (RLS) are separate, cumulative
checks. A role first needs permission to perform `SELECT` on a table. RLS then
limits which rows that otherwise-permitted statement may see. A `SELECT` policy
does not itself grant table access, so PostgreSQL rejected the request before it
could use the published-and-verified row predicate.

## Corrective permission model

Migration `20260823000001_grant_groundrule_public_read_privileges.sql` grants
`SELECT` to `anon` and `authenticated` on exactly the 13 runtime/reference tables
created by the municipal rule schema migration:

1. `public.jurisdictions`
2. `public.project_types`
3. `public.rule_sets`
4. `public.regulatory_sources`
5. `public.source_provisions`
6. `public.input_definitions`
7. `public.input_options`
8. `public.rules`
9. `public.rule_versions`
10. `public.rule_outcomes`
11. `public.rule_version_inputs`
12. `public.rule_citations`
13. `public.rule_relationships`

The original schema migration contains no `GRANT` or `REVOKE` statements. The
unexpected live privileges therefore did not originate in that migration; they
may have come from database defaults or separate environment administration.
Because none of the public runtime roles needs to author or structurally operate
on reference data, the corrective migration explicitly revokes `INSERT`,
`UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` from both roles before
granting `SELECT`. `REVOKE` is safe and idempotent when a privilege is absent.
These are ordinary table privileges and are not required for Supabase's API roles
to read through PostgREST. No service-role privilege is changed.

This is safe because all 13 tables retain RLS and their existing `SELECT`
policies unchanged. In particular, the `rule_sets` policy continues to require a
non-null `published_at` and `research_status = 'verified'`; related-table policies
continue to restrict runtime data to active/published rule records. There are no
write policies, and the patch adds no write grant. The legacy
`public.municipalities` table is deliberately absent, as are functions, sequences,
schema-wide grants, default privileges, application changes, and data changes.

## Manual Supabase verification

After applying the migration through the normal reviewed deployment process, run
the following in the Supabase SQL editor. It reports every applicable privilege
for the two API roles and should return exactly one `SELECT` row per role/table
(26 rows total):

```sql
select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee in ('anon', 'authenticated')
  and table_schema = 'public'
  and table_name in (
    'jurisdictions', 'project_types', 'rule_sets',
    'regulatory_sources', 'source_provisions', 'input_definitions',
    'input_options', 'rules', 'rule_versions', 'rule_outcomes',
    'rule_version_inputs', 'rule_citations', 'rule_relationships'
  )
order by table_name, grantee, privilege_type;
```

Also verify RLS remains enabled on every patched table:

```sql
select tablename, rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in (
    'jurisdictions', 'project_types', 'rule_sets',
    'regulatory_sources', 'source_provisions', 'input_definitions',
    'input_options', 'rules', 'rule_versions', 'rule_outcomes',
    'rule_version_inputs', 'rule_citations', 'rule_relationships'
  )
order by tablename;
```

All 13 `rowsecurity` values must be `true`. Finally, inspect `pg_policies` and
confirm that the existing `SELECT` policies and predicates are unchanged,
including the publication/verification predicate on `rule_sets`:

```sql
select tablename, policyname, roles, cmd, qual
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'jurisdictions', 'project_types', 'rule_sets',
    'regulatory_sources', 'source_provisions', 'input_definitions',
    'input_options', 'rules', 'rule_versions', 'rule_outcomes',
    'rule_version_inputs', 'rule_citations', 'rule_relationships'
  )
order by tablename, policyname;
```

## Manual Vercel verification

No migration is applied as part of this patch. After the reviewed migration is
applied to Supabase, open the deployed Vercel `/dev/rule-evaluator` route and run
the same published Clearwater evaluation that reproduced the incident. Confirm
that the request completes without `permission denied for table rule_sets` and
returns the expected published rule evaluation. Then test an unpublished or
unverified rule set (if a controlled fixture is available) and confirm it remains
invisible, demonstrating that the RLS boundary still applies.

READY TO APPLY PUBLIC READ MIGRATION
