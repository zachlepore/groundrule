"use client";
import type { ShedGuideItem } from "../../../lib/guides/shed";
import { startShedLookup } from "./actions";
const sourceLabels: Record<string, string> = {
 "permit.small_shed_exemption": "View Clearwater shed permit requirements",
 "location.lmdr_setbacks": "View Clearwater shed setback requirements",
 "height.residential_maximum": "View Clearwater shed height requirements",
};
function Source({ item }: { item: ShedGuideItem }) { const citation=item.citations[0]; const label=sourceLabels[item.key]; if(!citation?.sourceUrl||!label)return null; const detail=`${citation.sourceTitle}, ${citation.sectionIdentifier}`; return <p className="guide-source"><a className="related-guide-action" href={citation.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${label}, ${detail}`} title={detail}>{label} <span aria-hidden="true">→</span></a></p>; }
function SetbackValues({item}:{item:ShedGuideItem}) { const setbacks=[{label:"Front",value:item.values?.front_ft},{label:"Side",value:item.values?.side_ft},{label:"Rear",value:item.values?.rear_ft}]; return <dl className="shed-setback-values">{setbacks.map(setback=><div className="shed-setback-value" key={setback.label}><dt>{setback.label}</dt><dd>{String(setback.value)} ft</dd></div>)}</dl>; }
function Cards({items}:{items:ShedGuideItem[]}) { return <section className="guide-highlights" aria-labelledby="shed-rules"><h2 id="shed-rules">Your shed rules</h2><div className="highlight-grid">{items.map(item=><article className="highlight-item" key={item.key}><h3>{item.title}</h3>{item.key==="location.lmdr_setbacks"?<SetbackValues item={item}/>:<p className="highlight-answer">{item.answer}</p>}{item.qualification&&<p className="highlight-qualification">{item.qualification}</p>}<Source item={item}/></article>)}</div></section>; }
function Situations({items,onOpenIsr}:{items:ShedGuideItem[];onOpenIsr:()=>void}) { return <section className="specific-situations"><h2>Specific situations</h2><div>{items.map(item=><article className="specific-situation" key={item.key}><h3>{item.title}</h3><p>{item.answer}</p>{item.key==="site.impervious_surface"&&<button className="related-guide-action" onClick={onOpenIsr}>View your impervious surface limit <span aria-hidden="true">→</span></button>}{item.action&&<a className="related-guide-action" href={item.action.url} target="_blank" rel="noreferrer">{item.action.label} <span aria-hidden="true">→</span></a>}</article>)}</div></section>; }
import { ClearwaterResidentShell } from "../resident-shell";

export function ShedWorkflow({initialAddress="",openProject=false}:{initialAddress?:string;openProject?:boolean}) {
 return <ClearwaterResidentShell activeGuide="shed" guideTitle="Shed guidance" initialAddress={initialAddress} openProject={openProject} lookup={startShedLookup}>
 {(guide,openGuide)=><article className="guide"><aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map(fact=><li key={fact}>{fact}</li>)}</ul></aside><p className="guide-intro">Based on current Clearwater rules and property data · Not City approval</p><Cards items={guide.highlights}/><Situations items={guide.specificSituations} onOpenIsr={()=>openGuide("impervious-surface-ratio")}/></article>}
 </ClearwaterResidentShell>;
}
