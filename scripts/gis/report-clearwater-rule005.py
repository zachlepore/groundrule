#!/usr/bin/env python3
"""Durable research reports and source-cited questions; not an approval exporter."""
import argparse,collections,csv,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
def j(p):return json.loads(p.read_text())
def table(headers,rows):return '| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+'\n'.join('| '+' | '.join(map(str,r))+' |' for r in rows)+'\n'
def run(analysis,evaluator,output):
 a,evaluator,out=map(pathlib.Path,(analysis,evaluator,output));assert not out.exists();s=j(a/'summary.json');rows=j(a/'all-records.json');ranking=j(a/'ranking.json');samples=j(a/'qc-cases.json');reg=j(ROOT/'research/gis/rule005-regulatory-evidence.v1.json');audit=j(evaluator);assert audit['scenariosPassed']==4
 out.mkdir(parents=True)
 population=table(['Exact source primary','Addresses','Parcel IDs','Geometry groups','Unit-labelled addresses','Technical screen apart from unsupported'],[(c['sourceCode'],c['addresses'],c['parcelIds'],c['geometryGroups'],c['unitLabeledAddresses'],c['technicalScreenApartFromUnsupported']) for c in s['sourceCodes']])
 top=table(['Rank','Exact source primary / mapped combination','Addresses / IDs / groups','Technical apart from unsupported','Score /100','Volume-heavy / regulatory-heavy rank'],[(i,r['sourceCode']+' / '+r['mappedCombination'],f"{r['addresses']} / {r['parcelIds']} / {r['geometryGroups']}",r['technicalScreenApartFromUnsupported'],r['weightedScore'],f"{r['sensitivityRanks']['volume_emphasis']} / {r['sensitivityRanks']['regulatory_emphasis']}") for i,r in enumerate(ranking[:10],1)])
 technical=sum(r['technicalScreenApartFromUnsupported'] for r in rows);human=[r for r in rows if r['humanCaseIds']];geom=collections.defaultdict(list)
 for r in rows:geom[r['footprintSha256']].append(r)
 shared=[rs for rs in geom.values() if len({r['parcelId'] for r in rs})>1];units=sum(r['unitLabelPresent'] for r in rows)
 report=f'''# Rule 005 — unsupported Clearwater population and ranked response opportunities

**Investigation/QC preparation only; zero new approvals.** Baseline: validated Rules 001–004 at `15ed2eb`, hosted run https://github.com/zachlepore/groundrule/actions/runs/39038131922 and artifact https://github.com/zachlepore/groundrule/actions/runs/39038131922/artifacts/12103396272 . This export is on the approved-static branch; it is **not assumed merged into main**. Latest fetched main remains the PR #100 merge.

## Exact reconciliation

63,430 original profiles = 43,092 original CLEAN + 20,338 original REVIEW. The unchanged approved scopes are 1,967 + 262 + 731 + 364 = **3,324**. Remaining unapproved REVIEW: **17,014**. **2,832** remaining addresses have the original `unsupported_zoning_code` flag (16.645116% of the remaining population), associated with **2,676 parcel IDs / 1,077 normalized geometry groups**. NCOD: **2,524 addresses / 2,492 IDs / 965 groups**. Standalone OS/R source classification: **308 / 184 / 112**. No missing primary code is inferred within this unsupported population: each has a recorded source code.

All 11 frozen source files, the immutable Release archive, all 61 approved-export output checksums, and every original field across 63,430 profiles were verified. The approved lookup SHA-256 remains `a4191f3e33be50545aeb6b0739f307db0470517d721e0abe854182dd2859e739`. Large generated data are kept outside Git. No new lookup, confidence classification or production row is written.

{population}

A normalized geometry group is an exact, orientation-normalized **horizontal footprint proxy**, not a surveyed legal parcel or proof of condominium/common ownership. There are {units} unit/apt-labelled addresses and {len(shared)} footprint groups containing multiple parcel IDs. {sum(len(rs) for rs in shared)} addresses belong to those shared-footprint groups. For example, HDR-NCOD Island Est's 1,385 addresses span only 43 distinct outlines; many are unit identities, not independent physical boundary decisions. Raw land-use codes, unit labels, source parcel OBJECTIDs and STRAPs are retained; no legal ownership type is invented from them. No title/declaration evidence was available.

## Measurements and technical exceptions

The original ambiguity diagnostic is reused unchanged for **1,621 parcel IDs**. Missing diagnostics are supplemented for **1,055 IDs**, requiring only **626 distinct raw-geometry computations**. The existing Turf intersection helper (historically named `measureOsrParcel`) measures **all positive-area district codes without a code filter**. It does not strip NCOD suffixes or change classifications. Supplemented evidence remains separately identified; its rounding convention is six decimals while frozen diagnostics retain their original precision. Positive-area floor is the existing 0.000001 m² convention, not a legal tolerance. A single recorded source code need not mean complete coverage.

**{technical} addresses** pass the research technical screen *apart from* the unresolved unsupported-code issue; **{len(rows)-technical}** have additional holds. This is not eligibility, certification or approval. Original flags remain exactly as recorded; research holds are additive. The screen permits only unsupported/ambiguity issues for research and still enforces original geometry, repeated/overlapping polygons, total coverage 99.9–100.1%, jurisdiction, authoritative identity, representative/address location and registered human holds. Parcel-peer holds propagate conservatively. Source geometry is never repaired. Supplementary point and topology observations retain explicit source/projection limitations.

{table(['Additional research hold (overlapping address counts)','Addresses'],sorted(s['technicalHolds'].items(),key=lambda x:-x[1]))}

Registered human evidence within this population: {[(r['address'],r['humanCaseIds'],r['researchTechnicalHolds']) for r in human]}. R001-27 is a **nonfinal family-level primary candidate**, not confirmation of the full NCOD subtype or legal applicability; its hold remains. No other registered true-split/staff/unclear hold was found in the unsupported subset. This is not evidence that unreviewed properties have no real splits. Five historically unpushed Batch 5A reviews remain unavailable and are not inferred. Rules 003/004 approved members are excluded before this population is reconstructed.

## Exact combination ranking

All **52 exact source-primary / mapped-combination groups** are in `combination-ranking.csv` and `ranking.json`, with separate counts, holds, source-described base, subtype, section references and current/future response readiness. They partition 2,832 addresses; geometry counts should not be treated as legal ownership counts.

{top}

Scoring is research prioritization, not a probability of approval: address potential 20%, source confidence 15%, regulatory clarity 25%, human-QC ease 10%, card-extension ease 15%, residential-fence fit 15%. Scores are 0–5, weighted to 100. Volume = 5×sqrt(technical-screen count / 2,832), and source confidence = 5×technical-screen fraction; other scores are explicit expert judgments in the JSON. Single-code Coachman LMDR has a clear, bounded fence exception; Island Estates adds seawall/setback/use/shared-land dependencies; nonresidential OS/R/I and mixed-code parcels score lower for this residential MVP. Repeated condo footprints reduce map workload but do not remove shared-land/applicability questions.

Sensitivity uses volume-heavy 35/15/20/10/10/10 and regulatory-heavy 10/15/35/10/15/15. The exact single-code Coachman LMDR group remains **rank 1 under both**. LDR/CRNCOD is a small future sibling lead (7 single-code addresses, only 6 technically screened) and cannot be merged into the LMDR rule: its front-yard provision differs. Largest raw combination, HDR-NCOD Island Est + P (726), remains a separate overlay-plus-split investigation and receives no inherited Preservation notice threshold or code alias.

## Three internal response designations

These labels are Groundrule internal confidence designations, never municipal certification. **Currently recommended for research:** designation 1 = 0; designation 2 = 0; designation 3 = **2,832**. This is an assessment table, not a classification update. The current product adapter still rejects original REVIEW records; no ambiguous-response UI is implemented here.

- **1, certified starting guidance:** possible for a bounded cohort only after overlay-aware content/rule coverage, current-source acceptance/confirmation, technical checks, manual QC and explicit owner authorization. Base identification by itself is insufficient.
- **2, certified starting guidance with meaningful split notifier:** additionally requires a defensible primary *with its overlay provisions covered*, evidence of an actual relevant secondary mapped district and project-context review. A generic notifier cannot compensate for unsupported primary-overlay rules. An NCOD overlay alone is **not** a split between two spatial base districts.
- **3, ambiguous with known zoning information:** retain exact source label, source-described base/overlay, positive-area mapped codes and percentages **with measurement QA**, and the reason for staff review. For invalid geometry/coverage or point disagreement, describe them as source-record labels/diagnostics rather than confirmed property zoning or accurate legal acreage. Do not display a confidently derived district, permissions, frontage or numerical project answer.

The potential largest immediate response-completeness benefit is a future fact-rich ambiguous-response path for these 2,832 records, without lowering original REVIEW or certifying them. The proposed next **starting-guidance research** cohort is the narrower 227 below. These counts are different outcomes and must not be added as separate recovered properties.

## Exact Rule 005 recommendation

**Existing source code and sole positive-area combined code `LMDR-NCOD Coachman R`; 227 addresses / 227 IDs / 227 distinct footprints.** Raw original issues must be exactly `unsupported_zoning_code`, all additional source/identity/location/human checks must pass, and no generic LMDR alias is assigned. Every source description explicitly says Low Medium Density Residential — Coachman Ridge Neighborhood Conservation Overlay District; `SPECIAL=(CRNCOD)`, OBJECTID **10947**, corroborated by CDC §2-1601.C/D. The 227 recorded raw land-use codes are `01`, with no unit/apt label, but permitted residential use and street/building-line applicability still need review.

242 source-primary Coachman LMDR addresses = **227 candidates + 1 coverage hold + 14 with Institutional intersections**. The hold is **2384 STAG RUN BLVD**, parcel `072916168620001620`, measured coverage **99.818656%**; do not waive the inherited 99.9% minimum to recover it. The 14 LMDR/CRNCOD + I records require a separate split/primary review, even where I is small. Candidate combined-zone coverage is exactly 100% at six-decimal diagnostic precision; there is no independent overlay coverage percentage. Parcel-area quantiles m²: {s['candidate']['areaM2Quantiles']}.

Potential future designation-1 recovery ceiling: **227**, not a promised yield. Current certified readiness and approvals: **0**. If all gates later pass and owner approves, remaining REVIEW could be 16,787, combined approved guidance 3,551; neither change occurs here. No percentage notice threshold is proposed or imported from Rules 001–004.
'''
 citations='\n\n'.join(f"### {c['id']} — CDC § {c['section']}\n\n{c['supportedFinding']}\n\n**Limit/question:** {c['limitationOrQuestion']}\n\n[Archived source, lines {c['lineStart']}–{c['lineEnd']}]({c['permalink']}); full raw two-column extract and source hash in `rule005-regulatory-evidence.v1.json`." for c in reg['citations'])
 cross=table(['Exact source code','Explicit source-described base','Source overlay marker','Source polygon OBJECTIDs','Code evidence'],[(c['exactSourceCode'],c['sourceDescribedBaseDistrict'],c['overlayCode'] or '(none)',[x['OBJECTID'] for x in c['sourcePolygons']],c['codeCitationId']) for c in reg['exactCodeEvidenceCrosswalk']])
 regulatory=f'''# Rule 005 — NCOD regulatory evidence and response readiness

**Research only. No new resident-facing claims, normalization, approvals or rules.** Source: repository archive `research/clearwater/clearwater-development-code.txt`, SHA-256 `{reg['sourceSha256']}`, committed as `2f0117519995ca06e33edeeb4962db95e933f412`. Compiled Volume II, **Supplement 55, July 2026**, ordinances through **9857-25, enacted December 4, 2025**. NCOD pages retain Supplement 12 (2005) text within the compilation; those page vintages do not by themselves establish supersession or current currency. This source is substantive Code text, not search snippets or generic residential guidance.

Live Municode and City Planning requests on **October 20, 2026** failed at the proxy with **CONNECT HTTP 403**. No current web text was retrieved or invented. Later amendments, legal atlas boundaries, tract exclusions, current neighborhood plans and parcel decisions remain unverified. Conclusions below concern the cited archived version. Two-column text was reconstructed manually; raw source lines are retained to distinguish headings/continuations and avoid mixing adjacent sections. Cite section and printed page with the archived file, not an uncited paraphrase.

## Explicit evidence crosswalk — not suffix stripping

{cross}

The GIS `ZONING_DESC` explicitly names the base and overlay; `SPECIAL` identifies CRNCOD/IENCOD, and the Code identifies the corresponding underlying districts. These exact, enumerated research mappings are not a general parser and are not inserted into `normalizedZoningCode`, evaluator facts or any existing lookup. Unknown future codes require evidence; a raw string prefix is not accepted. OS/R is a separately mapped OSR concept, not an NCOD subtype or a residential substitute. A GIS/source description identifies what the source says, not surveyed legal applicability to every project.

## Controlling sections and limitations

{citations}

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

'''+ '\n'.join(f"{i}. {question}" for i,question in enumerate(reg['planningQuestions'],1))+'''

For CRNCOD, cite §§2-1601.B/C/J and 3-803.A when confirming source mapping, current prohibition and frontage interaction. For IENCOD, cite §§2-1602.B/C/G/H/I and 3-803.A when confirming boundary exclusions, use class and rear-setback/seawall applicability. §4-608.A separates zoning administration from private deed restrictions. No outbound messages to Planning or others were sent.
'''
 sampletable=table(['Case','Scope','Address','Parcel ID','Purpose'],[(x['caseId'],'CANDIDATE' if x['inCandidateScope'] else 'EXCLUDED comparison',x['record']['address'],x['record']['parcelId'],x['selectionReason']) for x in samples])
 memo=f'''# Rule 005 decision memo and manual-QC index

**Recommended bounded combination:** source-primary and sole positive-area code **LMDR-NCOD Coachman R**, **227 addresses / 227 parcel IDs / 227 geometry groups**. No source code is stripped or changed. Current response-readiness recommendation is **designation 3: ambiguous, with known zoning information**. The conditional future target is designation 1 after complete overlay-aware fence support, QC, current-source acceptance/confirmation and explicit owner authorization. No approval is requested in this research delivery.

The larger unsupported population is 2,832, including 2,524 NCOD and 308 OS/R. The 227 lead stays rank 1 under volume-heavy and regulatory-heavy scoring. It is selected for an explicit base/overlay source designation, a narrow source-quality screen, residential-fence fit and directly identifiable card exceptions—not numerical volume. It is not ready for certification merely because LMDR is identifiable.

## What is verified versus unresolved

Verified: exact Rule 004 baseline (63,430 profiles, 3,324 existing approvals, 17,014 unresolved REVIEW); unchanged unsupported population; combined GIS feature OBJECTID 10947 explicitly names LMDR/CRNCOD; archived §§2-1601.C/J and 3-803.A establish overlay precedence and material fence differences; 227 sole-code geometries pass technical investigation checks and have 100% diagnostic combined-zone coverage. No independent overlay boundary exists in the frozen source.

Unresolved: live Code/amendment currency, legal boundary/plat applicability, specific frontage/building/fence locations, exceptions/official decisions, use/ownership/private restrictions, and missing NCOD evaluator/card support. Parcel land-use code 01 and no unit label are source observations, not legal detached-dwelling certification. No building/fence/aerial/plat geometry is invented.

## Actual QC packet

`qc-atlas.pdf`: 11 indexed high-resolution map pages; `maps/R005-01.png` through `R005-11.png` (300 dpi) plus vector PDFs; `contact-sheet.pdf`: two pages; `review-worksheet.csv` and printable PDF: blank owner fields. Cases 01–08 are eight distinct candidate footprints stratified by size, irregularity, source-zone boundary proximity and geographic extent. Cases 09–11 are **excluded comparison controls**, never added to candidate membership. A review of these maps is not approval of all 227 addresses or a substitute for regulatory coverage.

{sampletable}

R005-09 preserves the single-code coverage hold at 2384 Stag Run Blvd (99.818656%). R005-10 illustrates a separate Institutional intersection at 1697 Midnight Pass Way (I 1.260595%, retained). R005-11 illustrates LDR/CRNCOD versus LMDR/CRNCOD and a coverage hold at 1745 Casey Jones Ct: the two underlying districts have different front-yard provisions and cannot be merged by a neighborhood label.

## Owner-QC questions — all answers blank

For each case record mapping credibility, any additional district/boundary issue, observed front/street-side configuration, whether City clarification is needed, whether known facts support a useful ambiguous response, whether future starting guidance would be appropriate after full overlay support, proposed internal designation 1/2/3/uncertain, and notes. The analyst readiness recommendation does not populate the owner's fields. Current or future fences/building lines must be reviewed in an authoritative viewer/site record; these source maps contain only address/parcel/combined-zone geometry.

## Findings that would support or narrow a later implementation

Support: correct combined LMDR/CRNCOD identity, no meaningful unmeasured extra district, source coverage/identity consistency, regulator-confirmed/accepted controlling edition and a clearly encoded CRNCOD-specific fence pathway that never advertises prohibited front/street-side or chain-link fences. Retain all original codes, REVIEW, QA, provenance and project-specific limits.

Disqualify/narrow: discrepant current overlay boundary, additional district or coverage failure, conflicting source or human evidence, unresolvable property/frontage/building-line applicability, special approvals/nonconformity or ownership/use that prevent the proposed response. A meaningful notifier does not fix an incorrect base/overlay answer. Do not infer a legal exemption from small overlap or use another rule's notice threshold.

Potential designation-1 recovery ceiling **227**; current certified readiness/new approvals **0**. The remaining 15 same-primary addresses (one coverage hold, 14 with I) remain separate research. A fact-rich ambiguous-response design could improve useful response coverage for all 2,832 unsupported records while preserving REVIEW and QA, but that response flow is not implemented here.

## Decisions required before any implementation

1. Accept/confirm the cited Code vintage and resolve targeted Planning questions on CRNCOD applicability and frontage interaction.
2. Review the blank QC packet; specify any membership exclusions without substituting new parcels.
3. Agree that any proposed certified starting response is fence-scoped, overlay-aware and internally certified only, with topic-specific limitations.
4. Explicitly authorize a bounded membership and card/evaluator implementation after its required regulatory conditions are supported. No such authorization is inferred from this investigation.

No Rules 001–004 modifications, new approvals, Supabase, Guide/UI, production, deployment or merging. See the full population and regulatory-readiness reports, compact summary/ranking files and separate downloadable package for all address-level and geometry evidence.
'''
 for n,text in [('clearwater-rule005-unsupported-population.md',report),('clearwater-rule005-regulatory-readiness.md',regulatory),('clearwater-rule005-decision-memo.md',memo)]: (out/n).write_text(text)
 questions={'sourceVersion':reg['sourceEdition'],'currentCurrencyConfirmed':False,'questions':[{'question':q,'citationIds':['CR-BASE','CR-LMDR','CR-CHAIN','FENCE-PRECEDENCE'] if i in [0,1,2] else ['IE-BASE','IE-LMDR-FENCE','IE-MULTI-FENCE','NCOD-PRIVATE']} for i,q in enumerate(reg['planningQuestions'])]};(out/'planning-questions.json').write_text(json.dumps(questions,indent=2)+'\n')
 worksheet=['# Rule 005 blank owner-QC worksheet','','Reviewer/date: ____________________','', 'No answers are inferred. All cases are unreviewed; excluded comparisons are not candidates.']
 for x in samples:
  r=x['record'];worksheet+=['',f"## {x['caseId']} — {r['address']}",'',f"Parcel `{r['parcelId']}`; {'CANDIDATE' if x['inCandidateScope'] else 'EXCLUDED comparison'}; source `{r['sourceCode']}`.",'',*[f'- {k}: ____________________' for k in x['ownerQc']]]
 (out/'review-worksheet.md').write_text('\n'.join(worksheet)+'\n')
 (out/'README.md').write_text('''# Rule 005 unsupported/NCOD investigation\n\nRead the unsupported-population report, regulatory-readiness report and decision memo. The exact proposed cohort contains 227, not 228: one existing coverage hold is excluded. All analyst current-readiness recommendations are ambiguous/known-information; zero new approvals.\n\nMaps and full 2,832-address data are in the separately delivered downloadable packet, outside Git. The map renderer depicts combined GIS codes, not an invented separate overlay layer. Original QA/status/codes remain unchanged; every owner-QC answer is blank.\n\nReproduce with Node and existing frozen npm dependencies, Python 3 + Shapely 2.1.2 + matplotlib 3.10.8:\n\n```sh\nnode --max-old-space-size=4096 scripts/gis/measure-clearwater-rule005.mjs SOURCE APPROVED004 SOURCE_ZIP NEW_MEASURED\n./node_modules/.bin/tsx scripts/gis/audit-clearwater-rule005-fence.ts NEW_EVALUATOR_AUDIT.json\nPYTHONPATH=/path/to/shapely python3 scripts/gis/analyze-clearwater-rule005.py SOURCE NEW_MEASURED BIG_FISH_ANALYSIS NEW_ANALYSIS\nXDG_CACHE_HOME=/writable/cache PYTHONPATH=/path/to/shapely python3 scripts/gis/render-clearwater-rule005-qc.py NEW_ANALYSIS NEW_MAPS\npython3 scripts/gis/report-clearwater-rule005.py NEW_ANALYSIS NEW_EVALUATOR_AUDIT.json NEW_REPORTS\nPYTHONPATH=/path/to/shapely python3 tests/clearwater-rule005.test.py\n```\n\nUse the immutable September 28 Release and validated Rule 004 export from the prior hosted workflow. Inputs/outputs are SHA-pinned in the evidence and manifests; existing output directories are refused. The prior Big Fish package can be regenerated with its existing scripts. No live City/Municode or Supabase content was silently substituted.\n''')
 print(json.dumps({'reports':3,'rankedCombinations':len(ranking),'candidate':s['candidate']['addresses'],'currentCertifiedReady':0},indent=2))
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('analysis');a.add_argument('evaluator');a.add_argument('output');v=a.parse_args();run(v.analysis,v.evaluator,v.output)
