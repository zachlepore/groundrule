# Findings after Batch 4A

October 6, 2026. Human official-viewer research only; no production behavior change.

The set now holds 25 reviewed cases: 20 single-zone confirmations, 4 true splits (including one explicitly multipart case), and 1 unresolved staff-review case. Batch 1B remains skipped without human decisions.

| Case | Exact human result | Reference interpretation |
|---|---|---|
| 4A-01 | CONFIRMED: LMDR | Minor C boundary intersection; technical ambiguity |
| 4A-02 | CONFIRMED: LMDR | Competing C intersection not meaningful in the viewer |
| 4A-03 | CONFIRMED: C | Small LMDR clip does not establish a meaningful developed-property split |
| 4A-04 | UNCLEAR / STAFF REVIEW — C / LMDR | Public evidence does not establish one authoritative answer; residential use cannot override mapped zoning |
| 4A-05 | TRUE SPLIT / MULTIPART PARCEL — LMDR / C | Human reports linked disconnected parcel components in different districts; preserve multipart split subtype |

The full notes, dates, methods, diagnostic percentages and source lineage live in `reference-dataset.json`. The raw result and ordered zone list remain unchanged. The staff-review record has no verified zone list; reported C/LMDR context is retained separately.

A minor edge/corner intersection between development districts does not by itself prove TRUE SPLIT. A zoning boundary or the placement of parcel components in different districts must be materially meaningful according to authoritative evidence. True split, multipart split and unresolved uncertainty remain separate outcomes. Neither dominant area, address-point location nor current physical land use replaces that interpretation.

These examples do not establish a universal threshold or authorize an automated rule. The research subtype for multipart splitting is reported by the human viewer inspection; it is not independently established from a raw parcel geometry upload. No production classifier, canonical data, Supabase, Guides or resident UX has been modified.
