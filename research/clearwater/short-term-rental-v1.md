# Clearwater Short-term Rental Property Guide V1

## 1. Controlling legal framework

The Clearwater Community Development Code (CDC) regulates the resident's question as an **overnight accommodations use**, not as a platform-specific “Airbnb” use. Section 8-102 supplies the duration-based classification; Article 2 then identifies permitted uses and approval levels district by district. Section 3-919 supplies evidence the City may use to establish a sub-month rental use in a residential zoning district. A use that is absent from a district's permitted-use tables is not an ordinary permitted use.

This makes land-use eligibility distinct from state public-lodging/tax classification and from Clearwater's requirements for longer-term residential rentals. Florida law can constrain local vacation-rental regulation and protect a lawfully established use, but it does not turn an unapproved LMDR use into an ordinary permitted use.

## 2. Definition

CDC § 8-102 defines **overnight accommodations** as one or more units occupied, offered, or advertised for a term of **less than 31 days or one calendar month, whichever is less**. Ownership form, consideration, and the occupant's direct or indirect ownership interest do not change that classification. CDC § 3-919 uses the same duration and lists state registration, vacation-rental advertising, sub-month booking instruments, and agents as prima facie evidence.

## 3. Zoning-district audit

The current codified Article 2 material identifies 15 base districts. “Allowed” below means a land-use pathway exists, not that a resident can begin operating without approval.

| District | Broad type | Ordinary result | Material conditions/source |
|---|---|---|---|
| LDR | Residential | Conditional approval pathway | Level Two; accessory to principal private residence, ≤4 units, arterial frontage and site conditions; §§ 2-104.B, 4-401 |
| LMDR | Residential | Not permitted | Overnight accommodations omitted from §§ 2-202–2-204 permitted-use tables |
| MDR | Residential | Conditional approval pathway | Level Two; accessory private residence, ≤6 units, frontage/corner and site conditions; § 2-304.E |
| MHDR | Residential | Conditional approval pathway | Level One flexible standard and conditions; § 2-403.F |
| HDR | Residential | Conditional approval pathway | Listed flexible use with district conditions; §§ 2-503.F, 2-504.D |
| MHP | Residential | Not an ordinary permitted use | Overnight accommodations absent from §§ 2-602–2-603 |
| C | Nonresidential | Conditional approval pathway | Listed in flexible standards/development; §§ 2-703.P, 2-704.P |
| T | Nonresidential | Conditional approval pathway | Principal district use with density, design, coastal and approval constraints; §§ 2-802.N, 2-803.K |
| D | Form/plan district | Plan/subdistrict confirmation | Appendix C regulates hotel/overnight-accommodation intensity by character district |
| O | Nonresidential | Conditional approval pathway | § 2-1004 overnight-accommodation pathway; frontage/design and plan compatibility matter |
| US 19 | Form/plan district | Plan/subdistrict confirmation | Appendix B subdistrict and frontage standards control; zoning label alone is insufficient |
| I | Nonresidential | No ordinary pathway identified | Overnight accommodations absent from ordinary Institutional uses; §§ 2-1202–2-1204 |
| IRT | Nonresidential | Conditional approval pathway | § 2-1304.F; adjacency, arterial access, coastal and future-land-use constraints |
| OSR | Open space/recreation | No ordinary pathway identified | §§ 2-1402–2-1404 |
| P | Preservation | No ordinary pathway identified | §§ 2-1502–2-1503 |

Neighborhood Conservation District designation is not a sixteenth base zoning district; where an overnight-accommodation pathway exists, it can change dimensional compatibility criteria. The audit does **not** support “all residential = no”: LDR, MDR, MHDR, and HDR expressly provide pathways, while LMDR and MHP do not.

## 4. Meaningful regulatory profiles

The 15 granular districts collapse into five useful profiles: (1) no ordinary permitted-use pathway, (2) residential accessory/private-residence pathway, (3) nonresidential overnight-accommodation pathway, (4) tourism/hotel-intensity pathway, and (5) plan/subdistrict confirmation (Downtown and US 19). V1 publishes only profile 1 as applied to **LMDR**, because it is the deterministic profile needed by the trusted pilot property. Other profiles need more than a zoning code before Groundrule can responsibly say “allowed.”

## 5. Minimum property facts and data audit

