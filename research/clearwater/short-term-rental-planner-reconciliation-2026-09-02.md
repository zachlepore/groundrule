# Clearwater short-term-rental planner reconciliation

**Audit date:** 2026-09-02  
**Production-change decision:** stop at research; retain the published LMDR-only rule  
**Planner statement under review:** “Not permitted in any residential zoning district.”

## Executive decision

Abi's statement is **OPERATIONALLY CORRECT BUT LEGALLY SIMPLIFIED** for the ordinary
resident question, subject to one focused confirmation from Planning.

The apparent disagreement is caused by two different questions:

1. Clearwater's definition of a **residential use** expressly excludes a rental offered,
   advertised, or occupied for less than 31 days or one calendar month, whichever is
   less, on residentially zoned property (CDC § 8-102). A normal whole-dwelling vacation
   rental therefore is not a residential use.
2. The district tables nevertheless expressly list a tightly conditioned **overnight
   accommodations** use in LDR, MDR, MHDR, and HDR. Every such residential pathway says
   the accommodation must be accessory to the principal building's use as a private
   residence. LDR and MDR require Level Two review; MHDR and HDR contain Level One and
   Level Two routes. These provisions are not an ordinary by-right whole-home STR rule.

The code does not define “private residence,” say in these base-district criteria that
the owner must occupy it, or expressly say how much of the dwelling may be occupied by
guests. “Accessory” establishes subordination to the principal private-residence use,
but the reviewed text does not safely answer those operational questions. Downtown's
separately named bed-and-breakfast category *does* expressly require an owner or manager
to reside on site and breakfast service; that language should not be imported into the
base districts without authority.

Accordingly, the code disproves the unqualified legal proposition that no accommodation
pathway exists in any residential district, while Abi's shorthand can still accurately
describe what Planning considers a normal resident-operated STR. A planner answer is
required before Groundrule converts that distinction into broader production results.
The deterministic LMDR prohibition is unaffected.

## 1. Existing STR architecture

The resident workflow performs the shared address lookup, applies the Clearwater
jurisdiction gate, converts the trusted property profile to generalized facts, and calls
the shared evaluator for project type `short_term_rental`. React contains no duration,
district, or approval logic. The presentation adapter maps a matched structured
`prohibition` to the resident-facing “Not allowed” card and otherwise fails safely to
“Needs confirmation.”

The database package is intentionally limited:

- rule set: `clearwater_short_term_rental_v1`;
- rule: `eligibility.lmdr_prohibition`;
- active version: version 1;
- authoritative input: `property.zoning_district`;
- structured outcome: `prohibition`;
- citations: CDC §§ 2-202–2-204 (primary) and § 8-102 (definition);
- coverage: deterministic LMDR only; every other district remains unsupported.

The published migration creates an unpublished version and all children, validates one
outcome/two citations/one input, then publishes and activates it. No published child is
being mutated in this reconciliation.

## 2. How the existing five profiles were derived

The earlier research read § 8-102's duration classification together with each Article 2
use table, rather than treating “STR” as a use-table label:

| Existing profile | Source → provision | Interpretation → structured rule | Current resident result |
|---|---|---|---|
| No ordinary pathway | LMDR §§ 2-202–2-204; MHP §§ 2-602–2-604; I §§ 2-1202–2-1204; OSR §§ 2-1402–2-1404; P §§ 2-1502–2-1503 | Omission from the district's permitted uses; only LMDR was published as `eligibility.lmdr_prohibition` v1 | LMDR: **NOT ALLOWED**; all others: **NEEDS CONFIRMATION** because V1 has no rule |
| Residential accessory/private-residence | LDR § 2-104.B; MDR § 2-304.E; MHDR §§ 2-403.F, 2-404.D; HDR §§ 2-503.F, 2-504.C | Express overnight-accommodation use, subordinate to a principal private residence and subject to approval/site criteria; no rule published | **NEEDS CONFIRMATION** |
| Nonresidential overnight accommodation | C §§ 2-703.P, 2-704.P; O district tables/§ 2-1004; IRT § 2-1304.F | A possible use whose availability depends on approval and facts such as future-land-use designation, access, adjacency, or site design; no rule published | **NEEDS CONFIRMATION** |
| Tourism/hotel intensity | T §§ 2-801.1, 2-802.N, 2-803.K and Beach by Design where applicable | Express use, but zoning alone does not establish density, approval, coastal, access, or design compliance; no rule published | **NEEDS CONFIRMATION** |
| Plan/subdistrict confirmation | US 19 Appendix B; Downtown Appendix C | Subdistrict/character district, frontage, use subtype, and approval level control; no rule published | **NEEDS CONFIRMATION** |

