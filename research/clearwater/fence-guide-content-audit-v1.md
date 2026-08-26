# Clearwater fence guide content and property-data audit V1

## Scope and authority

This audit covers the canonical CLEAN property **1950 DREW PLZ**, whose only
server-exposed evaluator property fact is
`property.zoning_district = "lmdr"`. It reviews the committed Clearwater Community
Development Code extraction, the reconciled rule package, published seed and
forward-only resident-rule migration, rule relationships, tests, and authoritative
GIS snapshots. It does not treat a missing fact as a negative fact and does not
change regulatory semantics or an applied migration.

## 1. Chain-link finding

**Classification: 2. DIFFERENT RULES — PRESENT CHAIN-LINK SEPARATELY.**

Section 3-804 expressly says its height requirements apply to all fences and walls
**except chain-link fences**. Section 3-805 supplies the separate chain-link regime.
This is why the presentation said “non-chain-link”: it was a real scope boundary,
not uncertainty and not a general chain-link prohibition. The phrase was nevertheless
too cryptic for a resident.

Answers to the audit questions:

* **A — General allowance:** Chain-link is available on ordinary, non-Downtown
  property only through § 3-805's conditions. It is not generally allowed in every
  yard or location.
* **B — Separate treatment:** Yes. It has separate height, location/yard, design,
  screening, and right-of-way restrictions. It is prohibited in Downtown; on a
  developed parcel it must be behind the principal structure's front building line;
  between the structure and a side/rear line it is limited to 48 inches, or six feet
  when clad in green or black vinyl; it is prohibited where that side/rear line is
  adjacent to a public right-of-way; and its full length must be landscaped with the
  specified hedge or nondeciduous robust-growing vine. It cannot have exposed top
  points, wires, or prongs. Listed recreational facilities, vacant lots, and public
  landbank property have special pathways. The section does not impose a separate
  opacity rule or separate permit process merely because the fence is chain-link.
  General sight-visibility restrictions remain independently applicable. The
  committed authority does not establish a chain-link-specific waterfront rule;
  § 3-804's waterfront language sits in a schedule that expressly excludes
  chain-link, so no waterfront answer for chain-link is inferred.
* **C — Existing wording:** The ordinary 4-foot and 6-foot outcomes are modeled with
  `project.is_chain_link = false`; § 3-805 rules are related as more specific than
  the ordinary side/rear rule. The qualification correctly guarded those outcomes,
  but failed to explain the different regime.
* **D — Front maximum:** No. The ordinary four-foot front-yard maximum does not apply
  to chain-link. Chain-link generally may not be in front of the principal structure
  and must be behind its front building line, subject to the recreation exception.
* **E — Side/rear maximum:** Not as a general rule. Chain-link has a 48-inch baseline
  and a six-foot green/black-vinyl pathway, plus the public-right-of-way prohibition
  and landscaping requirement.
* **F — Resident relevance:** Yes, but only as a clearly identified separate regime.
  It must not be reduced to “ordinary, non-chain-link.” Because this answers-first
  guide does not yet ask material or segment questions, the baseline cards now state
  that chain-link follows different rules rather than pretending the ordinary
  dimensions cover it. A future chain-link result should be composed from the
  existing structured § 3-805 outcomes, not hard-coded into React.

No regulatory-data migration is required. The published provisions, rule conditions,
input dependencies, outcomes, and specificity relationship already model this split.

## 2. Waterfront finding

**Canonical-property classification: 4. NOT CURRENTLY KNOWN.**

“Protected waterfront area” is presentation shorthand, not a Code-defined parcel
class, mapped overlay, or zoning district in the reviewed package. Section 3-804.B.3
actually applies when both conditions are true:

1. the property is adjacent to water; and
2. the proposed fence is within **20 feet of the property line adjacent to the
   water**, or within the **required setback**, whichever protected distance is
   greater.

Within that location the fence must be non-opaque and cannot exceed four feet. The
20 feet is therefore measured landward from the water-adjacent property line to the
proposed fence. If the applicable required setback is greater, its boundary controls.
It is a waterfront-yard/segment geometry test, not mere proximity to any waterbody.

Groundrule cannot currently evaluate it for 1950 DREW PLZ. The imported layers contain
address points, parcel polygons, and zoning polygons only. A parcel outline alone does
not identify which boundary is legally adjacent to water, does not supply an
authoritative water/shoreline boundary, does not establish the applicable required
setback, and says nothing about a proposed fence segment. Absence of
`property.is_water_adjacent` is not `false`.

