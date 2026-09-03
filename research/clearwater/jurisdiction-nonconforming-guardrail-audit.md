# Clearwater jurisdiction and nonconforming-property guardrail audit

**Audit date:** 2026-09-03  
**Decision:** research/design only; **stop before production changes**  
**Data vintage inspected:** committed Pinellas/City snapshots retrieved 2026-08-23; committed Clearwater Code text, Supplement No. 55 (individual article pages carry earlier supplement markers)

## Executive answer

Groundrule currently knows that a pilot property is governed by Clearwater only when a preprocessed Pinellas County Enterprise GIS **site-address** record supplies `MUNICIPALITY = CLEARWATER`, the resulting property is `clean`, and the stored `jurisdiction_key` is `clearwater`. Mailing-city text is not evidence. The shared runtime gate rejects every other key and any REVIEW profile. This is safe against known non-Clearwater, unknown, and ambiguous stored facts, but it is a **single-source confirmation**, not the two-source verification Clearwater staff describe.

The City’s pool page says staff/applicants should check PCPAO Parcel Summary → Current Tax District and treats `Clearwater`, `CW`, `CWD`, and `CWDO` as in-city results. This audit could not verify an official structured PCPAO field contract, codebook, refresh promise, or the meanings of the suffixes. It therefore does not ingest or interpret that field. Nor can the current trusted profile establish lawful nonconformity. When documentary evidence of a special approval/nonconformity exists, a future evidence-based guardrail should stop only affected ordinary answers and refer the resident to Clearwater; generic inability to prove the absence of historic approvals must not block everyone.

## 1. Current Groundrule architecture and source inventory

### Periodic pipeline

1. `scripts/gis/clearwater-pilot.mjs` requests ArcGIS layer metadata, validates geometry and requested field names, pages GeoJSON, hashes each snapshot, and preprocesses locally.
2. **Pinellas County Enterprise GIS `PublicWebGIS/Parcels/MapServer/0` (site-address points)** supplies `OBJECTID`, `PIN_NUM`, `SITEADDID`, `ADDPTKEY`, `FULLADDR`, `MUNICIPALITY`, `POSTCODE`, and `STATUS`. The controlling jurisdiction field is `MUNICIPALITY`.
3. **The same service, layer 1 (parcel polygons)** supplies `PARCELID`, `STRAP`, `SITE_ADDRESS`, `SITE_CITY`, `SITE_STATE`, `SITE_ZIP`, and `LAND_USE_CODE`. It links/locates property but none of its address fields establishes jurisdiction.
4. **City of Clearwater `Zoning_WGS84/MapServer/1`** supplies `ZONING`, `ZONING_DESC`, and `SPECIAL`. It establishes zoning coverage, not municipal incorporation.
5. No PCPAO endpoint, Current Tax District field, countywide municipal-boundary snapshot, or annexation-history source is present in production ingestion. A conservative boundary classifier exists in code and fixtures, but the committed v2 pilot resolved all parcels from `MUNICIPALITY`; geometry fallback count is zero.

Source metadata, query URLs, hashes, retrieval timestamps, requested fields, geometry contracts, and counts are committed in `research/gis/data/clearwater-residential-pilot-v2/source-metadata.json`.

### Ingest classification and CLEAN / REVIEW

`normalizeMunicipality` explicitly maps `CLEARWATER` → `clearwater`, `UNINCORPORATED` → `unincorporated_pinellas`, and a closed list of other incorporated Pinellas names → `other_pinellas_municipality`. An unsupported nonblank value throws. At parcel level, agreeing nonblank address values confirm the mapped result; disagreement or a mixture of blank/nonblank becomes `ambiguous`; no evidence becomes geometry fallback if supplied, otherwise `unknown`. A geometry result that touches/crosses authority boundaries or lacks exactly one authority is not confirmed.

