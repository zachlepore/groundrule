# What Clearwater zoning code P represents

Research finding, October 6, 2026. No production implementation or classification change.

## Direct source evidence

The supplied September 28, 2026 `zoning.geojson` contains 70 P features. Their `ZONING_DESC` is `Preservation`. This is the same zoning layer and attribute used for LMDR/MDR and the other districts, not evidence of a separate flood or water-overlay service.

The retained Clearwater Development Code, Article 2, Division 15, §2-1501 (text lines 13187–13206), identifies P as the **Preservation District**. Its stated purpose includes protection of waters, waterways, coastal and noncoastal wetlands, environmentally sensitive areas, natural and artificially made interior bodies of water, and other submerged lands. §2-1501.1 says P may be located in more than one land-use category, distinguishing zoning district from future land-use designation. §§2-1502–1503 contain development standards, including environmental parks and marinas. This is a legally substantive district; P does not simply mean pond, flood overlay, irrelevant geometry, or a feature that can always be discarded. These findings use the supplied frozen source and retained code, not a fresh live GIS/code verification.

## Human observations versus legal meaning

All five Batch 2A properties were reported by the human reviewer as clearly LMDR in the official viewer, including a property whose diagnostic intersection was nearly 50% P. Preserve those individual results without changing the underlying mapped candidates or inferring that preservation constraints disappear. The reviewer distinguishes the developed residential property from parcel geometry extending into water. That is an important research distinction, not a generalized exemption.

For research modeling, keep separate fields for (1) the human-confirmed developed-property zoning interpretation and (2) every mapped zoning intersection, including P, coverage, source IDs and uncertainty. P can be distinguished as a preservation context when analyzing development-district conflicts, while retaining it as a zoning district with potential regulatory significance. These existing research records preserve both pieces of evidence. No rule for choosing parcel zoning, ignoring P, or emitting production facts is established. A formal schema or resolver change requires separate review and authorization.

## Open follow-up: 2A-03, 1773 OWEN DR

The human explicitly reported no obvious water in imagery and requested separate investigation. The diagnostic identifies LMDR OBJECTID 11191 at 87.198015% and P OBJECTID 11174 at 10.430392%; total coverage is 97.628407%, leaving approximately 2.371593% uncovered. P feature 11174 has `ZONING_DESC: Preservation` and `SPECIAL: null`; those attributes do not explain why its geometry intersects this property.

The cause remains unresolved. It could involve a preserved feature not apparent in imagery or a map/parcel alignment issue; the supplied evidence does not establish a flood overlay, pond, or artifact. Retain the user's confirmed LMDR label, the P intersection, and the separate follow-up. Investigating the shape and municipal intent of feature 11174 and the coverage gap is a targeted research question, not a reason to overwrite the human decision.

## Sampling

Pause LMDR/P and LMDR/OS/R as requested. The next batch uses the recurring LMDR/MDR pair, both development zoning districts, across minor to near-even diagnostic intersections. No threshold or generalized resolver rule has been proposed or implemented.
