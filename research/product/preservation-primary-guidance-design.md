# Preservation context alongside primary guidance — locked design direction

Recorded October 12, 2026 from the user's explicit design approval. **Design direction approved; implementation, classifier promotion, data changes and resident-facing Guide changes are not authorized.**

When a property has an independently established primary guidance district alongside a relevant Preservation intersection, retain the normal primary-zone Guide and show this exact contextual notice:

**Part of your property is mapped as Preservation**

"Your property also intersects a Preservation (P) zoning district. If your proposed work is within or near this area, additional restrictions may apply. Check Clearwater's official zoning map and confirm with Planning before proceeding."

Provide a link labelled **Clearwater's official zoning viewer**. Its destination must be the verified City viewer application, not a REST service, a guessed URL, or an unofficial map. The existing frozen source identifies the official zoning service at `https://gis.myclearwater.com/arcgis/rest/services/ArcGISMapServices/Zoning_WGS84/MapServer/1`; this is provenance, **not the viewer destination**. No verified viewer application URL is present in the repository. A read-only request to the official GIS host returned proxy CONNECT HTTP 403 during this task. Verify the viewer URL through the City before the separately authorized implementation; this missing URL does not change the approved wording or justify implementing now.

Use an informational, calm presentation. Do not imply P has legally disappeared, that every P polygon is water, or that a primary guidance interpretation eliminates restrictions within the P-designated portion. Preserve full original intersections, percentages, source lineage and exceptions. Keep park, stream, marina, genuine split and other meaningful Preservation context rather than turning physical use into a legal conclusion.

This context is most relevant to fences, sheds, pools, setbacks and impervious-surface work whose location may interact with Preservation. Avoid unnecessary warnings on unrelated Guides. Exact placement and interaction behavior are deferred to the authorized UX implementation task; no new UI components, warnings, routing, data schema or application code are part of this note.

This notice does not resolve a TRUE SPLIT case or establish which portion's district governs proposed work. It presupposes that primary applicability has been established through the approved research/data process. Unclear primary applicability and confirmed genuine splits require separate review, not an automatic primary Guide plus a notice. Rule 001 remains unapproved.
