# Clearwater biggest-fish recovery ranking

**No new eligibility or approval is established.** Baseline: 17,378 unresolved REVIEW addresses after 2,960 existing approvals. Opportunities below partition addresses by explicit `opportunity()` precedence; they are not summed together with root-cause categories. Ten opportunities account for 17241 addresses; 137 human/link/parcel-geometry holds remain outside the top ten. Cross-cutting interventions must not add their counts again.

| Rank | Disjoint recovery opportunity | Addresses / parcels | Enhanced QC-pass | Planning recovery* | Score /100 | Volume-heavy / defensibility-heavy rank |
|---|---|---|---|---|---|---|
| 1 | Near-complete primary, residential district pairs | 603 / 571 | 603 | 482 | 80.04 | 2 / 1 |
| 2 | Near-complete primary, mixed-use district pairs | 1879 / 1052 | 1879 | 751 | 78.0 | 1 / 3 |
| 3 | Remaining exact OS/R pairs | 760 / 662 | 760 | 494 | 75.886 | 3 / 2 |
| 4 | Near-complete primary, three or more districts | 917 / 555 | 917 | 366 | 63.934 | 4 / 4 |
| 5 | Previously investigated Rule 001 changed/new-code scope | 202 / 184 | 193 | 96 | 56.514 | 5 / 5 |
| 6 | Material splits and remaining classification conflicts | 3921 / 2244 | 1926 | 192 | 45.197 | 6 / 6 |
| 7 | Same-code polygon identity / union investigation | 1024 / 666 | 0 | 0 | 34.5 | 7 / 7 |
| 8 | NCOD and unsupported-code support | 2827 / 2675 | 0 | 0 | 28.5 | 8 / 8 |
| 9 | Authoritative invalid zoning geometry replacement | 2355 / 1621 | 0 | 0 | 25.0 | 9 / 9 |
| 10 | Coverage and cross-code topology reconciliation | 2753 / 1326 | 0 | 0 | 23.0 | 10 / 10 |

*Planning recovery is an explicit scenario, not a validated recoverable count or calibrated probability: floor(enhanced QC-pass × judgment fraction). Technically screened means research-worthy, not legally eligible. Verified newly eligible and approved counts are **zero for every opportunity**. For technical-source failures the immediate estimate is zero; affected population is speculative upside only, conditional on new authoritative evidence and complete QC. These deliberately conservative assumptions avoid counting broken-source records as recoverable.

## Transparent scoring and sensitivity

Volume 35%, data confidence 25%, regulatory defensibility 20%, engineering/QC ease 15%, generalizability 5%. Scores are 0–5 expert judgments; volume = 5 × sqrt(planning recovery / largest planning recovery), then weighted sum ×20. Ease includes both engineering and human effort (larger is easier). Confidence/defensibility are judgments informed by measured flags and district types, not legal findings. `ranking.json` preserves every component and fraction. Sensitivity: volume-heavy 45/20/15/15/5 and defensibility-heavy 25/25/30/15/5; table reports resulting ranks. Reasonable weights shift priority within the screened leads, but cannot make failed-source cohorts immediately eligible. At the stricter no-human-approval lower bound, every recovery estimate is zero and numerical volume ranking is undefined; the value of the ranking is selecting research, not promising an approved yield.

## Opportunity evidence, exclusions, effort and dependencies

### 1. Near-complete primary, residential district pairs

Affected 603 addresses / 571 IDs; enhanced QC-pass 603 / 571 IDs. Planning fraction 0.8, recovery 482 (2.77% of unresolved); source/hold-dependent upside ceiling 0, **not additive or expected**. Dominant combinations: [('hdr + lmdr', 365), ('lmdr + mdr', 97), ('ldr + lmdr', 48), ('ldr + mdr', 30)].

Evidence/exclusions: {'near_complete': 603}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Residential density/setback differences; do not infer legal absence of a split. Effort/QC estimate: 2–3 engineering days; 12–18 distinct-geometry inspections. Dependencies: Existing viewer and current district standards; condominium/shared-land context. Generalizability 4/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 2. Near-complete primary, mixed-use district pairs

Affected 1879 addresses / 1052 IDs; enhanced QC-pass 1879 / 1052 IDs. Planning fraction 0.4, recovery 751 (4.32% of unresolved); source/hold-dependent upside ceiling 0, **not additive or expected**. Dominant combinations: [('i + mhdr', 374), ('c + hdr', 340), ('i + mdr', 304), ('mdr + o', 198)].

Evidence/exclusions: {'near_complete': 1879}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Commercial/institutional restrictions can be important at tiny percentages. Effort/QC estimate: 3–5 days; 20–30 stratified geometry inspections. Dependencies: Project-location and current district standards. Generalizability 4/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 3. Remaining exact OS/R pairs

