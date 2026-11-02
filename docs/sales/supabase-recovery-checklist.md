# Supabase recovery checklist for the bounded Clearwater pilot

Companion to [the readiness report](clearwater-sales-v1-readiness.md). **Planning only:** no dashboard action, credential use, SQL execution, restore, migration, database write or deployment is authorized/performed by this audit. Owner runs or separately authorizes each operational step. Keep secrets/backup data out of Git and chat.

## 1. Establish the correct project and environment — owner

- Open the existing Supabase organization/project through the owner's normal account. Record project reference, region, organization, displayed status/error, last known access, plan and current backup/restore availability. Distinguish paused compute, billing restriction, unhealthy service and expired restore eligibility; do not infer any from an app error.
- In Vercel's existing Groundrule project, record the production domain, production branch, deployment SHA, runtime/Node version and environment scope. Repo-listed candidate is `groundrule-three.vercel.app`; owner must confirm it. Preview deployments for draft branches are not production evidence.
- Privately compare **project identity**, not secret values, to the configured `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production and Preview. These are the only application Supabase variables read by `lib/supabase/server.ts`. Verify the intended project's valid publishable/anon-compatible key without sharing it here. No service-role key belongs in this app's browser/public variables. Do not rotate/reset credentials just to investigate.
- Capture a dated status screenshot and last known good deployment. Identify the responsible project owner and municipal reviewer. Do not create a replacement project or change billing while the original project's state is unclear.

## 2. Preserve recovery options before any data change — owner

- Inventory Dashboard backups/PITR/download options **as actually available for this project's plan, age and status**; export/download a retained backup where offered before restoration. Record snapshot times, PostgreSQL version, scope, encryption/storage location and file hashes. Obtain source GIS Release and previously validated approval/provenance artifacts independently; GIS files are not a database backup.
- If compute is paused and no logical export is possible, document that limitation. An owner-controlled **Resume/Restore** operation may be necessary to make the existing database readable. It is not permission for this agent to restore, migrate, recreate or bill anything. Review the Dashboard's described consequences first. If the Dashboard offers only recovery into another project, a paid-plan change or destructive replacement, stop for a separate owner decision.
- After owner-authorized resume and **before SQL/data/schema/rule changes**, isolate the pilot from public traffic or retain an unavailable response. Take fresh schema + data + roles/grants backups using an owner-controlled compatible Supabase/Postgres export process. Include migration history, policies, functions, source/rule versions, properties and addresses. Record counts and checksums. Database dumps do not include Storage object bytes: back those up separately if used. Record Auth/storage dependencies even though the pilot needs no accounts.
- Verify the archive can be read/listed and is complete. Rehearse restoration only in an isolated, separately authorized nonproduction target, never the existing project by default. Keep an encrypted independent copy and an access-controlled rollback record. If usable backups cannot be secured, **no data/schema mutation** is allowed to proceed.

Documentation destinations for owner verification: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Dashboard](https://supabase.com/dashboard), [CLI reference](https://supabase.com/docs/reference/cli/introduction). Requests to Supabase documentation were proxy-blocked in this audit; no particular retention window, pause deadline or restore entitlement is asserted.

## 3. Read-only inventory after recovery — owner / separately authorized Codex

Use a read-only transaction and save results privately. Run each section only if its prerequisite tables/columns exist; a missing object is a finding, not an instruction to create it. Inspect definitions in the Dashboard if the inventory role cannot read catalogs. Do not paste resident-level exports or secrets into an issue.

```sql
begin transaction read only;
select now(), version();
select table_schema, table_name
from information_schema.tables
where table_schema in ('public', 'supabase_migrations')
order by 1, 2;
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('municipalities', 'jurisdictions', 'properties',
                    'property_addresses', 'rule_sets', 'rules', 'rule_versions')
order by table_name, ordinal_position;
rollback;
```

Only once the migration-history table is confirmed:

```sql
begin transaction read only;
select version from supabase_migrations.schema_migrations order by version;
rollback;
```

Compare with the **17 files** under `supabase/migrations/` at audited main `6d63ced`, from `20260822000000` through `20260908000001`. Do not run `db push`, reset, migration repair, or replay SQL as a way to discover state. The municipality table predates these migrations and requires its own schema/RLS/slug check (`clearwater` versus rules jurisdiction `clearwater-fl`). Missing earlier migrations may explain failures but must be reviewed individually.

If the expected columns exist:

```sql
begin transaction read only;
select slug, active from public.jurisdictions order by slug;
select p.validation_status, p.jurisdiction_key, p.normalized_zoning_code,
       count(distinct p.id) as properties, count(a.id) as active_addresses
from public.properties p
left join public.property_addresses a
  on a.property_id = p.id and a.jurisdiction_id = p.jurisdiction_id and a.active
group by 1, 2, 3 order by 1, 2, 3;
select a.jurisdiction_id, a.normalized_address, count(*)
from public.property_addresses a where a.active
group by 1, 2 having count(*) > 1;
select p.id
from public.properties p
left join public.jurisdictions j on j.id = p.jurisdiction_id
where j.id is null;
select r.key, r.active_version_id, rv.version_number,
       rv.research_status, rv.lifecycle_status, rv.published_at,
       rv.effective_from, rv.effective_to