The smallest authoritative data addition would require: (a) a current City/Pinellas
authoritative hydrology or shoreline/water-boundary layer appropriate to the Code's
“adjacent to water” test, or an authoritative parcel waterfront-adjacency field; (b)
the authoritative applicable required-setback value and geometry for the parcel; (c)
the identified water-adjacent property line; and (d) proposed-fence geometry. The
derivation must retain source/version and measurement provenance. Only then can the
system compute the greater of 20 feet or the required setback. Current data supports
neither **Waterfront · No** nor **Waterfront · Yes**, so neither appears in the UI.

## 3. Trusted-property fact inventory for 1950 DREW PLZ

| Candidate | Observed value | Classification | Resident display decision |
|---|---|---|---|
| Address | 1950 DREW PLZ | TRUSTED — authoritative address point and matched parcel | Display as the page's primary identifier |
| Zoning | LMDR / Low Medium Density Residential | TRUSTED — City zoning polygon at parcel representative point; CLEAN validation | Display concise code as **Zoning · LMDR** |
| Municipality/jurisdiction | Clearwater / `clearwater-fl` | TRUSTED — address `MUNICIPALITY`, parcel city, lookup scope | Do not add to strip; the workflow brand and disclaimer already say Clearwater |
| Parcel identifier | 122915557820250300 | TRUSTED — matched address and parcel source identifier | Do not display; no benefit to this fence answer |
| Postal place/state/ZIP | Clearwater, FL 33765 | TRUSTED source attributes | NOT USEFUL TO RESIDENT in the trust strip |
| Parcel use/classification | source `LAND_USE_CODE = 01` | AMBIGUOUS for resident use — no committed authoritative label/semantic normalization | Do not display or infer dwelling/use facts |
| Parcel geometry / representative point | polygon; `[-82.755886..., 27.968518...]` representative point | TRUSTED source geometry; representative point is DERIVED WITH HIGH CONFIDENCE | NOT USEFUL TO RESIDENT; retain for GIS audit only |
| Address coordinates | `[-82.755904..., 27.968519...]` | TRUSTED source geometry | NOT USEFUL TO RESIDENT |
| Parcel area | No authoritative area attribute imported; calculable from polygon | DERIVED WITH HIGH CONFIDENCE geometrically, but NOT AVAILABLE as a validated profile fact | Do not display |
| Waterfront status | no field or authoritative water layer | NOT AVAILABLE | Do not display |
| Corner-lot status | no legal frontage/ROW classification | NOT AVAILABLE | Do not display |
| Through/double-frontage status | no legal frontage/orientation classification | NOT AVAILABLE | Do not display |
| Frontage | no authoritative front-line designation or validated length | NOT AVAILABLE | Do not display |
| Street adjacency | parcel topology alone does not establish legal frontage | AMBIGUOUS | Do not display |
| Right-of-way adjacency | no authoritative ROW layer/classification imported | NOT AVAILABLE | Do not display |
| Driveway presence | no driveway layer or field imported | NOT AVAILABLE | Do not display |
| Zoning overlay/special area | source zoning requested `SPECIAL`, but no affirmative profile fact is normalized or server-exposed for this property | AMBIGUOUS | Do not display or infer “none” |
| Flood information | no flood layer/field imported | NOT AVAILABLE | Do not display |
| Principal structure/vacancy | no building/use source normalized | NOT AVAILABLE | Do not display |

The source snapshots also contain internal object IDs, match method, validation state,
retrieval timestamps, and hashes. They are valuable provenance but are not resident
property facts.

## 4. Recommended trust strip

Only one fact presently earns a place:

| Resident label/value | Authority | Stored source | Raw/derived | Workflow value |
|---|---|---|---|---|
| **Zoning · LMDR** | City of Clearwater zoning service, joined to the authoritative parcel/address snapshot | CLEAN property profile `normalizedZoningCode`, emitted server-side as `property.zoning_district` | Normalized from raw `LMDR` after spatial match and validation | Quietly shows that the applicable zoning district was used without dumping parcel metadata |

The address itself is trusted and displayed as the heading, rather than duplicated in
the strip. No Waterfront, Corner lot, Through lot, frontage, flood, use, or overlay
claim is added. Property facts remain server-controlled: the server performs lookup
again and overlays the stored CLEAN zoning fact.

## 5. Fence permit destination

**PERMIT CTA DESTINATION NOT YET VERIFIED.**

The regulatory package authoritatively supports a building permit before construction,
submission of the application and applicable plans for City review, and a final
inspection. It does not contain a verified resident action URL. Searches for an
official City fence-specific page, general building application containing fences,
and the Clearwater online permitting portal did not yield a repository-verifiable
destination that established the fence workflow, account requirement, and pre-click
documents. A plausible portal name or URL is not enough. The production CTA therefore
remains absent.