Zoning validation separately produces `clean` or `review`. REVIEW profiles remain in research artifacts but are deliberately excluded from the production seed and narrow lookup. Thus CLEAN means the imported profile passed the existing property/zoning validation; it is not proof of conformity and, by itself, does not prove jurisdiction.

### Canonical profile and runtime

The `properties` table stores `jurisdiction_key`, `jurisdiction_authority_name`, `jurisdiction_source`, `jurisdiction_source_updated_at`, and `jurisdiction_derived_at`. The lookup RPC returns exactly one active CLEAN address match, and `StoredPropertyProfile.jurisdiction` preserves those values. `requireClearwaterProperty` delegates to the single shared gate. Admission requires both `validationStatus === "clean"` and `normalizedKey === "clearwater"`.

| Stored situation | Runtime result |
|---|---|
| CLEAN + Clearwater | Eligible; only then are property facts evaluated under Clearwater rules |
| Other Pinellas municipality | Blocked as `outside`; authority name may be shown |
| Unincorporated Pinellas | Blocked as `outside`; County may be named |
| Unknown | Blocked as `unconfirmed` |
| Ambiguous/conflicting | Blocked as `unconfirmed` |
| Any REVIEW profile | Not returned by production lookup; the lower-level gate also refuses it |

Fence, Shed, Setbacks, Short-term rental, Impervious surface ratio, and Pool server actions all execute `findPropertyByAddress` → `requireClearwaterProperty(property)` → `propertyProfileToFacts` → evaluator. Direct guide deep links use those server actions; the shared resident shell renders the block rather than a guide result. The generic evaluator remains intentionally ungated infrastructure and must not be exposed as a Clearwater resident lookup by itself.

`FULLADDR`, `SITE_CITY`, and `POSTCODE` are never consulted by the classifier or gate. The lookup’s `jurisdiction_slug` scopes a trusted dataset; it does not convert the submitted mailing city into jurisdiction evidence.

## 2. Pinellas `MUNICIPALITY` assessment

The committed service contract demonstrates that `MUNICIPALITY` is a county-published site-address attribute and that values can distinguish Clearwater, named municipalities, and `UNINCORPORATED`. It is materially more appropriate than postal city. It is address-point data, however—not a parcel tax-jurisdiction field or a legal boundary adjudication. Multiple address points on one parcel can conflict, annexation updates can lag, and boundary parcels require escalation. The ingest already fails safely for missing/conflicting point values.

The available evidence does **not** establish who authors this field, whether it is derived from PCPAO, whether both derive from the same boundary maintenance, or a contractual update cadence. It should remain a useful primary input for the existing pilot, but Groundrule should not represent it as independent confirmation by PCPAO or by municipal polygons.

## 3. PCPAO Current Tax District research

### What is established

The official Clearwater residential in-ground pool/spa/enclosure checklist directs an applicant to the Pinellas County Property Appraiser, property search, Parcel Summary, and **Current Tax District**. It expressly says `Clearwater`, `CW`, `CWD`, and `CWDO` indicate a property is in the City of Clearwater. That is authoritative **City operational guidance** for using the displayed PCPAO result as a current-incorporation check.

“Current Tax District” is, at minimum, PCPAO’s current parcel-summary tax-district designation. It is not the mailing city. The City’s exact-value instruction supports treating those four complete display values as positive Clearwater evidence in that workflow. It does **not** establish that every string beginning with `CW` is Clearwater, decode `D`/`DO`, establish historical status, or prove the field is legally dispositive for every regulatory purpose.

### What was not established

During this audit, the City and PCPAO consumer pages returned HTTP 403 to command-line retrieval, and internet search tooling was unavailable. No official downloadable/API/GIS metadata was obtained that names a Current Tax District field, gives a code domain, documents `CW`/`CWD`/`CWDO`, identifies ownership/derivation, promises an update frequency, or grants automated-use terms. The existing parcel layer metadata committed in the repo does not include it. Consequently:

