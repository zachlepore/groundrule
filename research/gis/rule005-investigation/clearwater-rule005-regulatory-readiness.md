# Rule 005 — NCOD regulatory evidence and response readiness

**Research only. No new resident-facing claims, normalization, approvals or rules.** Source: repository archive `research/clearwater/clearwater-development-code.txt`, SHA-256 `9745beac8988ab96c4b7bd67ce506d02d1bbd0a62ed0dc990e2abfa53d81b7a0`, committed as `2f0117519995ca06e33edeeb4962db95e933f412`. Compiled Volume II, **Supplement 55, July 2026**, ordinances through **9857-25, enacted December 4, 2025**. NCOD pages retain Supplement 12 (2005) text within the compilation; those page vintages do not by themselves establish supersession or current currency. This source is substantive Code text, not search snippets or generic residential guidance.

Live Municode and City Planning requests on **October 20, 2026** failed at the proxy with **CONNECT HTTP 403**. No current web text was retrieved or invented. Later amendments, legal atlas boundaries, tract exclusions, current neighborhood plans and parcel decisions remain unverified. Conclusions below concern the cited archived version. Two-column text was reconstructed manually; raw source lines are retained to distinguish headings/continuations and avoid mixing adjacent sections. Cite section and printed page with the archived file, not an uncited paraphrase.

## Explicit evidence crosswalk — not suffix stripping

| Exact source code | Explicit source-described base | Source overlay marker | Source polygon OBJECTIDs | Code evidence |
|---|---|---|---|---|
| LDR-NCOD Coachman R | LDR | CRNCOD | [10686] | CR-BASE |
| LMDR-NCOD Coachman R | LMDR | CRNCOD | [10947] | CR-BASE |
| LMDR-NCOD Island Est | LMDR | IENCOD | [10869, 10937] | IE-BASE |
| MDR-NCOD Island Est | MDR | IENCOD | [10873] | IE-BASE |
| MHDR-NCOD Island Est | MHDR | IENCOD | [10870, 10898] | IE-BASE |
| HDR-NCOD Island Est | HDR | IENCOD | [10871, 10874] | IE-BASE |
| I-NCOD Island Est | I | IENCOD | [10872] | IE-BASE |
| OS/R | OSR | (none) | [10489, 10523, 10527, 10532, 10534, 10544, 10550, 10563, 10565, 10579, 10580, 10583, 10591, 10600, 10607, 10609, 10616, 10639, 10643, 10655, 10676, 10678, 10679, 10681, 10688, 10689, 10696, 10703, 10709, 10712, 10713, 10714, 10715, 10716, 10719, 10721, 10722, 10737, 10750, 10757, 10760, 10763, 10775, 10782, 10802, 10804, 10805, 10820, 10822, 10845, 10848, 10855, 10863, 10880, 10881, 10882, 10884, 10915, 10916, 10919, 10925, 10926, 10938, 10942, 10944, 10945, 10952, 10954, 10955, 10957, 10959, 10968, 10970, 10971, 10991, 11012, 11026, 11032, 11059, 11063, 11066, 11075, 11078, 11106, 11107, 11113, 11133, 11160, 11217, 11218, 11238, 11240] | OSR-SCOPE |


The GIS `ZONING_DESC` explicitly names the base and overlay; `SPECIAL` identifies CRNCOD/IENCOD, and the Code identifies the corresponding underlying districts. These exact, enumerated research mappings are not a general parser and are not inserted into `normalizedZoningCode`, evaluator facts or any existing lookup. Unknown future codes require evidence; a raw string prefix is not accepted. OS/R is a separately mapped OSR concept, not an NCOD subtype or a residential substitute. A GIS/source description identifies what the source says, not surveyed legal applicability to every project.

## Controlling sections and limitations

### CR-BASE — CDC § 2-1601.B–D

Coachman Ridge overlays LDR and LMDR; applies additional requirements in its designated boundary. Table D explicitly distinguishes the underlying districts.

**Limit/question:** Underlying label must be supported by GIS ZONING_DESC/SPECIAL and these provisions, never suffix stripping.

[Archived source, lines 13289–13348](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13289); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### CR-CHAIN — CDC § 2-1601.J.1

Chain link and vinyl coated chain link fences are prohibited throughout CRNCOD.

**Limit/question:** Generic chain-link cards cannot be reused without the overlay prohibition.

[Archived source, lines 13501–13513](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13501); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### CR-LDR — CDC § 2-1601.J.2.a

LDR underlying designation: non-opaque fences not exceeding three feet may be permitted between front building and property lines and between side building and street-adjacent property lines, with compatible materials/design.

