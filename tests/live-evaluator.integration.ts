import assert from "node:assert/strict";
import { evaluateProjectRules } from "../lib/rules";
import { liveEvaluatorRequest } from "../app/dev/rule-evaluator/request";

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;
const configured = requiredEnvironment.filter((key) => process.env[key]);

if (configured.length === 0) {
  console.log(`SKIP live evaluator: ${requiredEnvironment.join(" and ")} are unavailable`);
  process.exit(0);
}
assert.equal(
  configured.length,
  requiredEnvironment.length,
  `Incomplete Supabase configuration; expected ${requiredEnvironment.join(" and ")}`,
);

async function run() {
  const result = await evaluateProjectRules(liveEvaluatorRequest);
  const loadedRuleCount = result.matchedRules.length + result.notMatchedRules.length
    + result.unknownRules.length + result.reviewRequiredRules.length;

  assert.ok(loadedRuleCount > 0, "expected at least one live rule");
  assert.ok(result.unknownRules.length > 0, "expected incomplete facts to produce UNKNOWN rules");
  assert.ok(result.missingInputs.length > 0, "expected incomplete facts to produce missing inputs");
  assert.ok(
    result.matchedRules.length + result.reviewRequiredRules.length > 0,
    "expected at least one matched or review-required rule",
  );
  assert.ok(result.citations.length > 0, "expected citations for matched/review-required rules");

  console.log(JSON.stringify({
    ruleSet: result.ruleSet,
    loadedRuleCount,
    matched: result.matchedRules.length,
    notMatched: result.notMatchedRules.length,
    unknown: result.unknownRules.length,
    reviewRequired: result.reviewRequiredRules.length,
    missingInputs: result.missingInputs.length,
    citations: result.citations.length,
  }, null, 2));
}

void run();
