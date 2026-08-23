import { evaluateProjectRules } from "../../../lib/rules";
import { liveEvaluatorRequest } from "./request";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const countRows = (result: Awaited<ReturnType<typeof evaluateProjectRules>>) => [
  ["Loaded rules", result.matchedRules.length + result.notMatchedRules.length + result.unknownRules.length + result.reviewRequiredRules.length],
  ["Matched", result.matchedRules.length],
  ["Not matched", result.notMatchedRules.length],
  ["Unknown", result.unknownRules.length],
  ["Review required", result.reviewRequiredRules.length],
  ["Missing inputs", result.missingInputs.length],
  ["Conflicts", result.conflicts.length],
] as const;

export default async function LiveRuleEvaluatorPage() {
  let result: Awaited<ReturnType<typeof evaluateProjectRules>> | null = null;
  let diagnosticError: string | null = null;
  try {
    result = await evaluateProjectRules(liveEvaluatorRequest);
  } catch (error) {
    diagnosticError = error instanceof Error ? error.message : "Unknown live evaluator failure";
  }

  if (!result) {
    return (
      <main style={{ margin: "2rem auto", maxWidth: "64rem", padding: "0 1rem", fontFamily: "monospace" }}>
        <h1>Live rule evaluator diagnostic error</h1>
        <p role="alert">{diagnosticError}</p>
        <p>No fixture data was used. Check the Supabase environment, published data, and public read policies.</p>
      </main>
    );
  }

  return (
    <main style={{ margin: "2rem auto", maxWidth: "64rem", padding: "0 1rem", fontFamily: "monospace" }}>
      <h1>Live rule evaluator diagnostic</h1>
      <p>This server-rendered page has no fixture fallback and performs read-only Supabase queries.</p>
      <dl>
        <dt>Jurisdiction</dt><dd>{result.ruleSet.jurisdiction}</dd>
        <dt>Project type</dt><dd>{result.ruleSet.projectType}</dd>
        <dt>Live rule set</dt><dd>{result.ruleSet.key} — {result.ruleSet.title}</dd>
        {countRows(result).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>

      <h2>Matched rule sample</h2>
      <ul>{result.matchedRules.slice(0, 5).map((rule) => <li key={rule.key}>{rule.key} — {rule.title}</li>)}</ul>

      <h2>Missing input sample</h2>
      <ul>{result.missingInputs.slice(0, 8).map((input) => <li key={input.key}>{input.key} — {input.label}</li>)}</ul>

      <h2>Citation sample</h2>
      <ul>{result.citations.slice(0, 5).map((citation, index) => (
        <li key={`${citation.sourceTitle}-${citation.sectionIdentifier}-${index}`}>
          {citation.sourceTitle} — {citation.sectionIdentifier}{citation.sectionTitle ? ` — ${citation.sectionTitle}` : ""}
        </li>
      ))}</ul>
    </main>
  );
}
