"use server";

import { evaluateProjectRules } from "../../../lib/rules";
import type { Facts } from "../../../lib/rules/types";
import { mockClearwaterPropertyFacts } from "./mock-property";

export async function evaluateFenceAnswers(facts: Facts) {
  // Property facts remain server-owned until the mock is replaced by GIS.
  return evaluateProjectRules({ jurisdiction: "clearwater-fl", projectType: "fence", facts: { ...facts, ...mockClearwaterPropertyFacts } });
}
