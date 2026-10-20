import type { Condition, Facts, JsonValue, TruthValue } from "./types";

export const isKnownFact = (facts: Facts, key: string) => Object.prototype.hasOwnProperty.call(facts, key) && facts[key] !== null && facts[key] !== undefined;
const invert = (value: TruthValue): TruthValue => value === "TRUE" ? "FALSE" : value === "FALSE" ? "TRUE" : "UNKNOWN";
const same = (a: JsonValue, b: JsonValue) => JSON.stringify(a) === JSON.stringify(b);

export function conditionFactKeys(condition: Condition): string[] {
  if ("all" in condition) return condition.all.flatMap(conditionFactKeys);
  if ("any" in condition) return condition.any.flatMap(conditionFactKeys);
  if ("not" in condition) return conditionFactKeys(condition.not);
  return [condition.fact];
}

export function evaluateCondition(condition: Condition, facts: Facts): TruthValue {
  if ("all" in condition) {
    const values = condition.all.map((child) => evaluateCondition(child, facts));
    return values.includes("FALSE") ? "FALSE" : values.every((value) => value === "TRUE") ? "TRUE" : "UNKNOWN";
  }
  if ("any" in condition) {
    const values = condition.any.map((child) => evaluateCondition(child, facts));
    return values.includes("TRUE") ? "TRUE" : values.every((value) => value === "FALSE") ? "FALSE" : "UNKNOWN";
  }
  if ("not" in condition) return invert(evaluateCondition(condition.not, facts));

  const hasValue = isKnownFact(facts, condition.fact);
  if (condition.op === "is_known") return hasValue ? "TRUE" : "FALSE";
  if (condition.op === "is_unknown") return hasValue ? "FALSE" : "TRUE";
  if (!hasValue) return "UNKNOWN";
  const value = facts[condition.fact] as JsonValue;
  switch (condition.op) {
    case "is_true": return value === true ? "TRUE" : "FALSE";
    case "is_false": return value === false ? "TRUE" : "FALSE";
    case "eq": return same(value, condition.value) ? "TRUE" : "FALSE";
    case "neq": return !same(value, condition.value) ? "TRUE" : "FALSE";
    case "in": return condition.values.some((candidate) => same(value, candidate)) ? "TRUE" : "FALSE";
    case "not_in": return condition.values.some((candidate) => same(value, candidate)) ? "FALSE" : "TRUE";
    case "lt": case "lte": case "gt": case "gte": {
      if (typeof value !== "number" || typeof condition.value !== "number") return "UNKNOWN";
      return ({ lt: value < condition.value, lte: value <= condition.value, gt: value > condition.value, gte: value >= condition.value })[condition.op] ? "TRUE" : "FALSE";
    }
    case "between": {
      const [lower, upper] = condition.values;
      if (typeof value !== "number" || typeof lower !== "number" || typeof upper !== "number") return "UNKNOWN";
      return ((condition.lower_inclusive ? value >= lower : value > lower) && (condition.upper_inclusive ? value <= upper : value < upper)) ? "TRUE" : "FALSE";
    }
  }
}

/** Runtime shape guard matching the existing database expression grammar. */
export function isCondition(value: unknown, depth = 0): value is Condition {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 128) return false;
  const c = value as Record<string, unknown>, keys = Object.keys(c);
  const only = (...allowed: string[]) => keys.every(k => allowed.includes(k));
  if ("all" in c || "any" in c) {
    const key = "all" in c ? "all" : "any", children = c[key];
    return only(key) && Array.isArray(children) && children.length > 0 && children.every(x => isCondition(x, depth + 1));
  }
  if ("not" in c) return only("not") && isCondition(c.not, depth + 1);
  if (typeof c.fact !== "string" || !c.fact.length || typeof c.op !== "string") return false;
  if (["is_true", "is_false", "is_known", "is_unknown"].includes(c.op)) return only("fact", "op");
  if (["eq", "neq", "lt", "lte", "gt", "gte"].includes(c.op)) return only("fact", "op", "value", "unit") && Object.hasOwn(c, "value") && c.value !== undefined;
  if (["in", "not_in"].includes(c.op)) return only("fact", "op", "values", "unit") && Array.isArray(c.values) && c.values.length > 0;
  return c.op === "between" && only("fact", "op", "values", "unit", "lower_inclusive", "upper_inclusive") && Array.isArray(c.values) && c.values.length === 2 && typeof c.lower_inclusive === "boolean" && typeof c.upper_inclusive === "boolean";
}
