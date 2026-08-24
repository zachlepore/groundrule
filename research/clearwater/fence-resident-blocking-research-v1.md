# Clearwater resident fence blocking research V1

## 1. Scope

This is the narrow follow-up required by the resident-flow audit. It addresses only (1) the
procedural permit/approval path for an ordinary fence on private residential property and
(2) the street/driveway sight-visibility triangle. It does not redesign the three-question
flow, re-audit the substantive fence standards, or complete the separate pool-barrier
branch.

The audit's precise gaps were: it could not say whether a normal residential fence needs a
permit or other approval, and it had the vertical sight-clearance rule but not the official
figure's horizontal geometry. The audit also correctly distinguishes the later pool-source
gap as nonblocking for the stated ordinary, no-pool scenario.

## 2. Sources reviewed

Authoritative source text was limited to the committed **City of Clearwater Community
Development Code and Building and Development Regulations**, Volume II, Supplement No.
55 (July 2026), containing ordinances through Ordinance No. 9857-25 (December 4, 2025), in
`clearwater-development-code.txt`. The entire extraction was searched, not only Article 3,
Division 8. Relevant provisions are:

* §§ 3-803.F and 3-807.B (all fences/walls must comply with § 3-904.A);
* § 3-904.A and its figure titled **“Sight Visibility Triangle”**;
* § 8-102 (definitions of `structure` and `visibility or sight triangle`);
* Article 4, Division 1 and §§ 4-202 through 4-204 (development approvals, applications,
  building permits, and occupancy permits);
* Chapter 47, Articles III–V, especially §§ 47.051, 47.081, 47.083, and 47.111 (adopted
  technical codes, permit administration, fees, and inspections); and
* § 47.084 only as a contrast: it expressly regulates temporary demolition fencing and is
  not the ordinary-homeowner rule.

Interpretive context was checked against the required existing research:
`fence-resident-flow-v1.md`, `fence-rule-package-v1.md`, and
`fence-regulatory-master.md`. The existing Clearwater seed migration,
`20260823000000_seed_clearwater_fence_rules.sql`, was reviewed for impacted atomic rules
and inputs. No non-Clearwater source, neighboring ordinance, blog, contractor page, or
permit aggregator was used as authority.

## 3. Permit/approval findings

### A. Zoning legality is not procedural authorization

Article 3, Division 8 determines whether a fence's material, design, height, placement,
and special characteristics comply. Words such as “permitted” in § 3-804 describe what is
substantively allowable; they do not waive Article 4's permit process. Article 4 expressly
says a building permit authorizes only construction allowed under the applicable Level One
minimum/flexible or Level Two approval.

### B. An ordinary anchored residential fence requires a building permit

Section 4-203.A.1 says no person may commence construction, demolition, modification, or
renovation of a building **or structure** without first obtaining a building permit.
Section 8-102 defines a structure as any human-constructed or installed object anchored to
the ground. An ordinary post-supported fence is therefore a structure under the Code. This
conclusion follows the Code's definition and is not inferred merely from § 3-804 allowing
fences.

The complete extraction contains no ordinary-fence exemption from § 4-203. Height,
ordinary material, and front/side/rear location change substantive compliance but do not
create a permit exemption in the reviewed Code. Replacement likewise falls within
“modification or renovation”; § 3-808.B's permission to replace boards on a legally
nonconforming fence without replacing posts is a substantive nonconformity rule, not a
permit waiver. A pool enclosure, retaining-wall/fence combination, marine work, public
project, flexible-height design, or temporary construction/demolition fence can add other
standards or approvals, but none negates the ordinary building-permit baseline.

### C. Review path and administrators

The application goes to the **Building Official** in the form required by the Development
Code and Building Official. Under § 4-203.B, the Building Official forwards it to the
**Community Development Coordinator**, who determines conformity with Level One minimum
standards or an applicable flexible/Level Two approval. The Building Official separately
determines conformity with the applicable building code; both determinations must be
favorable before issuance.

