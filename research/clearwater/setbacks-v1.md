# Clearwater Setbacks V1

## Resident question and safe meaning

This workflow answers **“What are my setbacks?”** with the standard minimum zoning setbacks for an LMDR **detached dwelling**. Clearwater defines a setback as the required horizontal distance between a property line and a structure (§ 8-102). The answer is therefore useful for an ordinary house or addition that remains part of the detached dwelling, but it is deliberately not labeled as a universal setback for every possible improvement.

## Authoritative sources

The controlling source is the official *Clearwater Community Development Code* extraction in this repository (Supplement Nos. 52/54), linked in production to the City's Municode publication:

- § 2-202 and Table 2-202, LMDR minimum standard development.
- § 8-102, definitions of setback and front/side/rear setback.
- § 3-903.A, C, D, and H, required setbacks, double-frontage and corner lots, and swimming pools.
- § 3-203.A–B, accessory-structure placement and zoning-district setbacks (already researched for Shed).

The local official extraction was inspected before further source discovery. Internet source search was attempted on 2026-08-27 but the available search service returned HTTP 401, so no secondary source was used to establish a fact.

## LMDR findings and measurement semantics

Table 2-202's **Detached Dwellings** row establishes:

| Setback | Minimum | Measured from/to |
| --- | ---: | --- |
| Front | 25 ft | horizontally from the front property line to the structure |
| Side | 5 ft | horizontally from each side property line to the structure |
| Rear | 10 ft | horizontally from the rear property line to the structure |

These are not generic numbers for all LMDR development. Table 2-202 expressly organizes standards by **use**, and these values are from the detached-dwelling row. Section 3-903.A generally excludes buildings and structures from required zoning-district setbacks, subject to enumerated exceptions.

## Principal versus accessory structures; Shed relationship

For an ordinary principal detached dwelling, Table 2-202 directly controls. An addition that remains part of that dwelling ordinarily must maintain the dwelling setbacks, although Groundrule cannot determine compliance without a survey and plans.

Shed V1 is case **B** from the audit: § 3-203.B independently requires an accessory structure to comply with the applicable zoning-district setbacks, so its evaluated LMDR result happens to use the same 25/5/10 values. The Setbacks workflow did not treat Shed's presentation as authority. It reused the existing § 2-202 source provision, while a separate Setbacks rule states the table's detached-dwelling meaning and adds § 8-102 measurement provenance. This is small duplication at the workflow rule-package boundary, necessary because rule sets are evaluated by project type.

Pools are not governed merely by the detached-dwelling table row: § 3-903.H says swimming pools and screened pool enclosures comply with the applicable district setbacks for the principal use unless district flexibility applies. Other improvements can have separate standards and exceptions.

## Corner and multiple frontages

Section 3-903.D gives a corner lot two front setbacks and two side setbacks. Section 3-903.C permits a narrower double-frontage treatment only for a platted lot with a deed or plat access restriction: the nonaddressed street portion may use the rear setback. Existing trusted property facts do not establish corner status, number of frontages, or the required recorded restriction. V1 therefore gives one conditional Specific Situation and asks no questionnaire.

## Specific Situations included

1. **Corner or multiple-street lots** — explains the verified classification consequence and recommends City confirmation rather than inventing a lot type.
2. **Some improvements have different rules** — prevents residents from applying dwelling values universally to sheds, pools, or other work.
3. **Waterfront lots** — warns that the ordinary ten-foot rear value is not the waterfront answer. Table 2-202 footnote 1 generally identifies 25 feet for waterfront detached dwellings, with adjacent-structure and Building Code/seawall conditions.

Easements, visibility areas, and nonconformities were not promoted into the short guide: they matter to final placement or existing legality, but do not change the ordinary zoning-only answer with facts Groundrule currently trusts.

## Incidental pool finding

Section 3-903.H authoritatively establishes that swimming pools **and screened pool enclosures** follow the applicable principal-use district setbacks unless flexibility applies. The reviewed code text did not establish that the relevant measurement is specifically to the pool deck, and a screened enclosure is not necessarily the same thing as a deck. The planner statement “to the pool deck” therefore remains a lead for a future Pool workflow, not a production Setbacks rule. The exact next Pool research task is to obtain the City provision or formal interpretation defining whether pool setback is measured to water, pool shell, deck, or enclosure.

## Property facts, GIS, and gaps

Only trusted clean-profile jurisdiction and normalized zoning are required for the ordinary answer. For 1950 DREW PLZ they remain Clearwater and `lmdr`. No GIS data, property columns, or inferred frontage/waterfront/easement/nonconformity facts were added.

A later targeted enrichment could add authoritative waterfront and lot-frontage classification, but neither is necessary to answer the common LMDR question safely. Surveyed property-line and structure locations would be needed to assess a proposed placement; that is intentionally outside Groundrule.

## Rule architecture and reuse assessment

A forward-only migration adds a `setbacks` project type and an independent `clearwater_setbacks_v1` package. It reuses the existing § 2-202 provision and adds § 8-102/§ 3-903 provisions. One structured outcome contains front, side, rear, measurement reference, endpoint, and applicability; React contains no regulatory distance constants. Unsupported zoning matches no primary rule and the workflow escalates rather than substituting Clearwater defaults.

Unchanged reuse includes trusted address lookup, CLEAN validation, Clearwater jurisdiction gate, zoning fact adapter, rule loader, deterministic evaluator, citations, answer-card styles, trust strip, Specific Situations style, project selector pattern, and neutral route handoff. Workflow-specific code is limited to action, guide adapter, route composition, rules, research, and tests.

Three workflows now clearly duplicate `Source`, answer cards, Specific Situations, address/project stages, and route-handoff state. A shared typed resident-guide shell is justified as a future small refactor, but was not mixed into this regulatory feature because current title/content shapes differ and a rushed abstraction would obscure safe-failure behavior.

## Canonical output

For clean, trusted **1950 DREW PLZ** in Clearwater with zoning **LMDR**:

- Front — **25 ft minimum**, from the front property line to the structure.
- Side — **5 ft minimum**, from the side property line to the structure.
- Rear — **10 ft minimum**, from the rear property line to the structure.

The page labels these as standard dwelling setbacks and immediately follows them with the three narrow conditional situations. There is no project questionnaire.

## Limitations and exact next task

V1 supports the LMDR detached-dwelling row only. It does not classify a lot, locate legal property lines, check a plan, determine a nonconformity, select waterfront alternatives, or cover other zoning districts. The next Setbacks task is to research and encode the detached-dwelling rows and material footnotes for each additional supported residential zoning district; add a property fact only if a condition demonstrably changes the common answer.

CLEARWATER SETBACKS V1 READY FOR RESIDENT REVIEW
