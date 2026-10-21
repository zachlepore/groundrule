export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type FactValue = JsonValue | undefined;
export type Facts = Record<string, FactValue>;
export type TruthValue = "TRUE" | "FALSE" | "UNKNOWN";
export type RuleStatus = "MATCHED" | "NOT_MATCHED" | "UNKNOWN" | "REVIEW_REQUIRED";

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fact: string; op: "is_true" | "is_false" | "is_known" | "is_unknown" }
  | { fact: string; op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte"; value: JsonValue; unit?: string }
  | { fact: string; op: "in" | "not_in"; values: JsonValue[]; unit?: string }
  | { fact: string; op: "between"; values: JsonValue[]; lower_inclusive: boolean; upper_inclusive: boolean; unit?: string };

export interface InputOption { key: string; label: string; description: string | null }
export interface RuleInput {
  key: string; label: string; dataType: string; unit: string | null;
  propertyDerived: boolean; userInputAllowed: boolean; requiredWhenApplicable: boolean;
  role: string; options: InputOption[];
}
export interface Outcome { sequence: number; type: string; subjectKey: string | null; parameters: Record<string, JsonValue>; severity: string; messageTemplate: string }
export interface Citation {
  sourceTitle: string; sectionIdentifier: string; sectionTitle: string | null;
  excerpt: string | null; sourceUrl: string | null; editionLabel: string | null;
  publishedOn: string | null; effectiveFrom: string | null; effectiveTo: string | null;
  citationRole: string; pinpointNote: string | null;
}
export interface RuleRelationship { fromRuleKey: string; toRuleKey: string; type: string; rationale: string | null; scopeCondition: Condition | null; metadata: Record<string, JsonValue>; effectiveFrom?: string | null; effectiveTo?: string | null; sourceProvisionId?: string | null; sourceProvisionChecksum?: string | null; validationPolicy?: "versioned" | "reviewed_clearwater_seed_v1"; citations?: Citation[] }
export interface LoadedRule {
  key: string; title: string; groupKey: string | null; versionNumber: number;
  effectiveFrom?: string | null; effectiveTo?: string | null;
  condition: Condition; evaluationMode: "deterministic" | "partial" | "discretionary" | "external" | "informational";
  summary: string; outcomes: Outcome[]; inputs: RuleInput[]; citations: Citation[];
}
export interface LoadedRuleSet { key: string; title: string; jurisdiction: string; projectType: string; coverageStatus: string; knownGaps: JsonValue[]; rules: LoadedRule[]; relationships: RuleRelationship[] }
export interface EvaluationRequest { jurisdiction: string; projectType: string; facts: Facts; asOfDate?: string }
export interface RuleResolution {
  state: "effective" | "suppressed" | "pending" | "conflicting";
  reasons: string[]; controllingRuleKeys: string[]; relationships: RuleRelationship[]; citations: Citation[];
}
export interface EvaluatedRule extends LoadedRule { rawStatus?: RuleStatus; rawOutcomes?: Outcome[]; resolution?: RuleResolution; status: RuleStatus; truth: TruthValue; missingFactKeys: string[]; relationships: RuleRelationship[] }
export interface EvaluationConflict { relationship: RuleRelationship; fromStatus: RuleStatus; toStatus: RuleStatus; requiresReview: boolean }
export interface EvaluationResult {
  evaluatedAsOf?: string;
  ruleSet: Omit<LoadedRuleSet, "rules" | "relationships">;
  matchedRules: EvaluatedRule[]; reviewRequiredRules: EvaluatedRule[]; unknownRules: EvaluatedRule[]; notMatchedRules: EvaluatedRule[];
  missingInputs: RuleInput[]; conflicts: EvaluationConflict[]; citations: Citation[];
}
