#!/usr/bin/env python3
"""Generate auditable research reports from analyze-clearwater-big-fish output; no approvals."""
import argparse,collections,csv,hashlib,json,math,pathlib

def counts(rs):return len(rs),len({r['parcelId'] for r in rs if r['parcelId'] is not None})
def dist(v):
 v=sorted(v);return {str(q):v[round((len(v)-1)*q/100)] if v else None for q in [0,25,50,75,90,95,99,100]}
def table(headers,rs):return '| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+'\n'.join('| '+' | '.join(str(v) for v in r)+' |' for r in rs)+'\n'
# Expert planning judgments, not measured probability estimates. Fraction never acts as eligibility.
J={
 'Near-complete primary, residential district pairs':(.8,4,4,4,4,'2–3 engineering days; 12–18 distinct-geometry inspections','Residential density/setback differences; do not infer legal absence of a split.','Existing viewer and current district standards; condominium/shared-land context'),
 'Near-complete primary, mixed-use district pairs':(.4,4,2.5,3,4,'3–5 days; 20–30 stratified geometry inspections','Commercial/institutional restrictions can be important at tiny percentages.','Project-location and current district standards'),
 'Near-complete primary, three or more districts':(.4,4,2,2.5,4,'4–6 days; 15–25 site/geometry inspections','Shared-land and several legally applicable districts; many addresses amplify one wrong interpretation.','Site plans, governing land rights and district boundaries'),
 'Remaining exact OS/R pairs':(.65,4,3.5,3.5,3,'2–4 days; 12–20 stratified inspections','Cannot transplant the Rule 002 or 003 notice thresholds; preserve substantive park/open-space areas.','Viewer, OS/R applicability and shared-property rights'),
 'Previously investigated Rule 001 changed/new-code scope':(.5,4,2.5,4,2,'1–3 days; inspect changed-code strata and all exceptions','Different primary guidance is beyond existing same-code approval; NCOD subtype and marina uncertainty.','Prior investigations plus regulatory confirmation of proposed primary'),
 'NCOD and unsupported-code support':(0,2,2.5,1.5,4,'5–10 days; overlay-aware legal mapping plus source-wide intersections','Never strip NCOD suffixes or treat OS/R as an ordinary residential primary.','Authoritative overlay provisions and full code registry; 1,073 pure unsupported profiles require complete intersection QC'),
 'Authoritative invalid zoning geometry replacement':(0,1.5,2,1.5,5,'5–10 days plus municipal source turnaround','Repairing geometry locally does not establish the legal boundary.','City-corrected authoritative geometry/version'),
 'Same-code polygon identity / union investigation':(0,2,3,2.5,5,'3–6 days; inspect identity/version and cross-code topology','Repeated parts may be disjoint valid district areas; deduplication cannot remove different legal districts.','Source polygon identities, versions and City interpretation'),
 'Coverage and cross-code topology reconciliation':(0,1.5,1.5,1.5,5,'5–10 days plus City clarification','Summed coverage is not union coverage; excess and gaps can cancel.','Authoritative topology and boundary interpretation'),
 'Material splits and remaining classification conflicts':(.1,3,1.5,1.5,2,'5–10 days; 25–40 targeted inspections, individual holds remain','Meaningful interior regions and discordant primaries make a blanket presentation policy unsafe.','Project/site evidence, density and zoning applicability guidance')}

