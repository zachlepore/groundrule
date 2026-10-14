#!/usr/bin/env node
/** CLR-Z-001 research candidate. Frozen inputs; no production changes. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { Worker } from "node:worker_threads";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import bbox from "@turf/bbox";
import RBush from "rbush";
import { allowedZoning, normalizeZoning } from "./clearwater-pilot.mjs";
import { RULE_VERSION, NOTICE_THRESHOLD_PERCENT, noticeVisibility, normalizeReviewSession,
  analyzePolicy, focusedQc, renderPolicyReport, renderFocusedQc } from "./clearwater-rule001-policy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const RULE_ID = "CLR-Z-001";
const hash = b => createHash("sha256").update(b).digest("hex");
const json = async p => JSON.parse(await readFile(p, "utf8"));
const supported = code => code === "os/r" || allowedZoning.has(code);
const rawCodes = d => [...new Set(d.zoningFeatures.map(e => e.rawZoningCode))].sort();
const pPercent = d => d.zoningCodeCoverage.find(e => e.normalizedZoningCode === "p")?.percentOfParcel ?? 0;
const pair = d => rawCodes(d).join(" + ");
export const coverageBand = n => n < 1 ? "minimal <1%" : n < 20 ? "moderate 1–<20%" : n <= 50 ? "large 20–50%" : n <= 90 ? "P dominant >50–90%" : "P dominant >90%";

export function classify(d, profiles, gold = [], duplicateIdentity = false) {
  const codes = [...new Set(d.zoningCodeCoverage.map(e => e.normalizedZoningCode))];
  const other = codes.filter(c => c !== "p");
  const structuralMatch = codes.includes("p") && other.length === 1;
  const flags = [];
  if (!d.parcelFound || !d.parcelGeometryValid || !(d.parcelAreaSquareMeters > 0)) flags.push("invalid_or_missing_parcel_geometry");
  if (d.hasInvalidZoningGeometry) flags.push("invalid_zoning_geometry");
  if (d.sourceErrors?.length) flags.push(...d.sourceErrors);
  if (!Number.isFinite(d.totalZoningCoveragePercent) || d.totalZoningCoveragePercent < 99.9 || d.totalZoningCoveragePercent > 100.1) flags.push("coverage_outside_99.9_to_100.1_percent");
  if (d.zoningCodeCoverage.some(e => !Number.isFinite(e.percentOfParcel) || e.percentOfParcel <= 0 || e.percentOfParcel > 100.1)) flags.push("invalid_district_coverage");
  if (d.hasRepeatedNormalizedCode) flags.push("repeated_same_code_polygons");
  if (d.hasOverlappingSameCodePolygons) flags.push("overlapping_same_code_polygons");
  if (codes.some(c => !supported(c))) flags.push("unsupported_zoning_code_combination");
  if (duplicateIdentity) flags.push("duplicate_parcel_identity");
  if (!profiles.length) flags.push("no_authoritative_clearwater_address_membership");
  if (profiles.some(p => p.normalizedJurisdiction !== "clearwater" || p.jurisdictionStatus !== "confirmed")) flags.push("jurisdiction_not_confirmed");
  if (profiles.some(p => p.issues.some(i => i !== "parcel_ambiguous_zoning"))) flags.push("unrelated_source_profile_issue");
  if (gold.some(r => ["human_true_split", "human_staff_review"].includes(r.humanReview.reviewStatus))) flags.push("human_split_or_staff_review");
  if (gold.some(r => r.humanReview.reviewStatus === "human_primary_applicability_unclear")) flags.push("human_primary_applicability_unclear");
  const proposal = structuralMatch ? d.zoningFeatures.find(e => e.normalizedZoningCode === other[0])?.rawZoningCode : null;
  if (structuralMatch && gold.some(r => r.humanReview.reviewStatus === "human_confirmed" && normalizeZoning(r.humanReview.result.replace(/^CONFIRMED:\s*/, "")) !== other[0])) flags.push("gold_contradiction");
  if (structuralMatch && gold.some(r => {
    if(r.humanReview.reviewStatus!=="human_primary_candidate"||!r.humanReview.reportedPrimaryCode)return false;
    const reported=normalizeZoning(r.humanReview.reportedPrimaryCode);
    const familyOnly=reported.endsWith("ncod")&&other[0].startsWith(reported);
    return other[0]!==reported&&!familyOnly;
  })) flags.push("conflicting_human_candidate_evidence");
  if (other.length > 1) flags.push("multiple_non_P_districts");
  const eligible = structuralMatch && !flags.length;
  return { ruleId: RULE_ID, ruleVersion:RULE_VERSION, structuralMatch, eligible, hypotheticalNonP: proposal,
    pCoveragePercent:codes.includes("p")?pPercent(d):null,
    proposedNoticeVisibility:noticeVisibility(eligible,pPercent(d)),noticeThresholdPercent:NOTICE_THRESHOLD_PERCENT,
    retainedSecondaryPreservation:eligible?"P":null,approvalStatus:"NOT_APPROVED",
    proposedPrimaryGuidanceZoning: eligible ? proposal : null,
    otherIntersectingZoningDistricts: eligible ? rawCodes(d).filter(c => normalizeZoning(c) !== other[0]) : rawCodes(d),
    decisionStatus: eligible ? "PENDING_QC" : codes.length === 1 && codes[0] === "p" && !flags.length ? "P_ONLY_PRESERVED" : "REVIEW",
    flags: [...new Set(flags)], reason: eligible ? "Exactly P and one supported non-P district; source/coverage checks pass. No P-percentage limit. Preservation remains mapped and potentially restrictive." : "No provisional primary assignment; retain original classification and review evidence." };
}