Affected 760 addresses / 662 IDs; enhanced QC-pass 760 / 662 IDs. Planning fraction 0.65, recovery 494 (2.84% of unresolved); source/hold-dependent upside ceiling 0, **not additive or expected**. Dominant combinations: [('os/r + us19', 255), ('mhdr + os/r', 171), ('os/r + t', 160), ('hdr + os/r', 96)].

Evidence/exclusions: {'near_complete': 558, 'primary_mismatch': 5}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Cannot transplant the Rule 002 or 003 notice thresholds; preserve substantive park/open-space areas. Effort/QC estimate: 2–4 days; 12–20 stratified inspections. Dependencies: Viewer, OS/R applicability and shared-property rights. Generalizability 3/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 4. Near-complete primary, three or more districts

Affected 917 addresses / 555 IDs; enhanced QC-pass 917 / 555 IDs. Planning fraction 0.4, recovery 366 (2.11% of unresolved); source/hold-dependent upside ceiling 0, **not additive or expected**. Dominant combinations: [('c + i + mdr', 260), ('c + irt + mhdr', 229), ('c + hdr + i + mdr', 211), ('c + hdr + o', 128)].

Evidence/exclusions: {'near_complete': 917}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Shared-land and several legally applicable districts; many addresses amplify one wrong interpretation. Effort/QC estimate: 4–6 days; 15–25 site/geometry inspections. Dependencies: Site plans, governing land rights and district boundaries. Generalizability 4/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 5. Previously investigated Rule 001 changed/new-code scope

Affected 202 addresses / 184 IDs; enhanced QC-pass 193 / 179 IDs. Planning fraction 0.5, recovery 96 (0.55% of unresolved); source/hold-dependent upside ceiling 9, **not additive or expected**. Dominant combinations: [('mdr + p', 81), ('lmdr + p', 39), ('hdr + p', 36), ('d + p', 20)].

Evidence/exclusions: {'missing_primary': 1, 'parcel_peer_hold': 5, 'primary_mismatch': 79, 'representative_point_inconsistent': 1, 'cross_code_overlap_measured': 4, 'address_point_outside_linked_parcel': 2}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Different primary guidance is beyond existing same-code approval; NCOD subtype and marina uncertainty. Effort/QC estimate: 1–3 days; inspect changed-code strata and all exceptions. Dependencies: Prior investigations plus regulatory confirmation of proposed primary. Generalizability 2/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 6. Material splits and remaining classification conflicts

Affected 3921 addresses / 2244 IDs; enhanced QC-pass 1926 / 1346 IDs. Planning fraction 0.1, recovery 192 (1.10% of unresolved); source/hold-dependent upside ceiling 1995, **not additive or expected**. Dominant combinations: [('i + irt + p', 397), ('lmdr + mdr', 288), ('c + hdr + i + lmdr', 276), ('os/r + p + t', 249)].

Evidence/exclusions: {'cross_code_overlap_measured': 1665, 'address_point_outside_linked_parcel': 184, 'parcel_peer_hold': 296, 'near_complete': 1002, 'primary_mismatch': 122, 'missing_primary': 14, 'representative_point_inconsistent': 14, 'unrelated_profile_issue': 14}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Meaningful interior regions and discordant primaries make a blanket presentation policy unsafe. Effort/QC estimate: 5–10 days; 25–40 targeted inspections, individual holds remain. Dependencies: Project/site evidence, density and zoning applicability guidance. Generalizability 2/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 7. Same-code polygon identity / union investigation

Affected 1024 addresses / 666 IDs; enhanced QC-pass 0 / 0 IDs. Planning fraction 0, recovery 0 (0.00% of unresolved); source/hold-dependent upside ceiling 1024, **not additive or expected**. Dominant combinations: [('p + us19', 363), ('i + os/r + p + us19', 265), ('i + lmdr + us19', 182), ('c + irt + mdr', 110)].

Evidence/exclusions: {'near_complete': 339, 'repeated_code': 1024, 'same_code_overlap': 531, 'coverage_failure': 64, 'cross_code_overlap_measured': 661, 'missing_primary': 1, 'parcel_peer_hold': 1, 'primary_mismatch': 1, 'representative_point_inconsistent': 1, 'unrelated_profile_issue': 1}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Repeated parts may be disjoint valid district areas; deduplication cannot remove different legal districts. Effort/QC estimate: 3–6 days; inspect identity/version and cross-code topology. Dependencies: Source polygon identities, versions and City interpretation. Generalizability 5/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 8. NCOD and unsupported-code support

Affected 2827 addresses / 2675 IDs; enhanced QC-pass 0 / 0 IDs. Planning fraction 0, recovery 0 (0.00% of unresolved); source/hold-dependent upside ceiling 2827, **not additive or expected**. Dominant combinations: [('hdrncodislandest + p', 726), ('hdrncodislandest', 397), ('lmdrncodislandest + p', 303), ('lmdrncodislandest', 261)].

