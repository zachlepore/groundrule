# Clearwater fence planner correction audit V1

## Scope and inspected architecture

This correction pass inspected the Fence workflow and server action, the resident-guide adapter, evaluator and presentation types, property-profile fact adapter, both published Fence migrations, Fence regression fixtures, the committed Community Development Code extraction, the reconciled Fence rule package, the content/data audit, and the verified permit-CTA note. The existing architecture remains: a jurisdiction-gated stored property profile supplies zoning to the evaluator; published structured rules supply outcomes and citations; and `buildClearwaterFenceGuide` turns those outcomes into the resident presentation.

## Visibility correction: stopped because the committed authority conflicts

The existing 30-inch treatment originated in § 3-904.A. The committed authoritative Code text says that no structure or landscaping may obstruct views from 30 inches through eight feet above grade within the depicted triangle, unless the City Engineer approves otherwise. The August 24 resident-rule migration interpreted that text and a manually recovered figure as allowing a non-opaque fence no higher than 30 inches and published `visibility.triangle_restriction` and `visibility.triangle_conflict` on that basis.

Abi's newer direction that no fence is allowed in the applicable visibility triangle materially conflicts with both the committed § 3-904 text interpretation and the published rule/citation record. Following the task's stop condition, this pass did **not** change, hide, or supersede that rule. Resolution requires the current official figure or another authoritative City clarification confirming whether § 3-904.A prohibits every fence despite its obstruction-height wording. A future correction must use a forward-only rule-version migration; it must not edit either historical migration.

## Planner-workflow audit

| Item | Status | Finding |
|---|---|---|
| Height transition at the principal structure's road-facing leading edge | **D — cannot be safely automated from current property facts** | Structured front and side/rear rules use project location relative to the principal structure, but the property adapter supplies zoning only and has no structure or proposed-fence geometry. The answers-first guide therefore presents both applicable categories rather than claiming a segment classification. |
| Front vegetation-buffer treatment | **A — structured correctly; presentation improved** | § 3-804 and the published `design.front_landscape_strip` outcome model the three-foot right-of-way-side strip for a fence over three feet. The front card now explains that the structured full maximum requires the evaluator-derived buffer. |
| Corner/multi-frontage lots | **D — cannot be safely automated from current property facts** | `frontage.corner_multi_review` captures the addressed-front, adjoining-character, open-style, and street-classification review. No trusted frontage or neighboring-pattern fact is exposed. |
| Double-frontage/full-block lots | **D — cannot be safely automated from current property facts** | The four- and six-foot opposite-frontage outcomes are structured, but legal frontage, neighboring orientation, and arterial/collector classification are unavailable. Abi's “full block” description cannot be collapsed into an automatic result without those facts. |
| Downtown/Tourist materials | **D — cannot be safely automated completely from current property facts** | Downtown chain-link prohibition is structured, and § 3-803 identifies Downtown and Tourist design regimes. The property adapter exposes only base zoning, not a reliable special-area/overlay classification or the incorporated design-guideline decisions needed for a complete materials answer. |
| Easements | **B — rules structured, resident answer incomplete; corrected in presentation** | § 3-806 and the `access.*` rules distinguish prohibited public/drainage/right-of-way placement from conditional utility access. The guide now says zoning guidance does not authorize interference with utility/access rights and directs the resident to staff/utility review. |

## Government adjacency and waterfront

Government-property adjacency is not a canonical property fact and cannot be inferred from the current address/parcel/zoning snapshot. The guide therefore presents a self-identifiable Specific Situation and explicitly says Groundrule cannot detect it; it never produces automated approval. A future canonical fact should distinguish City/County ownership, adjacency source and date, shared boundary, owning agency, and proposed-fence contact with that boundary.

The published waterfront outcomes are supported by § 3-804, but current profiles have no trusted waterfront classification, legal water-adjacent line, required setback, or proposed-fence geometry. The former ordinary side/rear copy was too definitive because it embedded the waterfront conclusion for every profile. It now withholds a parcel-specific conclusion and directs waterfront residents to Planning & Zoning. Future canonical facts should retain authoritative waterfront adjacency, the identified water-side property line, applicable setback and provenance; proposal geometry is still needed to evaluate a fence segment.

## Contact and permit pathway

The official Fence Permit Application Checklist URL remains verified in the committed August 26 permit-CTA note and remains the single permit action. Current Planning & Zoning phone/link details could not be independently verified: internet search returned an authorization failure and the official website request was blocked by the environment. No phone number or unverified contact URL was added. The UI uses the planner-confirmed department name, **Clearwater Planning & Zoning**, as the direct next step without fabricating contact details.

## Change boundary and deployment

This pass changes only Fence guide composition, Fence workflow copy, Fence tests, and this audit. It adds no GIS ingestion, schema changes, rule versions, migrations, or remote database actions. **SUPABASE ACTION REQUIRED: NO.**
