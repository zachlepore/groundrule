"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FenceGuide, FenceGuideItem } from "../../../lib/guides/fence";
import { startFenceLookup } from "./actions";

function Source({ item }: { item: FenceGuideItem }) {
  const citation = item.citations[0];
  if (!citation) return null;
  const detail = `${citation.sourceTitle}, ${citation.sectionIdentifier}`;
  return <p className="guide-source">{citation.sourceUrl ? <a href={citation.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View source, ${detail}`} title={detail}>Source ↗</a> : null}</p>;
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
    <figcaption id="visibility-caption">The shaded visibility area extends {String(feet)} ft along each applicable edge. In this area: non-opaque fence only, with a {String(height)} {String(heightUnit)} maximum fence height.</figcaption>
  </figure>;
}

function GuideSection({ symbol, title, items }: { symbol: string; title: string; items: FenceGuideItem[] }) {
  if (!items.length) return null;
  return <section className="guide-section" aria-labelledby={`section-${title.replaceAll(" ", "-")}`}><h2 id={`section-${title.replaceAll(" ", "-")}`}><span>{symbol}</span>{title}</h2>
    {items.map((item) => <article className="guide-item" key={item.key}><h3>{item.title}</h3><p>{item.body}</p>{item.bullets && <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{item.assetId && <VisibilityDiagram item={item}/>}<Source item={item}/></article>)}
  </section>;
}

function GuideHighlights({ items }: { items: FenceGuideItem[] }) {
  return <section className="guide-highlights" aria-labelledby="guide-highlights-title">
    <h2 id="guide-highlights-title">What you can do</h2>
    <div className="highlight-grid">{items.map((item) => <article key={item.key} className="highlight-item">
      <h3>{item.title}</h3><p className="highlight-answer">{item.answer ?? item.body}</p>
      {item.qualification && <p className="highlight-qualification">{item.qualification}</p>}{item.action && <a className="highlight-action" href={item.action.url}>{item.action.label} →</a>}<Source item={item}/>
    </article>)}</div>
  </section>;
}

/** Compact secondary guidance shared by workflows with self-identifiable conditions. */
function SpecificSituations({ items }: { items: FenceGuideItem[] }) {
  if (!items.length) return null;
  return <section className="specific-situations" aria-labelledby="specific-situations-title">
    <h2 id="specific-situations-title">Specific situations</h2>
    <div>{items.map((item) => <article key={item.key} className="specific-situation">
      <h3>{item.title}</h3><p>{item.body}</p><Source item={item}/>
    </article>)}</div>
  </section>;
}

function residentAddress(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-US"));
}

export function FenceWorkflow({ initialAddress = "", openProject = false }: { initialAddress?: string; openProject?: boolean }) {
  const router = useRouter();
  const [address, setAddress] = useState(""); const [confirmedAddress, setConfirmedAddress] = useState<string | null>(null);
  const [guide, setGuide] = useState<FenceGuide | null>(null);
  const [stage, setStage] = useState<"address" | "project" | "guide">("address");
  const [error, setError] = useState<string | null>(null); const [pending, startTransition] = useTransition();
  const lookup = (requestedAddress = address, showGuide = false) => startTransition(async () => { try { const found = await startFenceLookup(requestedAddress); if (!found) { setStage("address"); setError("This address isn’t in our limited Clearwater pilot area yet. We did not evaluate it."); return; } if(found.status==="blocked"){setStage("address");setError(found.reason==="outside"?`THIS PROPERTY IS OUTSIDE CLEARWATER CITY LIMITS · Jurisdiction · ${found.jurisdictionName ?? "Outside Clearwater"}. Clearwater's property rules don't apply to this address.`:"WE COULDN'T CONFIRM THIS PROPERTY'S JURISDICTION. Groundrule won't apply Clearwater rules until it can be confirmed.");return;} setAddress(requestedAddress); setConfirmedAddress(found.displayAddress); setGuide(found.guide); setStage(showGuide ? "guide" : "project"); setError(null); } catch { setStage("address"); setError("We couldn’t look up that address right now. Please try again later."); } });
  const opened = useRef(false);
  // The route handoff is intentionally consumed once; lookup uses the initial address.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (openProject && initialAddress && !opened.current) { opened.current = true; lookup(initialAddress, true); } }, [initialAddress, openProject]);
  const newSearch = () => { setAddress(""); setConfirmedAddress(null); setGuide(null); setError(null); setStage("address"); };

  return <main className="workflow-shell"><header className="workflow-brand">GROUNDRULE <span>Clearwater, Florida</span></header>
    {stage === "address" && <section className="address-panel"><p className="eyebrow">Clearwater fence pilot</p><h1>Enter your property address</h1><p className="workflow-copy">Guidance based on current City rules and property data.</p><div className="address-form"><input aria-label="Property address" autoComplete="street-address" placeholder="1950 Drew Plz" value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === "Enter" && address.trim() && lookup()}/><button onClick={() => lookup()} disabled={pending || !address.trim()}>{pending ? "Looking…" : "Continue"}</button></div>{error && <p role="alert" className="warning">{error}</p>}</section>}
    {stage === "project" && confirmedAddress && <section className="address-panel"><p className="found">✓ Property found</p><h1 className="address-heading">{residentAddress(confirmedAddress)}<small>Clearwater, FL</small></h1><div className="project-choice"><h2>What do you need help with?</h2><div className="project-grid"><button onClick={() => setStage("guide")}>Fence <span>→</span></button><button onClick={() => router.push(`/clearwater/shed?address=${encodeURIComponent(confirmedAddress)}&project=shed`)}>Shed <span>→</span></button></div></div></section>}
    {stage === "guide" && guide && confirmedAddress && <article className="guide"><h1>{residentAddress(confirmedAddress)}</h1><aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map((fact) => <li key={fact}>{fact}</li>)}</ul></aside><p className="guide-intro">Guidance only · Based on current Clearwater rules and property data · Not a permit or City approval</p><GuideHighlights items={guide.highlights}/><GuideSection symbol="" title="Near a driveway or street corner?" items={guide.checkThis}/><p className="visibility-escalation">Not sure if this applies to your fence? Contact Clearwater.</p><SpecificSituations items={guide.specificSituations}/><button className="new-search" onClick={newSearch}>← New search</button></article>}
  </main>;
}
