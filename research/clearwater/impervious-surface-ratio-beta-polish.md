# Clearwater ISR post-planner beta polish

## Audit and resource search

The existing route remains a thin address-to-result workflow: trusted property lookup, Clearwater jurisdiction gate, property-fact adaptation, structured-rule evaluation, and presentation adaptation. The LMDR maximum is still read from the evaluator's structured `maximum` outcome. Unsupported contexts remain **Needs confirmation**. No current-coverage, remaining-capacity, additional-area, geometry, footprint, or aerial calculation was added.

Committed research contained no City worksheet URL. On September 2, 2026, searches were attempted for the planner-described worksheet using the requested worksheet, calculation, and ISR terms, restricted to the City's `myclearwater.com` and `clearwaterfl.gov` domains. The web search service returned an authorization error, and direct requests to the City domain were blocked by the environment's network proxy with HTTP 403. The official resource's current title, URL, format, instructions, and purpose therefore could not be confidently verified. Per the stop condition, no worksheet action is exposed to residents. This remains a targeted follow-up for a browser-enabled verification pass; a City URL must not be inferred from likely filenames.

## Resident explanation and Shed consistency

The concise “What counts as impervious?” copy uses only examples expressly supported by CDC § 8-102: roofs, sidewalks, parking areas, compacted sand, limerock, shell, and clay. Streets are omitted as less useful in this property-focused explanation. Gravel, artificial turf, pavers, decks, pools, dirt, landscaping, patios, and driveways are not classified because the reviewed authority does not expressly resolve each resident-facing category. Including roofs is consistent with the Shed Guide's structured conclusion that a shed roof counts even where the floor is dirt; the ISR Guide does not repeat or broaden that Shed rule.

## Future CAD asset specification

- **Placement:** insert the educational figure after “What counts as impervious?” and before a future verified City worksheet action. The maximum answer and scope note must remain above it and visually dominant.
- **Canvas:** use an approximately 4:3 landscape view, with generous internal margins so labels remain legible when the figure is reduced to a single mobile column.
- **Required elements:** a clearly marked example parcel boundary; house roof footprint; driveway and sidewalk/walkway; landscaped/pervious area; a restrained legend that visually distinguishes impervious from pervious areas; simple example-area labels; and the conceptual equation “total impervious surface area ÷ gross land area = example ISR.” Only include a patio if separate authoritative review supports that classification before export.
- **Labels and caveat:** label the drawing “Example only — not your property.” Label areas as illustrative rather than regulatory or surveyed. Do not show setbacks, buildable area, remaining capacity, approval status, or dimensions that could be mistaken for standards or facts about the resident's parcel.
- **Export:** prefer optimized, text-accessible SVG for crisp responsive rendering. Preserve a readable viewBox and avoid rasterized labels. If a raster fallback is needed, export at least 2× the largest rendered CSS size.
- **Responsive behavior:** keep the full parcel visible without horizontal scrolling, verify labels at 320 CSS pixels, avoid relying on color alone, and allow the legend to stack below the drawing on narrow screens.
- **Accessibility:** proposed alt text: “Example parcel showing a house roof, driveway, and walkway as impervious areas, contrasted with pervious landscaped area; total impervious area divided by gross land area gives the example ISR.” A nearby visible caption must repeat that the example is educational and is not based on the resident's property.

No structured rule or migration changes are required for this presentation-only pass.
