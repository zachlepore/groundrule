#!/usr/bin/env python3
"""Render read-only QC JSON; requires matplotlib. No GIS applicability inference."""
import argparse, csv, hashlib, json, math, os
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR', '/tmp/groundrule-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Polygon, Patch, PathPatch
from matplotlib.path import Path as PlotPath
from matplotlib.lines import Line2D

COLORS={'mdr':'#b8cde7','os/r':'#168b63'}
def polygons(g): return [g['coordinates']] if g['type']=='Polygon' else g['coordinates']
def main():
    args=argparse.ArgumentParser();args.add_argument('prepared');args.add_argument('output');a=args.parse_args()
    prepared=Path(a.prepared);out=Path(a.output)
    if out.exists():raise RuntimeError('Fresh renderer output directory required')
    out.mkdir(parents=True);(out/'maps').mkdir()
    sample=json.loads((prepared/'sample.json').read_text());population=json.loads((prepared/'population.json').read_text());analysis=json.loads((prepared/'analysis.json').read_text())
    legend=[Patch(facecolor=COLORS['mdr'],label='Mapped MDR intersection'),Patch(facecolor=COLORS['os/r'],label='Mapped OS/R intersection'),Line2D([0],[0],color='#111',lw=1,label='Parcel boundary'),Line2D([0],[0],marker='x',color='#111',lw=0,label='Address point')]
    def draw(ax,r,detail=False):
        geom=r['geometry'];parcel=geom['parcel']['geometry'];ring=polygons(parcel)[0][0];lon,lat=ring[0][:2];sx=111320*math.cos(math.radians(lat));sy=111320
        def xy(coords):return [((p[0]-lon)*sx,(p[1]-lat)*sy) for p in coords]
        def addpoly(poly,**style):
            vertices=[];codes=[]
            for i,ring in enumerate(poly):
                points=xy(ring);signed=sum(x*v-u*y for (x,y),(u,v) in zip(points,points[1:]))
                if (signed>0)!=(i==0):points.reverse()
                vertices.extend(points);codes.extend([PlotPath.MOVETO]+[PlotPath.LINETO]*(len(points)-2)+[PlotPath.CLOSEPOLY])
            ax.add_patch(PathPatch(PlotPath(vertices,codes),**style))
        for z in geom.get('contextZoningFeatures',[]):
            for poly in polygons(z['feature']['geometry']):
                addpoly(poly,facecolor=COLORS[z['district']],edgecolor=COLORS[z['district']],alpha=.18,lw=.4,zorder=1)
        for z in geom['intersections']:
            for poly in polygons(z['geometry']):
                addpoly(poly,facecolor=COLORS[z['district']],edgecolor=COLORS[z['district']],lw=.6,zorder=2)
        for poly in polygons(parcel):
            for line in poly:ax.add_patch(Polygon(xy(line),fill=False,edgecolor='#111',lw=.8,zorder=4))
        for addr in r['addresses']:
            x,y=xy([addr['coordinates']])[0];ax.plot(x,y,'x',color='#111',ms=3,alpha=.6,zorder=5)
        points=[p for poly in polygons(parcel) for p in xy(poly[0])];xs,ys=zip(*points);spanx=max(xs)-min(xs);spany=max(ys)-min(ys)
        ax.set_xlim(min(xs)-spanx*.12,max(xs)+spanx*.12);ax.set_ylim(min(ys)-spany*.12,max(ys)+spany*.12);ax.set_aspect('equal',adjustable='box')
        if detail:
            osr=next(z['geometry'] for z in geom['intersections'] if z['district']=='os/r')
            rings=[p[0] for p in polygons(osr)]
            def shoelace(r):
                points=xy(r);return abs(sum(x*v-u*y for (x,y),(u,v) in zip(points,points[1:])))/2
            rr=max(rings,key=shoelace);cx,cy=xy(rr)[len(rr)//2]
            ax.set_xlim(cx-10,cx+10);ax.set_ylim(cy-10,cy+10)
        ax.set_xlabel('Approx. east (m)',fontsize=7);ax.set_ylabel('Approx. north (m)',fontsize=7);ax.tick_params(labelsize=6);ax.grid(alpha=.15)
        xmin,xmax=ax.get_xlim();ymin,ymax=ax.get_ylim();span=xmax-xmin
        choices=[.1,.2,.5,1,2,5,10,20,50,100,200,500,1000]
        length=max(x for x in choices if x<=span*.3);x=xmin+span*.07;y=ymin+(ymax-ymin)*.08
        ax.plot([x,x+length],[y,y],color='black',lw=2,zorder=8);ax.text(x+length/2,y+(ymax-ymin)*.015,f'{length:g} m',ha='center',va='bottom',fontsize=7,zorder=9,bbox={'facecolor':'white','alpha':.8,'edgecolor':'none','pad':1})
        ax.annotate('N',xy=(.93,.96),xytext=(.93,.82),xycoords='axes fraction',ha='center',fontsize=8,arrowprops={'arrowstyle':'->','color':'#111'})
    def evidence_note(r):
        if r['osrPercent']<=.25 and r['osrAreaSqFt']>=250:
            return f"Indeterminate: only {r['osrPercent']:.6f}% of a large parcel, but {r['osrAreaSqFt']:.1f} sq ft is mapped OS/R.\nA percentage-only suppression could hide a potentially relevant physical area; inspect its location and use."
        return f"Indeterminate: {r['osrAreaSqFt']:.1f} sq ft is mapped OS/R ({r['osrPercent']:.6f}%). Inspect the boundary detail.\nA narrow-looking edge may reflect mapping alignment or a real district boundary; source polygons cannot decide."
    index=plt.figure(figsize=(8.5,11));index.text(.06,.95,'Rule 003 — human QC index',fontsize=18,weight='bold');index.text(.06,.905,'25 distinct parcel IDs and canonical footprints; 5 review batches.\nNo human observations or final notice threshold are inferred.',fontsize=10)
    for i,r in enumerate(sample):index.text(.06,.855-i*.027,f"{r['caseId']}  {r['addresses'][0]['address'][:42]:42}  {r['osrPercent']:.4f}%  | atlas p.{i+2}",fontsize=8,family='monospace')
    index.text(.06,.115,'Blue: MDR. Green: actual OS/R intersection. Black: parcel boundary / address points.\nAll maps north up; scales differ and each has its own scale bar.\nReview in City GIS with aerial/project context; do not infer legal insignificance from size.',fontsize=9)
    with PdfPages(out/'qc-atlas.pdf',metadata={'Title':'Groundrule Rule 003 manual QC atlas'}) as atlas,PdfPages(out/'contact-sheet.pdf',metadata={'Title':'Groundrule Rule 003 indexed contact sheet'}) as contact:
        atlas.savefig(index);contact.savefig(index);plt.close(index)
        for i,r in enumerate(sample):
            fig=plt.figure(figsize=(8.5,11));fig.suptitle(f"{r['caseId']} — {r['addresses'][0]['address']}",fontsize=12,y=.975)
            fig.text(.06,.93,f"Parcel {r['parcelId']}   |   {len(r['addresses'])} address record(s)\nPrimary MDR · secondary OS/R · original QA REVIEW · current notice: PROMINENT (>0%)",fontsize=10)
            fig.text(.06,.87,f"Parcel: {r['parcelAreaSqFt']:,.2f} sq ft   |   OS/R: {r['osrAreaSqFt']:,.2f} sq ft   |   {r['osrPercent']:.6f}%\nRetained profile flag: parcel_ambiguous_zoning. Eligibility vetoes: none.",fontsize=9)
            raw_flags=', '.join(r['sourceQualityEvidence'].get('diagnosticCandidateFailures',[])) or 'none'
            fig.text(.06,.823,f"Frozen diagnostic warnings (retained): {raw_flags}",fontsize=7)
            ax=fig.add_axes([.09,.36,.82,.42]);draw(ax,r);ax.set_title('Full parcel — actual clipped district geometry',fontsize=10)
            detail=fig.add_axes([.59,.12,.32,.20]);draw(detail,r,True);detail.set_title('20 m OS/R edge window',fontsize=8)
            fig.legend(handles=legend,loc='lower left',bbox_to_anchor=(.045,.235),fontsize=8,frameon=False)
            fig.text(.06,.195,'Human QC: ____________________\nNotice warranted? ______________\nNotes: ________________________',fontsize=10,linespacing=1.8)
            fig.text(.06,.065,evidence_note(r),fontsize=8,linespacing=1.5)
            fig.text(.06,.02,f"Frozen September 28 GIS. Faint fills: zoning context; solid fills: actual parcel intersections.\nApproximate local metre axes; no aerial/ownership evidence or legal determination. Atlas page {i+2}.",fontsize=7)
            fig.savefig(out/'maps'/f"{r['caseId']}.png",dpi=250);fig.savefig(out/'maps'/f"{r['caseId']}.pdf");atlas.savefig(fig);plt.close(fig)
        for batch in range(5):
            fig,axs=plt.subplots(3,2,figsize=(8.5,11));fig.suptitle(f'Rule 003 — batch {batch+1} / 5 (geometry evidence only)',fontsize=12)
            for ax,r in zip(axs.flat,sample[batch*5:(batch+1)*5]):
                draw(ax,r);ax.set_title(f"{r['caseId']} · {r['osrPercent']:.6f}% · {r['osrAreaSqFt']:.1f} sq ft\n{r['addresses'][0]['address']}",fontsize=8)
            axs.flat[5].axis('off');axs.flat[5].legend(handles=legend,loc='upper left',fontsize=8)
            axs.flat[5].text(0,.55,'Human QC fields are blank.\nInspect high-resolution map and\n20 m edge detail in the atlas.\n\nSmall size does not establish\nlegal insignificance or mapping error.',fontsize=9,va='top')
            fig.tight_layout(rect=[0,.02,1,.95]);contact.savefig(fig);fig.savefig(out/f'batch-{batch+1}.png',dpi=170);plt.close(fig)
    def csv_file(name,headers,rows):
        with open(out/name,'w',newline='') as f:w=csv.writer(f);w.writerow(headers);w.writerows(rows)
    csv_file('review-worksheet.csv',['Case ID','Parcel ID','Address','OS/R percentage','OS/R area (sq ft)','Human QC: meaningful / likely boundary artifact / uncertain','Prominent notice warranted? yes / no / uncertain','Reviewer notes'],[[r['caseId'],r['parcelId'],r['addresses'][0]['address'],f"{r['osrPercent']:.6f}",f"{r['osrAreaSqFt']:.2f}",'','',''] for r in sample])
    csv_file('sample-index.csv',['Case ID','Parcel ID','Address','Address count','Primary','Secondary','Parcel sq ft','OS/R sq ft','OS/R percent','Original QA','Original profile flags','Frozen diagnostic warnings','Parcel geometry valid','Repeated same-code polygons','Overlapping same-code polygons','Current notice','Selection reason','Automated evidence note (not human QC)'],[[r['caseId'],r['parcelId'],r['addresses'][0]['address'],len(r['addresses']),'MDR','OS/R',r['parcelAreaSqFt'],r['osrAreaSqFt'],r['osrPercent'],'REVIEW','parcel_ambiguous_zoning',';'.join(r['sourceQualityEvidence'].get('diagnosticCandidateFailures',[])),r['sourceQualityEvidence']['parcelGeometryValid'],r['sourceQualityEvidence'].get('hasRepeatedNormalizedCode',False),r['sourceQualityEvidence'].get('hasOverlappingSameCodePolygons',False),r['noticeRecommendation'],r['selectionReason'],evidence_note(r).replace('\n',' ')] for r in sample])
    csv_file('population.csv',['Parcel ID','Representative address','Address count','Parcel area (sq ft)','OS/R area (sq ft)','OS/R percentage','Canonical footprint key'],[[r['parcelId'],r['addresses'][0]['address'],len(r['addresses']),r['parcelAreaSqFt'],r['osrAreaSqFt'],r['osrPercent'],r['footprintKey']] for r in population])
    csv_file('threshold-sensitivity.csv',['Strict threshold %','Notices: addresses','Notices: parcel IDs','Suppressed: addresses','Suppressed: parcel IDs'],[[r['thresholdPercent'],r['remaining']['addresses'],r['remaining']['parcels'],r['suppressed']['addresses'],r['suppressed']['parcels']] for r in analysis['sensitivity']])
    area_bands=[(0,10),(10,100),(100,250),(250,500),(500,1000),(1000,float('inf'))]
    area_distribution=[{'lower':lo,'upper':hi,'addresses':sum(len(r['addresses']) for r in population if lo<r['osrAreaSqFt']<=hi),'parcels':sum(lo<r['osrAreaSqFt']<=hi for r in population)} for lo,hi in area_bands]
    csv_file('area-distribution.csv',['Lower exclusive sq ft','Upper inclusive sq ft','Addresses','Parcel IDs'],[[r['lower'],r['upper'],r['addresses'],r['parcels']] for r in area_distribution])
    suppression_outliers=[{'threshold':t,'r':r} for t in [.5,1,2,3,5] for r in population if r['osrPercent']<=t and r['osrAreaSqFt']>=250]
    csv_file('percentage-suppression-outliers.csv',['Strict percent threshold','Parcel ID','Representative address','Addresses suppressed','OS/R percent','OS/R sq ft'],[[x['threshold'],x['r']['parcelId'],x['r']['addresses'][0]['address'],len(x['r']['addresses']),x['r']['osrPercent'],x['r']['osrAreaSqFt']] for x in suppression_outliers])
    csv_file('combined-policy-illustrations.csv',['Strict percent threshold','Strict area threshold sq ft','Operator','Remaining addresses','Remaining parcels','Suppressed addresses','Suppressed parcels','Addresses rescued by area guard','Parcels rescued by area guard'],[[r['percentThreshold'],r['areaThresholdSqFt'],r['operator'],r['remaining']['addresses'],r['remaining']['parcels'],r['suppressed']['addresses'],r['suppressed']['parcels'],r['rescuedFromPercentSuppression']['addresses'],r['rescuedFromPercentSuppression']['parcels']] for r in analysis['combinedPolicyIllustrations']])
    md=['# Rule 003 manual QC — evidence only','',f"Verified population: **731 approved addresses / 146 parcel IDs / {analysis['uniqueCanonicalFootprints']} canonical footprints**. All originally REVIEW, existing primary MDR, secondary OS/R retained. Current >0% notice policy is unchanged. Exactly 25 distinct parcel IDs/footprints are sampled; all human QC fields are blank.",'','## Presentation sensitivity (strict >; no policy adopted)','', '| Threshold | Notices: addresses / parcel IDs | Suppressed: addresses / parcel IDs |','|---|---:|---:|']
    for r in analysis['sensitivity']:md.append(f"| >{r['thresholdPercent']}% | {r['remaining']['addresses']} / {r['remaining']['parcels']} | {r['suppressed']['addresses']} / {r['suppressed']['parcels']} |")
    md+=['','## Sample index','', '| Case | Address | Parcel ID | OS/R % | OS/R sq ft | Addresses | Selection / interpretation |','|---|---|---|---:|---:|---:|---|']
    for r in sample:md.append(f"| [{r['caseId']}](maps/{r['caseId']}.pdf) | {r['addresses'][0]['address']} | {r['parcelId']} | {r['osrPercent']:.6f} | {r['osrAreaSqFt']:.2f} | {len(r['addresses'])} | {r['selectionReason']} Indeterminate; requires human/project context. |")
    md+=['','## Distribution and empty bands','', '| OS/R band | Addresses | Parcel IDs | Sample parcel IDs |','|---|---:|---:|---:|']
    for r in analysis['bands']:md.append(f"| {r['band']} | {r['addresses']} | {r['parcels']} | {r['sampleParcels']} |")
    md+=['','## Absolute OS/R area distribution','', '| Sq ft (lower exclusive / upper inclusive) | Addresses | Parcel IDs |','|---|---:|---:|']
    for r in area_distribution:md.append(f"| >{r['lower']}–{r['upper']} | {r['addresses']} | {r['parcels']} |")
    md+=['','Area quantiles are parcel-ID weighted (not independent-footprint weighted): '+', '.join(f"q{float(q):g} = {v:.2f} sq ft" for q,v in sorted(analysis['parcelWeightedQuantiles']['areaSqFt'].items(),key=lambda x:float(x[0])))+'.', '', '## Percentage-only suppression of areas at least 250 sq ft','', '| Hypothetical threshold | Suppressed addresses | Suppressed parcel IDs |','|---|---:|---:|']
    for t in [.5,1,2,3,5]:
        rs=[x['r'] for x in suppression_outliers if x['threshold']==t];md.append(f"| >{t}% | {sum(len(r['addresses']) for r in rs)} | {len(rs)} |")
    md+=['','See percentage-suppression-outliers.csv for every flagged identity at every threshold. The 250 sq ft marker is for review prioritization only.']
    example=next(r for r in analysis['combinedPolicyIllustrations'] if r['percentThreshold']==2 and r['areaThresholdSqFt']==250)
    md+=['',f"For scale only, retaining notices for >2% OR >250 sq ft would retain {example['remaining']['addresses']} addresses / {example['remaining']['parcels']} parcel IDs, versus 12 / 11 for >2% alone; it would suppress {example['suppressed']['addresses']} / {example['suppressed']['parcels']}. This illustrates the effect of large denominators and shared-address weighting, not which policy is correct."]
    md+=['','## Interpretive limits and observations to prioritize','',
        'Review the three large-address/large-denominator properties first: Drew, Enterprise and Fairwood. A small percentage may still contain tens or hundreds of square feet of mapped OS/R. Then inspect the nearest available cases around 0.5%, 1% and 2%, and all eleven >3% parcels. There are no eligible >2–3% or >10% examples; the gap is evidence, not a missing sampling quota.',
        '', 'The 250 sq ft marker in outliers.json is an investigation triage marker, not a legal significance threshold or a proposed final policy. The combined-policy CSV illustrates retaining a notice when percent > threshold **OR** OS/R area > area threshold (100, 250, 500, 1,000 sq ft). This can retain large absolute areas hidden by percentages, but neither metric establishes legal applicability, project location, usable dimensions, shared ownership or boundary accuracy. Area alone can also suppress a narrow but consequential boundary crossing. No final percentage, area cutoff or combined policy is selected.',
        '', 'No eligible parcel has an invalid/repeated-same-code/overlapping-same-code zoning quality veto. Distinct parcel IDs sometimes share the same footprint; these are not duplicate zoning polygons. Sampling uses canonical ring rotation/orientation and polygon-order invariance to avoid duplicated footprints, plus six-decimal bounding-box contexts to avoid near-identical unit-footprint panels. This approximate context key is used only for sample diversity; it does not merge addresses, edit geometry, alter parcel identity or infer ownership. Full-population counts always use the 146 authoritative IDs, with 38 canonical footprints reported separately.',
        '', 'Waterfront status, actual land use, buildings and project locations cannot be verified from these polygon inputs. Large parcels and irregular/curved boundaries are included as prompts; no property is labelled waterfront without supporting evidence. Review the City viewer with aerial/site-plan context. Apparent slivers may be true mapped district boundaries. No automated label substitutes for the blank human QC fields.',
        '', 'All 2 address-link holds, 3 OS/R-primary unsupported-code cases and 148 additional-district exclusions remain outside the sample/population. Original parcel_ambiguous_zoning flags remain; no QC flags are removed. Rules 001/002 and all three approved policies are unchanged. Maps use approximate local equirectangular metre axes and metre scale bars, not a survey projection. The 20 m inset is a selected OS/R edge window, not every OS/R component. Full geometry and measurements remain in prepared/population.json and the immutable Release.',
        '', 'Areas are converted using the exact international foot (1 m² = 10.7639104167 sq ft); frozen source areas were rounded to 0.001 m². Percentages retain frozen six-decimal precision. Stratification and purposive selection do not estimate the prevalence of human-confirmed artifacts.',
        '', '## Files and reproduction','', '`contact-sheet.pdf` indexes five batches; `qc-atlas.pdf` includes 25 full case pages; `maps/` has 250-dpi PNG and vector PDF per case. `review-worksheet.csv` has blank human fields. `population.csv`, threshold and combined-policy CSVs cover the full population. Prepared JSON retains full source evidence, flags, addresses and selected geometries. Package checksums and input provenance are written after rendering.',
        '', 'Run prepare-clearwater-rule003-qc.mjs against verified frozen source and a freshly verified approved three-rule export, then this renderer with its prepared output directory and a fresh destination. Requires Python matplotlib for maps. No Guide/UI/production code runs. Owner observations and explicit policy authorization are required before any notice suppression is implemented.']
    (out/'decision-report.md').write_text('\n'.join(md)+'\n')
    provenance={'evidenceOnly':True,'rendererSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'matplotlibVersion':matplotlib.__version__,'preparedAnalysisSha256':hashlib.sha256((prepared/'analysis.json').read_bytes()).hexdigest(),'units':'international square feet; approximate metre map axes','policyChanged':False}
    (out/'render-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
    print(f'Rendered {len(sample)} cases, indexed PDFs, high-resolution maps and CSVs to {out}')
if __name__=='__main__':main()
