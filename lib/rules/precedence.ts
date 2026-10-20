import { conditionFactKeys, evaluateCondition, isCondition, isKnownFact } from "./condition";
import type { Facts, LoadedRuleSet, RuleRelationship, TruthValue } from "./types";

export class PrecedenceValidationError extends Error {
  constructor(public readonly issues: string[]) { super(`Invalid regulatory precedence: ${[...issues].sort().join("; ")}`); this.name = "PrecedenceValidationError"; }
}
export const relationshipKey = (r: RuleRelationship) => `${r.fromRuleKey}|${r.toRuleKey}|${r.type}`;
export const isOverride = (r: RuleRelationship) => r.type === "excepts" || r.type === "exempts_from";
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
// Exhaustive compatibility policy for the checked-in 20260823000000 fence seed.
// No future rule versions, scoped edges or additional labels inherit this policy.
const legacy = new Set([
  "waterfront.height|height.side_rear_baseline|more_specific_than",
  "chain_link.side_rear_base_height|height.side_rear_baseline|more_specific_than",
  "chain_link.side_rear_vinyl_height|chain_link.side_rear_base_height|more_specific_than",
  "chain_link.recreation_exemption|chain_link.front_location|exempts_from",
  "chain_link.public_landbank|chain_link.landscaping|exempts_from",
  "material.exposed_top_prohibition|barbed_wire.street_adjacency|potentially_conflicts_with",
]);
export function validatePrecedence(set: LoadedRuleSet, asOfDate: string): RuleRelationship[] {
  const issues: string[] = [];
  if (!validDate(asOfDate)) throw new PrecedenceValidationError(["invalid evaluation date"]);
  const rules = new Map(set.rules.map(r => [r.key, r]));
  if (rules.size !== set.rules.length) issues.push("duplicate rule identity");
  for (const r of set.rules) {
    if ((r.effectiveFrom != null && (!validDate(r.effectiveFrom) || r.effectiveFrom > asOfDate)) || (r.effectiveTo != null && (!validDate(r.effectiveTo) || r.effectiveTo <= asOfDate))) issues.push(`${r.key}: rule version not effective`);
    if (!["deterministic", "informational", "partial", "discretionary", "external"].includes(r.evaluationMode)) issues.push(`${r.key}: invalid evaluation mode`);
    if (!isCondition(r.condition)) issues.push(`${r.key}: invalid condition`);
    if (!Number.isInteger(r.versionNumber) || r.versionNumber < 1) issues.push(`${r.key}: invalid rule version`);
  }
  const active: RuleRelationship[] = [];
  for (const r of set.relationships) {
    const id = relationshipKey(r), start = r.effectiveFrom, end = r.effectiveTo;
    if ((start != null && !validDate(start)) || (end != null && !validDate(end)) || (end != null && (start == null || end <= start))) { issues.push(`${id}: invalid effective interval`); continue; }
    if ((start && asOfDate < start) || (end && asOfDate >= end)) continue;
    active.push(r);
    const from = rules.get(r.fromRuleKey), to = rules.get(r.toRuleKey);
    if (!from || !to) { issues.push(`${id}: missing endpoint`); continue; }
    if (from === to) issues.push(`${id}: self relationship`);
    if (!["excepts", "exempts_from", "more_specific_than", "depends_on", "potentially_conflicts_with"].includes(r.type)) issues.push(`${id}: unsupported type`);
    if (r.scopeCondition !== null && !isCondition(r.scopeCondition)) issues.push(`${id}: invalid scope condition`);
    const m = r.metadata;
    if (!m || typeof m !== "object" || Array.isArray(m)) { issues.push(`${id}: invalid relationship metadata`); continue; }
    const seeded = set.key === "clearwater_fence_v1" && legacy.has(id) && from.versionNumber === 1 && to.versionNumber === 1 && r.scopeCondition === null && m.fromVersionNumber == null && m.toVersionNumber == null && (start == null || start === "2026-08-23") && end == null;
    if (!seeded) {
      if (isOverride(r) && new Set(to.outcomes.map(o => o.subjectKey)).size > 1) issues.push(`${id}: mixed-subject target must be split into atomic rules`);
      if (!Number.isInteger(m.fromVersionNumber) || m.fromVersionNumber !== from.versionNumber || !Number.isInteger(m.toVersionNumber) || m.toVersionNumber !== to.versionNumber) issues.push(`${id}: missing or stale endpoint version binding`);
      if (typeof r.sourceProvisionId !== "string" || !r.sourceProvisionId.trim() || m.sourceProvisionId !== r.sourceProvisionId || !r.sourceProvisionChecksum || !/^[a-f0-9]{64}$/.test(r.sourceProvisionChecksum) || m.sourceProvisionChecksum !== r.sourceProvisionChecksum || !r.citations?.length || typeof m.sourceEditionLabel !== "string" || !m.sourceEditionLabel.trim() || !r.citations.every(c => c.editionLabel === m.sourceEditionLabel)) issues.push(`${id}: missing or stale provision/edition binding`);
    }
    for (const c of r.citations ?? []) if ((c.effectiveFrom && (!validDate(c.effectiveFrom) || c.effectiveFrom > asOfDate)) || (c.effectiveTo && (!validDate(c.effectiveTo) || c.effectiveTo <= asOfDate))) issues.push(`${id}: source version not effective`);
    if (typeof r.rationale !== "string" || !r.rationale.trim()) issues.push(`${id}: missing precedence rationale`);
    active[active.length - 1] = { ...r, validationPolicy: seeded ? "reviewed_clearwater_seed_v1" : "versioned" };
  }
  active.sort((a, b) => relationshipKey(a).localeCompare(relationshipKey(b)));
  const keys = new Set<string>();
  for (const r of active) { const key = relationshipKey(r); if (keys.has(key)) issues.push(`${key}: duplicate active relationship`); keys.add(key); }
  for (const r of active.filter(isOverride)) if (active.some(x => x.type === "potentially_conflicts_with" && [x.fromRuleKey, x.toRuleKey].sort().join("|") === [r.fromRuleKey, r.toRuleKey].sort().join("|"))) issues.push(`${relationshipKey(r)}: contradictory conflict and override`);
  const graph = new Map<string, string[]>();
  for (const r of active.filter(r => isOverride(r) || r.type === "depends_on" || r.type === "more_specific_than")) {
    const [a, b] = r.type === "depends_on" ? [r.toRuleKey, r.fromRuleKey] : [r.fromRuleKey, r.toRuleKey];
    graph.set(a, [...(graph.get(a) ?? []), b]);
  }
  const done = new Set<string>(), visiting = new Set<string>();
  function visit(key: string) { if (visiting.has(key)) { issues.push(`cyclic precedence at ${key}`); return; } if (done.has(key)) return; visiting.add(key); for (const next of (graph.get(key) ?? []).sort()) visit(next); visiting.delete(key); done.add(key); }
  for (const key of [...rules.keys()].sort()) visit(key);
  if (issues.length) throw new PrecedenceValidationError([...new Set(issues)].sort());
  return active;
}
export const scopeTruth = (r: RuleRelationship, facts: Facts): TruthValue => r.scopeCondition === null ? "TRUE" : evaluateCondition(r.scopeCondition, facts);
export const missingScopeFacts = (r: RuleRelationship, facts: Facts): string[] => r.scopeCondition === null ? [] : [...new Set(conditionFactKeys(r.scopeCondition).filter(k => !isKnownFact(facts, k)))].sort();
