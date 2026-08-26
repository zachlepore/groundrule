# Clearwater Shed outcome-type audit

The live `rule_outcomes.outcome_type` check supports exactly `prohibition`,
`permission_pathway`, `exemption`, `maximum`, `minimum`, `range`,
`required_value`, `obligation`, `approval_required`,
`external_authority_required`, `manual_review_required`, `information`, and
`warning`. `advisory` is a supported **severity**, not an outcome type.

| Rule key | Previous type | Supported type | Rationale | Presentation change |
| --- | --- | --- | --- | --- |
| `permit.small_shed_exemption` | `permit_threshold` (unsupported; the reported failed row surfaced `advisory`) | `exemption` | The finding exempts sheds at or below the inclusive threshold from the building-permit requirement. | The Shed guide now selects `exemption`; its resident-facing threshold text and parameters are unchanged. |
| `permit.larger_shed_review` | `external_authority_required` | `external_authority_required` | The resident must contact Clearwater Permitting for the applicable permit path. | None. |
| `permit.utilities` | `external_authority_required` | `external_authority_required` | Clearwater must confirm separate trade-permit requirements. | None. |
| `location.lmdr_setbacks` | `minimum_setbacks` (unsupported) | `obligation` | This is one composite placement duty containing three directional minimums; representing it as one scalar `minimum` would be incorrect. | The Shed guide now selects `obligation`; its setback values and resident-facing text are unchanged. |
| `height.residential_maximum` | `maximum` | `maximum` | The finding is a scalar upper bound on `project.height`. | None; the migration now supplies the schema-required `project.height` subject and compliance input. |

The other controlled values inserted by the migration were checked against the
schema: coverage `limited`; research status `verified`; lifecycle statuses
`withdrawn` and `active`; evaluation modes `informational` and `deterministic`;
research confidence `medium` and `high`; severities `advisory`, `warning`, and
`requirement`; input roles `applicability` and `compliance`; authority
requirements `none` and `authoritative`; citation role `primary`; and schema
version `1` are all valid. Referenced inputs already exist with supported data
types: `project.structure_type` and `property.zoning_district` are enums, while
`project.height` is decimal.

The migration remains one explicit `BEGIN`/`COMMIT` transaction. PostgreSQL rolls
back the transaction when the constraint error aborts it, so the failed run did
not commit partial Shed data. Conflict handling plus unpublished-version guards
make a clean retry idempotent and avoid mutations of published children.