def run(inputdir,out):
 inp,out=pathlib.Path(inputdir),pathlib.Path(out);assert not out.exists(),'Fresh report output required'
 s=json.loads((inp/'summary.json').read_text());topology=json.loads((inp/'topology-summary.json').read_text());rows=json.loads((inp/'unresolved-addresses.json').read_text())
 assert len(rows)==s['remaining']==17378
 assert len({r['addressId'] for r in rows})==17378
 assert sum(x['addresses'] for x in s['categories'])==17378
 ops=[]
 for o in s['opportunities']:
  if o['opportunity']=='outside_top10_holds':continue
  n=o['opportunity'];fraction,c,d,e,g,effort,risk,dependency=J[n];estimate=math.floor(o['qualityPass']*fraction)
  ops.append({**o,'planningRecovery':estimate,'fractionOfQcPass':fraction,'confidenceScore':c,'regulatoryScore':d,'easeScore':e,'generalizabilityScore':g,'effort':effort,'risk':risk,'dependencies':dependency,'verifiedNewEligible':0,'speculativeUpsideCeiling':o['addresses']-o['qualityPass']})
 maxest=max(o['planningRecovery'] for o in ops)
 weights={'base':[.35,.25,.20,.15,.05],'volume_emphasis':[.45,.20,.15,.15,.05],'defensibility_emphasis':[.25,.25,.30,.15,.05]}
 for o in ops:
  o['volumeScore']=5*math.sqrt(o['planningRecovery']/maxest) if maxest else 0
  v=[o['volumeScore'],o['confidenceScore'],o['regulatoryScore'],o['easeScore'],o['generalizabilityScore']]
  o['scores']={k:round(20*sum(a*b for a,b in zip(v,w)),3) for k,w in weights.items()}
 for k in weights:
  for i,o in enumerate(sorted(ops,key=lambda x:(-x['scores'][k],x['opportunity'])),1):o.setdefault('ranks',{})[k]=i
 ops.sort(key=lambda x:x['ranks']['base'])
 # Narrow recommended cohort; every source/human/link/topology hold remains outside.
 cohort=[r for r in rows if r['qualityScreenPass'] and r['districts']==['hdr','lmdr'] and r['originalZoning']=='HDR' and r['dominantCode']=='hdr' and r['dominantPercent']>=99]
 fps=collections.defaultdict(list)
 for r in cohort:fps[r['geometryEvidence']['canonicalFootprintSha256']].append(r)
 # Select one example per geometry, then cap at 12: address count, high secondary area and maximum overlap strata.
 reps=[sorted(rs,key=lambda r:str(r['addressId']))[0] for rs in fps.values()]
 reps=sorted(reps,key=lambda r:(-r['secondaryPercent'],str(r['addressId'])))
 sample=reps[:12]
 subgroups=collections.Counter(r['originalZoning'] for r in rows if r['combination']=='hdr + lmdr')
 area=dist([r['secondaryAreaM2'] for r in cohort]);pct=dist([r['secondaryPercent'] for r in cohort])
 bins=[]
 for low,high in [(0,.1),(.1,.25),(.25,.5),(.5,1)]:
  rs=[r for r in cohort if low<r['secondaryPercent']<=high];bins.append({'range':f'>{low}–{high}%','addresses':len(rs),'parcelIds':counts(rs)[1],'footprints':len({r['geometryEvidence']['canonicalFootprintSha256'] for r in rs})})
 overlap_bins=[]
 for lo,hi in [(0,.1),(.1,.5),(.5,1),(1,3),(3,6),(6,10),(10,25),(25,50),(50,100),(100,float('inf'))]:
  br=[r for r in rows if r['districtCount']>=2 and lo<r['secondaryPercent']<=hi]
  overlap_bins.append({'secondaryPercentRange':f'>{lo}–{hi}','addresses':len(br),'parcelIds':counts(br)[1],'enhancedQcPass':sum(r['qualityScreenPass'] for r in br)})
 near=[r for r in rows if 'near_complete' in r['flags']];qc=[r for r in rows if r['qualityScreenPass']]
 edge=[r for r in near if r['geometryEvidence'].get('secondaryAreaM2Approx') is not None and r['geometryEvidence'].get('secondaryBeyond1mBoundaryM2Approx',1e99)<=.01]
 interior=[r for r in near if r['geometryEvidence'].get('secondaryBeyond1mBoundaryM2Approx',0)>.01]
 coverage=[r for r in rows if 'coverage_failure' in r['flags']]
 under=[r for r in coverage if r['coveragePercent']<99.9];over=[r for r in coverage if r['coveragePercent']>100.1]
 footall=collections.defaultdict(list)
 for r in rows:
  fp=r['geometryEvidence'].get('canonicalFootprintSha256')
  if fp:footall[fp].append(r)
 concentrations=sorted([{'footprint':fp,'addresses':len(rs),'parcelIds':counts(rs)[1],'example':rs[0]['address'],'combination':rs[0]['combination']} for fp,rs in footall.items()],key=lambda x:-x['addresses'])
 original_unsupported=collections.Counter(r['originalZoning'] for r in rows if 'unsupported' in r['flags'])
 pure_unsupported=[r for r in rows if r['issues']==['unsupported_zoning_code']]
 details='\n\n'.join(f"**{c['category']}** — dominant combinations {c['combinations']}; retained flags (overlapping address counts) {c['flags']}." for c in s['categories'])
 categories=table(['Primary cause (first matching blocker/pattern)','Addresses','Parcel IDs','% remaining'],[(c['category'],c['addresses'],c['parcels'],f"{c['percent']:.4f}%") for c in s['categories']])
 audit=f'''# Clearwater unresolved population audit

Read-only analysis of merged PR #100 (`ee1ce8a`, export implementation `77ef7fc`). No new approvals or policy changes. Frozen Release: https://github.com/zachlepore/groundrule/releases/tag/clearwater-gis-2026-09-28 . Archive SHA-256 `{s['sourceArchiveSha256']}`; approved lookup `{s['lookupSha256']}`. All {s['sourceFilesVerified']} source-file and {s['approvedOutputChecksumsVerified']} export-file checksums verified; every original field compared against all frozen profiles. Current six-percent Rule 003 output is used, not the earlier Rule 002 remaining-population file.

## Reconciliation

63,430 = 43,092 original CLEAN + 20,338 original REVIEW. 20,338 = 1,967 Rule 001 + 262 Rule 002 + 731 Rule 003 + **17,378 still-unapproved REVIEW**. All 2,960 approvals remain excluded from this analysis. Notice totals are verified: Rule 001 762 prominent / 1,205 non-prominent; Rule 002 4 / 258; Rule 003 0 / 731. Zero original-field changes or duplicate address identities. Remaining: **{s['remainingParcels']} non-null parcel IDs**, and 112 unlinked profiles with null parcel IDs (null is not a parcel). No new legal eligibility is established.

## Mutually exclusive primary accounting

{categories}
{details}

Primary precedence is implemented in `primary_category`: human hold → address link → unsupported → missing primary → parcel validity → source zoning validity → supplemental topology validity → representative point → same-code overlap → repeated code → measured cross-code overlap → summed coverage → primary/area disagreement → near-complete primary → remaining ambiguity. An address with multiple failures appears once, at its first category; all original issues and secondary flags remain in the downloadable inventory. These are verified blocker/pattern categories, not proof of the legal cause of a boundary disagreement. Near-complete means existing primary equals area dominant and covers at least 99%; it is an analytical bin, not a new cutoff for approval. Parcel IDs can occur in more than one category, so parcel counts are not additive.

## Secondary mechanisms and source limitations

{table(['Flag','Addresses'],sorted(s['secondaryFlags'].items(),key=lambda x:-x[1]))}

All 1,200 profiles absent from the original ambiguity diagnostic are retained. Complete supplemental intersections were attempted against frozen parcels/zoning, retaining failures; these are separately identified Shapely measurements, never silently substituted into original Turf diagnostics. Unsupported codes remain unsupported. Their original-code distribution is {dict(original_unsupported)}. The {len(pure_unsupported)} profiles whose only original issue is unsupported zoning are a discrete source-support research lead, **not** confirmed clean topology or safe base-code aliases. Full NCOD subtype and overlay obligations must survive any future resolver.

Coverage failures (secondary, before primary precedence): {len(coverage)}, comprising {len(under)} below 99.9% and {len(over)} above 100.1% summed coverage. Cross-code intersections >0.01 m²: {s['secondaryFlags'].get('cross_code_overlap_measured',0)} addresses. A summed total near 100 can conceal an overlap and a compensating gap. `unionCoveragePercentApprox` is recorded wherever all indexed source geometry is valid. Repeated same-code and overlapping same-code flags are distinct; repeated disjoint polygons are not necessarily duplicates. No deduplication, union replacement or repair is performed. Source-wide canonical comparison found {topology['uniqueCanonicalZoningFootprints']} distinct footprints among 761 zoning polygons: **zero exact duplicate geometry groups**. Repeated district codes therefore do not justify blindly deleting identical polygons. There are {topology['shapelyInvalidZoningFeatures']} Shapely-invalid zoning features (a different validity test from the original Turf flags, which remain intact). Among measured valid-source cases, {topology['summedCoveragePassButUnionBelow99_9Addresses']} addresses passed summed coverage while falling below 99.9% union coverage; the theoretical cancellation concern is not asserted as a measured recovery population.

Representative-point zoning is rechecked against all frozen zoning polygons. {s['secondaryFlags'].get('representative_point_inconsistent',0)} addresses disagree with exactly-one/source-ID correspondence; {s['secondaryFlags'].get('address_point_outside_linked_parcel',0)} address points fall outside their authoritative linked parcel. Neither observation proves an authoritative link wrong (units/shared land and geocoding can differ). Those addresses and their parcel peers fail the enhanced research screen. Existing human true-split/staff/unclear vetoes remain; conflicting confirmed codes are flagged separately. Five historical unpushed Batch 5A reviews are unavailable and are not inferred.

Technical vs regulatory: link failures, invalid geometries, repeated polygon identities and coverage defects are primarily technical investigation leads, but correcting them still needs authoritative evidence. Unsupported NCOD and OS/R codes mix application support and regulatory scope. Area-primary disagreements, real interior splits and human holds require regulatory/human interpretation. Near-complete-primary boundary patterns are genuinely uncertain until physical context and legal applicability are checked; technical quality is not approval.

## Citywide secondary-area distribution

Secondary is the sum of all non-area-dominant districts; it is not necessarily the secondary to the stored primary when those disagree. Multi-district rows only, with failed-source measurements retained and explicitly flagged. Percentages may exceed 100 under overlap. Missing measurements are never imputed as zero.

{table(['Summed secondary %','Addresses','Parcel IDs','Enhanced QC-pass'],[(b['secondaryPercentRange'],b['addresses'],b['parcelIds'],b['enhancedQcPass']) for b in overlap_bins])}

## Systemic geometry and address amplification

{len(near)} addresses have same-primary dominance ≥99% before exclusions; only {len(qc)} addresses pass the enhanced technical/human/link/topology screen across all combinations. Of measured near-complete cases, {len(edge)} addresses have all measured secondary geometry within 1 m of the parcel boundary; {len(interior)} have secondary area extending beyond that band. Other cases lack complete/valid morphology and are not labelled slivers. The 1 m band and 0.01 m² computation tolerance are investigation diagnostics, never legal tolerances or policy changes. Percentages from established Turf evidence are unchanged; approximate geometry areas use local equirectangular scaling at 27.97°N (Shapely {s['pythonGeometryVersion']}). Invalid source geometries are not repaired. Tiny below-tolerance conflicts remain recorded as numeric values.

{table(['Largest identical canonical footprint','Addresses','Parcel IDs','Combination'],[(x['example'],x['addresses'],x['parcelIds'],x['combination']) for x in concentrations[:10]])}
Canonical normalized geometry equality identifies repeated footprints across distinct parcel IDs; it does not merge ownership or assert shared-land rights. Repeated condominiums can make one investigation unusually valuable. Regency Oaks' 397 records on one I + IRT + P parcel, for example, have measurable cross-code overlap and a substantial secondary region beyond the boundary band; they fail the enhanced screen despite passing older summed coverage. No blanket recovery is justified.

Boundary-alignment patterns are consistent with possible artifacts but do not prove survey error. No authoritative parks inventory, survey, land-rights records or current legal interpretation was supplied; proximity to OS/R is not proof of park use or misalignment. A presentation-only future policy could retain REVIEW plus non-exclusive primary guidance, all secondary restrictions and viewer access. Existing Rules 001–003 remain untouched; their notice cutoffs do not generalize automatically.

## Files and reproduction

`summary.json`, `categories.csv`, `combinations.csv`, `opportunities.csv` are compact committed summaries under `research/gis/big-fish-results/` (along with ranking, topology, notice reconciliation and Rule 004 samples). Full `unresolved-addresses.csv/json` in the downloadable analysis package retain every address ID, parcel, original classification/status, all flags, percentages, areas, polygon references and supplemental geometry metrics. `analysis-checksums.json` covers every raw analysis output. See ranking/recommendation reports for the next bounded investigation. Run the commands in the recommendation report against the pinned Release and validated approved export; fresh output directories are mandatory.
'''
 ranktable=table(['Rank','Disjoint recovery opportunity','Addresses / parcels','Enhanced QC-pass','Planning recovery*','Score /100','Volume-heavy / defensibility-heavy rank'],[(i,o['opportunity'],f"{o['addresses']} / {o['parcels']}",o['qualityPass'],o['planningRecovery'],o['scores']['base'],f"{o['ranks']['volume_emphasis']} / {o['ranks']['defensibility_emphasis']}") for i,o in enumerate(ops,1)])
 ranking=f'''# Clearwater biggest-fish recovery ranking

**No new eligibility or approval is established.** Baseline: 17,378 unresolved REVIEW addresses after 2,960 existing approvals. Opportunities below partition addresses by explicit `opportunity()` precedence; they are not summed together with root-cause categories. Ten opportunities account for {sum(o['addresses'] for o in ops)} addresses; 137 human/link/parcel-geometry holds remain outside the top ten. Cross-cutting interventions must not add their counts again. The disjoint planning scenario totals {sum(o['planningRecovery'] for o in ops)} conditional recoveries, leaving {17378-sum(o['planningRecovery'] for o in ops)} unresolved; it is not an approved target or forecast.

{ranktable}
*Planning recovery is an explicit scenario, not a validated recoverable count or calibrated probability: floor(enhanced QC-pass × judgment fraction). Technically screened means research-worthy, not legally eligible. Verified newly eligible and approved counts are **zero for every opportunity**. For technical-source failures the immediate estimate is zero; affected population is speculative upside only, conditional on new authoritative evidence and complete QC. These deliberately conservative assumptions avoid counting broken-source records as recoverable.

## Transparent scoring and sensitivity

Volume 35%, data confidence 25%, regulatory defensibility 20%, engineering/QC ease 15%, generalizability 5%. Scores are 0–5 expert judgments; volume = 5 × sqrt(planning recovery / largest planning recovery), then weighted sum ×20. Ease includes both engineering and human effort (larger is easier). Confidence/defensibility are judgments informed by measured flags and district types, not legal findings. `ranking.json` preserves every component and fraction. Sensitivity: volume-heavy 45/20/15/15/5 and defensibility-heavy 25/25/30/15/5; table reports resulting ranks. Reasonable weights shift priority within the screened leads, but cannot make failed-source cohorts immediately eligible. At the stricter no-human-approval lower bound, every recovery estimate is zero and numerical volume ranking is undefined; the value of the ranking is selecting research, not promising an approved yield.

## Opportunity evidence, exclusions, effort and dependencies

'''
 for o in ops:
  rs=[r for r in rows if r['opportunity']==o['opportunity']]
  comb=collections.Counter(r['combination'] for r in rs).most_common(4)
  ranking+=f"### {o['ranks']['base']}. {o['opportunity']}\n\nAffected {o['addresses']} addresses / {o['parcels']} IDs; enhanced QC-pass {o['qualityPass']} / {o['qualityParcels']} IDs. Planning fraction {o['fractionOfQcPass']}, recovery {o['planningRecovery']} ({o['planningRecovery']/17378*100:.2f}% of unresolved); source/hold-dependent upside ceiling {o['speculativeUpsideCeiling']}, **not additive or expected**. Dominant combinations: {comb}.\n\nEvidence/exclusions: {dict(collections.Counter(f for r in rs for f in r['flags']))}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: {o['risk']} Effort/QC estimate: {o['effort']}. Dependencies: {o['dependencies']}. Generalizability {o['generalizabilityScore']}/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.\n\n"
 ranking+=f'''## Recommended priorities

- **Biggest immediate volume lead:** near-complete mixed-use pairs, {next(o['qualityPass'] for o in ops if o['opportunity']=='Near-complete primary, mixed-use district pairs')} enhanced-screen addresses. Planning yield is conditional and requires district-aware stratified QC; this entire bucket is not a proposed rule.
- **Best systemic fix:** geometry- and identity-aware triage that distinguishes union coverage, cross-code overlap, edge-confined secondaries and repeated condominium footprints while retaining original REVIEW. Apply it to multiple cohorts as a research queue, not an automatic zoning resolver. The opportunities are disjoint; their common mechanism is not extra recovery.
- **Highest-volume difficult problem:** unsupported/NCOD support (2,832 flag-bearing addresses, with 2,827 assigned to this opportunity after earlier human holds). Preserve overlays and obtain applicable legal provisions. Invalid-source and topology cohorts also require authoritative inputs before recovery can be estimated defensibly.
- **Rule 004 next bounded QC:** existing HDR + LMDR, HDR ≥99%, all enhanced safeguards: **{len(cohort)} addresses / {counts(cohort)[1]} parcel IDs / {len(fps)} identical-geometry groups**. This is narrower than the broad ranked residential opportunity and has a modest, auditable inspection burden. Its conditional maximum additional guidance-ready count is {len(cohort)}, with **0 currently approved or legally confirmed**. It is chosen for bounded evidence and QC efficiency, not because it is the largest raw group.

Largest structural obstacle: a raw GIS overlap and a chosen representative point cannot establish project-specific zoning applicability, density rights or shared-land ownership. Broad numerical rules can mask real commercial/institutional or conservation restrictions. Correct authoritative geometry, overlay-aware regulatory interpretation and parcel-specific evidence are needed for the difficult remainder.
'''
 exclusions=[r for r in rows if r['combination']=='hdr + lmdr' and r not in cohort]
 reject=collections.Counter(f for r in exclusions for f in r['flags'])
 qc_table=table(['Proposed QC example (unreviewed)','Parcel ID','LMDR %','LMDR m²','Addresses sharing exact footprint'],[(r['address'],r['parcelId'],r['secondaryPercent'],r['secondaryAreaM2'],len(fps[r['geometryEvidence']['canonicalFootprintSha256']])) for r in sample])
 recommendation=f'''# Rule 004 recommendation — bounded HDR + LMDR investigation

**Research recommendation only. No approval requested or implemented.** Existing Rules 001–003, notice policies, raw zoning and QA remain unchanged.

Exact definition: remaining original-REVIEW and unapproved; existing primary `HDR`; exactly the positive-area district set `HDR + LMDR`; existing HDR equals area-dominant district at ≥99% diagnostic coverage; complete summed coverage 99.9–100.1%; valid parcel and source zoning; no repeated/same-code overlap, measurement error, measured cross-code overlap >0.01 m², unsupported/unrelated source issue, human veto or conflicting confirmation; consistent representative source ID; address point inside linked parcel; no such profile hold among parcel peers. These are proposed investigation bounds, not new guidance eligibility or legal thresholds. Full observed secondary geometry remains retained even where it extends inward.

**{len(cohort)} addresses / {counts(cohort)[1]} parcel IDs / {len(fps)} normalized identical-footprint groups** satisfy this definition. The broader exact HDR + LMDR unresolved population is {len([r for r in rows if r['combination']=='hdr + lmdr'])}; {len(exclusions)} lie outside this proposed scope. Existing primaries in the broader population: {dict(subgroups)}. Exclusion flags overlap: {dict(reject)}. A valid existing LMDR primary is excluded from this HDR scope rather than silently changed. Multi-district parcels, unsupported codes and all earlier human/source exclusions remain outside.

## Measured distribution

LMDR percent quantiles (address weighted, nearest-rank-index round): {pct}. LMDR area m² quantiles from original diagnostic: {area}. These are address-weighted; repeated footprints can dominate the distribution. `rule004-summary.json` includes one-per-parcel and one-per-exact-footprint quantiles. No notice threshold is proposed on geometry alone and no 1%, 2%, 3% or 6% presentation rule is inherited.

{table(['LMDR overlap range','Addresses','Parcel IDs','Footprints'],[(b['range'],b['addresses'],b['parcelIds'],b['footprints']) for b in bins])}

## Proposed manual QC packet and plan

{qc_table}
These are **new unreviewed analytical examples**, not gold cases or owner-confirmed observations. Exact footprint equivalence just reduces redundant map inspection; every distinct parcel identity and shared-land relationship still needs reconciliation. Inspect every distinct geometry group if ≤12; otherwise start with 12 stratified groups (largest address concentration, minimum/median/maximum overlap, maximum secondary area, any secondary region beyond the 1 m boundary band), extending only for contradictory findings. Current packet has {len(sample)} distinct groups. Within each multi-ID footprint check a residential unit and any commercial/common-unit address if present, source zoning boundaries and representative-point identity. Review single-property outliers separately. Do not ask the owner to review hundreds of identical maps.

Approval-supporting findings would be consistent existing HDR starting guidance, no substantive project-area LMDR region that makes HDR guidance misleading, verified shared-footprint linkage, retained LMDR details/viewer/caveats and no new contradictions. Disqualify or narrow for a real interior split, different primary applicability, density/setback implications that cannot be described safely, mismatched ownership geometry, unsupported shared-land inference or regulatory uncertainty. A percentage-only suppression policy cannot be assumed. Legal density/lot-area calculations and project location may require City interpretation even if the visible secondary strip is small.

Conditional maximum recovery is **{len(cohort)}**; a conservative implementation commitment is **zero until manual QC and explicit owner authorization**. Successful approval of every candidate would reduce unresolved REVIEW from 17,378 to {17378-len(cohort)}, without changing original REVIEW or raw zoning. Broader residential near-complete cohorts are separate subsequent investigations.

## Reproduce

Use Node (existing GIS dependencies) and Python 3 with Shapely 2.1.2; obtain the Release directly and verify the manifest archive hash. Validated baseline artifact: https://github.com/zachlepore/groundrule/actions/runs/39030680013/artifacts/12100112777 . Use the complete PR #100 validated export, lookup SHA `{s['lookupSha256']}`. The approved exporter/workflow remains the authority; no new exporter is introduced.

```sh
PYTHONPATH=/path/to/shapely python3 scripts/gis/analyze-clearwater-big-fish.py SOURCE APPROVED_EXPORT clearwater-full-gis-snapshot.zip NEW_ANALYSIS
PYTHONPATH=/path/to/shapely python3 scripts/gis/summarize-clearwater-topology.py SOURCE NEW_ANALYSIS NEW_ANALYSIS/topology-summary.json
python3 scripts/gis/report-clearwater-big-fish.py NEW_ANALYSIS NEW_REPORTS
PYTHONPATH=/path/to/shapely python3 tests/clearwater-big-fish.test.py
```

Both scripts refuse existing output directories. Input checksums and all original fields are verified; script hash/source/lookup provenance are recorded. Generated full address-level data stays outside Git; compact reports, samples and summaries are version controlled. No new approval config, UI, Supabase, deployment or merge is part of this investigation.
'''
 out.mkdir(parents=True)
 for name,txt in [('clearwater-unresolved-population-audit.md',audit),('clearwater-big-fish-ranking.md',ranking),('clearwater-rule004-recommendation.md',recommendation)]: (out/name).write_text(txt)
 with (out/'overlap-ranges.csv').open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(overlap_bins[0]),lineterminator="\n");w.writeheader();w.writerows(overlap_bins)
 (out/'ranking.json').write_text(json.dumps({'weights':weights,'opportunities':ops},indent=2)+'\n')
 rsumm={'definition':'Existing HDR; exact HDR + LMDR; HDR >=99%; enhanced screen true','addresses':len(cohort),'parcelIds':counts(cohort)[1],'footprints':len(fps),'percentAddressQuantiles':pct,'areaAddressQuantilesM2':area,'percentParcelQuantiles':dist([r['secondaryPercent'] for r in {r['parcelId']:r for r in cohort}.values()]),'percentFootprintQuantiles':dist([rs[0]['secondaryPercent'] for rs in fps.values()]),'areaParcelQuantilesM2':dist([r['secondaryAreaM2'] for r in {r['parcelId']:r for r in cohort}.values()]),'areaFootprintQuantilesM2':dist([rs[0]['secondaryAreaM2'] for rs in fps.values()]),'bins':bins,'sourceLookupSha256':s['lookupSha256'],'candidateMembershipSha256':hashlib.sha256(json.dumps(sorted(r['addressId'] for r in cohort),separators=(',',':')).encode()).hexdigest(),'outsideScopeAddresses':len(exclusions)}
 (out/'rule004-summary.json').write_text(json.dumps(rsumm,indent=2)+'\n')
 for filename,rs in [('rule004-candidates.csv',cohort),('rule004-qc-samples.csv',sample)]:
  with (out/filename).open('w',newline='') as f:
   fields=['addressId','address','parcelId','originalStatus','guidanceStatus','originalZoning','combination','secondaryPercent','secondaryAreaM2','flags','humanCaseIds','sourceEvidence'];w=csv.DictWriter(f,fieldnames=fields,lineterminator="\n");w.writeheader()
   for r in rs:w.writerow({k:json.dumps(r[k]) if isinstance(r[k],list) else r[k] for k in fields})
 (out/'systemic-summary.json').write_text(json.dumps({'nearCompleteAddresses':len(near),'enhancedQcPassAddresses':len(qc),'secondaryWithin1mAddresses':len(edge),'secondaryBeyond1mAddresses':len(interior),'unsupportedCodeCounts':dict(original_unsupported),'pureUnsupportedAddresses':len(pure_unsupported),'concentrations':concentrations[:30]},indent=2)+'\n')
 print(json.dumps({'rule004':rsumm,'ranking':[(o['opportunity'],o['planningRecovery'],o['scores']['base']) for o in ops]},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('analysis');p.add_argument('output');a=p.parse_args();run(a.analysis,a.output)
