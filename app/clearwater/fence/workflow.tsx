"use client";

import { useMemo, useState, useTransition } from "react";
import type { FenceGuide, FenceGuideItem } from "../../../lib/guides/fence";
import type { EvaluationResult, FactValue, Facts, RuleInput } from "../../../lib/rules/types";
import { nextQuestion } from "../../../lib/rules/questions";
import { evaluateFenceAnswers, startFenceLookup } from "./actions";

type Snapshot = { facts: Facts; result: EvaluationResult };

function Source({ item }: { item: FenceGuideItem }) {
  const citation = item.citations[0];
  if (!citation) return null;
  const label = `${citation.sourceTitle} ${citation.sectionIdentifier}`;
  return <p className="guide-source"><span>{label}</span>{citation.sourceUrl && <a href={citation.sourceUrl} target="_blank" rel="noreferrer">View official rule →</a>}</p>;
}

function VisibilityDiagram({ item }: { item: FenceGuideItem }) {
  const feet = item.values?.horizontal_leg_1_ft;
  const height = item.values?.display_value;
  const heightUnit = item.values?.display_unit === "in" ? "in." : item.values?.display_unit;
  return <figure className="visibility-diagram" aria-labelledby="visibility-caption">
    <svg viewBox="0 0 560 300" role="img" aria-label="Simple diagram of the triangular clear-view area where a driveway meets a street">
      <rect width="560" height="300" fill="#f8faf8"/><rect y="220" width="560" height="80" fill="#dfe5e2"/>
      <rect x="390" width="100" height="220" fill="#e9edeb"/><path d="M390 220 L265 220 L390 95 Z" fill="#cce3d5" stroke="#236044" strokeWidth="3"/>
      <path d="M265 205v30M390 205v30M280 230h95" stroke="#236044" strokeWidth="2"/><text x="307" y="255" fill="#173d2d" fontSize="18">{String(feet)} ft</text>
      <path d="M375 95h30M375 220h30M400 110v95" stroke="#236044" strokeWidth="2"/><text x="412" y="166" fill="#173d2d" fontSize="18">{String(feet)} ft</text>
      <text x="26" y="267" fill="#44514b" fontSize="18">Street / right-of-way</text><text x="411" y="38" fill="#44514b" fontSize="17">Driveway</text>
      <text x="276" y="184" fill="#173d2d" fontSize="16">Keep view clear</text>
    </svg>
    <figcaption id="visibility-caption">In the shaded area: non-opaque fence only, no higher than {String(height)} {String(heightUnit)} This illustration helps explain the rule; Clearwater must confirm the exact location.</figcaption>
  </figure>;
}

function GuideSection({ symbol, title, items }: { symbol: string; title: string; items: FenceGuideItem[] }) {
  if (!items.length) return null;
  return <section className="guide-section" aria-labelledby={`section-${title.replaceAll(" ", "-")}`}><h2 id={`section-${title.replaceAll(" ", "-")}`}><span>{symbol}</span>{title}</h2>
    {items.map((item) => <article className="guide-item" key={item.key}><h3>{item.title}</h3><p>{item.body}</p>{item.bullets && <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{item.assetId && <VisibilityDiagram item={item}/>}<Source item={item}/></article>)}
  </section>;
}

function QuestionControl({ input, value, onChange }: { input: RuleInput; value: FactValue; onChange: (value: FactValue) => void }) {
  if (input.dataType === "boolean") return <div className="choice-grid"><button className={value === true ? "selected" : ""} onClick={() => onChange(true)}>Yes</button><button className={value === false ? "selected" : ""} onClick={() => onChange(false)}>No</button></div>;
  if (input.dataType === "enum") return <div className="choice-grid">{input.options.map((option) => <button className={value === option.key ? "selected" : ""} key={option.key} onClick={() => onChange(option.key)}>{option.label}{option.description && <small>{option.description}</small>}</button>)}</div>;
  return <input className="answer-input" type={input.dataType === "text" ? "text" : "number"} min={input.dataType === "text" ? undefined : 0} step="any" value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(input.dataType === "text" ? event.target.value : event.target.value === "" ? undefined : Number(event.target.value))}/>;
}

