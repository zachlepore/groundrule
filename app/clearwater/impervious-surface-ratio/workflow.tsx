"use client";
import type { ImperviousSurfaceRatioGuide } from "../../../lib/guides/impervious-surface-ratio";
import { startImperviousSurfaceRatioLookup } from "./actions";
function Source({guide}:{guide:ImperviousSurfaceRatioGuide}){const c=guide.citations[0];if(!c)return null;const detail=`${c.sourceTitle}, ${c.sectionIdentifier}`;return <p className="guide-source"><a href={c.sourceUrl??undefined} target="_blank" rel="noreferrer" title={detail}>Source ↗</a></p>}
import { ClearwaterResidentShell } from "../resident-shell";

export function ImperviousSurfaceRatioWorkflow({initialAddress="",openProject=false}:{initialAddress?:string;openProject?:boolean}) {
 return <ClearwaterResidentShell activeGuide="impervious-surface-ratio" initialAddress={initialAddress} openProject={openProject} lookup={startImperviousSurfaceRatioLookup}>
 {(guide)=><article className="guide"><h1>Impervious surface ratio guidance</h1><aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map(f=><li key={f}>{f}</li>)}</ul></aside><section className={`isr-answer isr-answer-${guide.status}`}><p className="eyebrow">Impervious surface ratio</p><h2>{guide.heading}</h2>{guide.maximumPercent!==null&&<p className="isr-value">{guide.maximumPercent}%</p>}<p>{guide.explanation}</p><p className="isr-scope">{guide.scopeNote}</p><Source guide={guide}/></section><section className="isr-education" aria-labelledby="isr-what-counts"><h2 id="isr-what-counts">What counts as impervious?</h2><p>{guide.whatCounts}</p></section></article>}
 </ClearwaterResidentShell>;
}
