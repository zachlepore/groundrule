"use client";

import type { FenceGuideItem } from "../../../lib/guides/fence";
import { startFenceLookup } from "./actions";

function Source({ item }: { item: FenceGuideItem }) {
  const citation = item.citations[0];
  if (!citation) return null;
  const detail = `${citation.sourceTitle}, ${citation.sectionIdentifier}`;
  return <p className="guide-source">{citation.sourceUrl ? <a href={citation.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View source, ${detail}`} title={detail}>Source ↗</a> : null}</p>;
}

function VisibilityFigure() {
  return <figure className="visibility-figure">
    <h4>Where sight visibility rules apply</h4>
    {/* The future CAD asset must retain its intrinsic aspect ratio without fixed dimensions. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/figures/clearwater/fence-sight-visibility-triangle.png" alt="Clearwater sight-visibility triangles at a driveway and street corner"/>
    <figcaption>Use this diagram to identify the areas that may require visibility review.</figcaption>
  </figure>;
}

function GuideSection({ symbol, title, items }: { symbol: string; title: string; items: FenceGuideItem[] }) {
  if (!items.length) return null;
  return <section className="guide-section" aria-labelledby={`section-${title.replaceAll(" ", "-")}`}><h2 id={`section-${title.replaceAll(" ", "-")}`}><span>{symbol}</span>{title}</h2>
    {items.map((item) => <article className="guide-item" key={item.key}><h3>{item.title}</h3><p>{item.body}</p>{item.bullets && <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{item.assetId && <VisibilityFigure/>}<Source item={item}/></article>)}
  </section>;
}

function GuideHighlights({ items }: { items: FenceGuideItem[] }) {
  return <section className="guide-highlights" aria-labelledby="guide-highlights-title">
    <h2 id="guide-highlights-title">What you can do</h2>
    <div className="highlight-grid">{items.map((item) => <article key={item.key} className="highlight-item">
      <h3>{item.title}</h3><p className="highlight-answer">{item.answer ?? item.body}</p>
      {item.qualification && <p className="highlight-qualification">{item.qualification}</p>}{item.action && <a className="related-guide-action" href={item.action.url}>{item.action.label} <span aria-hidden="true">→</span></a>}<Source item={item}/>
    </article>)}</div>
  </section>;
}

/** Compact secondary guidance shared by workflows with self-identifiable conditions. */
function SpecificSituations({ items }: { items: FenceGuideItem[] }) {
  if (!items.length) return null;
  return <section className="specific-situations" aria-labelledby="specific-situations-title">
    <h2 id="specific-situations-title">Specific situations</h2>
    <div>{items.map((item) => <article key={item.key} className="specific-situation">
      <h3>{item.title}</h3><p>{item.body}</p>{item.action && <a className="related-guide-action" href={item.action.url} target="_blank" rel="noreferrer">{item.action.label} →</a>}<Source item={item}/>
    </article>)}</div>
  </section>;
}


import { ClearwaterResidentShell } from "../resident-shell";

export function FenceWorkflow({ initialAddress = "", openProject = false }: { initialAddress?: string; openProject?: boolean }) {
  return <ClearwaterResidentShell activeGuide="fence" guideTitle="Fence guidance" initialAddress={initialAddress} openProject={openProject} lookup={startFenceLookup}>
    {(guide) => <article className="guide"><aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map((fact) => <li key={fact}>{fact}</li>)}</ul></aside><p className="guide-intro">Based on current Clearwater rules and property data · Not City approval</p><GuideHighlights items={guide.highlights}/><GuideSection symbol="" title="Near a driveway or street corner?" items={guide.checkThis}/><p className="visibility-escalation">Not sure if this applies to your fence? Contact Clearwater Planning &amp; Zoning.</p><SpecificSituations items={guide.specificSituations}/><p className="guide-intro">The ordinary requirements above are based on the property facts available here. Final permit approval may include review by Engineering or another City department.</p></article>}
  </ClearwaterResidentShell>;
}