The five-profile model was a research taxonomy, not fifteen production decisions. The
only resident conclusion actually encoded was LMDR.

## 3. Authoritative provisions reviewed

The audit re-opened the committed Clearwater Community Development Code, including:

- § 8-102: “overnight accommodation unit,” “overnight accommodations,” “residential
  use,” “residentially zoned property,” and “nonresidentially zoned property” definitions;
- §§ 2-102–2-104 (LDR), 2-202–2-204 (LMDR), 2-302–2-304 (MDR), 2-402–2-404
  (MHDR), 2-502–2-504 (HDR), and 2-602–2-604 (MHP);
- §§ 2-702–2-704 (C), 2-801.1–2-803 (T), 2-1001.1–2-1004 (O),
  2-1202–2-1204 (I), 2-1302–2-1304 (IRT), 2-1402–2-1404 (OSR), and
  2-1502–2-1503 (P);
- Appendix B §§ B-302–B-303 for US 19 and Appendix C § C-303 for Downtown;
- § 3-919's evidence provisions for rentals of sub-month duration;
- Article 4's Level One and Level Two approval procedures; and
- City Code § 3-2301's scope exclusion for hotels, motels, resort condominiums,
  transient apartments, resort dwellings, and bed-and-breakfast inns.

The Florida lodging and tax statutes cited in V1 remain context only. They do not create
a local land-use entitlement and were not used to resolve district eligibility.

## 4. Currentness and internet check

The committed compilation is **Supplement No. 55, July 2026**, containing ordinances
deemed advisable for codification through Ordinance No. 9857-25, enacted December 4,
2025. The relevant Article 2 and § 8-102 pages are present. Their page footers are often
Supplement No. 52 or 54 because those pages were not replaced by Supplement 55; that is
normal looseleaf codification, not evidence that the provisions expired.

An online comparison was attempted on 2026-09-02. The browsing service returned HTTP
401, and direct requests to both Municode and the City site were blocked by the execution
environment's proxy with HTTP 403. Current official online text therefore could not be
independently compared. The committed July 2026 compilation is the newest available
authoritative material in this repository. No evidence reviewed indicates an intervening
code change, but online currentness remains a documented limitation.

## 5. Clearwater terminology

Clearwater does not use “short-term rental” or a platform name as the controlling Article
2 use. Its controlling category is **overnight accommodations**, a facility with one or
more temporary-occupancy units. Classification ignores ownership form, consideration,
the occupant's direct or indirect ownership interest, and whether occupancy arises from
a rental agreement or another agreement.

“Residential use” means a permanent family residence and, on residentially zoned
property, excludes the same sub-month rental/advertising activity. Thus a dwelling does
not remain a permitted residential use merely because it looks like a house.

“Hotel” is not interchangeable with every overnight accommodation. The Downtown table
separates “Overnight Accommodations (Bed & Breakfast)” from “Overnight Accommodations
(Hotel).” The former has private-residence, on-site owner/manager, breakfast, parking,
and event restrictions. Tourist and other base-district tables generally use the broader
overnight-accommodations category. “Vacation rental” appears in enforcement evidence;
it is not the district-table entitlement label. The reviewed provisions do not establish
“transient accommodation” or “dwelling rental” as substitute Article 2 use categories.

## 6. The less-than-31-day / calendar-month rule

The exact § 8-102 threshold is **less than 31 days or one calendar month, whichever is
less**. It applies when occupancy occurs or the facility is offered or advertised as
available. It is not simply a “30-night” rule: because the shorter measure controls, an
entire calendar month can be the boundary even when that month has fewer than 31 days.

Section 3-919 reinforces enforcement of that classification. Prima facie evidence
includes registration/licensure for transient or vacation-rental activity, advertising
tourist housing or vacation rental, booking or rental instruments covering any period
below the threshold, and use of an agent to arrange such occupancy. Section 3-919 does
not create permission; it helps establish an overnight-accommodation use.

## 7. Residential private-residence pathway reconciliation