For an ordinary fence that meets Level One **Minimum Standard Development**, Article 4,
Division 1 says the building-permit application may proceed through building-permit review
without a separate development application. That is zoning review within the permit path,
not “no City approval.” A design expressly requiring Level One Flexible Standard
Development—for example, one of § 3-804's flexible front-height pathways—requires that
additional development approval.

### D. Application, plan, fee, and inspection consequences

Section 4-203.B requires the City's prescribed building-permit application. Section
4-203.A.4 states that complete engineering and architectural plans for each development
component must be submitted before issuance. The Code does not provide a fence-specific
site-plan checklist, survey exception, plan simplification, or fence-specific application
form in the extraction, so Groundrule should not invent required drawing contents. Section
47.081's design-professional exception for construction under $10,000 that does not affect
building structural components addresses professional sealing; it is not a permit
exemption.

Sections 4-202.F and 47.083 require applicable fees, but the reviewed text does not establish
a reliable ordinary-fence fee. The prior research remains correct not to treat Appendix A's
“fence erection” business classification as a homeowner permit fee.

Section 47.111 requires the permit holder or agent to request a **final inspection** on
completion and any other inspections required by the permit. No ordinary-fence-specific
intermediate inspection sequence was found. An occupancy permit is not shown to be the
ordinary fence closeout: § 4-204 governs occupancy/use of land or buildings, while § 47.111
directly supplies final-inspection administration.

### Permit conclusion

For a normal homeowner constructing, replacing, or materially modifying an anchored fence:

1. obtain a **City building permit before work**;
2. expect Community Development Coordinator zoning/development-standard review within the
   building-permit process;
3. obtain a separate Level One flexible or higher approval only when the chosen design or
   property condition invokes that pathway; and
4. request the final inspection required by § 47.111.

This blocker is resolved at rule-package level. A current form/checklist and fee would be
useful implementation content, but neither is necessary to answer whether approval is
required.

## 4. Visibility-triangle findings

### A. Applicability and trigger

Sections 3-803.F and 3-807.B make § 3-904.A applicable to **all fences and walls**. Section
3-904.A applies “at street or driveway intersections.” It regulates any structure or
landscaping that obstructs views within the prescribed triangle; thus a fence is covered
both expressly by the fence cross-references and as a structure.

This covers street intersections and driveway intersections. A corner lot is affected when
its proposed fence enters a street-intersection triangle, but corner-lot status alone does
not establish intersection with the triangle. Driveways are independent triggers, so an
interior lot can also be affected. Section 3-904.A does not state a separate alley triangle
or special alley dimensions. An alley is therefore not to be automatically treated as a
street or driveway without the missing figure/official interpretation.

The definition in § 8-102 describes the visibility/sight triangle as the area of the corner
lot closest to the intersection kept free of visual impairment for pedestrian and vehicle
views. That definition does not override § 3-904.A's express driveway application or supply
measurement geometry.

### B. Supported vertical restriction and exception

Within the triangle, no structure or landscaping may obstruct views at a level from **30
inches above grade through eight feet above grade**, unless otherwise approved by the
**City Engineer**. For a typical solid fence, this means the regulated obstruction band
begins below ordinary fence height; Groundrule cannot treat a short fence as compliant
unless it is no more than 30 inches high or the authoritative geometry/design establishes
that it does not obstruct the protected view. The text does not define an opacity percentage
or opening-size safe harbor.

Section 3-904.B is a different, waterfront-view triangle and must not be substituted for the
traffic triangle. Its non-opaque-fence/48-inch exception does not create a traffic-triangle
exception.

## 5. Exact dimensions and conditions where supported

