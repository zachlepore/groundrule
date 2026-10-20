#!/usr/bin/env python3
"""Scientific NCOD source maps; a combined code is not a separate measured overlay layer."""
import argparse,csv,hashlib,json,math,os,pathlib
os.environ.setdefault('MPLCONFIGDIR','/tmp/groundrule-rule005-mpl')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Patch
from matplotlib.lines import Line2D
from shapely.geometry import shape,Point,box
from shapely.affinity import translate,scale
from shapely.ops import nearest_points
import importlib.util
spec=importlib.util.spec_from_file_location('drawing',pathlib.Path(__file__).with_name('render-clearwater-rule004-qc.py'));drawing=importlib.util.module_from_spec(spec);spec.loader.exec_module(drawing)
COL={'LMDR-NCOD Coachman R':'#a7c9e7','LDR-NCOD Coachman R':'#b9d9b2','I':'#d8c9b8','P':'#b9a5cc'}
def color(code):return COL.get(code,'#d8d8d8')
def draw_polygon(ax,g,**style):
 if not g.is_empty:drawing.draw_polygon(ax,g,**style)
def run(analysis,output):
 inp,out=pathlib.Path(analysis),pathlib.Path(output);assert not out.exists()
 for n,h in json.loads((inp/'checksums.json').read_text()).items():assert hashlib.sha256((inp/n).read_bytes()).hexdigest()==h,n
 samples=json.loads((inp/'qc-cases.json').read_text());out.mkdir(parents=True);(out/'maps').mkdir()
 def draw(ax,s,detail=False):
  data=json.loads((inp/'geometries'/f"{s['caseId']}.json").read_text());g=shape(data['parcel']['geometry']);lon,lat=g.centroid.x,g.centroid.y
  metric=lambda x:scale(translate(x,-lon,-lat),xfact=111195*math.cos(math.radians(lat)),yfact=111195,origin=(0,0))
  gm=metric(g);x0,y0,x1,y1=gm.bounds;pad=max(x1-x0,y1-y0)*.4;lim=(x0-pad,y0-pad,x1+pad,y1+pad)
  if detail:
   target=next(z for z in data['zoningContext'] if z['properties']['ZONING']==s['record']['sourceCode']);border=metric(shape(target['geometry']).boundary);a,b=nearest_points(gm.boundary,border);lim=(b.x-5,b.y-5,b.x+5,b.y+5)
  window=box(*lim)
  for z in data['zoningContext']:
   gz=metric(shape(z['geometry']));code=z['properties']['ZONING'];clipped=gz.intersection(window) if gz.is_valid else None
   if clipped is not None:draw_polygon(ax,clipped,facecolor=color(code),edgecolor=color(code),alpha=.30,lw=.7,hatch='//' if 'NCOD' in code else None,zorder=1)
  for z in data['positiveAreaIntersections']:draw_polygon(ax,metric(shape(z['geometry'])),facecolor=color(z['rawCode']),edgecolor='#48708e',alpha=.80,lw=.6,hatch='//' if 'NCOD' in z['rawCode'] else None,zorder=2)
  draw_polygon(ax,gm,facecolor='none',edgecolor='#111',lw=1.4,zorder=4)
  for z in data['zoningContext']:
   lines=metric(shape(z['geometry']).boundary).intersection(window)
   for line in list(lines.geoms) if hasattr(lines,'geoms') else [lines]:
    if line.geom_type=='LineString':ax.plot(*line.xy,color='#555',ls='--',lw=.8,zorder=3)
  point=metric(Point(s['record']['addressCoordinates']));ax.plot(point.x,point.y,'x',color='#a50024',ms=6,zorder=6)
  ax.set_xlim(lim[0],lim[2]);ax.set_ylim(lim[1],lim[3]);ax.set_aspect('equal',adjustable='box');ax.grid(alpha=.15);ax.tick_params(labelsize=6);ax.set_xlabel('Approx. east (m)',fontsize=6);ax.set_ylabel('Approx. north (m)',fontsize=6)
  x0,x1=ax.get_xlim();y0,y1=ax.get_ylim();length=max(v for v in [.1,.2,.5,1,2,5,10,20,50,100] if v<=(x1-x0)*.25);xx=x0+(x1-x0)*.07;yy=y0+(y1-y0)*.08
  ax.plot([xx,xx+length],[yy,yy],color='#111',lw=2,zorder=10);ax.text(xx+length/2,yy+(y1-y0)*.025,f'{length:g} m',fontsize=6,ha='center',bbox={'facecolor':'white','edgecolor':'none','alpha':.8},zorder=11)
  if not detail:ax.annotate('N',xy=(.95,.95),xytext=(.95,.80),xycoords='axes fraction',ha='center',arrowprops={'arrowstyle':'->'},fontsize=8)
 legend=[Patch(facecolor='#d8d8d8',label='Other source district (see geometry references)'),Patch(facecolor=COL['LMDR-NCOD Coachman R'],hatch='//',label='Combined LMDR-NCOD Coachman R source zone'),Patch(facecolor=COL['LDR-NCOD Coachman R'],hatch='//',label='Combined LDR-NCOD Coachman R source zone'),Patch(facecolor=COL['I'],label='Institutional (I) source zone'),Line2D([0],[0],color='black',label='Parcel outline'),Line2D([0],[0],color='#555',ls='--',label='Source zoning boundary'),Line2D([0],[0],color='#a50024',marker='x',lw=0,label='Address point')]
 with PdfPages(out/'qc-atlas.pdf') as atlas:
  for s in samples:
   r=s['record'];fig=plt.figure(figsize=(8.5,11));fig.suptitle(f"{s['caseId']} — {r['address']}",fontsize=12,y=.975)
   scope='IN RESEARCH COHORT — NOT APPROVED' if s['inCandidateScope'] else 'EXCLUDED COMPARISON — NOT A CANDIDATE'
   fig.text(.06,.93,f"{scope}\nParcel {r['parcelId']} | original QA REVIEW | source {r['sourceCode']}",fontsize=8,color='#111' if s['inCandidateScope'] else '#9b001b')
   cov='; '.join(f"{next(f['rawZoningCode'] for f in r['sourceZoningFeatures'] if f['normalizedZoningCode']==z['normalizedZoningCode'])}: {z['percentOfParcel']:.6f}%" for z in r['coverage'])
   fig.text(.06,.88,f"Parcel {r['parcelAreaM2']:,.6f} m² | source polygon IDs {r['sourcePolygonIds']}\nMeasured positive-area coverage: {cov}",fontsize=7)
   ax=fig.add_axes([.09,.43,.82,.40]);draw(ax,s);ax.set_title('Parcel and combined NCOD-coded zoning context — no aerial/building lines',fontsize=8)
   ax=fig.add_axes([.61,.19,.30,.20]);draw(ax,s,True);ax.set_title('Nearest source boundary (10 × 10 m)\nMay lie outside parcel',fontsize=7)
   fig.legend(handles=legend,loc='lower left',bbox_to_anchor=(.055,.28),fontsize=6,frameon=False)
   fig.text(.06,.22,'Human conclusions: blank\nReview the worksheet.\nNo frontage, building line or\nlegal overlay boundary is inferred.',fontsize=8,linespacing=1.6)
   fig.text(.06,.13,'NCOD hatching denotes the source combined-code polygon, not a separate measured overlay layer.\nThe frozen snapshot has no independent overlay polygon, building footprint, proposed fence line,\nlegal frontage, title/deed or seawall evidence. A source boundary is not a survey.',fontsize=7,linespacing=1.4)
   refs='§ 2-1601.J.1, J.2.b, J.3; § 3-803.A' if r['sourceCode']=='LMDR-NCOD Coachman R' else '§ 2-1601.J.1, J.2.a; § 3-803.A'
   fig.text(.06,.065,f"Regulatory questions: {refs} (archived Supplement 55; current amendments unverified).\nSelection: {s['selectionReason']}\nRetained research holds: {', '.join(r['researchTechnicalHolds']) or 'none apart from unsupported-code/product/regulatory readiness'}",fontsize=6.5)
   fig.text(.06,.02,'September 28 GIS; research only. No Rule 005 approvals or threshold policy.\nSource/edition citations and unresolved Planning questions are in the regulatory report.',fontsize=6)
   fig.savefig(out/'maps'/f"{s['caseId']}.png",dpi=300);fig.savefig(out/'maps'/f"{s['caseId']}.pdf");atlas.savefig(fig);plt.close(fig)
 with PdfPages(out/'contact-sheet.pdf') as contact:
  for batch in range(math.ceil(len(samples)/6)):
   fig,axs=plt.subplots(3,2,figsize=(8.5,11));fig.suptitle(f'Rule 005 NCOD QC — page {batch+1}',fontsize=14)
   selected=samples[batch*6:(batch+1)*6]
   for ax,s in zip(axs.flat,selected):draw(ax,s);ax.set_title(f"{s['caseId']} | {'CANDIDATE' if s['inCandidateScope'] else 'EXCLUDED CONTROL'}\n{s['record']['address']}",fontsize=7)
   for ax in list(axs.flat)[len(selected):]:ax.axis('off')
   fig.text(.06,.015,'Combined-code GIS polygons only. All owner-QC fields blank; no certified responses or new approvals.',fontsize=7);fig.tight_layout(rect=[0,.04,1,.96]);contact.savefig(fig);fig.savefig(out/f'contact-sheet-{batch+1}.png',dpi=200);plt.close(fig)
 # Standalone printable worksheet pages, preserving every blank reviewer field.
 with PdfPages(out/'review-worksheet.pdf') as pdf:
  for batch in range(math.ceil(len(samples)/3)):
   fig=plt.figure(figsize=(8.5,11));fig.text(.06,.95,'Rule 005 — blank owner QC worksheet',fontsize=16)
   for n,s in enumerate(samples[batch*3:(batch+1)*3]):
    y=.88-n*.28;r=s['record'];fig.text(.06,y,f"{s['caseId']} · {r['address']}\nParcel {r['parcelId']} · {'CANDIDATE' if s['inCandidateScope'] else 'EXCLUDED COMPARISON'}",fontsize=9)
    fig.text(.06,y-.06,'Combined NCOD mapping credible? ______   Additional district/boundary concern? ______\nFront/street-side configuration: ______________________________________________\nCity regulatory clarification needed? ______   Known facts adequate for ambiguous response? ______\nFuture starting guidance after overlay support? ______   Internal designation (1/2/3/uncertain): ______\nReviewer/date: ____________________   Notes: __________________________________',fontsize=8,linespacing=1.7)
   fig.text(.06,.025,'Visual inspection is not a legal zoning, frontage, ownership or current-law determination.',fontsize=7);pdf.savefig(fig);plt.close(fig)
 (out/'render-provenance.json').write_text(json.dumps({'caseMaps':len(samples),'atlasPages':len(samples),'contactSheetPages':math.ceil(len(samples)/6),'worksheetPages':math.ceil(len(samples)/3),'pngDpi':300,'matplotlibVersion':matplotlib.__version__,'rendererSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'ownerQcFields':'BLANK','noSeparateOverlayLayerInvented':True,'sharedDrawingModuleSha256':hashlib.sha256(pathlib.Path(__file__).with_name('render-clearwater-rule004-qc.py').read_bytes()).hexdigest()},indent=2)+'\n')
 (out/'checksums.json').write_text(json.dumps({str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()},indent=2)+'\n')
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('analysis');a.add_argument('output');v=a.parse_args();run(v.analysis,v.output)