| District | What the code expressly allows | Approval/site controls | What the code does **not** resolve |
|---|---|---|---|
| LDR | Overnight accommodations accessory to the principal building's use as a private residence; no more than 4 units; guest-only food service | Level Two; arterial frontage; screened parking, enclosed waste, and Neighborhood Conservation compatibility | No express owner-occupancy sentence; no express whole-vs-part-dwelling sentence; “private residence” undefined in reviewed text |
| MDR | Same accessory relationship; no more than 6 units; guest-only food service | Level Two; major-arterial frontage or corner lot; parking, lighting, waste, and neighborhood criteria | Same unresolved operational points |
| MHDR | Same accessory relationship; no more than 10 units; guest-only food service | Listed in Level One flexible standards and Level Two flexible development; frontage/corner, parking, lighting, waste, height, and compatibility criteria vary by route | Same unresolved operational points; existence of two approval routes is not permission to operate without review |
| HDR | Same accessory relationship; no more than 10 units; guest-only food service | Listed in Level One and Level Two tables; frontage/corner and site/design criteria | Same unresolved operational points |
| LMDR | No overnight-accommodation use in minimum, flexible-standard, or flexible-development tables | No ordinary approval route identified | Historic approvals/nonconformities remain property-specific |
| MHP | No overnight-accommodation use in the district tables | No ordinary approval route identified | Historic approvals/nonconformities remain property-specific |

The pathway is real and current in the committed code. Groundrule did not invent it.
Groundrule did, however, leave the operational meaning appropriately unresolved. The
base-district text does not support saying owner occupancy is required, and it does not
support saying a resident may rent the whole principal residence. The safest reading is
that the accommodation must remain incidental/subordinate to a genuine principal
private-residence use and receive the specified development approval. Whether Clearwater
staff calls that narrow use a bed-and-breakfast rather than an STR is precisely the
remaining planner-practice question.

No superseding blanket prohibition was found. Instead, § 8-102 prevents the transient
activity from qualifying as a *residential use*, while Article 2 separately authorizes a
conditional *overnight-accommodations use* in four residential districts. Reading the
definition as voiding those express table entries would make those entries meaningless.

## 8. Tourist district reconciliation

T zoning is not an unconditional “Allowed.” Sections 2-802.N and 2-803.K list overnight
accommodations through Level One flexible-standard and Level Two flexible-development
routes. Section 2-801.1 ties development potential to the applicable future-land-use
designation and, on Clearwater Beach, Beach by Design. The criteria address unit/room
density, height, design, access (generally major-arterial frontage away from Clearwater
Beach), accessory uses, parking, coastal evacuation, and in some cases hotel-density
allocations.

A T parcel therefore supports: “Overnight accommodations are a contemplated principal
use in Tourist zoning, subject to City development approval and property-specific
limits.” It does not support: “Your home may be used as a short-term rental merely because
the parcel is T.” Groundrule lacks enough facts and approval history for a deterministic
parcel result, so the current **NEEDS CONFIRMATION** fallback is correct.

## 9. Nonresidential reconciliation

- **C:** overnight accommodations appear in both flexible-standard and flexible-
  development pathways. Future-land-use designation controls whether accommodation
  density exists (Commercial Neighborhood shows N/A; other listed designations allow
  specified densities), alongside access, coastal, site, and approval criteria.
- **D:** Appendix C allows hotel-type accommodations in multiple character districts and
  the separately regulated bed-and-breakfast subtype only where its table permits it.
  Character district/frontage and BCP approval matter; “D” alone is insufficient.
- **O:** accommodation development potential is N/A in two listed future-land-use
  designations and 30 units/acre in Residential/Office/Retail. The Level Two route and
  property/site controls make O zoning alone insufficient.
- **US 19:** Appendix B's subdistrict table marks overnight accommodations BCP in the
  relevant subdistrict columns and imposes use-specific criteria. Subdistrict, frontage,
  future-land-use, and development approval are required.
- **I:** no overnight-accommodation use appears in the reviewed district tables.
- **IRT:** § 2-1304 provides a Level Two route, with restrictions involving residential
  adjacency, arterial access, coastal location, future-land-use category, acreage, and
  recorded development limitations.
- **OSR:** no overnight-accommodation use appears in §§ 2-1402–2-1404. The code index has
  a stale/misleading cross-reference to § 2-1403.C, but that subsection regulates parking
  garages and lots. The operative table controls the conclusion.
- **P:** no ordinary overnight-accommodation route appears in the reviewed tables.

Therefore “STRs are only allowed in Tourist zoning” would be false. C, D, O, US 19, and
IRT can also support an overnight-accommodation use under their respective controls.

## 10. All-district decision matrix