**Limit/question:** Not an LMDR exception; compatibility and street-side location need interpretation.

[Archived source, lines 13514–13535](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13514); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### CR-LMDR — CDC § 2-1601.J.2.b

LMDR underlying designation: fences prohibited between the front building line and front property line and between side building line and any street-adjacent property line.

**Limit/question:** Ordinary four-foot front card is unsafe here; corner/street-side fence-line facts or City confirmation needed.

[Archived source, lines 13528–13552](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13528); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### CR-SIDE — CDC § 2-1601.J.3 and K

Side/rear fences refer to Article 3 Division 8; certain equipment must be behind the front building line and screened, potentially with fencing or landscaping.

**Limit/question:** Read J.3 together with J.1 and J.2; do not treat side/rear reference as overriding chain-link or street-side bans.

[Archived source, lines 13549–13566](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13549); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### IE-BASE — CDC § 2-1602.A–C

Island Estates overlay adds requirements to LMDR, MDR, MHDR, HDR, I and C. Overlay provisions govern covered subjects; remaining Code fills gaps. Boundaries have four express tract exclusions.

**Limit/question:** GIS combined label is not proof that every source polygon satisfies the legal tract exclusions or current amendment state.

[Archived source, lines 13565–13605](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13565); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### IE-LMDR-USE — CDC § 2-1602.D–F

LMDR/IENCOD has its own minimum/flexible standards and waterfront-related footnotes.

**Limit/question:** Do not automatically enable generic setbacks, pool or other property cards from base identification.

[Archived source, lines 13612–13656](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13612); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### IE-LMDR-FENCE — CDC § 2-1602.G.2.a–b

Single-family LMDR/IENCOD: fences no higher than six feet between any portion of the principal structure and any side lot line; all fences between rear building setback line and seawall non-opaque.

**Limit/question:** Requires principal structure, side-line classification, rear building setback line and seawall/fence location.

[Archived source, lines 13836–13900](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13836); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### IE-MULTI-FENCE — CDC § 2-1602.H.2.a–b

Multifamily MDR/MHDR/HDR/C IENCOD areas have the corresponding six-foot side and non-opaque rear-setback-to-seawall provisions.

**Limit/question:** District label alone does not establish multifamily use, shared-property rights or proposed segment location.

[Archived source, lines 13862–13889](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13862); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### IE-INSTITUTIONAL — CDC § 2-1602.I

I/IENCOD contains additional landscaping requirements; general applicable code remains relevant.

**Limit/question:** No residential base or residential use permission inferred.

[Archived source, lines 13908–13922](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13908); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### FENCE-PRECEDENCE — CDC § 3-803.A

CRNCOD and IENCOD design guidelines/standards apply first; Article 3 Division 8 fills matters where those standards are silent.

**Limit/question:** A split-zone notifier cannot compensate for missing primary-overlay rules.

[Archived source, lines 15909–15927](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L15909); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### NCOD-PRIVATE — CDC § 4-608.A

NCOD mechanism adds neighborhood standards; its purpose does not include City enforcement of neighborhood deed restrictions.

**Limit/question:** City zoning review and association/deed restrictions are separate; no private rights certified.

[Archived source, lines 25123–25150](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L25123); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### OSR-SCOPE — CDC § 2-1401

OSR is an open-space/recreation district, with development potential also depending on Countywide Future Land Use designation.

**Limit/question:** OS/R is a supported legal concept but is outside the ordinary residential fence scope; do not alias it to a residential district.

[Archived source, lines 12922–12947](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L12922); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### CR-EXTERIOR — CDC § 2-1601.G–K

Coachman Ridge additionally restricts driveway materials, parking on landscaped areas and storage/parking of listed vehicles (with stated business/loading exceptions); specified equipment must be behind the front building line and screened.

**Limit/question:** These exterior-use standards require topic-specific cards/facts; do not unlock driveway, parking or equipment guidance using a generic LMDR alias.

[Archived source, lines 13490–13565](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13490); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

### IE-EXTERIOR — CDC § 2-1602.G.1/G.3/G.4, H.1/H.3/H.4 and I

Island Estates adds parking-on-landscaping, yard landscaping-material and outdoor commercial fishing/crabbing-equipment provisions; institutional areas have the stated additional landscaping requirement.

**Limit/question:** Retain each use/district scope and landscaping-plan exception; these are not generic permissions or fully encoded MVP conditions.

