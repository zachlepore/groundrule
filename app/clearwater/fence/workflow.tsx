"use client";

import type { FenceGuideItem } from "../../../lib/guides/fence";
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


import { ClearwaterResidentShell } from "../resident-shell";

export function FenceWorkflow({ initialAddress = "", openProject = false }: { initialAddress?: string; openProject?: boolean }) {
  return <ClearwaterResidentShell activeGuide="fence" guideTitle="Fence guidance" initialAddress={initialAddress} openProject={openProject} lookup={startFenceLookup}>
    {(guide) => <article className="guide"><aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map((fact) => <li key={fact}>{fact}</li>)}</ul></aside><p className="guide-intro">Based on current Clearwater rules and property data · Not City approval</p><GuideHighlights items={guide.highlights}/><GuideSection symbol="" title="Near a driveway or street corner?" items={guide.checkThis}/><p className="visibility-escalation">Not sure if this applies to your fence? Contact Clearwater Planning &amp; Zoning.</p><SpecificSituations items={guide.specificSituations}/><p className="guide-intro">The ordinary requirements above are based on the facts Groundrule can confirm. Final permit approval may include review by Engineering or another City department.</p></article>}
  </ClearwaterResidentShell>;
}
