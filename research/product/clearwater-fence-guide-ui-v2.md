# Clearwater fence guide UI v2

## Information hierarchy

The guide now opens with property context, a short scope disclaimer, and an answers-first summary. Front-yard height, side-and-rear height, permit status, and materials are set in an editorial two-column layout so the conclusion can be scanned before its qualification and source. Procedural requirements, conditional visibility guidance, and optional project refinement follow in that order.

## What changed

- Primary conclusions have dedicated presentation fields and stronger type, while qualifications are visually subordinate.
- Permit guidance joins the immediate summary and remains in the complete procedural section.
- Existing procedural duties are rendered as a numbered list without adding a construction step or changing their order.
- Citation labels are shorter, spacing is tighter, and the explanatory diagram has a constrained desktop width.
- The optional **Check my fence** action remains after all immediate guidance.

## What was intentionally preserved

The address → project type → property guide flow is unchanged. The guide still appears without project questions. Trusted property lookup, validation state, evaluator behavior, municipal rule records, source targets, question planning, optional refinement, and safe failure for unsupported addresses are unchanged. No GIS data, database schema, RLS policy, migration, or regulatory source was modified.

## Regulatory values and the UI

Municipal rules continue through the evaluator into `buildClearwaterFenceGuide`. That structured presentation builder formats outcome parameters into answers, qualifications, visibility bullets, and diagram values. React only renders those fields; it does not contain fence heights, sight-area dimensions, permit decisions, or material restrictions.

## Citation treatment

Every substantive item retains its evaluator-provided citations and authoritative URL. The interface presents the first citation as a compact `Source · § …` link, with the full source title available in its accessible label. Citation targets are neither replaced nor fabricated.

## Mobile behavior

At phone widths the summary becomes a single column, headings and addresses wrap safely, the SVG remains fluid, and spacing is reduced without shrinking touch targets. Sources remain normal links and the refinement action remains comfortably tappable. The layout does not require horizontal scrolling.

## Remaining presentation limitations

Material conclusion wording still reflects the source outcome message and can vary in length. The diagram is explanatory rather than a survey or parcel-specific determination. Groundrule cannot determine whether a proposed fence enters the visibility area, and Clearwater must confirm exact applicability.

## Canonical 1950 DREW PLZ validation path

On `/clearwater/fence`, enter `1950 DREW PLZ`, continue, and select **Build or replace a fence**. The trusted lookup resolves the clean pilot property with `property.zoning_district = "lmdr"`; the evaluator then supplies the immediate guide. The presentation test confirms the LMDR fact survives guide construction, structured thresholds reach the summary and visibility metadata, citations remain attached, and the optional check follows the guide.

READY FOR ABI UI REVIEW