“Current” describes actual V1 behavior, not the earlier research shorthand. “Additional
facts” includes existing lawful approval/nonconforming status for every district.

| District | Relevant terminology | Ordinary resident STR? | Narrow/accessory path? | Approval | Additional facts required | Current | Recommended | Authority | Confidence | Abi discrepancy? |
|---|---|---:|---:|---|---|---|---|---|---|---|
| LDR | Overnight accommodations accessory to private residence | No by-right path | Yes, ≤4 units | Level Two | Residence relationship, units, arterial frontage, site/NC criteria | NEEDS CONFIRMATION | REQUIRES APPROVAL | §§ 2-104.B, 4-401 et seq. | Medium-high legal; medium operational | Yes, literal; possibly no operational conflict |
| LMDR | Overnight accommodations omitted | No | No ordinary path | None identified | Existing approval/nonconformity only | NOT ALLOWED | NOT ALLOWED | §§ 2-202–2-204; § 8-102 | High | No |
| MDR | Accessory overnight accommodations | No by-right path | Yes, ≤6 units | Level Two | Residence relationship, units, frontage/corner, site/NC criteria | NEEDS CONFIRMATION | REQUIRES APPROVAL | § 2-304.E | Medium-high legal; medium operational | Yes, literal; possibly no operational conflict |
| MHDR | Accessory overnight accommodations | No by-right path | Yes, ≤10 units | Level One or Two route | Residence relationship, units, frontage/corner, design/site criteria | NEEDS CONFIRMATION | REQUIRES APPROVAL | §§ 2-403.F, 2-404.D | Medium-high legal; medium operational | Yes, literal; possibly no operational conflict |
| HDR | Accessory overnight accommodations | No by-right path | Yes, ≤10 units | Level One or Two route | Residence relationship, units, frontage/corner, design/site criteria | NEEDS CONFIRMATION | REQUIRES APPROVAL | §§ 2-503.F, 2-504.C | Medium-high legal; medium operational | Yes, literal; possibly no operational conflict |
| MHP | Overnight accommodations omitted | No | No ordinary path | None identified | Existing approval/nonconformity only | NEEDS CONFIRMATION | NOT ALLOWED | §§ 2-602–2-604; § 8-102 | High | No |
| C | Overnight accommodations | Potentially | Not residential accessory | Level One or Two route | FLU, density, access, coastal/site criteria, approval | NEEDS CONFIRMATION | REQUIRES APPROVAL | §§ 2-701.1, 2-703.P, 2-704.P | High | Contradicts “Tourist only,” not residential statement |
| T | Overnight accommodations/hotel intensity | Potentially | Not necessarily private-residence STR | Level One or Two route | FLU/special-area plan, density, access, coastal/design/site criteria, approval | NEEDS CONFIRMATION | REQUIRES APPROVAL | §§ 2-801.1, 2-802.N, 2-803.K | High | Supports tourism shorthand, but not exclusivity |
| D | Hotel and bed-and-breakfast overnight accommodations | Potentially | B&B subtype is accessory/private residence | BCP where table permits | Character district, frontage, subtype, site criteria, approval | NEEDS CONFIRMATION | NEEDS CONFIRMATION | Appendix C § C-303 | High | Downtown is another possible context |
| O | Overnight-accommodation intensity/path | Potentially in qualifying FLU | No residential accessory rule relied on | Level Two | FLU, frontage/site criteria, approval | NEEDS CONFIRMATION | REQUIRES APPROVAL | §§ 2-1001.1, 2-1004 | Medium-high | Another possible non-T context |
| US 19 | Overnight accommodations | Potentially | No residential accessory rule relied on | BCP | Subdistrict, frontage, FLU/site criteria, approval | NEEDS CONFIRMATION | NEEDS CONFIRMATION | Appendix B §§ B-302–B-303 | High | Another possible non-T context |
| I | Overnight accommodations omitted | No ordinary path | No | None identified | Existing approval/nonconformity only | NEEDS CONFIRMATION | NOT ALLOWED | §§ 2-1202–2-1204 | High | None |
| IRT | Overnight accommodations | Potentially | No | Level Two | FLU, acreage, adjacency, arterial/coastal criteria, recorded limits, approval | NEEDS CONFIRMATION | REQUIRES APPROVAL | § 2-1304.F | High | Another possible non-T context |
| OSR | Overnight accommodations omitted | No ordinary path | No | None identified | Existing approval/nonconformity only | NEEDS CONFIRMATION | NOT ALLOWED | §§ 2-1402–2-1404 | High | None |
| P | Overnight accommodations omitted | No ordinary path | No | None identified | Existing approval/nonconformity only | NEEDS CONFIRMATION | NOT ALLOWED | §§ 2-1502–2-1503 | High | None |