| Fact | Need | Availability classification |
|---|---|---|
| Confirmed City of Clearwater jurisdiction | Always; admission gate | **A — already trusted** |
| Normalized base zoning district | Selects rule profile | **A — already trusted** |
| Existing lawful overnight-accommodation approval/nonconforming status | Possible exception to an ordinary prohibition | **D — requires new authoritative approval/history data** |
| Principal private-residence use | Required for residential pathways outside LMDR | **D — requires new authoritative/current-use or approval data** |
| Arterial/corner frontage, unit count, site criteria | Required for residential approval pathways | **B/C/D depending fact; not promoted and not needed for LMDR V1** |
| Future land use, coastal storm area, subdistrict/designation | Required in several nonresidential/plan pathways | **B or D; not in the canonical profile today** |
| Owner occupancy | Not a standalone LMDR STR control | Not required for the LMDR answer |
| Dwelling/condominium type | Private restrictions may matter, but do not change the LMDR City use table | Not required for the LMDR answer |

No new GIS fact is justified for the limited LMDR rule. `property.zoning_district` is already promoted only from CLEAN profiles. Citywide “allowed” answers will require targeted authoritative data/approval integration; Groundrule must not infer those facts from a listing or ask an opening questionnaire.

## 6. Canonical property: 1950 Drew Plz

The existing CLEAN profile establishes City of Clearwater jurisdiction and LMDR zoning. Those facts are sufficient for the ordinary land-use result because overnight accommodations do not appear in any LMDR permitted-use tier. Result: **NOT ALLOWED**. The exact primary explanation is: **“Your property is zoned LMDR. Short-term rentals are not permitted in this zoning district.”**

This is an ordinary current-use answer, not an adjudication that no historic development order or lawful nonconformity exists. A claimant with documented prior City approval needs City confirmation.

## 7. Logic, exceptions, and safe unknowns

1. Stop unless the trusted jurisdiction gate returns Clearwater.
2. For CLEAN `LMDR`, match the structured prohibition.
3. For every other zoning value in V1, return **NEEDS CONFIRMATION — Groundrule can’t confirm this property yet.** Never substitute a generic residential conclusion.
4. A documented lawful existing overnight-accommodation approval/nonconformity is the one high-value specific situation, but V1 does not possess that property fact and therefore does not display an invented exception card.

## 8. Operating requirements are separate

Eligibility comes first. The City code's residential-rental business-tax and inspection division expressly excludes hotels, motels, resort condominiums, transient apartments, resort dwellings, and bed-and-breakfast inns (§ 3-2301), so it must not be presented as a generic STR checklist. Where an overnight-accommodation use is approved, state public-lodging licensing and tax classification, City development approval, parking/site standards, and private condominium/HOA restrictions may independently apply. V1 intentionally does not show these after an LMDR prohibition.

## 9. Jurisdiction and state constraints

A Clearwater postal address is not jurisdiction evidence. Unincorporated Pinellas County and other municipalities are blocked before rule loading. Florida Statutes §§ 509.242 and 509.032 govern public-lodging classifications and local preemption/grandfathering issues; § 212.03 governs transient-rental tax. These are external constraints, not substitutes for Clearwater's district use authorization.

## 10. Rule architecture and provenance

The forward migration creates project type `short_term_rental`, limited rule set `clearwater_short_term_rental_v1`, and rule `eligibility.lmdr_prohibition` version 1. Its authoritative applicability input is `property.zoning_district`; its structured outcome is `prohibition`; its primary citation is CDC §§ 2-202–2-204 and its definition citation is CDC § 8-102. Children are validated before publication and activation.

Primary sources: [Clearwater Community Development Code](https://library.municode.com/fl/clearwater/codes/community_development_code), [Florida Statutes Chapter 509](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0509/0509.html), and [Florida Statutes § 212.03](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0212/Sections/0212.03.html). The repository's committed codified text was used to reconstruct and cross-check the district tables.

## 11. Address-specific value and coverage

**Yes, STR guidance benefits materially from address-specific evaluation.** LMDR differs from LDR/MDR/MHDR/HDR, and the latter pathways depend on additional parcel facts. The address lookup keeps residents from needing to identify zoning themselves while the evaluator safely consolidates a shared semantic profile.

Clearwater-wide coverage requires authoritative promotion of future land use and relevant overlay/subdistrict facts, plus a reliable way to determine existing approved use/development orders, private-residence status, frontage/site criteria, and lawful nonconforming status. Until then, those parcels stay unknown rather than receiving a manufactured permission.

## 12. Unresolved questions

- The authoritative system of record and ingestion method for historic/current development approvals and lawful nonconformities.
- Which committed GIS layers can authoritatively supply coastal, Downtown/US 19 subdistrict, frontage, and future-land-use facts after field-level provenance review.
- The exact operating workflow for each approved overnight-accommodation class; this is deliberately outside the V1 land-use answer.

The canonical LMDR answer is deterministic and resident-reviewable; broader districts remain intentionally unsupported and safe.

CLEARWATER SHORT-TERM RENTAL V1 READY FOR RESIDENT REVIEW