export async function verifySource(input, manifest, gold) {
  const verification = [];
  for (const [name, expected] of Object.entries(manifest.files)) {
    const bytes = await readFile(path.join(input, name));
    assert.equal(bytes.length, expected.bytes, `${name}: byte count`);
    assert.equal(hash(bytes), expected.sha256, `${name}: SHA256`);
    verification.push({ file: name, ...expected, verified: true });
  }
  for (const s of gold.sourceFiles) {
    const bytes = await readFile(path.join(input, s.path));
    assert.equal(hash(bytes), s.sha256, `${s.path}: gold evidence checksum`);
  }
  const metadata = await json(path.join(input, "source-metadata.json"));
  assert.equal(metadata.config.pilotName, "clearwater-full-v1");
  assert.equal(metadata.sources.addresses.where, "MUNICIPALITY = 'CLEARWATER'");
  const layers = {};
  for (const name of ["addresses", "parcels", "zoning"]) {
    layers[name] = await json(path.join(input, `${name}.geojson`));
    assert.equal(layers[name].features.length, manifest.expectedCounts[name], `${name}: expected full count`);
    assert.equal(layers[name].features.length, metadata.sources[name].recordCount);
    assert.equal(hash(JSON.stringify(layers[name])), metadata.sources[name].sha256, `${name}: metadata canonical SHA256`);
  }
  assert.ok(layers.addresses.features.every(f => f.properties.MUNICIPALITY === "CLEARWATER"));
  const profiles = await json(path.join(input, "property-profiles.json"));
  const stats = await json(path.join(input, "validation-report.json"));
  const counts = { profiles: profiles.length, uniqueParcels: new Set(profiles.map(p => p.parcelIdentifier).filter(v => v != null)).size,
    clean: profiles.filter(p => p.status === "clean").length, review: profiles.filter(p => p.status === "review").length };
  for (const [name, count] of Object.entries(counts)) assert.equal(count, manifest.expectedCounts[name], `${name}: full-city expected count`);
  assert.equal(stats.uniqueParcelsRepresented, counts.uniqueParcels);
  assert.equal(stats.cleanPropertyProfiles, counts.clean); assert.equal(stats.reviewPropertyProfiles, counts.review);
  assert.equal(stats.conflictingZoning, profiles.filter(p => p.issues.includes("parcel_ambiguous_zoning")).length);
  const addressIds = new Set(layers.addresses.features.map(f => f.properties.OBJECTID));
  assert.equal(new Set(profiles.map(p => p.sourceAddressIdentifier)).size, profiles.length);
  assert.ok(profiles.every(p => addressIds.has(p.sourceAddressIdentifier)));
  for (const p of profiles) for (const name of ["addresses", "parcels", "zoning"]) assert.equal(p.sourceSnapshots[name].sha256, metadata.sources[name].sha256);
  const diagnostic = await json(path.join(input, "zoning-diagnostic/zoning-diagnostic.json"));
  const ids = new Set(profiles.filter(p => p.issues.includes("parcel_ambiguous_zoning")).map(p => String(p.parcelIdentifier)));
  assert.equal(diagnostic.parcels.length, ids.size);
  assert.equal(new Set(diagnostic.parcels.map(d => d.parcelIdentifier)).size, ids.size);
  assert.ok(diagnostic.parcels.every(d => ids.has(d.parcelIdentifier)));
  return { metadata, layers, profiles, diagnostic, verification, counts };
}