| Element | Authoritative result |
|---|---|
| Locations | Street intersections and driveway intersections |
| Covered items | Structures and landscaping; fence/wall coverage is express via §§ 3-803.F and 3-807.B |
| Protected vertical band | 30 inches above grade to 8 feet above grade |
| Administrative exception | Otherwise approved by the City Engineer |
| Horizontal leg lengths | **Not recoverable from the committed text extraction** |
| Triangle vertices | **Not recoverable** |
| Measurement origin | **Not recoverable** |
| Lines/edges used (property line, ROW, curb, pavement, driveway edge, etc.) | **Not recoverable** |
| Alley geometry | No distinct rule supported in the recovered text |

The page contains a figure captioned exactly **“Sight Visibility Triangle”** immediately
after § 3-904.A. The extraction preserves the caption but none of the diagram's lines,
labels, dimensions, vertices, or measurement instructions. Accordingly, no horizontal
number can be approximated from prose. The separate 15-foot triangular sidewalk/utility
easement in § 3-1905.I concerns new-subdivision street design and is not the § 3-904 sight
triangle.

## 6. Cross-references and incorporated authority

The operative chain is §§ 3-803.F and 3-807.B → Article 3, Division 9 → § 3-904.A → the
embedded **“Sight Visibility Triangle”** figure. The exception authority is the City
Engineer. The provision does not cite FDOT, AASHTO, a City Engineering Index, a roadway
design manual, or another transportation standard. No external engineering standard may
therefore be used to fill the missing drawing unless Clearwater authoritatively identifies
it as the controlling version.

The permit chain is § 8-102's structure definition → § 4-203 building permit → Community
Development Coordinator and Building Official review, with Chapter 47 adopting the Florida
Building Code and administering fees and inspections. The Code's incorporated technical
code can affect specialized construction, but the municipal permit duty is independently
stated in § 4-203.

## 7. Product classification

| Blocker/component | Classification | Groundrule treatment |
|---|---|---|
| Ordinary permit duty | **AUTOMATABLE** | Always state that an anchored new/replacement residential fence requires a City building permit before work. |
| Ordinary minimum-standard review path | **AUTOMATABLE** + **INFORMATIONAL WARNING** | Explain that zoning review occurs within permit review; do not promise issuance. |
| Flexible/special approval | **CITY REVIEW REQUIRED** | Trigger only from a design/property rule that expressly requires it. |
| Application plans and final inspection | **INFORMATIONAL WARNING** | Tell the resident plans are required and a final inspection must be requested; link a current City checklist later rather than inventing contents. |
| Potential traffic-triangle applicability | **RESIDENT-ANSWERABLE** as a coarse warning trigger; potentially **PROPERTY/GIS-DERIVABLE** with new data | A resident can say a segment is near a street corner or driveway, but cannot classify legal geometry. |
| Exact traffic-triangle intersection/compliance | **CITY REVIEW REQUIRED** today | The controlling figure is missing, so do not calculate it. |
| City Engineer exception | **CITY REVIEW REQUIRED** | Record only an actual approval. |

V1 can safely say: **“Because your fence is near a street corner or driveway, additional
visibility rules may apply. Clearwater keeps views clear from 30 inches to 8 feet above
grade inside its sight triangle; confirm the fence line with the City before building.”**
It cannot safely calculate the horizontal restriction.

## 8. 1950 DREW PLZ implications

Known facts—CLEAN match, Clearwater jurisdiction, and LMDR zoning—are enough to automate
the ordinary **building-permit warning**, because the permit duty does not depend on zoning
district. They are not enough to decide whether a flexible approval is needed because the
proposed location, height, material, and design are not supplied.

Those facts cannot establish visibility-triangle applicability. Exact future automation
would require, at minimum:

* authoritative parcel and public right-of-way geometry;
* authoritative street-intersection and driveway/access-opening geometry, including the
  measurement edges named by the official figure;
* the proposed fence segment geometry (not merely “front/side/rear”);
* reliable grade/elevation or a supported method for the 30-inch-to-8-foot band; and
* the complete § 3-904.A figure and any official interpretive metadata needed to construct
  the triangle.