* no PCPAO scraping or live dependency is justified;
* the suffix meanings remain **unverified** and must not be invented;
* no claim of independence from `MUNICIPALITY` can be made;
* no prefix matching is safe—special taxing/service districts could otherwise be confused with municipal incorporation;
* tax district cannot yet be promoted into the canonical profile; and
* current status does not expose annexation date, prior jurisdiction, agreement terms, or vested approvals.

A structured annual tax-roll/download may exist, but existence, exact field semantics, join key, licensing, and cadence require PCPAO confirmation before engineering. If verified, obtain it periodically, preserve raw code plus source vintage, join by parcel identifier, and never call PCPAO during a resident request.

## 4. Unincorporated Pinellas and municipal geometry

The site-address domain explicitly supports `UNINCORPORATED`, and the runtime translates it to a blocked County result. This is the current authoritative negative pathway. Pinellas Enterprise GIS likely maintains jurisdiction/boundary information, and Groundrule already has a conservative polygon classifier, but this audit did not verify and snapshot an official municipal-boundary layer contract. Therefore geometry remains a proposed QC/fallback—not evidence currently used for the pilot.

A useful boundary dataset must cover both incorporated polygons and the residual unincorporated area (or permit a rigorously defined county-minus-municipalities computation), carry a publisher/update timestamp, and have documented annexation maintenance. A point/centroid-only test is insufficient at borders; any crossing, touching, gap, overlap, or disagreement must become review.

## 5. Recommended jurisdiction source hierarchy

This is a staged recommendation, not an implemented hierarchy:

1. **Primary candidate after verification:** PCPAO structured parcel Current Tax District, using an official complete-value codebook and parcel join. Clearwater’s own instructions make it the best candidate for current-incorporation confirmation, but it remains gated on source verification.
2. **Required QC:** Pinellas site-address `MUNICIPALITY`, aggregated across all address points for the parcel.
3. **Geometry QC/fallback after verification:** authoritative current municipal-boundary polygons, tested conservatively against parcel geometry.
4. **Manual review:** any source conflict, missing/stale source, boundary-touch/crossing, unsupported raw code, unmatched parcel, or annexation in flight.

Do not silently “vote” two sources against one. Two agreeing sources may confirm. A single verified primary may provisionally confirm only under a documented freshness policy. Any authoritative conflict must yield jurisdiction review. Annexations should propagate on the next atomic ingest only after current effective status agrees; an application or Agreement to Annex is not incorporation.

## 6. Pilot comparison

The current committed data—not remembered approximations—contains:

| Measure | Count |
|---|---:|
| Authoritative site-address records | 126 |
| Parcel features fetched | 123 |
| Unique parcels represented by addresses | 114 |
| CLEAN address profiles | 110 |
| CLEAN stored parcels | 106 |
| REVIEW address profiles | 16 |
| REVIEW parcels | 8 |

All 126 site-address records have raw `MUNICIPALITY = CLEARWATER`; all address points agree within their 114 represented parcels. Results are 114 Clearwater, 0 unincorporated, 0 another municipality, 0 unknown, 0 ambiguous, and 0 geometry fallbacks. The 16 REVIEW profiles arise from zoning validation (15 ambiguous-zoning issues and one unsupported zoning code), not jurisdiction disagreement, and remain unchanged.

**Cross-source result:** no structured PCPAO Current Tax District or verified municipal-boundary snapshot was available, so zero pilot parcels could be independently compared. It would be false to label the 114 same-source classifications “agreements with PCPAO.” Accordingly, PCPAO agreements, disagreements, and missing counts are all **not measured**, not zero. There are no unincorporated or other-municipality examples in this geographically compact pilot.

Canonical parcel `122915557820250300`, 1950 DREW PLZ, has a committed Clearwater municipality value and CLEAN LMDR profile, so it remains eligible under current behavior. This audit did not independently PCPAO-verify it.