const distance = (a, b) => a && b ? Math.hypot((a[0] - b[0]) * 98.5, (a[1] - b[1]) * 111.3) : 0;
export function sampleQc(population, gold) {
  const selected = [];
  const add = (r, reason) => { if (r && !selected.some(s => s.parcelId === r.parcelId)) selected.push({ ...r, selectionReason: reason }); };
  const eligible = population.filter(r => r.decision.eligible && r.addresses[0]?.coordinates);
  const known = id => population.find(r => r.parcelId === id);
  add(known("082915049680000050"), "Known waterfront from human 2A-01; microscopic P overlap; repeat check, not new independent evidence.");
  add(known("182916345600050230"), "Interior residential pond context reported by human 2A-04; substantial P overlap; repeat check, not new independent evidence.");
  const choose = (pool, reason) => {
    const available = pool.filter(r => !selected.some(s => s.parcelId === r.parcelId));
    available.sort((a,b) => {
      const min = r => selected.length ? Math.min(...selected.map(s => distance(r.addresses[0]?.coordinates, s.addresses[0]?.coordinates))) : 0;
      return min(b) - min(a) || a.parcelId.localeCompare(b.parcelId);
    });
    add(available[0], reason);
  };
  const groups = [...new Set(eligible.map(r => r.combination))].sort((a,b) => eligible.filter(r => r.combination === b).length - eligible.filter(r => r.combination === a).length || a.localeCompare(b));
  for (const group of groups) {
    if (selected.length >= 20) break;
    choose(eligible.filter(r => r.combination === group), `${group}: independent pair-specific QC, geographically separated where possible.`);
  }
  for (const band of [...new Set(eligible.map(r => r.coverageBand))]) choose(eligible.filter(r => r.coverageBand === band), `${band}: coverage stress test; maximize separation from previous cases.`);
  while (selected.length < Math.min(25, eligible.length)) {
    const counts = new Map(groups.map(g => [g, selected.filter(r => r.combination === g).length]));
    const group = groups.slice().sort((a,b) => counts.get(a) - counts.get(b) || groups.indexOf(a) - groups.indexOf(b))[0];
    const pool = eligible.filter(r => r.combination === group && !selected.some(s => s.parcelId === r.parcelId));
    choose(pool.length ? pool : eligible, `${group}: additional geographically diverse pair check.`);
  }
  // Exceptions are a separate last batch and receive no operative proposal.
  add(known("052916714240000100"), "EXCEPTION: human reports no obvious water at 1773 OWEN DR; unexplained P feature and coverage gap. Inland context is reported, not independently verified.");
  const exceptions = population.filter(r => !r.decision.eligible && r.decision.structuralMatch && r.addresses.length && !selected.some(s => s.parcelId === r.parcelId));
  for (const flag of ["unsupported_zoning_code_combination", "overlapping_same_code_polygons", "coverage_outside_99.9_to_100.1_percent", "repeated_same_code_polygons"]) {
    if (selected.length >= 30) break;
    choose(exceptions.filter(r => r.decision.flags.includes(flag)), `EXCEPTION: ${flag}; hypothetical rule would require separate review.`);
  }
  while (selected.length < Math.min(30, population.filter(r => r.addresses.length).length)) choose(exceptions, "EXCEPTION: additional quality stress case.");
  return selected.map((r,i) => ({ caseId: `R001-${String(i+1).padStart(2,"0")}`, batchId: `R001-${Math.floor(i/5)+1}`, parcelId: r.parcelId,
    sourceSnapshotIdentifier:r.sourceSnapshotIdentifier, originalZoningFeatures:r.evidence?.zoningFeatures ?? null,
    address: r.addresses[0]?.address, coordinates: r.addresses[0]?.coordinates,
    originalIntersections: r.originalIntersections, proposedPrimaryGuidanceZoning: r.decision.proposedPrimaryGuidanceZoning,
    hypotheticalNonP: r.decision.hypotheticalNonP, decisionStatus: r.decision.decisionStatus,
    diagnosticFlags: r.decision.flags, selectionReason: r.selectionReason,
    nearestOtherSampleMeters: Math.round(1000 * Math.min(...selected.filter(s => s.parcelId !== r.parcelId).map(s => distance(r.addresses[0]?.coordinates,s.addresses[0]?.coordinates)))),
    waterfrontStatus: gold.records.find(g => g.parcelId === r.parcelId)?.humanReview.note ?? "Not established by snapshot; reviewer must identify waterfront/inland context. P is not a water indicator.",
    humanReview: { result: null, note: null, reviewDate: null, verificationMethod: "Clearwater official zoning viewer", reviewStatus: "pending" } }));
}

