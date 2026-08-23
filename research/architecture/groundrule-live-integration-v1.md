# Groundrule Live Integration v1

## Scope and repository prerequisite

The prerequisite evaluator files (`condition.ts`, `evaluate.ts`, `index.ts`,
`loader.ts`, and `types.ts`), the existing Supabase server utility, and the
existing Next.js App Router landing page were present before this work began.
`groundrule-evaluator-v1.md` ended with `READY FOR UI INTEGRATION`.

This change adds only a diagnostic integration surface. It does not add a user
questionnaire, parcel/GIS behavior, authentication, schema changes, database
writes, fixture fallback, or Clearwater-specific evaluator behavior.

## Route and live access path

The diagnostic route is `GET /dev/rule-evaluator`. It is an async React Server
Component with `dynamic = "force-dynamic"` and `revalidate = 0`, so every request
runs on the server rather than being statically generated or hydrated with
credentials in the browser.

The route calls the generic `evaluateProjectRules` entry point. That entry point
uses the existing `createSupabaseServerClient`, configured by
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The client
does not persist an auth session and uses the publishable app credential—not a
service-role secret. The loader performs only `select` queries against the
published rule data. There is no fallback data path.

## Fixed diagnostic facts

Only request facts are fixed in the route configuration:

| Machine key | Value |
| --- | --- |
| `project.material` | `wood` |
| `project.is_wire_fence` | `false` |
| `project.has_exposed_top_points` | `false` |
| `project.in_required_setback` | `true` |
| `project.street_plane_length` | `120` |
| `project.is_chain_link` | `false` |
| `project.location_zone` | `front` |
| `project.height` | `4` |
| `project.landscape_strip_waived` | `false` |
| `project.structure_type` | `fence` |
| `project.material_appropriateness_approved` | `false` |
| `property.is_water_adjacent` | `false` |
| `property.zoning_district` | `ldr` |

These keys and enum options exist in the Clearwater seed package. The request is
intentionally incomplete so live conditions can produce unknown rules and
missing inputs. No expected limit, outcome, citation, rule key, or legal result
is embedded in the route.

## Diagnostic output and database-origin proof

The page displays jurisdiction, project type, live rule-set key and title, and
counts for loaded, matched, not-matched, unknown, review-required, missing-input,
and conflict results. It also samples matched rule keys/titles, missing input
keys/labels, and citation source/section identifiers.

The rule-set title, loaded count, displayed stored rule keys and titles, input
labels, and citation identifiers all come from the Supabase response. The loaded
count is calculated from the evaluator result partitions; it is not an expected
runtime constant.

## RLS behavior and live result

The intended read path uses the configured publishable key and therefore remains
subject to the project's public/anonymous read policies. It does not bypass RLS.

The local Codex environment did not contain either required Supabase environment
variable, so no live request or RLS conclusion could be made here. Consequently,
live evaluator counts are not recorded and must not be inferred from the seed.
The read-only integration check reports an explicit skip when both variables are
absent and fails on partial configuration or failed assertions. If the deployed
route reports a query error, its table-specific loader label (`identity`,
`rules`, `outcomes`, `inputs`, `citations`, or `relationships`) and Supabase error
message identify the failing read surface; policies must be diagnosed outside
this task rather than modified here.

## Failure modes

The page catches and visibly reports:

- missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- no currently effective, verified, published jurisdiction/project rule set;
- Supabase/RLS failures, including the loader query stage and database message;
- malformed live rows that cause loader or evaluator execution to fail; and
- unexpected failures, without substituting fixture results.

## Automated and manual verification

Run locally or in a protected deployment environment:

```sh
npm run test:evaluator
npm run test:evaluator:live
npm run lint
npm run build
```

For the live check, configure the same two Vercel Supabase variables used by the
application. The script queries the Clearwater fence rule set, requires at least
one loaded rule, executes the evaluator, and asserts unknown rules, missing
inputs, matched/review results, and citations. It prints the database-derived
rule-set metadata and counts for recording here after a successful run.

Manual Vercel steps:

1. Confirm the deployment has `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with no service-role credential needed.
2. Open `/dev/rule-evaluator` directly and confirm it identifies itself as the
   server-rendered, read-only diagnostic.
3. Record the displayed live rule-set title and all result counts.
4. Confirm matched samples show stored rule keys/titles, missing samples show
   database input labels, and citation samples show source section identifiers.
5. If an error appears, retain its exact loader stage and Supabase message to
   diagnose the corresponding table/policy. Do not add a fixture or service-role
   fallback.
6. Run `npm run test:evaluator:live` with the deployment environment and retain
   its JSON output as the read-only integration evidence.

## Unresolved issue and next step

Live public-read/RLS behavior and evaluator result counts remain unresolved until
the route or integration script runs with the configured live project. The code
path is ready for that proof, but this document cannot claim the proof before a
successful live run.

After a successful live proof, the smallest dynamic-question-flow step is to map
each evaluator `missingInputs` entry directly to one server-validated question,
using its database-provided label, type, unit, and options, then resubmit the
accumulated fact map to the same generic entry point.

LIVE INTEGRATION NEEDS REVISION