## 7. Annexation findings

Clearwater Community Development Code § 4-604 makes annexation a City Council process and distinguishes a petition and an agreement to annex from an effective annexation. The City considers land-use/zoning changes and existing development; applicable impact fees must be paid before annexation is effective. Code § 1-104.C says annexed property is rezoned by City ordinance to the closest related County zoning classification as determined by the coordinator, and the City zoning atlas is amended.

These provisions support four separations:

* current incorporated jurisdiction is not a mailing address;
* an Agreement to Annex is not current incorporation;
* prior County jurisdiction does not itself prove a nonconformity or vested exception; and
* an annexation/effective-date record does not reveal all development orders, agreement terms, lawful conditions, or staff determinations.

No trustworthy structured annexation-history feed was verified. Current incorporation can eventually be known from refreshed jurisdiction sources; annexation date, ordinance, agreement, and continuing rights require ordinance/document research. Annexation by itself must never trigger “grandfathered.”

## 8. Nonconforming-property authority

The controlling current-code concepts are specific rather than a generic grandfather flag:

* **§ 6-101:** lots, structures, uses, and characteristics lawfully existing before changed standards can be nonconforming; the Code permits continuation but seeks compliance with changes of use/redevelopment/change of condition.
* **§ 6-102 (structures):** normal repair/maintenance is allowed, but subsection B requires full compliance when repair of a nonconforming structure or improvement exceeds 50% of the entire structure’s **assessed value**. Subsection D separately addresses destruction/damage below versus at least 50%, uses official tax assessment rolls, requires the building official to determine the repair-cost ratio, and contains timing/conformity consequences. Alteration may not increase the nonconformity. A specific affordable-housing approval exemption exists.
* **§ 6-103 (uses):** expansion/movement/change and 180-day discontinuance are constrained. Damage below versus at least 50% of assessed structure value affects whether a nonconforming use may be re-established; fixtures/inventory have another damage threshold. A detached owner-occupied dwelling exception is specific.
* **§ 6-106 (lots):** a residential lot of record legally existing before 1999 may have a Level One pathway, subject to proof of lawful creation, ownership/development history, and other standards. No permit issues for an unlawfully created lot.
* **§ 6-107:** nonconforming accessory uses/structures have their own termination and principal-project triggers.
* **§ 6-108/6-109:** access features and formal termination of nonconformity have distinct events and approvals.

A current setback mismatch, unusual geometry, zoning change, apparent age, imagery, or annexation is not proof that the condition was lawful when created or that it remains protected.

### The “50%” reconciliation

Abi’s shorthand most closely resembles **Article 6 § 6-102.B**, because it speaks of a nonconforming structure becoming fully compliant when repair exceeds 50% of assessed value. But it is unsafe as a generic “upgrades reach 50% of tax valuation” rule:

1. § 6-102.B concerns an already nonconforming structure/improvement and assessed value from official rolls.
2. § 6-102.D separately governs destruction/damage and a building-official cost determination.
3. § 6-103 has separate thresholds for structures containing nonconforming uses and for damaged fixtures/inventory.
4. **Floodplain** substantial-improvement rules are different: Code § 8-102 and Chapters 47/51 use cumulative improvement/repair cost against 50% of **market value**, with location/time-window rules (including Clearwater Beach/Sand Key and other special-flood-hazard areas). Chapter 51 assigns the determination to floodplain/building officials and excludes land, site improvements, and accessory buildings from the building market value.

Therefore no 50% rule is encoded. Abi should confirm the intended article, the type of nonconformity, whether “repair” includes the described upgrade, valuation basis, cumulative period, current amendments, and responsible official. Floodplain and Article 6 thresholds must remain separate.

## 9. What Groundrule can and cannot know

