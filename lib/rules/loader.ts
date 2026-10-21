import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server";
import { PrecedenceValidationError, validDate, validatePrecedence } from "./precedence";
import type { Citation, Condition, JsonValue, LoadedRule, LoadedRuleSet, Outcome, RuleInput, RuleRelationship } from "./types";

type Row = Record<string, unknown>;
function relationshipCitations(row: Row): Citation[] {
  if (!row.source_provisions) return [];
  const p = row.source_provisions as Row, source = p.regulatory_sources as Row | null;
  if (!source) return [];
  return [{ sourceTitle: String(source.title), sectionIdentifier: String(p.display_locator ?? p.locator), sectionTitle: p.title ? String(p.title) : null, excerpt: p.excerpt ? String(p.excerpt) : null, sourceUrl: p.source_url ? String(p.source_url) : null, editionLabel: source.edition_label ? String(source.edition_label) : null, publishedOn: source.published_on ? String(source.published_on) : null, effectiveFrom: source.effective_from ? String(source.effective_from) : null, effectiveTo: source.effective_to ? String(source.effective_to) : null, citationRole: "precedence", pinpointNote: row.rationale ? String(row.rationale) : null }];
}

const rows = (value: unknown): Row[] => (value ?? []) as Row[];
const object = (value: unknown): Row => value as Row;

async function checked(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, label: string) {
  const { data, error } = await query;
  if (error) throw new Error(`Unable to load rule set ${label}: ${error.message}`);
  return data;
}