Next task: verify, on a reachable official Clearwater page, the deepest stable fence
application destination; whether it starts an online application or supplies a form;
whether login is required; and the fence-specific site plan/survey/product documents,
if any. Store that action destination separately from regulatory citations and cover it
with a guide test before rendering the CTA.

## 6. Materials-rule finding

Section 3-802.C is unequivocal: no fence or wall may be made of corrugated or sheet
metal. This is a prohibition, not advice, discouragement, or a special-approval path.
The seeded `material.metal_prohibition` outcome already has prohibition type/severity
and says the materials “may not be used.” The former word **Avoid** softened the rule.
The resident answer is now **Corrugated or sheet metal fencing is not allowed**.

The package does not provide a complete affirmative list of common allowed materials.
It requires material appropriate to purpose/location, requires wire fences to use
chain-link wire, and regulates masonry/decorative finishes and hazardous materials.
Those provisions do not justify inventing a complete “allowed materials” list.

## 7. Problem classification

### A. Copy problems

* “Ordinary, non-chain-link” hid a real, materially different chain-link regime.
* “Protected waterfront area” hid the actual adjacency and dimensional test.
* “Avoid” understated a categorical material prohibition.

### B. Presentation problems

* The guide repeated project context in “Clearwater fence guide” and “Fences at.”
* The ordinary height cards need clear exception language until a dedicated,
  outcome-driven chain-link presentation is implemented.
* The address, not repeated workflow labels, should be the primary guide heading.

### C. Property-data gaps

* No affirmative waterfront-adjacency fact or authoritative water/shoreline layer.
* No required-setback geometry, legal frontage/lot type, ROW/street classification,
  driveway, building/vacancy, flood, or normalized overlay fact.
* No proposed-fence geometry for waterfront measurement.

### D. Regulatory-data gaps

The ordinary, chain-link, waterfront, materials, permit-duty, and visibility rules
needed for this copy audit are supported. The package does not resolve how the
waterfront rule interacts with chain-link because § 3-804 expressly excludes
chain-link and § 3-805 supplies no waterfront term. That question must be researched
before presenting a chain-link waterfront conclusion. Qualitative chain-link
landscaping adequacy and “similar” recreation uses still require City judgment.

### E. Action-link gaps

The permit duty is known, but a direct official resident initiation URL, account
requirement, and pre-click document list remain unverified. No CTA is rendered.

## 8. Narrow implementation changes

* Removed “Clearwater fence guide” and “Fences at”; the address is the sole heading.
* Replaced the chain-link shorthand with explicit notice that it follows a separate
  regime and explained the front restriction and side/rear categories without moving
  numeric thresholds into React.
* Replaced vague waterfront shorthand with the supported 20-foot/property-line versus
  required-setback test in adapter copy. It is conditional and makes no claim about
  this parcel.
* Strengthened the materials headline to match the prohibition.
* Added tests for the prohibition wording, simplified heading, and continued absence
  of unverified resident claims/action URLs.

No evaluator, GIS adapter, property schema, rule data, or migration was changed.

## 9. Remaining smallest research/data tasks

1. Acquire and validate the waterfront sources/geometry listed in section 2 before
   evaluating or displaying waterfront status.
2. Research the chain-link/waterfront interaction from current official Clearwater
   authority or obtain an official interpretation; do not infer one by combining
   §§ 3-804 and 3-805.
3. Verify the official permit initiation destination and application prerequisites.
4. If a dedicated chain-link primary answer is added, compose it from the published
   § 3-805 outcomes and request only genuinely outcome-determinative facts; do not
   hard-code its thresholds in React or alter an applied migration.

## 10. Canonical resident wording after this audit

> **1950 Drew Plz**
>
> Zoning · LMDR
>
> Guidance only · Based on current Clearwater rules and property data · Not a permit
> or City approval
>
> **WHAT YOU CAN DO**
>
> **FRONT YARD**  
> 4 ft maximum fence height  
> Chain-link is not allowed in front of the principal structure and follows separate
> rules.
>
> **SIDE + REAR**  
> 6 ft maximum fence height  
> For fences other than chain-link. Chain-link and water-adjacent locations follow
> different rules.
>
> **MATERIALS**  
> Corrugated or sheet metal fencing is not allowed
>
> **PERMIT**  
> Required
>
> **NEAR A DRIVEWAY OR STREET CORNER?**  
> Existing outcome-driven visibility guidance and diagram.

No **Waterfront · No**, **Corner lot · No**, or permit CTA appears.

**CLEARWATER FENCE CONTENT HAS REMAINING DATA GAPS**