export function FenceWorkflow() {
  const [address, setAddress] = useState(""); const [confirmedAddress, setConfirmedAddress] = useState<string | null>(null);
  const [guide, setGuide] = useState<FenceGuide | null>(null); const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [stage, setStage] = useState<"address" | "project" | "guide" | "refine">("address"); const [draft, setDraft] = useState<FactValue>();
  const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  const question = useMemo(() => snapshot ? nextQuestion(snapshot.result.missingInputs, snapshot.facts, snapshot.result.unknownRules) : null, [snapshot]);
  const lookup = () => startTransition(async () => { try { const found = await startFenceLookup(address); if (!found) { setError("This address isn’t in our limited Clearwater pilot area yet. We did not evaluate it."); return; } setConfirmedAddress(found.displayAddress); setGuide(found.guide); setSnapshot({ facts: found.facts, result: found.result }); setStage("project"); setError(null); } catch { setError("We couldn’t look up that address right now. Please try again later."); } });
  const submit = () => { if (!question || !snapshot || !confirmedAddress || draft === undefined || draft === "") return; startTransition(async () => { try { const facts = { ...snapshot.facts, [question.key]: draft }; const result = await evaluateFenceAnswers(confirmedAddress, facts); setSnapshot({ facts, result }); setDraft(undefined); setError(null); } catch { setError("We couldn’t check the rules right now. Please try again later."); } }); };

  return <main className="workflow-shell"><header className="workflow-brand">GROUNDRULE <span>Clearwater, Florida</span></header>
    {stage === "address" && <section className="address-panel"><p className="eyebrow">Clearwater fence pilot</p><h1>Enter your property address</h1><p className="workflow-copy">Guidance based on current City rules and property data.</p><div className="address-form"><input aria-label="Property address" autoComplete="street-address" placeholder="1950 Drew Plz" value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === "Enter" && address.trim() && lookup()}/><button onClick={lookup} disabled={pending || !address.trim()}>{pending ? "Looking…" : "Continue"}</button></div>{error && <p role="alert" className="warning">{error}</p>}</section>}
    {stage === "project" && <section className="address-panel"><p className="found">✓ We found this property.</p><h1 className="address-heading">{confirmedAddress}<small>Clearwater, FL</small></h1><div className="project-choice"><h2>What do you want to do?</h2><button onClick={() => setStage("guide")}>Build or replace a fence <span>→</span></button></div></section>}
    {stage === "guide" && guide && <article className="guide"><p className="eyebrow">Clearwater fence guide</p><h1>Fences at {confirmedAddress}</h1><p className="guide-intro">This guidance is based on this property and current Clearwater rules. It is not a permit or City approval.</p><GuideSection symbol="✓" title="WHAT YOU CAN DO" items={guide.whatYouCanDo}/><GuideSection symbol="!" title="BEFORE YOU BUILD" items={guide.beforeYouBuild}/><GuideSection symbol="?" title="CHECK THIS" items={guide.checkThis}/><aside className="refine"><h2>Have a specific fence in mind?</h2><p>Answer a few optional questions to check your planned location, height, and material.</p><button onClick={() => setStage("refine")}>Check my fence</button></aside></article>}
    {stage === "refine" && snapshot && <section className="address-panel"><button className="back-link" onClick={() => setStage("guide")}>← Back to property guide</button><p className="eyebrow">Optional fence check</p>{question ? <><h1>{question.label}</h1><QuestionControl input={question} value={draft} onChange={setDraft}/><div className="workflow-actions"><button className="primary" onClick={submit} disabled={pending || draft === undefined || draft === ""}>{pending ? "Checking…" : "Continue"}</button></div></> : <><h1>Your details are checked.</h1><p className="workflow-copy">Return to the property guide. Your answers were evaluated against the live Clearwater rules.</p></>}{error && <p role="alert" className="warning">{error}</p>}</section>}
  </main>;
}
