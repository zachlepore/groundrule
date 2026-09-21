"use client";
import type { ImperviousSurfaceRatioGuide } from "../../../lib/guides/impervious-surface-ratio";
import { startImperviousSurfaceRatioLookup } from "./actions";
import { ClearwaterResidentShell } from "../resident-shell";
const CLEARWATER_ISR_WORKSHEET_URL="https://www.myclearwater.com/files/sharedassets/public/planning-amp-development/documents/zoning-approval/isrupdated5_12_2020.pdf";

export function ImperviousSurfaceRatioWorkflow({initialAddress="",openProject=false}:{initialAddress?:string;openProject?:boolean}) {
 return <ClearwaterResidentShell activeGuide="impervious-surface-ratio" guideTitle="Impervious surface ratio guidance" initialAddress={initialAddress} openProject={openProject} lookup={startImperviousSurfaceRatioLookup}>
 {(guide:ImperviousSurfaceRatioGuide)=><article className="guide"><aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map(f=><li key={f}>{f}</li>)}</ul></aside><section className={`isr-answer isr-answer-${guide.status}`}><p className="eyebrow">Impervious surface ratio</p><h2>{guide.heading}</h2>{guide.maximumPercent!==null&&<p className="isr-value">{guide.maximumPercent}%</p>}<p>{guide.explanation}</p><p className="isr-scope">{guide.scopeNote}</p></section><section className="isr-education" aria-labelledby="isr-what-counts"><h2 id="isr-what-counts">What counts as impervious?</h2><p>{guide.whatCounts}</p><a className="related-guide-action" href={CLEARWATER_ISR_WORKSHEET_URL} target="_blank" rel="noreferrer">View Clearwater&apos;s ISR worksheet <span aria-hidden="true">→</span></a></section></article>}
 </ClearwaterResidentShell>;
}
