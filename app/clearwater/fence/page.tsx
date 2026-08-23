import { evaluateProjectRules } from "../../../lib/rules";
import { FenceWorkflow } from "./workflow";
import { mockClearwaterPropertyFacts } from "./mock-property";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function initialEvaluation() {
  try {
    return await evaluateProjectRules({
      jurisdiction: "clearwater-fl", projectType: "fence", facts: mockClearwaterPropertyFacts,
    });
  } catch {
    return null;
  }
}

export default async function ClearwaterFencePage() {
  const result = await initialEvaluation();
  if (!result) {
    return <main className="workflow-shell"><header className="workflow-brand">GROUNDRULE</header><section className="workflow-card"><p className="eyebrow">Clearwater fence guide</p><h1>We can’t check the rules right now.</h1><p className="workflow-copy" role="alert">The live city rule information is temporarily unavailable. Please try again later.</p></section></main>;
  }
  return <FenceWorkflow initialResult={result} propertyFacts={mockClearwaterPropertyFacts} />;
}