## 11. Product answer and Abi classification

For a normal Clearwater resident, “Can I have a short-term rental here?” should mean:
“May I offer this dwelling to transient guests as a normal whole-home vacation rental?”
It should not silently mean “Could a professionally reviewed bed-and-breakfast-like or
hotel development possibly be approved under an overnight-accommodations use category?”

The defensible product model is therefore:

1. **NOT ALLOWED** where the tables provide no ordinary route, subject to a concise note
   for a claimant with a documented lawful prior approval.
2. **REQUIRES APPROVAL** where an express route exists but the City must review it and
   Groundrule has enough authoritative facts to characterize the route.
3. **NEEDS CONFIRMATION** where plan area, use subtype, approval history, or unresolved
   planner practice prevents a reliable result.
4. Never use **ALLOWED** from a zoning label alone for the audited pathways.

Abi's statement is classified **OPERATIONALLY CORRECT BUT LEGALLY SIMPLIFIED**, rather
than supported as an exceptionless legal statement. It correctly communicates that a
transient rental is not a residential use and that residents cannot treat residential
zoning as ordinary STR permission. It omits express accessory overnight-accommodation
routes in four residential districts. Whether those routes are treated administratively
as bed-and-breakfast-like uses is not answerable from the code alone.

## 12. Canonical property

For **1950 Drew Plz**, the trusted profile remains Clearwater/LMDR. Before: **NOT
ALLOWED**, with the structured `prohibition` message “Your property is zoned LMDR.
Short-term rentals are not permitted in this zoning district.” After: unchanged. Neither
the accessory routes in other districts nor the planner shorthand creates an LMDR route.

## 13. Can Groundrule say where STRs are allowed?

Groundrule can safely say only:

> Overnight accommodations are contemplated in Tourist zoning and in some other
> commercial or plan districts, but zoning alone is not approval. Residential districts
> do not provide an ordinary by-right whole-home short-term-rental use.

It cannot safely say “only Tourist zoning,” publish a citywide eligibility list/map, or
tell a T-zoned owner they are unconditionally allowed. The required FLU, subdistrict,
frontage, coastal/design, current-use, and approval facts are not all promoted in the
current property model.

Because the existing UI only produces an LMDR prohibition, adding the paragraph now
would introduce citywide implications into a deliberately limited rule package. It should
wait until the focused planner question is answered and its provenance can be encoded.

## 14. One focused follow-up question for Abi

> CDC §§ 2-104.B, 2-304.E, 2-403.F/2-404.D, and 2-503.F/2-504.C appear to allow an
> approved “overnight accommodations” use in LDR, MDR, MHDR, and HDR only when it is
> accessory to the principal building's use as a private residence. When you say STRs
> are not permitted in residential zoning, does Planning treat these as a distinct
> bed-and-breakfast-like pathway rather than a normal whole-home vacation rental—and, if
> so, must the owner or manager remain in residence and may only part of the dwelling be
> rented?

## 15. Implementation gate and disposition

The stop condition is met: the residential accessory/private-residence pathway cannot be
confidently translated into the resident's ordinary STR question without planner
clarification, and T zoning requires facts Groundrule does not possess. Therefore:

- no React, adapter, evaluator, property, or theme changes;
- no production rule changes;
- no structured rule version changes;
- no migration;
- no citywide “where allowed” copy;
- the canonical result and jurisdiction/address handoff remain unchanged.

The existing implementation is not materially wrong for its published scope. The prior
research correctly identified the express routes and correctly withheld results outside
LMDR. This audit adds the missing reconciliation: the route is accommodation-specific,
accessory, conditional, and not equivalent on the available evidence to an ordinary
whole-home residential STR.

## 16. Remaining uncertainty and next gate

Before a broader rule version is designed, obtain Abi's answer, preserve it as planner
provenance, and confirm online that the official code still matches Supplement 55. Then
decide whether the four residential routes should yield **REQUIRES APPROVAL** for a
bed-and-breakfast-like fact pattern or whether the normal whole-home question should
yield **NOT ALLOWED** with a narrowly disclosed alternative. T and other nonresidential
districts still require additional authoritative property and approval facts.

**SUPABASE ACTION REQUIRED: NO.** No migration was created and no remote rule operation
is implied.