| Potential fact | Availability class | Safe conclusion |
|---|---|---|
| Current stored jurisdiction from site-address `MUNICIPALITY` | **A** already trusted | Current single-source jurisdiction classification, subject to freshness/conflict safeguards |
| CLEAN/REVIEW and normalized zoning | **A** | Data-quality/zoning eligibility only; not conformity |
| Parcel geometry/address-point identifiers | **A** research pipeline | Join/QC evidence; not legal conformity |
| PCPAO Current Tax District | **B only if** structured source and semantics are verified | Candidate current-incorporation source; presently unavailable to Groundrule |
| Current municipal boundary | **B only if** authoritative layer is verified/ingested | Geometry QC/fallback; border conflicts require review |
| Flood hazard location | **B** from authoritative FEMA/City data, not currently trusted profile | Can trigger flood review, not decide substantial improvement |
| Annexation effective date/ordinance | **B/C** depending records | Historical fact only; not grandfathering |
| Agreement terms, development orders, variances, site plans, permits | **C** documents/permit history | Evidence for review after authenticated/manual matching |
| Lawfulness when condition arose; abandonment; scope of vested rights | **C/D** documents plus City judgment | Cannot be inferred automatically |
| Repair cost, assessed/market-value basis, cumulative permit history, official threshold determination | **C/D** | Project-specific official determination |
| Apparent setback/use/age from GIS or imagery | **E** unsafe inference | Never label nonconforming from this alone |

Establishing a nonconforming lot requires lawful lot creation/record date plus ownership and development history. A structure requires applicable historical rules, lawful permits/approvals, as-built facts, and continuity. A use requires lawful establishment and continuity/abandonment evidence. Historic approval requires the actual recorded development order/permit and its continuing terms. Annexation requires an effective ordinance/date; continuing treatment requires the agreement/order and City interpretation.

## 10. Proposed independent trust states

Do not merge jurisdiction and regulatory history.

### Jurisdiction trust

* `clearwater_confirmed`: fresh, supported Clearwater facts agree; ordinary evaluation may proceed.
* `not_clearwater`: an authoritative current fact identifies County or another municipality; never run Clearwater rules.
* `jurisdiction_review`: missing, stale, unsupported, boundary-ambiguous, or conflicting facts; never run Clearwater rules.

The existing keys already express these behaviors (`clearwater`, two outside categories, `unknown`, `ambiguous`). The smallest future change is better source provenance/conflict handling, not a replacement boolean.

### Regulatory-conformity trust

* `no_special_condition_identified` (default operational state): no evidence-based trigger is present; ordinary rules may run, without claiming the property is legally conforming.
* `special_condition_review`: a matched authoritative record/document or staff marker identifies a potentially answer-relevant nonconformity, vested approval, development order, annexation term, or substantial-improvement determination; suppress only affected confident results and refer to the City.

Do **not** create `ordinary_rules_applicable` as a legal conclusion, and do not block on generic `unknown`. Store trigger type, source/document identifier, affected guide/scope, effective/status dates, review date, and provenance. Never allow freeform suspicion or imagery to activate it.

## 11. Resident behavior

Warnings appear only after a relevant gate triggers:

* **Known outside Clearwater:** “This property is not within the City of Clearwater. Clearwater’s property rules don’t apply.” Add “Contact Pinellas County” or the named municipality only when the authority is deterministically known.
* **Uncertain/conflicting jurisdiction:** “We couldn’t confidently confirm which local government regulates this property. We won’t apply Clearwater rules. Check the PCPAO Current Tax District or contact Clearwater Planning & Development.” Do not show an ordinary guide result.
* **Evidence-based special history:** “This property may have an existing approval or condition that changes the standard rules. Contact Clearwater before relying on an ordinary result.” Explain the narrow evidence and affected topic without declaring the property illegal or using “grandfathered” as a conclusion.
* **Normal property:** no omnibus nonconformity disclaimer and no warning merely because Groundrule lacks complete historical proof.

## 12. Smallest safe implementation recommendation