export async function loadRuleSet(
  jurisdiction: string,
  projectType: string,
  client: SupabaseClient = createSupabaseServerClient(),
  asOfDate: string = new Date().toISOString().slice(0, 10),
): Promise<LoadedRuleSet> {
  if (!validDate(asOfDate)) throw new PrecedenceValidationError(["invalid evaluation date"]);
  const setData = await checked(client.from("rule_sets").select("id,key,title,coverage_status,known_gaps,jurisdictions!inner(slug),project_types!inner(key)")
    .eq("jurisdictions.slug", jurisdiction).eq("project_types.key", projectType).eq("research_status", "verified").not("published_at", "is", null)
    .lte("effective_from", asOfDate).or(`effective_to.is.null,effective_to.gt.${asOfDate}`).limit(1).maybeSingle(), "identity");
  if (!setData) throw new Error(`No published rule set for ${jurisdiction}/${projectType}`);
  const set = object(setData);
  const ruleRows = rows(await checked(client.from("rules").select("id,key,title,group_key,active_version_id,rule_versions!rules_active_version_fk(id,version_number,condition,evaluation_mode,summary,effective_from,effective_to,research_status,lifecycle_status,published_at)").eq("rule_set_id", set.id), "rules"));
  const versions = ruleRows.map((rule) => object(rule.rule_versions));
  for (const version of versions) {
    if (!version || !Number.isInteger(Number(version.version_number)) || version.research_status !== "verified" || version.lifecycle_status !== "active" || !version.published_at || typeof version.effective_from !== "string" || !validDate(version.effective_from) || version.effective_from > asOfDate || (version.effective_to != null && (typeof version.effective_to !== "string" || !validDate(version.effective_to) || version.effective_to <= asOfDate))) throw new PrecedenceValidationError(["active rule version unavailable for evaluation date"]);
  }
  const versionIds = versions.map((version) => String(version.id));
  const ruleIds = ruleRows.map((rule) => String(rule.id));
  const [outcomeRows, inputRows, citationRows, relationshipRows] = await Promise.all([
    checked(client.from("rule_outcomes").select("rule_version_id,sequence,outcome_type,parameters,severity,message_template,input_definitions(key)").in("rule_version_id", versionIds).order("sequence"), "outcomes"),
    checked(client.from("rule_version_inputs").select("rule_version_id,role,required_when_applicable,input_definitions(id,key,label,data_type,canonical_unit,default_source_class,user_input_allowed,input_options(key,label,description))").in("rule_version_id", versionIds), "inputs"),
    checked(client.from("rule_citations").select("rule_version_id,citation_role,pinpoint_note,sequence,source_provisions(locator,display_locator,title,excerpt,excerpt_checksum,source_url,regulatory_sources(title,edition_label,published_on,effective_from,effective_to))").in("rule_version_id", versionIds).order("sequence"), "citations"),
    checked(client.from("rule_relationships").select("from_rule_id,to_rule_id,relationship_type,rationale,scope_condition,metadata,effective_from,effective_to,source_provision_id,source_provisions(locator,display_locator,title,excerpt,excerpt_checksum,source_url,regulatory_sources(title,edition_label,published_on,effective_from,effective_to))").or(`from_rule_id.in.(${ruleIds.join(",")}),to_rule_id.in.(${ruleIds.join(",")})`), "relationships"),
  ]);
  const keyByRuleId = new Map(ruleRows.map((rule) => [String(rule.id), String(rule.key)]));
  const rules: LoadedRule[] = ruleRows.map((rule) => {
    const version = object(rule.rule_versions);
    const outcomes: Outcome[] = rows(outcomeRows).filter((r) => r.rule_version_id === version.id).map((r) => ({
      sequence: Number(r.sequence), type: String(r.outcome_type), subjectKey: r.input_definitions ? String(object(r.input_definitions).key) : null,
      parameters: r.parameters as Record<string, JsonValue>, severity: String(r.severity), messageTemplate: String(r.message_template),
    }));
    const inputs: RuleInput[] = rows(inputRows).filter((r) => r.rule_version_id === version.id).map((r) => { const d = object(r.input_definitions); return {
      key: String(d.key), label: String(d.label), dataType: String(d.data_type), unit: d.canonical_unit ? String(d.canonical_unit) : null,
      propertyDerived: d.default_source_class === "property_derived", userInputAllowed: Boolean(d.user_input_allowed), requiredWhenApplicable: Boolean(r.required_when_applicable), role: String(r.role),
      options: rows(d.input_options).map((o) => ({ key: String(o.key), label: String(o.label), description: o.description ? String(o.description) : null })),
    }; });
    const citations: Citation[] = rows(citationRows).filter((r) => r.rule_version_id === version.id).map((r) => { const p = object(r.source_provisions); const s = object(p.regulatory_sources); return {
      sourceTitle: String(s.title), sectionIdentifier: String(p.display_locator ?? p.locator), sectionTitle: p.title ? String(p.title) : null, excerpt: p.excerpt ? String(p.excerpt) : null,
      sourceUrl: p.source_url ? String(p.source_url) : null, editionLabel: s.edition_label ? String(s.edition_label) : null, publishedOn: s.published_on ? String(s.published_on) : null,
      effectiveFrom: s.effective_from ? String(s.effective_from) : null, effectiveTo: s.effective_to ? String(s.effective_to) : null, citationRole: String(r.citation_role), pinpointNote: r.pinpoint_note ? String(r.pinpoint_note) : null,
    }; });
    return { key: String(rule.key), title: String(rule.title), groupKey: rule.group_key ? String(rule.group_key) : null, versionNumber: Number(version.version_number), effectiveFrom: version.effective_from as string | null, effectiveTo: version.effective_to as string | null,
      condition: version.condition as Condition, evaluationMode: version.evaluation_mode as LoadedRule["evaluationMode"], summary: String(version.summary), outcomes, inputs, citations };
  });
  const relationships: RuleRelationship[] = rows(relationshipRows).map((r) => ({ fromRuleKey: keyByRuleId.get(String(r.from_rule_id)) ?? String(r.from_rule_id), toRuleKey: keyByRuleId.get(String(r.to_rule_id)) ?? String(r.to_rule_id),
    type: String(r.relationship_type), rationale: r.rationale ? String(r.rationale) : null, scopeCondition: r.scope_condition as Condition | null, metadata: r.metadata as Record<string, JsonValue>, effectiveFrom: r.effective_from as string | null, effectiveTo: r.effective_to as string | null, sourceProvisionId: r.source_provision_id as string | null, sourceProvisionChecksum: r.source_provisions ? object(r.source_provisions).excerpt_checksum as string | null : null, citations: relationshipCitations(r) }));
  const loaded: LoadedRuleSet = { key: String(set.key), title: String(set.title), jurisdiction, projectType, coverageStatus: String(set.coverage_status), knownGaps: set.known_gaps as JsonValue[], rules, relationships };
  loaded.relationships = validatePrecedence(loaded, asOfDate);
  return loaded;
}
