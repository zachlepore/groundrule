# Clearwater human zoning reference set

`reference-dataset.json` preserves decisions reported by the human reviewer after inspecting Clearwater's official zoning viewer. Diagnostic intersections and percentages remain separate from the human interpretation. This is a research reference set; it has no production effects.

## Reviewed evidence

There are 20 reviewed cases: 17 single-district confirmations and 3 true splits. Batch 1B's five cases were skipped without human labels.

| Batch | Class | Human results |
|---|---|---|
| 1A | Microscopic LMDR/OS/R intersections | 5 confirmed LMDR |
| 1C | Lower-dominance LMDR/OS/R | 5 confirmed LMDR, down to 96.887830% LMDR |
| 2A | LMDR/P | 5 confirmed LMDR, including nearly 49.4% competing P coverage |
| 3A | LMDR/MDR | 2 confirmed LMDR and 3 true splits |

All recorded reviews occurred October 6, 2026. Raw results and notes are preserved exactly, including the `MDR / LMDR` ordering for 3A-05. [The findings report](review-findings-3a.md) explains the evidence and sampling limits. [The Preservation research](p-preservation-research.md) establishes the meaning of P and preserves the separate open investigation for 2A-03. Neither report establishes a universal tolerance.

## Continuing human review

Present exactly five properties at a time, grouped by recurring ambiguity class. Include case ID, address, string parcel ID, dominant and competing codes, diagnostic percentages and selection reason. Parcel geometry uploads are not required for this human workflow.

Record only explicitly answered cases. Preserve the human result and note verbatim, review date, verification method `Clearwater official zoning viewer`, reviewer attribution, diagnostic candidates/percentages and source lineage. Use `human_confirmed`, `human_true_split`, or `human_staff_review` to distinguish single-district confirmation, genuine split and reviewed uncertainty. A staff-review result is not a verified zoning code. Unanswered or skipped cases must retain null human results and dates.

Reviewed zone arrays are research annotations. True splits must not be forced to a dominant district or address-point district. The conceptual future split property fact and resident wording are stored only as unimplemented human observations. Do not extrapolate an individual decision to other parcels, implement resolver rules or thresholds, or alter production classification, CLEAN/REVIEW status, Supabase, Guides or UX.

LMDR/OS/R and LMDR/P sampling are paused at the user's request. The next approved class is LMDR versus Commercial (C), with broad dominant-coverage sampling and geographic variety where practical. Ask before proposing generalized resolver rules.

## Provenance and persistence

Commit the small reference JSON and supporting Markdown documentation to Git. Per-file hashes and the source Actions run identify the frozen diagnostic evidence without embedding large source snapshots. The original artifact ZIP and raw parcel source remain incompletely verified here; viewer results are attributed to the human, not independent automated validation.

Temporary uploaded files, raw GIS geometry, large archives and the historical automated packet are not required for interpreting these reviewed labels and are not part of the durable reference-set commit. Working research copies may remain outside Git. No remote push is implied by a local commit.
