import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateLoadedRuleSet } from "./evaluate";
import { loadRuleSet } from "./loader";
import type { EvaluationRequest, EvaluationResult } from "./types";

export async function evaluateProjectRules(request: EvaluationRequest, client?: SupabaseClient): Promise<EvaluationResult> {
  const ruleSet = await loadRuleSet(request.jurisdiction, request.projectType, client);
  return evaluateLoadedRuleSet(ruleSet, request);
}

export type * from "./types";
