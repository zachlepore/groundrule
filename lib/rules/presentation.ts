import type { EvaluatedRule, EvaluationResult } from "./types";

export interface ResultGroup { key: string; label: string; rules: EvaluatedRule[] }

const labels: Record<string, string> = {
  height: "Height", material: "Materials", materials: "Materials", design: "Placement and design",
  frontage: "Placement and visibility", chain_link: "Chain-link fences", access: "Easements and access",
  waterfront: "Waterfront conditions", maintenance: "Maintenance", repair: "Repairs",
  subdivision: "Subdivision conditions", construction: "Temporary construction", entry: "Gates and entries",
  barbed_wire: "Barbed wire",
};

const topic = (rule: EvaluatedRule) => (rule.groupKey ?? rule.key.split(".")[0]).replaceAll("-", "_");
const title = (key: string) => labels[key] ?? key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

/** Groups and de-duplicates atomic runtime rules without changing their meaning or precedence. */
export function groupRules(rules: EvaluatedRule[]): ResultGroup[] {
  const groups = new Map<string, Map<string, EvaluatedRule>>();
  for (const rule of rules) {
    const key = topic(rule);
    const unique = groups.get(key) ?? new Map<string, EvaluatedRule>();
    unique.set(`${rule.summary}|${rule.outcomes.map((outcome) => outcome.messageTemplate).join("|")}`, rule);
    groups.set(key, unique);
  }
  return [...groups].map(([key, items]) => ({ key, label: title(key), rules: [...items.values()] }));
}

export function unresolvedImportantInputs(result: EvaluationResult) {
  return result.missingInputs.filter((input) =>
    result.unknownRules.some((rule) => rule.missingFactKeys.includes(input.key)),
  );
}
