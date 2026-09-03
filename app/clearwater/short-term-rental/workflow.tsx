"use client";
import type {ShortTermRentalGuide} from "../../../lib/guides/short-term-rental";
import {startShortTermRentalLookup} from "./actions";
function Source({guide}:{guide:ShortTermRentalGuide}){const citation=guide.citations[0];if(!citation?.sourceUrl)return null;const detail=`${citation.sourceTitle}, ${citation.sectionIdentifier}`;return <p className="guide-source"><a href={citation.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View source, ${detail}`} title={detail}>Source ↗</a></p>}
import { ClearwaterResidentShell } from "../resident-shell";

export function ShortTermRentalWorkflow({initialAddress="",openProject=false}:{initialAddress?:string;openProject?:boolean}) {
 return <ClearwaterResidentShell activeGuide="short-term-rental" initialAddress={initialAddress} openProject={openProject} lookup={startShortTermRentalLookup}>
 {(guide)=><article className="guide"><h1>Short-term rental guidance</h1>{guide.propertyContext.length>0&&<aside className="property-context" aria-label="Property facts used"><ul>{guide.propertyContext.map(fact=><li key={fact}>{fact}</li>)}</ul></aside>}<section className={`str-answer str-answer-${guide.status}`}><p className="eyebrow">Short-term rental</p><h2>{guide.heading}</h2><p>{guide.explanation}</p><Source guide={guide}/></section></article>}
 </ClearwaterResidentShell>;
}
