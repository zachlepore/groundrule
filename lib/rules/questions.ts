import type { EvaluatedRule, Facts, RuleInput } from "./types";

export interface PlannedQuestion extends RuleInput {
  affectedRuleCount: number;
}

const supportedTypes = new Set(["boolean", "enum", "decimal", "integer", "number", "text"]);

/** Plans questions from runtime metadata; it has no jurisdiction-specific ordering. */
export function planQuestions(
  missingInputs: RuleInput[],
  facts: Facts,
  unresolvedRules: Pick<EvaluatedRule, "missingFactKeys">[],
): PlannedQuestion[] {
  return missingInputs
    .filter((input) => {
      if (Object.prototype.hasOwnProperty.call(facts, input.key)) return false;
      if (!input.userInputAllowed || !supportedTypes.has(input.dataType)) return false;
      if (input.propertyDerived && !input.userInputAllowed) return false;
      return input.dataType !== "enum" || input.options.length > 0;
    })
    .map((input) => ({
      ...input,
      affectedRuleCount: unresolvedRules.filter((rule) => rule.missingFactKeys.includes(input.key)).length,
    }))
    .filter((input) => input.affectedRuleCount > 0)
    .sort((a, b) =>
      b.affectedRuleCount - a.affectedRuleCount ||
      Number(b.role === "applicability") - Number(a.role === "applicability") ||
      a.label.localeCompare(b.label),
    );
}

export function nextQuestion(
  missingInputs: RuleInput[],
  facts: Facts,
  unresolvedRules: Pick<EvaluatedRule, "missingFactKeys">[],
) {
  return planQuestions(missingInputs, facts, unresolvedRules)[0] ?? null;
}