from public.rules r
join public.rule_sets rs on rs.id = r.rule_set_id
left join public.rule_versions rv on rv.id = r.active_version_id
where rs.key = 'clearwater_fence_v1'
order by r.key;
select * from public.rule_relationships
where from_rule_id in (
  select r.id from public.rules r join public.rule_sets rs on rs.id=r.rule_set_id
  where rs.key='clearwater_fence_v1'
);
rollback;
```

The rule seed plus resident update describe **51 fence rules / six legacy relationships**, not a promised live count. Investigate missing/extra/null/inactive versions; main's loader assumes an active version exists for each returned rule. Check rule-set publication and effective dates, outcomes, version inputs/options, citation FKs, source editions, provision checksums/URLs and actual effective relationship scopes/dates. Compare version/content fingerprints, not merely counts. Ensure no unreviewed NCOD activation has occurred. A changed/scoped graph must not run under main's incomplete precedence semantics without a reviewed fix.

```sql
begin transaction read only;
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public' order by tablename, policyname;
select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema='public' and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef, p.proconfig, p.proacl, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'normalize_property_address', 'search_trusted_municipality_addresses',
  'resolve_property_address_state', 'find_trusted_property_by_address'
);
rollback;
```

Verify RLS is enabled on property tables and that anon/authenticated cannot write canonical or regulatory tables or bypass holds via another RPC. Property tables deliberately lack direct public SELECT grants/policies; narrow SECURITY DEFINER RPCs supply public reads. Inspect function grants/search paths and any extra endpoints, not just these four known functions. Regulatory reads must expose only appropriate published content. A missing policy/grant must not be “fixed” by disabling RLS or adding service-role credentials to runtime.

Expected seed-only data is 106 parcels / 110 addresses; do not force this number if the live project legitimately contains more. Check for imported full-city/demo batches in `properties.source_snapshot_metadata`, normalization collisions, duplicate/orphan links and differences between shared-parcel address identities. An actual property/code/QA disagreement is held for review. No automatic overwrite or REVIEW→CLEAN conversion.

## 4. Prepare only the necessary repair plan — Codex, then owner approval

- Produce a **concrete diff** of live schema/migration history/RPC/rule/data versus the intended pilot version, backup evidence, exact affected rows, rollback and preview acceptance plan. No blanket replay of 17 migrations.
- Pay particular attention to `20260826000001`: its historical jurisdiction UPDATE affects all existing Clearwater-jurisdiction rows before dropping the default. `20260827000000` expects a specific 106-parcel cohort. These are not general citywide backfills. Reapplying old seeds/enrichments against unknown contents can misclassify or fail.
- Keep existing IDs/addresses/source provenance. `scripts/demo/clearwater-sales-v1.mjs` is **insert-only** and rejects existing parcels/active addresses. For already present pilot properties, review a narrow metadata/reconciliation plan instead of generating duplicate imports. Never use this curated CLEAN generator for original-REVIEW approvals or NCOD normalization.
- Record whether a forward-only repair or no database change is actually necessary. Use the existing canonical structures; no new DB architecture is a launch prerequisite. Obtain separate explicit authorization for any SQL/migration/data application, project restore or billing change.

## 5. Validate restored service and release separately — Codex / owner / municipality

After recovery and any separately approved repair, verify both public RPC access and expected denials through the intended app environment. Do not test denied writes by attempting live inserts/deletes; inspect grants and use an isolated authorized test target for mutation-denial tests. Confirm the approved demo address → exact canonical row → confirmed Clearwater → supported fence scope → intended live rule versions → honest card status/citations → official next step.

Test: address abbreviations/fuzzy confirmation, units/shared parcels, empty/no-match, ambiguous address, REVIEW/NCOD, outside/unknown jurisdiction, direct excluded-Guide URL, missing rule/source, expired/stale graph and outage. Fixture-only negative tests are distinct from real deployed evidence. `tests/live-evaluator.integration.ts` checks an evaluator with diagnostic facts; it **does not** test the whole resident address path and exits successfully with SKIP when both env variables are missing. Require an actual connected result plus browser smoke evidence for release.

Owner verifies Production/Preview variable scope, approved SHA, Node/runtime, health, HTTPS and municipal contact links before authorizing deployment. Rollback for bad cards is the previous known-good app/cohort or a temporary unavailable/referral response; schema/data rollback needs its own reviewed plan. Never destroy/recreate the database to roll back a frontend defect.

**Completion record:** owner/project/ref/status; backup IDs/time/hash and private location; migration/RPC/schema inventory; actual address/property counts; pinned rule/source versions; tested demo identities and holds; deployed SHA/domain; positive and negative smoke results; support contact and disable/rollback procedure; municipality sign-off. Any missing item remains an explicit launch blocker, not a presumed match to repository files.