**Now:** retain production behavior and commit this audit only. This follows the hard-stop conditions: the PCPAO structured source/semantics and independence are unverified, municipal polygons are not verified/ingested, pilot comparison cannot be performed, and nonconformity cannot be derived from trusted profile facts. No Guide rules, schema, migration, CLEAN/REVIEW classifications, or runtime behavior change.

**Next, in order:** (1) obtain PCPAO’s official machine-readable data dictionary, complete tax-district domain, update schedule, reuse terms, and parcel join; (2) obtain Pinellas municipal-boundary metadata and annexation update process; (3) run countywide cross-source QC, including planner-validated Clearwater-postal/unincorporated and boundary cases; (4) adopt explicit conflict/staleness publication rules; (5) only if an authoritative property-specific special-condition source is found, pilot a scoped evidence flag. Otherwise defer nonconforming automation and keep document/staff escalation.

## 13. Unresolved questions

### For Abi / Clearwater staff

1. Which PCPAO downloadable/API product and exact field backs the displayed Current Tax District?
2. What do `CW`, `CWD`, and `CWDO` expand to, and is the four-value list exhaustive?
3. Are the codes direct incorporation indicators or composite taxing/service districts? What values indicate unincorporated County?
4. Which office owns updates, how soon after an effective annexation do PCPAO and Pinellas `MUNICIPALITY` change, and which controls during lag/conflict?
5. Please provide a verified Clearwater-mailing/unincorporated example and a recent annexation example for QC.
6. Did the 50% comment refer to § 6-102.B repair, § 6-102.D damage, § 6-103 use, floodplain substantial improvement, or another rule? What valuation and cumulative period applied?
7. Where are authoritative active development orders, variances, vested-rights decisions, lawful nonconformity determinations, and annexation agreements indexed?

### Legal/data-rights and engineering

1. May PCPAO bulk data be stored, transformed, and redistributed in a public property profile, and what attribution/refresh terms apply?
2. Is Current Tax District an official jurisdiction determination or operational proxy, and what appeal/correction process governs it?
3. Is Pinellas `MUNICIPALITY` independently maintained, and is an authoritative municipal/unincorporated polygon layer available with history?
4. Which source supplies annexation effective date and supersession/correction history?
5. What documentary event is strong enough to set—and later clear—a special-condition review flag?

## 14. Sources and provenance

Retrieved/inspected **2026-09-03**, unless the committed snapshot date is stated:

* City of Clearwater, “Residential In-Ground Pools/Spas/Enclosures Application Checklists” (Current Tax District instructions): https://www.myclearwater.com/Business-Development/Permitting/05-Residential-In-Ground-PoolsSpas-Enclosures-Application-Checklists (HTTP 403 from this environment; instruction text supplied in the audit request and not independently quoted beyond its stated four values).
* Pinellas County Property Appraiser: https://www.pcpao.gov/ (HTTP 403 from this environment; no consumer-page scraping performed).
* Pinellas County Enterprise GIS, Parcels service: https://egis.pinellas.gov/gis/rest/services/PublicWebGIS/Parcels/MapServer (exact layer/query contracts and 2026-08-23 responses preserved in the committed source metadata and GeoJSON).
* City of Clearwater Community Development Code: https://library.municode.com/fl/clearwater/codes/community_development_code (repo copy inspected: §§ 1-104.C, 4-604, 6-101–6-109, 8-102; no claim that the local copy supersedes later ordinances).
* City of Clearwater Code of Ordinances, flood/building provisions: same official Municode library (repo copy inspected: Chapters 47 and 51, especially § 51.204).

### Audit cautions

This document distinguishes source observation from inference. It does not establish a legal opinion, does not claim PCPAO and Pinellas GIS are independent, does not decode undocumented abbreviations, and does not declare any pilot property conforming. Before implementation, re-check the live official Code and obtain publisher-confirmed structured-source metadata.