export async function run(input, output, measurementsFile = null) {
  input = path.resolve(input); output = path.resolve(output);
  assert.ok(output !== input && !output.startsWith(input + path.sep), "Derived output must be separate from source");
  try { await access(output); throw new Error("Refusing to overwrite existing output; regenerate from frozen source into a new directory."); } catch(e) { if (e.code !== "ENOENT") throw e; }
  const manifest = await json(path.join(ROOT,"scripts/gis/clearwater-rule001-source.json"));
  const gold = await json(path.join(ROOT,"research/gis/zoning-gold/reference-dataset.json"));
  const observations=[];
  const reviewDatasetHashes=[];
  for(const entry of gold.additionalReviewDatasets??[]){
    assert.equal(path.basename(entry.path),entry.path,"Review journal must remain in the gold directory");
    const bytes=await readFile(path.join(ROOT,"research/gis/zoning-gold",entry.path));
    assert.equal(hash(bytes),entry.sha256,"Registered human review checksum");
    const session=JSON.parse(bytes);
    assert.equal(hash(await readFile(path.join(ROOT,session.sourceQcPacket.path))),session.sourceQcPacket.sha256,"Frozen QC identity checksum");
    observations.push(...session.records);reviewDatasetHashes.push({path:entry.path,sha256:entry.sha256});
  }
  assert.equal(observations.length,30,"Completed Rule 001 human session is required for v2");
  const reviews=[...gold.records,...normalizeReviewSession(observations)];
  const source = await verifySource(input, manifest, gold);
  console.log("Verified all source hashes, gold evidence hashes, metadata layer hashes and full-city counts.");
  const byParcel = new Map();
  for (const p of source.profiles) if (p.parcelIdentifier != null) {
    const id = String(p.parcelIdentifier); if (!byParcel.has(id)) byParcel.set(id, []); byParcel.get(id).push(p);
  }
  const evidence = new Map(source.diagnostic.parcels.map(d => [d.parcelIdentifier, { ...d, evidenceMethod: "verified_frozen_diagnostic" }]));
  const ptree = new RBush();
  const box = f => { const [minX,minY,maxX,maxY] = bbox(f); return {minX,minY,maxX,maxY}; };
  ptree.load(source.layers.zoning.features.filter(f => normalizeZoning(f.properties.ZONING) === "p").map(box));
  const ids = new Set(), duplicate = new Set(), seen = new Set();
  for (const f of source.layers.parcels.features) {
    const id = String(f.properties.PARCELID ?? f.properties.STRAP);
    if (seen.has(id)) duplicate.add(id); seen.add(id);
    if (!evidence.has(id) && ptree.collides(box(f))) ids.add(id);
  }
  // Workers only supplement missing frozen diagnostics; source files stay immutable.
  const count = Math.min(4, availableParallelism());
  const shards = Array.from({length: count}, () => []);
  [...ids].sort().forEach((id,i) => shards[i%count].push(id));
  console.log(`Supplementing ${ids.size} P-bounding-box parcels on ${count} workers; reusing ${evidence.size} frozen diagnostics.`);
  const algorithmSha256=hash(await readFile(path.join(ROOT,"scripts/gis/clearwater-rule001-intersections.mjs")));
  const measurementHeader={sourceFileHashes:manifest.files,algorithmSha256,screenedParcelIds:[...ids].sort()};
  if(measurementsFile){
    const cached=await json(measurementsFile);
    assert.deepEqual(cached.sourceFileHashes,manifest.files,"Supplemental observations must use the same verified frozen files");
    assert.equal(cached.algorithmSha256,algorithmSha256,"Supplemental measurement algorithm must match");
    assert.deepEqual(cached.screenedParcelIds,[...ids].sort(),"Every screened parcel must be accounted for");
    assert.ok(cached.parcels.every(d=>ids.has(d.parcelIdentifier)&&d.evidenceMethod==="supplemental_exact_intersection"));
    for(const d of cached.parcels)evidence.set(d.parcelIdentifier,d);
    console.log(`Reused ${cached.parcels.length} immutable supplemental measurements; no prior classifications are read.`);
  }else await Promise.all(shards.map((ids, index) => new Promise((resolve,reject) => {
    const worker = new Worker(new URL("./clearwater-rule001-intersections.mjs", import.meta.url), { workerData: { input, ids } });
    worker.on("message", message => {
      if (message.results) { for (const d of message.results) { if (evidence.has(d.parcelIdentifier)) d.sourceErrors.push("duplicate_parcel_identity"); evidence.set(d.parcelIdentifier,d); } resolve(); }
      else console.log(`worker ${index+1}: ${message.progress}/${message.total}`);
    });
    worker.on("error", reject); worker.on("exit", code => { if (code) reject(new Error(`intersection worker exited ${code}`)); });
  })));
  const population = [...evidence.values()].filter(d => d.zoningCodeCoverage.some(e => e.normalizedZoningCode === "p") || d.sourceErrors?.length).map(d => {
    const profiles = byParcel.get(d.parcelIdentifier) ?? [];
    const reviewed = reviews.filter(r => r.parcelId === d.parcelIdentifier && r.humanReview.reviewStatus !== "pending");
    return { parcelId: d.parcelIdentifier, membership: profiles.length ? "address_linked_clearwater" : "unverified_membership_no_city_address",
      addresses: profiles.slice().sort((a,b) => a.displayAddress.localeCompare(b.displayAddress)).map(p => ({ address: p.displayAddress, sourceAddressIdentifier: p.sourceAddressIdentifier, coordinates: p.addressCoordinates, originalStatus: p.status })),
      combination: pair(d), pCoveragePercent: pPercent(d), coverageBand: coverageBand(pPercent(d)),
      originalIntersections: d.zoningCodeCoverage.map(e => ({ code: d.zoningFeatures.find(f => f.normalizedZoningCode === e.normalizedZoningCode)?.rawZoningCode, ...e })),
      evidence: d, sourceSnapshotIdentifier: manifest.snapshotId,
      decision: classify(d,profiles,reviewed,duplicate.has(d.parcelIdentifier)) };
  }).sort((a,b) => a.parcelId.localeCompare(b.parcelId));
  const city = population.filter(r => r.membership === "address_linked_clearwater");
  const confirmedP = city.filter(r => r.originalIntersections.some(e => e.normalizedZoningCode === "p"));
  const byCombination = {};
  for (const r of confirmedP) {
    const v = byCombination[r.combination] ??= { parcels:0, addresses:0, candidateParcels:0, candidateAddresses:0, excludedStructuralParcels:0, cleanAddresses:0, reviewAddresses:0 };
    v.parcels++; v.addresses += r.addresses.length;
    if (r.decision.eligible) { v.candidateParcels++; v.candidateAddresses += r.addresses.length; }
    if (r.decision.structuralMatch && !r.decision.eligible) v.excludedStructuralParcels++;
    v.cleanAddresses += r.addresses.filter(a => a.originalStatus === "clean").length;
    v.reviewAddresses += r.addresses.filter(a => a.originalStatus === "review").length;
  }
  const candidates = city.filter(r => r.decision.eligible);
  const affectedIds = new Set(candidates.map(r => r.parcelId));
  const changed = source.profiles.filter(p => affectedIds.has(String(p.parcelIdentifier)));
  // Reporting only: partition candidates by ORIGINAL status and code agreement.
  // Matching a code does not make an original REVIEW record trusted or resolved.
  const addressCategories={reviewAlreadyMatched:0,reviewDifferentCode:0,reviewPreviouslyUnclassified:0,
    cleanAlreadyMatched:0,cleanDifferentCode:0,cleanPreviouslyUnclassified:0};
  const proposalByParcel=new Map(candidates.map(r=>[r.parcelId,r.decision.proposedPrimaryGuidanceZoning]));
  for(const p of changed){
    const prefix=p.status === "review" ? "review" : "clean";
    const kind=!p.zoningCode ? "PreviouslyUnclassified" : normalizeZoning(p.zoningCode)===normalizeZoning(proposalByParcel.get(String(p.parcelIdentifier))) ? "AlreadyMatched" : "DifferentCode";
    addressCategories[prefix+kind]++;
  }
  assert.equal(Object.values(addressCategories).reduce((s,n)=>s+n,0),changed.length,"Reporting categories must be mutually exclusive and exhaustive");
  const goldComparison = gold.records.map(g => {
    const r = city.find(r => r.parcelId === g.parcelId);
    const predicted = r?.decision.hypotheticalNonP;
    const applicable = Boolean(r?.decision.structuralMatch);
    return { caseId:g.caseNumber, parcelId:g.parcelId, humanReview:g.humanReview,
      structuralMatch: applicable, candidateEligible: r?.decision.eligible ?? false, hypotheticalNonP: predicted ?? null,
      agreement: applicable && g.humanReview.reviewStatus === "human_confirmed" ? normalizeZoning(predicted) === normalizeZoning(g.humanReview.result.replace(/^CONFIRMED:\s*/,"")) : null,
      exclusionFlags:r?.decision.flags ?? [], preservedKnownSplit: g.humanReview.reviewStatus === "human_true_split" && !r?.decision.eligible };
  });
  const histogram = {};
  for (const r of confirmedP) { const v = histogram[r.coverageBand] ??= {parcels:0,addresses:0}; v.parcels++;v.addresses+=r.addresses.length; }
  const exceptionFlags = {};
  for (const r of city) for (const flag of r.decision.flags) { const v=exceptionFlags[flag]??={parcels:0,addresses:0};v.parcels++;v.addresses+=r.addresses.length; }
  const summary = { ruleId:RULE_ID, approvalStatus:"NOT_APPROVED", snapshotId:manifest.snapshotId, inputCounts:source.counts,
    ruleVersion:RULE_VERSION,noticeThresholdPercent:NOTICE_THRESHOLD_PERCENT,
    pParcels:confirmedP.length, pAddresses:confirmedP.reduce((s,r)=>s+r.addresses.length,0),
    pCleanAddresses:confirmedP.reduce((s,r)=>s+r.addresses.filter(a=>a.originalStatus==="clean").length,0),
    pReviewAddresses:confirmedP.reduce((s,r)=>s+r.addresses.filter(a=>a.originalStatus==="review").length,0),
    pOnly:confirmedP.filter(r=>r.originalIntersections.length===1).length,
    pOnlyAddresses:confirmedP.filter(r=>r.originalIntersections.length===1).reduce((s,r)=>s+r.addresses.length,0),
    pExactlyOneOther:confirmedP.filter(r=>r.decision.structuralMatch).length,
    pExactlyOneOtherAddresses:confirmedP.filter(r=>r.decision.structuralMatch).reduce((s,r)=>s+r.addresses.length,0),
    pMultipleOther:confirmedP.filter(r=>r.originalIntersections.length>2).length,
    pMultipleOtherAddresses:confirmedP.filter(r=>r.originalIntersections.length>2).reduce((s,r)=>s+r.addresses.length,0),
    candidateParcels:candidates.length, candidateAddresses:changed.length,
    candidateAddressCategories:addressCategories,
    candidatePreviouslyUnclassifiedAddresses:changed.filter(p=>!p.zoningCode).length,
    candidateSameAsOriginalZoningAddresses:changed.filter(p=>p.zoningCode && normalizeZoning(p.zoningCode)===normalizeZoning(candidates.find(r=>r.parcelId===String(p.parcelIdentifier)).decision.proposedPrimaryGuidanceZoning)).length,
    candidateDifferentFromOriginalZoningAddresses:changed.filter(p=>p.zoningCode && normalizeZoning(p.zoningCode)!==normalizeZoning(candidates.find(r=>r.parcelId===String(p.parcelIdentifier)).decision.proposedPrimaryGuidanceZoning)).length,
    changedProvisionalRecords:changed.length, unchangedOriginalClassifications:source.profiles.length,
    unchangedProvisionalRecords:source.profiles.length-changed.length,
    originallyReviewCandidates:changed.filter(p=>p.status==="review").length,
    originallyCleanCandidates:changed.filter(p=>p.status==="clean").length,
    unresolvedReviewWithoutCandidate:source.profiles.filter(p=>p.status==="review"&&!affectedIds.has(String(p.parcelIdentifier))).length,
    pendingQcRecords:changed.length, originalReviewRecords:source.counts.review,
    goldReviewed:gold.records.filter(g=>g.humanReview.reviewDate).length,
    goldStructurallyApplicable:goldComparison.filter(g=>g.structuralMatch).length,
    goldContradictions:goldComparison.filter(g=>g.agreement===false).length,
    goldEligibleAgreements:goldComparison.filter(g=>g.candidateEligible&&g.agreement===true).length,
    unverifiedMembershipPParcels:population.filter(r=>r.membership!=="address_linked_clearwater"&&r.originalIntersections.some(e=>e.normalizedZoningCode==="p")).length,
    unverifiedMembershipPOnlyParcels:population.filter(r=>r.membership!=="address_linked_clearwater"&&r.originalIntersections.length===1&&r.originalIntersections[0].normalizedZoningCode==="p").length,
    byCombination, pCoverageDistribution:histogram, exceptionFlags,
    limitations:["The 112,466 raw parcel features include neighbors; only the 47,716 address-linked parcels have source-confirmed Clearwater membership. Additional raw P-overlap parcels are inventoried separately, not declared Clearwater.","No water/shoreline layer supplied. Waterfront/inland context must be established by the reviewer; known contexts are attributed to prior human notes.","Frozen diagnostic uses exact positive-area intersections greater than 0.000001 m²; line/point touches are not districts with area coverage. Percentages are summed source-polygon areas, not unioned coverage; repeated polygons are excluded.","Five unpushed Batch 5A labels are unavailable and excluded. No human label or approval is inferred.","The zip hash is pinned at first download; six raw-file hashes independently match committed human-reference lineage. No separate publisher-provided archive checksum was supplied."] };
  const policy=analyzePolicy(city,byParcel,observations,gold);
  const qc = focusedQc(city,byParcel,observations,gold);
  assert.ok(qc.length<=12,"No extensive new QC packet");
  await mkdir(output,{recursive:true});
  const writeJson = (name,value)=>writeFile(path.join(output,name),JSON.stringify(value,null,2)+"\n");
  await writeJson("supplemental-intersections.json",{...measurementHeader,parcels:[...evidence.values()].filter(d=>d.evidenceMethod==="supplemental_exact_intersection").sort((a,b)=>a.parcelIdentifier.localeCompare(b.parcelIdentifier))});
  await writeJson("source-verification.json",{...manifest,filesVerified:source.verification,metadata:source.metadata,
    processorSha256:hash(await readFile(path.join(ROOT,"scripts/gis/clearwater-rule001.mjs"))),intersectionAlgorithmSha256:algorithmSha256,
    policySha256:hash(await readFile(path.join(ROOT,"scripts/gis/clearwater-rule001-policy.mjs"))),ruleVersion:RULE_VERSION,reviewDatasetHashes});
  await writeJson("summary.json",summary); await writeJson("p-parcel-inventory.json",population);
  await writeJson("policy-analysis.json",policy);await writeJson("human-review-regression.json",{historical:policy.historicalRegression,rule001:policy.regression});
  await writeJson("gold-comparison.json",goldComparison); await writeJson("qc-batch.json",qc);
  await writeFile(path.join(output,"qc-reviewer.md"),renderFocusedQc(qc));
  await writeFile(path.join(output,"qc-with-proposals.md"),renderFocusedQc(qc,true));
  const inventoryMap = new Map(city.map(r=>[r.parcelId,r]));
  let audit = "", derived = "";
  for (const p of source.profiles) {
    const r=inventoryMap.get(String(p.parcelIdentifier));
    const d=evidence.get(String(p.parcelIdentifier));
    const decision = r?.decision;
    const record = { ...p, researchRule001:{ sourceSnapshotIdentifier:manifest.snapshotId,
      originalZoningIntersections:r?.originalIntersections ?? d?.zoningCodeCoverage.map(e=>({code:d.zoningFeatures.find(f=>f.normalizedZoningCode===e.normalizedZoningCode)?.rawZoningCode,...e})) ?? null,
      intersectionEvidence:d?.evidenceMethod ?? "P_screen_negative_or_unmatched; complete_non_P_intersections_not_measured",
      proposedPrimaryGuidanceZoning:decision?.proposedPrimaryGuidanceZoning??null,
      otherIntersectingZoningDistricts:decision?.otherIntersectingZoningDistricts??null,
      ruleId:decision?.eligible?RULE_ID:null, decisionStatus:decision?.decisionStatus??"UNCHANGED",
      ruleVersion:RULE_VERSION,approvalStatus:"NOT_APPROVED",
      existingPrimaryZoning:p.zoningCode,sourceGisQualityStatus:p.status,originalSourceProfileFlags:p.issues,
      originalZoningFeatures:d?.zoningFeatures??null,
      originalIntersectionEvidenceReference:r?{file:"p-parcel-inventory.json",parcelId:r.parcelId}:d?{sourceFile:"zoning-diagnostic/zoning-diagnostic.json",parcelId:d.parcelIdentifier}:null,
      retainedSecondaryPreservation:decision?.retainedSecondaryPreservation??null,
      pCoveragePercent:r?.pCoveragePercent??null,
      proposedNoticeVisibility:r?noticeVisibility(Boolean(decision?.eligible),r.pCoveragePercent):"NOT_APPLICABLE_NO_RULE001_PROPOSAL",
      noticeThresholdPercent:NOTICE_THRESHOLD_PERCENT,preservationDetailsRetained:Boolean(r),officialViewerAccessRequired:Boolean(r),
      residentGuidanceEligibility:decision?.eligible?"PROVISIONAL_ELIGIBLE_AFTER_EXPLICIT_APPROVAL":r?"REVIEW_REQUIRED":"UNCHANGED_NO_RULE001",
      flags:decision?.flags??[], productionEligible:false } };
    derived += JSON.stringify(record)+"\n";
    if(decision?.eligible) audit += JSON.stringify({sourceAddressIdentifier:p.sourceAddressIdentifier,address:p.displayAddress,parcelId:p.parcelIdentifier,originalZoningCode:p.zoningCode,originalStatus:p.status,originalIntersections:r.originalIntersections,...decision,sourceSnapshotIdentifier:manifest.snapshotId})+"\n";
  }
  await writeFile(path.join(output,"citywide-provisional.jsonl"),derived);
  await writeFile(path.join(output,"changed-record-audit.jsonl"),audit);
  const report = renderPolicyReport(policy,summary,qc);
  await writeFile(path.join(output,"report.md"),report);
  const names=["supplemental-intersections.json","source-verification.json","summary.json","p-parcel-inventory.json","gold-comparison.json","policy-analysis.json","human-review-regression.json","qc-batch.json","qc-reviewer.md","qc-with-proposals.md","citywide-provisional.jsonl","changed-record-audit.jsonl","report.md"];
  const outputHashes={};for(const name of names){const b=await readFile(path.join(output,name));outputHashes[name]={bytes:b.length,sha256:hash(b)};}
  await writeJson("output-checksums.json",outputHashes);
  console.log(JSON.stringify(summary,null,2));
  return summary;
}

if(import.meta.url===pathToFileURL(process.argv[1]??"").href) {
  if(![4,5].includes(process.argv.length)) throw new Error("Usage: node scripts/gis/clearwater-rule001.mjs <verified-source-directory> <new-output-directory> [immutable-supplemental-intersections.json]");
  await run(process.argv[2],process.argv[3],process.argv[4]);
}
