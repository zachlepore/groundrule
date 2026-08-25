# Groundrule Beta V1 design

## Product principle

Groundrule exists to stop municipalities from answering the same simple property questions every day. **We are not replacing the planner. We are removing the calls that never needed a planner.** The resident experience should produce the feeling: “That was obvious.”

Groundrule is a narrow self-service guide for repetitive, property-specific questions. It is not a comprehensive zoning platform, AI planning assistant, permit-intake product, development-feasibility system, or substitute for municipal judgment.

## Answers Before Questions

The resident principle is **Answers Before Questions**. The default flow is:

1. **Address** — find a supported property using trusted municipal/property data.
2. **Topic** — show only real, available workflows.
3. **Answer** — immediately render useful property-specific guidance.

The Clearwater reference flow is address → Fence → guide. Basic guidance must not be withheld behind project-detail questions.

If a workflow requires a long resident questionnaire to produce basic guidance, either:

A. Groundrule should derive more of the required information itself, or

B. the question is too complex for the simple self-service product and should be escalated to municipal staff.

## Property trust treatment

The guide gives a quiet signal that it used the resident's property rather than presenting a generic FAQ. Place a compact, cool-neutral **Property data used** strip beside or immediately below the address. Show only friendly interpretations of trusted stored facts, such as a zoning designation actually returned for the property.

Property context is secondary to the answer. Never invent lot position, waterfront status, parcel size, setbacks, or land use. Never expose parcel identifiers, source object identifiers, raw fact keys, GIS language, evaluator states, or database terminology. A code such as LMDR must be labeled as zoning rather than left unexplained.

## Semantic color system

The page remains primarily warm off-white, white, dark type, quiet borders, and restrained Groundrule green. Color communicates category subconsciously rather than acting as a traffic light:

- **Property information:** a very light cool blue-gray or neutral tint.
- **What you can do:** a pale, restrained green tint with dark text.
- **Before you build:** neutral editorial white/off-white.
- **Check this:** an extremely light warm cream or amber tint.
- **City confirmation:** neutral or warm restrained panel, reserved for real unresolved judgment.

Do not use saturated green, blue, yellow, or red. Do not turn semantic colors into generic SaaS cards.

## Box and answer grammar

Boxes exist to make scanning easier, not to decorate every paragraph. All panels share a small radius, one-pixel border, generous but economical padding, uppercase compact labels, strong primary answers, and quieter qualification text. Shadows are unnecessary.

**Answer cells** form a two-by-two desktop summary and a single readable mobile column. The order is answer first, qualification second, source third. Values and conclusions always come from structured guide presentation data, never React literals.

**Property context** is a single subdued metadata strip. **Process** uses a numbered sequence rather than independent cards. **Check this** groups one conditional explanation and its diagram. **City confirmation** is used only under the escalation rule below.

## Before You Build

Use **Before you build** for concise, ordered actions supported by rule outcomes, such as an application, permit, or final inspection. Translate municipal procedural language into clear resident instructions without adding unsupported steps. Groundrule explains what must happen; the municipality still accepts, reviews, and approves the actual application.

## Check This

Use **Check this** for simple conditional guidance that is broadly useful without another question. State the recognizable trigger first: for example, “Near a driveway or street corner?” Then explain what applies if the resident is building there.

Do not assert that the condition applies to the property when trusted data cannot establish that. Diagrams may explain a rule but must not imply a survey or site determination. Measurements, restrictions, and citations remain structured and data-driven.

## City Confirmation

Use **Need city confirmation** only when a genuinely material property or project detail cannot be reliably derived and requires professional judgment. It contains:

- a short explanation of what Groundrule cannot determine;
- one concise, specific question to ask municipal staff; and
- the supported municipal contact action.

Do not use city confirmation for every uncertainty. Simple conditional guidance belongs in **Check this**; routine answers should eliminate calls.

## Citations

Authoritative access is never removed. Present citations compactly as `Source · § …`, with an accessible label that identifies the full source. Citation hierarchy is answer first, qualification second, source third. Links must be comfortably tappable and visually subordinate, never hidden or replaced with fabricated sources.

## Questionnaire removal and complexity escalation

The Clearwater Fence resident guide ends after **What you can do**, **Before you build**, and **Check this**, apart from a restrained new-search action or genuinely useful municipal contact. It has no “Check my fence,” refinement questionnaire, continuation funnel, eligibility check, chatbot, or substitute wizard.

Generic evaluator and question-planning infrastructure may continue to support internal or future uses, but a long interview is not a resident product strategy. Groundrule either provides simple conditional guidance or stops at the boundary of planner judgment and offers a precise escalation.

## Mobile rules

Mobile is a primary layout, not a reduced desktop afterthought:

- Keep addresses large, readable, and safely wrapping.
- Stack answer cells into one column at iPhone widths.
- Let property metadata wrap without clipping or horizontal scrolling.
- Preserve large primary values and generous touch targets.
- Keep citations readable and tappable.
- Scale diagrams fluidly while retaining legible labels and captions.
- Keep process steps brief and vertically ordered.
- Reduce excess space, not type or tap targets.

## Visual restraint

Groundrule should feel trustworthy enough for municipal use without imitating a municipal website. Do not use seals, stock or AI imagery, hero illustrations, gradients, glass effects, dashboard chrome, large shadows, neon color, chatbot styling, or unnecessary animation. Favor typography, spacing, borders, and subtle background shifts.

Design for a resident with low technical literacy. They should understand the address entry, topic, primary limits, material restriction, permit status, conditional warning, and official sources without knowing zoning, GIS, evaluator, or legal terminology.

## Intentional non-goals

Groundrule does not provide comprehensive zoning exploration, development feasibility, permit submission, planner automation, project design, or resolution of complex cases through long questionnaires. It does not manufacture precision from missing property data and does not present guidance as a permit or City approval.

## Reusing Beta V1 for future workflows

Every future workflow should preserve the pipeline: municipal/property data → rule evaluator → structured guide presentation → resident UI. Add a topic only when it is genuinely supported. Reuse the address/topic/answer sequence, trust strip, semantic sections, answer hierarchy, process list, conditional pattern, escalation boundary, and compact citations.

Regulatory values and conclusions belong in rule and presentation data. Components render the shared grammar. A future guide may omit a section that has no supported content; empty space is preferable to filler or an engagement funnel.

GROUNDRULE BETA V1 DESIGN LOCKED