Until those exist, resident input that a fence is “near a street corner or driveway” can
trigger a warning but cannot resolve compliance. Nothing in the known facts establishes
that 1950 DREW PLZ is a corner lot, has a relevant driveway, or intersects a sight triangle.

## 9. Existing rule/input impact

No seed or database change is made here. The next rule-package update should address:

| Existing key | Assessment | Needed change and source |
|---|---|---|
| `construction.temporary_approval` / `project.building_official_approval` | Correct only for § 3-807.D temporary construction fencing; incorrect if read as the sole fence approval rule | Keep it scoped to temporary fencing. Add a new ordinary permit atomic rule sourced to §§ 4-203 and 8-102. |
| No existing ordinary-permit input | Missing | Add an administrative/result fact such as permit status only if Groundrule will track issued permits. The duty itself should not be a resident question. §§ 4-203, 47.111. |
| `frontage.corner_multi_review` / `property.lot_frontage_type` | Correct for § 3-804.C frontage/height review, but not a visibility rule | Do not overload it. A corner lot can trigger a warning, yet driveways also trigger § 3-904.A. |
| `project.location_zone` | Correct for front/side/rear height selection | Insufficient for sight geometry; retain unchanged. |
| `project.in_required_setback` | Correct for §§ 3-803/3-804 duties | Do not reuse as a visibility proxy. |
| No traffic-visibility atomic rule/input | Missing | Add a § 3-904.A obstruction rule and separately modeled street/driveway proximity warning trigger; hold exact spatial compliance until the figure is recovered. |
| `project.intersects_prohibited_access_area` | Correct for § 3-806 ROW/easement/meter/manhole placement | Do not conflate it with a sight triangle. |
| `project.city_engineer_authorized` | Semantically reusable only with care | Existing use concerns § 3-806 authorization. A separate visibility-exception approval input is clearer because § 3-904.A is a distinct decision. |

## 10. Resident-flow impact

The ordinary flow remains the proposed three questions: fence location, proposed height,
and material, with the existing conditional chain-link/design branches. Permit status is
not a fourth question: the result should always state “building permit required before
work” and explain City zoning review/final inspection.

Visibility also should not become a universal fourth question. When trusted map data or the
resident's location answer indicates a segment may be near a street corner or driveway,
show the conditional warning in § 7. If “other/more than one area” already requires segment
clarification, that clarification may ask whether a segment is near a street corner or
driveway; it is a warning trigger, not a resident certification that the legal triangle is
clear. Thus resolution of these blockers does not expand the preferred 2–5 ordinary
questions.

## 11. Remaining unresolved authority

Permit applicability is resolved, but current fence-specific form fields, drawing/survey
details, fees, and intermediate inspection practice are not in the reviewed Code. These are
useful operational details, not blockers to the ordinary legal answer.

The material unresolved authority is the **actual graphic on Community Development Code
§ 3-904.A, page CD3:34.3, captioned “Sight Visibility Triangle,” including every horizontal
dimension, label, vertex, measurement origin, and street/driveway edge shown in that
figure**. If Clearwater maintains an accessible original page image/PDF, that exact page is
required. If the figure itself cites or depends on another standard, the precise edition
and incorporated portion of that standard must then be retrieved. Without it, horizontal
geometry and automated applicability remain unsupported.

## 12. Exact recommended next step

Retrieve from Clearwater's official codification the image-complete **Community
Development Code § 3-904 page CD3:34.3 (Supplement No. 52 page carried into Volume II,
Supplement No. 55), specifically the figure “Sight Visibility Triangle.”** Transcribe and
independently verify all labels and dimensions against the official page; then update the
rule package with (a) the now-supported ordinary building-permit/final-inspection atomic
rules and (b) either exact sight-triangle geometry or a documented City-review-only rule.
Do not update the seed until that rule-package work is separately approved.

BLOCKERS PARTIALLY RESOLVED — TARGETED SOURCE RETRIEVAL REQUIRED