[Archived source, lines 13836–13922](https://github.com/zachlepore/groundrule/blob/2f0117519995ca06e33edeeb4962db95e933f412/research/clearwater/clearwater-development-code.txt#L13836); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`.

## Current Groundrule fence evaluator audit

Read-only source audit covers `lib/rules/evaluate.ts`, `lib/rules/condition.ts`, `lib/properties/facts.ts`, `lib/properties/lookup.ts`, `lib/guides/fence.ts`, the committed fence seed/resident migrations and prior fence research. **No live Supabase rule database was queried.** Therefore the finding is about repository-defined support, not a claim that a separately changed live database has been inspected.

The expression engine can represent additional rules, but the committed active-rule migrations do not encode §2-1601.J or §2-1602.G/H selectors, prohibitions and precedence. The seed explicitly lists special district/overlay standards as a known gap. The property adapter supplies only normalized zoning for trusted CLEAN profiles and returns no property facts for REVIEW; current unsupported properties are therefore blocked, not silently receiving these generic results in production.

`audit-clearwater-rule005-fence.ts` loads the actual four relevant seed condition JSON expressions and evaluates them with the real engine without DB access. **Four counterfactual scenarios pass:** generic front-height matches for both a raw composite code and a stripped LMDR code; generic uncoated/coated side/rear chain-link conditions also match if CRNCOD is passed as ordinary LMDR. This would be unsafe under §2-1601.J.2.b and J.1. These are counterfactual demonstrations of a missing gate, **not real resident results or new regulatory implementations**. Source conditions, hashes and observed matches are in `fence-evaluator-audit.json`.

## Information-card work before a certified NCOD response

| Card/fact area | Coachman LMDR need | Island Estates need |
|---|---|---|
| Property context | Exact combined code, explicit LMDR + CRNCOD, source/edition/QA; no base-only badge | Exact base plus IENCOD; legal tract/exclusion and source version caveats |
| Front fence | §2-1601.J.2.b prohibition replaces ordinary four-foot suggestion for covered front location | Review applicable general and overlay provisions; do not invent a new front standard |
| Street-side/corner | Same J.2.b street-adjacent side-building-line restriction; unknown exact configuration goes to review | Need site frontage and applicable overlay/general project-location evidence |
| Chain-link | §2-1601.J.1 bans both plain and vinyl-coated chain-link throughout CRNCOD; generic chain-link card must not suggest it | Do not import Coachman chain-link ban to IENCOD without authority |
| Side/rear | General Division 8 only with J.1/J.2 precedence, visibility/easement/other conditions retained | G.2/H.2 six-foot side and rear-setback-to-seawall non-opacity, with actual geometry/use applicability |
| Split notice | None inferred merely from one combined NCOD source code | Additional P/OSR/base-district splits need separate meaningfulness review; no inherited thresholds |
| Permits, easements, visibility | Existing supported duties/unknowns remain; no implied permission | Same; seawall/required setback and project location are not provided by GIS alone |
| Shared land/use | Land-use codes are recorded evidence, not development rights | Condo/source footprint repetition requires separate shared-land/association/project applicability handling |
| Other Guides | Do not unlock ordinary LMDR setbacks/shed/pool cards using an alias; CRNCOD §2-1601.D–F has separate standards | IENCOD §2-1602.D–F and G/H/I require topic-specific review before enabling other cards |

No card or evaluator change is made. Coarse user answers or `project.location_zone=side` cannot establish the exact street-side building-line zone. Planning/survey evidence or an explicit review pathway is needed when the controlling location is unknown. The pre-existing `fence-planner-correction-audit-v1.md` also records an unresolved sight-visibility interpretation issue; this task neither resolves it nor replaces that provision.

## Source-cited Planning questions

1. Confirm no amendments since the archived compilation alter 2-1601.J, 2-1602.G/H or 3-803.A.
2. Confirm source labels/SPECIAL correspond to currently designated CRNCOD/IENCOD parcels and resolve legal tract exclusions in 2-1602.B.
3. Confirm CRNCOD J.2.b street-side/front wording and its interaction with J.3 and general corner/multiple-frontage provisions, including any applicable flexibility/variance or documented nonconformity.
4. Confirm IENCOD rear building setback line and seawall applicability; identify exceptions requiring documented City decisions.
5. Identify controlling neighborhood plans and current plats/declarations/private restrictions; GIS does not establish them.
6. Confirm residential/condominium uses and which shared-land projects need association/management permissions.

For CRNCOD, cite §§2-1601.B/C/J and 3-803.A when confirming source mapping, current prohibition and frontage interaction. For IENCOD, cite §§2-1602.B/C/G/H/I and 3-803.A when confirming boundary exclusions, use class and rear-setback/seawall applicability. §4-608.A separates zoning administration from private deed restrictions. No outbound messages to Planning or others were sent.
