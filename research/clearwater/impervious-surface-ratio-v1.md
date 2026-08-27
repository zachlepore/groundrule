# Clearwater impervious surface ratio V1

## Finding and authoritative definition

Clearwater uses **maximum impervious surface ratio (ISR)** as a development-potential standard. Community Development Code (CDC) § 8-102 defines *impervious* as a surface compacted or covered so that it is highly resistant to water infiltration, including compacted sand, limerock, shell or clay and most conventionally surfaced streets, roofs, sidewalks, parking lots, and similar structures. It defines ISR as total impervious surface area on a site divided by gross land area. The Guide paraphrases this authority; it does not independently classify pools, decks, patios, or pavers.

## Controlling framework: zoning and Future Land Use

Zoning does not ordinarily supply a single citywide number by itself. Each Article 2 zoning division says development potential is determined by both the CDC standards and the property's **Countywide Future Land Use (FLU) designation**, then tabulates maximum ISR by FLU. Use type can also matter: Tourist and some plan districts distinguish accommodation, residential, and nonresidential development. Special-area plans can replace ordinary tables. Thus citywide evaluation generally needs jurisdiction + zoning + authoritative FLU, and sometimes use/approved-plan geography.

LMDR is a useful, narrow exception: § 2-201.1 lists Residential Low and Residential Urban, and both have maximum ISR **.65**. Therefore a trusted LMDR fact deterministically collapses both possible FLU branches without inferring which FLU applies.

## Regulatory variability audit

The committed CDC text contains eight genuinely different numeric maxima: **.20, .60, .65, .75, .80, .85, .90, and .95**. These are profiles, not zoning aliases. Ordinary examples include LDR (.60/.65 by FLU), LMDR (.65), MHDR (.75/.85), HDR (.85/.95), MHP (.75), Commercial (.80/.85/.90/.95), Office (.75/.85), IRT (.85/.95), and OSR (.60). Downtown, US 19, Tourist/special-area-plan, preservation and other plan-governed contexts require their applicable tables or approved plans. Identical values should be consolidated while retaining exact zoning, FLU, use, and plan facts.

| Classification | Maximum ISR | Conditions | Authority |
|---|---:|---|---|
| LMDR | .65 | Residential Low or Residential Urban FLU | CDC § 2-201.1 |
| Other ordinary zoning/FLU pairs | .60–.95 | Exact zoning + FLU; sometimes use | CDC Article 2 maximum-development-potential tables |
| Plan/special contexts | varies, including .20 | Applicable plan, location and/or approval | CDC plan-district provisions and approved plans |

Alternative development pathways can change intensity in Tourist and plan-governed areas; a lawful nonconforming or previously approved site also needs City review. These are not encoded as generic exceptions in this limited package.

## Property facts and data audit

| Required fact | Availability | V1 treatment |
|---|---|---|
| Clearwater jurisdiction | **A — already trusted** | Mandatory admission gate |
| Zoning district | **A — already trusted** | LMDR selects the supported profile |
| Countywide FLU | **D — requires new authoritative data** citywide | Not in committed GIS; not inferred or promoted |
| Use class / special-area-plan geography | **D/E** where a table distinguishes it | Needs authoritative datasets/approval records |

Committed GIS contains authoritative addresses, parcels, zoning, and municipality provenance, but no FLU layer. Citywide coverage requires ingesting the authoritative Clearwater/Pinellas Countywide FLU polygons, recording retrieval/checksum metadata, spatially joining parcels with ambiguity QC, and promoting only a normalized trusted FLU fact. Special-area-plan boundaries and controlling development approvals require a separate targeted audit.

## Canonical property: 1950 Drew Plz

The committed authoritative pilot profile resolves **1950 DREW PLZ → CLEAN parcel → Clearwater jurisdiction → LMDR zoning**. No FLU is present. Those facts are nevertheless sufficient because every FLU designation permitted in the LMDR maximum-potential table has the same .65 maximum. The applicable result is **maximum ISR 65%**.

Resident wording:

> **Impervious surface ratio**  
> **Maximum allowed**  
> **65%**  
> Your property allows an impervious surface ratio of up to 65%. This limits the share of the site covered by surfaces that resist water infiltration.

Secondary scope wording:

> This is the maximum applicable ratio. Groundrule does not calculate your property's existing impervious coverage or remaining capacity.

## Address-specific value and limits

Address-specific evaluation is justified because an address resolves the authoritative parcel, Clearwater jurisdiction gate, and zoning; citywide it must also resolve FLU and sometimes a special plan/use branch. Categories often collapse to the same numeric profile, but the property facts must remain granular. V1 supports the Clearwater LMDR pilot and safely returns **Needs confirmation** elsewhere.

The Guide does **not** calculate existing ISR, impervious square footage, allowable square footage, remaining capacity, or project feasibility; multiply parcel area; inspect aerials or footprints; survey conditions; or ask a questionnaire. It gives only the regulatory maximum selected from structured outcomes.

## Provenance, unresolved work, and recommendation

Primary authority is the committed Clearwater Community Development Code, Supplement No. 54, especially §§ 2-201.1 and 8-102, with official online access at https://library.municode.com/fl/clearwater/codes/community_development_code. Property provenance is recorded in `research/gis/data/clearwater-residential-pilot-v2/source-metadata.json` and the canonical profile. The forward-only migration publishes one limited LMDR rule with a structured `maximum` outcome and definition/primary citations.

Unresolved: authoritative FLU ingestion, normalization of all zoning/FLU combinations against current Countywide Plan Rules, special-area-plan boundaries and approvals, and nonconforming sites. Recommendation: resident-review the deterministic LMDR pilot, retain safe unknown elsewhere, and do not describe it as citywide coverage until those datasets are ingested and audited.

CLEARWATER IMPERVIOUS SURFACE RATIO V1 READY FOR RESIDENT REVIEW
