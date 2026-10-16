Approve the owner's bounded offline Rule 002 scope: 262 original-REVIEW addresses with existing LMDR codes and exactly LMDR + OS/R. The combined static lookup retains all 63,430 frozen original profiles and now has 2,229 approved guidance records (1,967 unchanged Rule 001 + 262 Rule 002), with no overlapping approvals, original zoning changes or source-GIS QA changes.

The versioned approval config pins the September 28 release, candidate implementation, human evidence, exclusions and presentation policy. The exporter reuses the existing source/candidate verifier, reads back every final serialized profile, and verifies all output checksums. OS/R always remains mapped and potentially applicable; LMDR is starting guidance, not an exclusive zoning determination. R002-01/02 preserve substantive secondary OS/R observations. The strict >3% OS/R policy yields 4 prominent and 258 non-prominent notices. Rule 001's separate >2% P policy and all 1,967 approval objects remain unchanged.

All 94 exact-pair excluded addresses, 173 additional-district addresses and existing human exceptions remain excluded from Rule 002. Rule 001's 201 changed-code and one unclassified proposal remain pending. The workflow publishes the approved full-city lookup, audit, checksums and provenance as `clearwater-approved-rules-001-002-static-lookup`; large GIS files are not committed. Existing research objects remain preapproval evidence, with final approval carried by `approvedPrimaryGuidance`.

Validation: 64 focused GIS/rule tests pass locally. The full local frozen-source regeneration and serialized-output reconciliation pass. The hosted validation run is linked below.

The remaining 18,109 REVIEW profiles are ranked descriptively without new assignments or methodology. MDR + OS/R is the recommended next class: 736 remaining REVIEW addresses, 733 passing the existing diagnostic geometry/coverage/profile-issue screen. Those counts are not approved recoveries.

No Supabase, production Guide, resident UX, Rule 001 approval, or extra manual-QC changes.