Evidence/exclusions: {'near_complete': 1324, 'parcel_peer_hold': 2827, 'unrelated_profile_issue': 2827, 'unsupported': 2827, 'coverage_failure': 28, 'cross_code_overlap_measured': 61, 'invalid_zoning': 18, 'repeated_code': 8, 'primary_mismatch': 173, 'address_point_outside_linked_parcel': 69}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Never strip NCOD suffixes or treat OS/R as an ordinary residential primary. Effort/QC estimate: 5–10 days; overlay-aware legal mapping plus source-wide intersections. Dependencies: Authoritative overlay provisions and full code registry; 1,073 pure unsupported profiles require complete intersection QC. Generalizability 4/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 9. Authoritative invalid zoning geometry replacement

Affected 2355 addresses / 1621 IDs; enhanced QC-pass 0 / 0 IDs. Planning fraction 0, recovery 0 (0.00% of unresolved); source/hold-dependent upside ceiling 2355, **not additive or expected**. Dominant combinations: [('lmdr + mdr', 640), ('lmdr + mhdr', 334), ('i + lmdr', 235), ('hdr + lmdr + mdr + mhdr', 183)].

Evidence/exclusions: {'invalid_zoning': 2355, 'near_complete': 1358, 'coverage_failure': 622, 'repeated_code': 271, 'primary_mismatch': 42, 'cross_code_overlap_measured': 218, 'same_code_overlap': 105, 'missing_primary': 1, 'parcel_peer_hold': 24, 'representative_point_inconsistent': 1, 'unrelated_profile_issue': 1, 'address_point_outside_linked_parcel': 4}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Repairing geometry locally does not establish the legal boundary. Effort/QC estimate: 5–10 days plus municipal source turnaround. Dependencies: City-corrected authoritative geometry/version. Generalizability 5/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

### 10. Coverage and cross-code topology reconciliation

Affected 2753 addresses / 1326 IDs; enhanced QC-pass 0 / 0 IDs. Planning fraction 0, recovery 0 (0.00% of unresolved); source/hold-dependent upside ceiling 2753, **not additive or expected**. Dominant combinations: [('p + us19', 576), ('irt + lmdr + mdr + mhdr + o', 478), ('mdr + o', 300), ('i + mdr', 197)].

Evidence/exclusions: {'coverage_failure': 2753, 'near_complete': 1724, 'address_point_outside_linked_parcel': 97, 'missing_primary': 40, 'parcel_peer_hold': 103, 'primary_mismatch': 47, 'representative_point_inconsistent': 40, 'unrelated_profile_issue': 38, 'cross_code_overlap_measured': 208}. The investigation changes no existing codes; changed/new-code or discordant-primary cohorts would require separate regulatory authorization. Unresolved original flags remain. Risk: Summed coverage is not union coverage; excess and gaps can cancel. Effort/QC estimate: 5–10 days plus City clarification. Dependencies: Authoritative topology and boundary interpretation. Generalizability 5/5: the mechanism may transfer; municipality-specific district interpretation, source tolerances and approvals do not.

## Recommended priorities

- **Biggest immediate volume lead:** near-complete mixed-use pairs, 1879 enhanced-screen addresses. Planning yield is conditional and requires district-aware stratified QC; this entire bucket is not a proposed rule.
- **Best systemic fix:** geometry- and identity-aware triage that distinguishes union coverage, cross-code overlap, edge-confined secondaries and repeated condominium footprints while retaining original REVIEW. Apply it to multiple cohorts as a research queue, not an automatic zoning resolver. The opportunities are disjoint; their common mechanism is not extra recovery.
- **Highest-volume difficult problem:** unsupported/NCOD support (2,832 flag-bearing addresses, with 2,827 assigned to this opportunity after earlier human holds). Preserve overlays and obtain applicable legal provisions. Invalid-source and topology cohorts also require authoritative inputs before recovery can be estimated defensibly.
- **Rule 004 next bounded QC:** existing HDR + LMDR, HDR ≥99%, all enhanced safeguards: **364 addresses / 364 parcel IDs / 2 identical-geometry groups**. This is narrower than the broad ranked residential opportunity and has a modest, auditable inspection burden. Its conditional maximum additional guidance-ready count is 364, with **0 currently approved or legally confirmed**. It is chosen for bounded evidence and QC efficiency, not because it is the largest raw group.

Largest structural obstacle: a raw GIS overlap and a chosen representative point cannot establish project-specific zoning applicability, density rights or shared-land ownership. Broad numerical rules can mask real commercial/institutional or conservation restrictions. Correct authoritative geometry, overlay-aware regulatory interpretation and parcel-specific evidence are needed for the difficult remainder.
