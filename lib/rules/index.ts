import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateLoadedRuleSet } from "./evaluate";
import { loadRuleSet } from "./loader";
import type { EvaluationRequest, EvaluationResult } from "./types";

export async function evaluateProjectRules(request: EvaluationRequest, client?: SupabaseClient): Promise<EvaluationResult> {
  const asOfDate = request.asOfDate ?? new Date().toISOString().slice(0, 10);
  const ruleSet = await loadRuleSet(request.jurisdiction, request.projectType, client, asOfDate);
  return evaluateLoadedRuleSet(ruleSet, { ...request, asOfDate });
}

export type * from "./types";
