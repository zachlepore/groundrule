"use client";

import { useMemo, useState, useTransition } from "react";
import type { EvaluationResult, FactValue, Facts, RuleInput } from "../../../lib/rules/types";
import { nextQuestion } from "../../../lib/rules/questions";
import { groupRules, unresolvedImportantInputs } from "../../../lib/rules/presentation";
import { evaluateFenceAnswers, startFenceLookup } from "./actions";

type Snapshot = { facts: Facts; result: EvaluationResult };

function QuestionControl({ input, value, onChange }: { input: RuleInput; value: FactValue; onChange: (value: FactValue) => void }) {
  if (input.dataType === "boolean") return <div className="choice-grid"><button className={value === true ? "selected" : ""} onClick={() => onChange(true)}>Yes</button><button className={value === false ? "selected" : ""} onClick={() => onChange(false)}>No</button></div>;
  if (input.dataType === "enum") return <div className="choice-grid">{input.options.map((option) => <button className={value === option.key ? "selected" : ""} key={option.key} onClick={() => onChange(option.key)}>{option.label}{option.description && <small>{option.description}</small>}</button>)}</div>;
  return <div><input className="answer-input" type={input.dataType === "text" ? "text" : "number"} min={input.dataType === "text" ? undefined : 0} step="any" value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(input.dataType === "text" ? event.target.value : event.target.value === "" ? undefined : Number(event.target.value))} />{input.unit && <span className="unit">{input.unit}</span>}</div>;
}

function Results({ result }: { result: EvaluationResult }) {
  const supported = groupRules(result.matchedRules);
  const review = groupRules(result.reviewRequiredRules);
  const unknown = unresolvedImportantInputs(result);
  return <section className="results">
    <p className="eyebrow">Your Clearwater fence guide</p><h1>Here’s what the rules indicate.</h1>
    <p className="workflow-copy">Based on the information provided and the stored pilot property profile, these are guidance—not a permit or approval.</p>
    <h2>What we can tell you</h2>{supported.length ? supported.map((group) => <article key={group.key}><h3>{group.label}</h3><ul>{group.rules.map((rule) => <li key={rule.key}>{rule.outcomes[0]?.messageTemplate ?? rule.summary}</li>)}</ul></article>) : <p>No definitive rules were identified from the available facts.</p>}
    <h2>What may still need review</h2>{result.conflicts.length > 0 && <p className="warning">The live rules contain {result.conflicts.length} unresolved conflict(s). City review is required.</p>}{review.length ? review.map((group) => <article key={group.key}><h3>{group.label}</h3><ul>{group.rules.map((rule) => <li key={rule.key}>{rule.outcomes[0]?.messageTemplate ?? rule.summary} City review may still be required.</li>)}</ul></article>) : <p>No review-required rule is currently matched.</p>}
    <h2>What we still don’t know</h2>{unknown.length ? <ul>{unknown.map((input) => <li key={input.key}>{input.label}{input.propertyDerived && !input.userInputAllowed ? " (requires property or city information)" : ""}</li>)}</ul> : <p>No material missing facts remain in this evaluation.</p>}
    <h2>Sources</h2>{result.citations.length ? <ul className="sources">{result.citations.map((citation, index) => <li key={`${citation.sourceTitle}-${citation.sectionIdentifier}-${index}`}>{citation.sourceUrl ? <a href={citation.sourceUrl} target="_blank" rel="noreferrer">{citation.sourceTitle}</a> : citation.sourceTitle} — {citation.sectionIdentifier}{citation.sectionTitle ? ` — ${citation.sectionTitle}` : ""}</li>)}</ul> : <p>No citations are attached to the currently supported outcomes.</p>}
  </section>;
}

export function FenceWorkflow() {
  const [address, setAddress] = useState("");
  const [confirmedAddress, setConfirmedAddress] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]); const [draft, setDraft] = useState<FactValue>(undefined);
  const [finished, setFinished] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  const question = useMemo(() => snapshot ? nextQuestion(snapshot.result.missingInputs, snapshot.facts, snapshot.result.unknownRules) : null, [snapshot]);
  const showResults = finished || !question;
  const lookup = () => startTransition(async () => { try { const found = await startFenceLookup(address); if (!found) { setError("This address isn’t in our limited Clearwater pilot area yet. We did not evaluate it."); return; } setConfirmedAddress(found.displayAddress); setSnapshot({ facts: found.facts, result: found.result }); setError(null); } catch { setError("We couldn’t look up that address right now. Please try again later."); } });
  const submit = (unknown = false) => { if (!question || !snapshot || !confirmedAddress) return; const value = unknown ? null : draft; if (value === undefined || value === "") return; startTransition(async () => { try { const facts = { ...snapshot.facts, [question.key]: value }; const result = await evaluateFenceAnswers(confirmedAddress, facts); setHistory((items) => [...items, snapshot]); setSnapshot({ facts, result }); setDraft(undefined); setError(null); } catch { setError("We couldn’t refresh the live rules. Your answer was not lost; please try again."); } }); };
  const back = () => { const previous = history.at(-1); if (!previous) return; setSnapshot(previous); setHistory((items) => items.slice(0, -1)); setDraft(undefined); setFinished(false); };
  if (!snapshot) return <main className="workflow-shell"><header className="workflow-brand">GROUNDRULE <span>Property rules, made clear.</span></header><div className="workflow-progress">Clearwater · Fence guide</div><section className="workflow-card"><p className="eyebrow">Limited Clearwater pilot area</p><h1>Enter the property address</h1><p className="workflow-copy">We’ll check whether this property is included in our current test area.</p><input className="answer-input" aria-label="Property address" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && address.trim()) lookup(); }} />{error && <p role="alert" className="warning">{error}</p>}<div className="workflow-actions"><button className="primary" onClick={lookup} disabled={pending || !address.trim()}>{pending ? "Looking…" : "Continue"}</button></div></section></main>;
  return <main className="workflow-shell"><header className="workflow-brand">GROUNDRULE <span>Property rules, made clear.</span></header><div className="workflow-progress">Clearwater · Fence guide {showResults ? "· Results" : "· Next useful question"}</div><section className="workflow-card"><p className="workflow-copy">We found this property: {confirmedAddress}.</p>{showResults ? <Results result={snapshot.result} /> : <><p className="eyebrow">Tell us about your project</p><h1>{question.label}</h1>{question.unit && <p className="workflow-copy">Enter the amount in {question.unit}.</p>}<QuestionControl input={question} value={draft} onChange={setDraft} />{error && <p role="alert" className="warning">{error}</p>}<div className="workflow-actions"><button className="secondary" onClick={back} disabled={!history.length || pending}>Back</button><button className="secondary" onClick={() => submit(true)} disabled={pending}>I don’t know</button><button className="primary" onClick={() => submit()} disabled={pending || draft === undefined || draft === ""}>{pending ? "Checking…" : "Continue"}</button></div><button className="result-link" onClick={() => setFinished(true)}>See results with what I’ve answered</button></>}</section></main>;
}
