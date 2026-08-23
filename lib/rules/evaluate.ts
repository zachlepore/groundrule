import { conditionFactKeys, evaluateCondition } from "./condition";
import type { Citation, EvaluatedRule, EvaluationRequest, EvaluationResult, LoadedRuleSet, RuleInput, RuleStatus } from "./types";

const statusFor = (truth: "TRUE" | "FALSE" | "UNKNOWN", mode: string): RuleStatus => {
  if (truth === "FALSE") return "NOT_MATCHED";
  if (truth === "UNKNOWN") return "UNKNOWN";
  return mode === "deterministic" || mode === "informational" ? "MATCHED" : "REVIEW_REQUIRED";
};

export function evaluateLoadedRuleSet(ruleSet: LoadedRuleSet, request: EvaluationRequest): EvaluationResult {
  const evaluated = ruleSet.rules.map((rule): EvaluatedRule => {
    const truth = evaluateCondition(rule.condition, request.facts);
    const missingFactKeys = truth === "UNKNOWN"
      ? [...new Set(conditionFactKeys(rule.condition).filter((key) => request.facts[key] === null || request.facts[key] === undefined))]
      : [];
    return { ...rule, truth, status: statusFor(truth, rule.evaluationMode), missingFactKeys, relationships: ruleSet.relationships.filter((r) => r.fromRuleKey === rule.key || r.toRuleKey === rule.key) };
  });
  const byKey = new Map(evaluated.map((rule) => [rule.key, rule]));

  // An explicit matching exemption suppresses only its encoded target. A more-specific
  // relationship is surfaced, not used to guess precedence; potential conflicts require review.
  for (const relationship of ruleSet.relationships) {
    if (relationship.type === "exempts_from" || relationship.type === "excepts") {
      const from = byKey.get(relationship.fromRuleKey); const to = byKey.get(relationship.toRuleKey);
      if (from?.truth === "TRUE" && to?.status === "MATCHED") to.status = "NOT_MATCHED";
    }
  }
  const conflicts = ruleSet.relationships.flatMap((relationship) => {
    if (relationship.type !== "potentially_conflicts_with") return [];
    const from = byKey.get(relationship.fromRuleKey); const to = byKey.get(relationship.toRuleKey);
    if (!from || !to || from.truth !== "TRUE" || to.truth !== "TRUE") return [];
    return [{ relationship, fromStatus: from.status, toStatus: to.status, requiresReview: true }];
  });
  const unknown = evaluated.filter((rule) => rule.status === "UNKNOWN");
  const inputMap = new Map<string, RuleInput>();
  for (const rule of unknown) for (const input of rule.inputs) if (rule.missingFactKeys.includes(input.key) && input.requiredWhenApplicable) inputMap.set(input.key, input);
  const citationMap = new Map<string, Citation>();
  for (const rule of evaluated.filter((r) => r.status === "MATCHED" || r.status === "REVIEW_REQUIRED"))
    for (const citation of rule.citations) citationMap.set(JSON.stringify(citation), citation);
  const { rules: _rules, relationships: _relationships, ...ruleSetSummary } = ruleSet;
  void _rules; void _relationships;
  return {
    ruleSet: ruleSetSummary,
    matchedRules: evaluated.filter((r) => r.status === "MATCHED"),
    reviewRequiredRules: evaluated.filter((r) => r.status === "REVIEW_REQUIRED"),
    unknownRules: unknown,
    notMatchedRules: evaluated.filter((r) => r.status === "NOT_MATCHED"),
    missingInputs: [...inputMap.values()], conflicts, citations: [...citationMap.values()],
  };
}
