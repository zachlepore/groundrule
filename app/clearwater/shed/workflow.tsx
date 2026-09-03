"use client";
import type { ShedGuideItem } from "../../../lib/guides/shed";
import { startShedLookup } from "./actions";
function Source({ item }: { item: ShedGuideItem }) { const citation=item.citations[0]; if(!citation)return null; const detail=`${citation.sourceTitle}, ${citation.sectionIdentifier}`; return <p className="guide-source">{citation.sourceUrl&&<a href={citation.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View source, ${detail}`} title={detail}>Source ↗</a>}</p>; }
function Cards({items}:{items:ShedGuideItem[]}) { return <section className="guide-highlights" aria-labelledby="shed-rules"><h2 id="shed-rules">Your shed rules</h2><div className="highlight-grid">{items.map(item=><article className="highlight-item" key={item.key}><h3>{item.title}</h3><p className="highlight-answer">{item.answer}</p>{item.qualification&&<p className="highlight-qualification">{item.qualification}</p>}<Source item={item}/></article>)}</div></section>; }
function Situations({items,onOpenIsr}:{items:ShedGuideItem[];onOpenIsr:()=>void}) { return <section className="specific-situations"><h2>Specific situations</h2><div>{items.map(item=><article className="specific-situation" key={item.key}><h3>{item.title}</h3><p>{item.answer}</p>{item.key==="site.impervious_surface"&&<button className="highlight-action" onClick={onOpenIsr}>View your impervious surface limit →</button>}{item.action&&<a className="highlight-action" href={item.action.url} target="_blank" rel="noreferrer">{item.action.label} ↗</a>}</article>)}</div></section>; }
import { ClearwaterResidentShell } from "../resident-shell";

export function ShedWorkflow({initialAddress="",openProject=false}:{initialAddress?:string;openProject?:boolean}) {
 return <ClearwaterResidentShell activeGuide="shed" guideTitle="Shed guidance" initialAddress={initialAddress} openProject={openProject} lookup={startShedLookup}>
 {(guide,openGuide)=><article className="guide"><aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map(fact=><li key={fact}>{fact}</li>)}</ul></aside><p className="guide-intro">Guidance only · Based on current Clearwater rules and property data · Not a permit or City approval</p><Cards items={guide.highlights}/><Situations items={guide.specificSituations} onOpenIsr={()=>openGuide("impervious-surface-ratio")}/></article>}
 </ClearwaterResidentShell>;
}
