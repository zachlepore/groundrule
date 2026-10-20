import { conditionFactKeys, evaluateCondition, isKnownFact } from "./condition";
import { isOverride, missingScopeFacts, PrecedenceValidationError, relationshipKey, scopeTruth, validatePrecedence } from "./precedence";
import type { EvaluatedRule, EvaluationRequest, EvaluationResult, LoadedRuleSet, RuleInput, RuleRelationship, RuleStatus, TruthValue } from "./types";
const statusFor = (truth: TruthValue, mode: string): RuleStatus => truth === "FALSE" ? "NOT_MATCHED" : truth === "UNKNOWN" ? "UNKNOWN" : mode === "deterministic" || mode === "informational" ? "MATCHED" : "REVIEW_REQUIRED";
const and = (...v: TruthValue[]): TruthValue => v.includes("FALSE") ? "FALSE" : v.includes("UNKNOWN") ? "UNKNOWN" : "TRUE";
const unique = <T,>(items: T[]): T[] => [...new Map(items.map(x => [JSON.stringify(x), x])).values()];

export function evaluateLoadedRuleSet(ruleSet: LoadedRuleSet, request: EvaluationRequest): EvaluationResult {
  const evaluatedAsOf = request.asOfDate ?? new Date().toISOString().slice(0, 10);
  const active = validatePrecedence(ruleSet, evaluatedAsOf);
  const evaluated = ruleSet.rules.map((rule): EvaluatedRule => {
    const truth = evaluateCondition(rule.condition, request.facts), status = statusFor(truth, rule.evaluationMode);
    return { ...rule, truth, status, rawStatus: status, rawOutcomes: rule.outcomes, outcomes: rule.outcomes,
      missingFactKeys: truth === "UNKNOWN" ? [...new Set(conditionFactKeys(rule.condition).filter(k => !isKnownFact(request.facts, k)))].sort() : [],
      relationships: active.filter(r => r.fromRuleKey === rule.key || r.toRuleKey === rule.key),
      resolution: { state: "effective", reasons: [], controllingRuleKeys: [], relationships: [], citations: [] } };
  });
  evaluated.sort((a, b) => a.key.localeCompare(b.key));
  const byKey = new Map(evaluated.map(r => [r.key, r]));
  function withhold(rule: EvaluatedRule, state: "suppressed" | "pending" | "conflicting", reason: string, edge: RuleRelationship, controller: EvaluatedRule) {
    const resolution = rule.resolution!;
    const rank = { effective: 0, suppressed: 1, pending: 2, conflicting: 3 };
    if (rank[state] > rank[resolution.state]) resolution.state = state;
    resolution.reasons.push(reason); resolution.controllingRuleKeys.push(controller.key); resolution.relationships.push(edge);
    resolution.citations.push(...controller.citations, ...(edge.citations ?? []));
    rule.status = resolution.state === "suppressed" ? "NOT_MATCHED" : resolution.state === "pending" ? "UNKNOWN" : "REVIEW_REQUIRED";
    rule.outcomes = []; // Declared outcomes remain in rawOutcomes; downstream must not consume them as effective permissions.
    rule.missingFactKeys = [...new Set([...rule.missingFactKeys, ...missingScopeFacts(edge, request.facts), ...controller.missingFactKeys])].sort();
  }
  const conflicts: EvaluationResult["conflicts"] = [];
  // Establish unresolved conflicts before traversing any controlling relationships.
  for (const edge of active.filter(r => r.type === "potentially_conflicts_with")) {
    const from = byKey.get(edge.fromRuleKey)!, to = byKey.get(edge.toRuleKey)!;
    const truth = and(from.truth, to.truth, scopeTruth(edge, request.facts));
    if (truth === "FALSE") continue;
    const state = truth === "TRUE" ? "conflicting" : "pending";
    withhold(from, state, "explicit_potential_conflict", edge, to); withhold(to, state, "explicit_potential_conflict", edge, from);
    conflicts.push({ relationship: edge, fromStatus: from.status, toStatus: to.status, requiresReview: true });
  }
  const resolved = new Set<string>();
  function resolve(key: string) {
    if (resolved.has(key)) return;
    const target = byKey.get(key)!;
    const controls = active.filter(r => (isOverride(r) && r.toRuleKey === key) || (r.type === "depends_on" && r.fromRuleKey === key));
    const candidates: { edge: RuleRelationship; controller: EvaluatedRule; truth: TruthValue }[] = [];
    for (const edge of controls) {
      const controllerKey = edge.type === "depends_on" ? edge.toRuleKey : edge.fromRuleKey;
      resolve(controllerKey); const controller = byKey.get(controllerKey)!;
      const scope = scopeTruth(edge, request.facts);
      if (scope === "FALSE" || target.truth === "FALSE") continue;
      const controlTruth: TruthValue = controller.status === "MATCHED" && controller.evaluationMode === "deterministic" ? "TRUE" : controller.status === "NOT_MATCHED" ? "FALSE" : "UNKNOWN";
      if (edge.type === "depends_on") {
        if (controlTruth === "FALSE" && scope === "TRUE") withhold(target, "suppressed", "dependency_not_satisfied", edge, controller);
        else if (controlTruth !== "TRUE" || scope !== "TRUE") withhold(target, "pending", "dependency_unresolved", edge, controller);
      } else {
        const truth = and(controlTruth, scope);
        if (truth !== "FALSE") candidates.push({ edge, controller, truth });
      }
    }
    if (candidates.length > 1) throw new PrecedenceValidationError([`${key}: multiple unresolved or active controllers require explicit compatibility review`]);
    for (const { edge, controller, truth } of candidates) {
      if (truth === "TRUE" && target.resolution!.state === "effective") withhold(target, "suppressed", "explicit_scoped_override", edge, controller);
      else if (target.resolution!.state !== "suppressed") withhold(target, "pending", "override_applicability_unresolved", edge, controller);
    }
    resolved.add(key);
  }
  for (const key of [...byKey.keys()].sort()) resolve(key);
  for (const rule of evaluated) {
    const r = rule.resolution!; r.reasons = [...new Set(r.reasons)].sort(); r.controllingRuleKeys = [...new Set(r.controllingRuleKeys)].sort();
    r.relationships = unique(r.relationships).sort((a, b) => relationshipKey(a).localeCompare(relationshipKey(b))); r.citations = unique(r.citations).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  for (const conflict of conflicts) { conflict.fromStatus = byKey.get(conflict.relationship.fromRuleKey)!.status; conflict.toStatus = byKey.get(conflict.relationship.toRuleKey)!.status; }
  const unknown = evaluated.filter(r => r.status === "UNKNOWN"), inputs = new Map<string, RuleInput>();
  const allInputs = ruleSet.rules.flatMap(r => r.inputs).sort((a, b) => a.key.localeCompare(b.key) || JSON.stringify(a).localeCompare(JSON.stringify(b)));
  for (const rule of unknown) for (const input of allInputs) if (rule.missingFactKeys.includes(input.key) && input.requiredWhenApplicable) inputs.set(input.key, input);
  const citations = unique(evaluated.filter(r => r.status === "MATCHED" || r.status === "REVIEW_REQUIRED" || r.resolution!.state !== "effective").flatMap(r => [...r.citations, ...r.resolution!.citations]));
  const { rules: _rules, relationships: _relationships, ...summary } = ruleSet; void _rules; void _relationships;
  return { evaluatedAsOf, ruleSet: summary, matchedRules: evaluated.filter(r => r.status === "MATCHED"), reviewRequiredRules: evaluated.filter(r => r.status === "REVIEW_REQUIRED"), unknownRules: unknown, notMatchedRules: evaluated.filter(r => r.status === "NOT_MATCHED"), missingInputs: [...inputs.values()].sort((a, b) => a.key.localeCompare(b.key)), conflicts, citations: citations.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) };
}
