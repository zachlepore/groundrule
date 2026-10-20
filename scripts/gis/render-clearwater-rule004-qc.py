#!/usr/bin/env python3
"""Read-only scientific QC maps from pinned prepared evidence. No inferred human conclusions."""
import argparse,csv,hashlib,json,math,os,pathlib,textwrap
os.environ.setdefault('MPLCONFIGDIR','/tmp/groundrule-rule004-mpl')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import PathPatch,Patch,Rectangle
from matplotlib.path import Path
from matplotlib.lines import Line2D
from shapely.geometry import shape,box,Point
from shapely.affinity import translate,scale
from shapely import maximum_inscribed_circle
COL={'hdr':'#b9d9ef','lmdr':'#f2a23a','os/r':'#86b69c','p':'#b5a0cc'}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def draw_polygon(ax,g,**style):
 polys=[g] if g.geom_type=='Polygon' else list(g.geoms) if g.geom_type in ['MultiPolygon','GeometryCollection'] else []
 for poly in polys:
  if poly.geom_type!='Polygon':continue
  vertices=[];codes=[]
  for j,r in enumerate([poly.exterior,*poly.interiors]):
   pts=list(r.coords);sgn=sum(x*v-u*y for (x,y),(u,v) in zip(pts,pts[1:]))
   if (sgn>0)!=(j==0):pts.reverse()
   vertices+=pts;codes+=[Path.MOVETO]+[Path.LINETO]*(len(pts)-2)+[Path.CLOSEPOLY]
  ax.add_patch(PathPatch(Path(vertices,codes),**style))
def run(prepared,output):
 inp,out=pathlib.Path(prepared),pathlib.Path(output);assert not out.exists(),'Fresh output required'
 for n,h in json.loads((inp/'checksums.json').read_text()).items():assert digest(inp/n)==h,n
 cases=json.loads((inp/'cases.json').read_text());additional=json.loads((inp/'additional-unit-examples.json').read_text());compare=json.loads((inp/'geometry-comparison.json').read_text());ctx=json.loads((inp/'geometries/site-context-parcel.json').read_text());records=list(csv.DictReader((inp/'candidate-addresses.csv').open()))
 out.mkdir(parents=True);(out/'maps').mkdir()
 def draw(ax,c,mode='full',labels=False):
  gd=json.loads((inp/'geometries'/f"{c['caseId']}.json").read_text());g=shape(gd['parcel']['geometry']);lon,lat=g.centroid.x,g.centroid.y
  metric=lambda x:scale(translate(x,-lon,-lat),xfact=111195*math.cos(math.radians(27.97)),yfact=111195,origin=(0,0))
  gm=metric(g);lm=metric(shape(next(x['geometry'] for x in gd['intersections'] if x['district']=='lmdr')));cg=metric(shape(ctx['parcel']['geometry']))
  if mode=='full':
   x0,y0,x1,y1=cg.union(gm).bounds;pad=max(x1-x0,y1-y0)*.07;lim=(x0-pad,y0-pad,x1+pad,y1+pad)
  elif mode=='strip':
   x0,y0,x1,y1=lm.bounds;pad=1;lim=(x0-pad,y0-2,x1+pad,y1+2)
  else:
   line=maximum_inscribed_circle(lm,tolerance=.0001);center=Point(line.coords[0]);lim=(center.x-1.5,center.y-1.5,center.x+1.5,center.y+1.5)
  window=box(*lim)
  # Faint source district context; solid clipped intersections; precise source coordinates retained.
  for z in gd['zoningFeatures']:
   district=z['properties']['ZONING'].lower();zgeom=metric(shape(z['geometry']));draw_polygon(ax,zgeom.intersection(window),facecolor=COL[district],edgecolor='none',alpha=.12,zorder=1)
   inter=zgeom.intersection(gm);draw_polygon(ax,inter,facecolor=COL[district],edgecolor='none',alpha=.9,zorder=3)
   border=zgeom.boundary.intersection(window)
   for line in list(border.geoms) if hasattr(border,'geoms') else [border]:
    if line.geom_type=='LineString':ax.plot(*line.xy,color='#285b86' if district=='hdr' else '#a15a00',lw=1,zorder=5)
  for z in ctx['intersections']:
   if z['district'] in ['os/r','p']:draw_polygon(ax,metric(shape(z['geometry'])),facecolor=COL[z['district']],edgecolor=COL[z['district']],lw=.6,alpha=.35,zorder=2)
  draw_polygon(ax,cg,facecolor='none',edgecolor='#777',linestyle=':',lw=1.2,zorder=6)
  draw_polygon(ax,gm,facecolor='none',edgecolor='#111',linestyle='--',lw=.9,zorder=7)
  for r in records:
   pt=metric(Point(json.loads(r['coordinates'])));ax.plot(pt.x,pt.y,'.',color='#333',ms=1.4,alpha=.28,zorder=8)
  reps=[('Unit',c['representative'])]+[(f"CU {x['record']['landUseCode']}",x['record']) for x in additional] if labels else [('Unit',c['representative'])]
  for name,r in reps:
   pt=metric(Point(r['coordinates']));ax.plot(pt.x,pt.y,'x',color='#c00024',ms=5,zorder=9)
   if labels and mode=='full':ax.annotate(name,(pt.x,pt.y),xytext=(6,6),textcoords='offset points',fontsize=6,color='#9b001b',bbox={'facecolor':'white','alpha':.8,'edgecolor':'none','pad':1},zorder=10)
  if mode=='full':
   x0,y0,x1,y1=lm.bounds;ax.add_patch(Rectangle((x0-1,y0-2),x1-x0+2,y1-y0+4,fill=False,edgecolor='#b32523',lw=.9,zorder=10));ax.text(x0,y0-6,'LMDR detail below',fontsize=6,color='#9b001b',ha='left')
  ax.set_xlim(lim[0],lim[2]);ax.set_ylim(lim[1],lim[3]);ax.set_aspect('equal',adjustable='box');ax.grid(alpha=.18);ax.tick_params(labelsize=6);ax.set_xlabel('Approx. local east (m)',fontsize=6);ax.set_ylabel('Approx. local north (m)',fontsize=6)
  x0,x1=ax.get_xlim();y0,y1=ax.get_ylim();span=x1-x0;length=max(v for v in [.01,.02,.05,.1,.2,.5,1,2,5,10,20,50,100] if v<=span*.25);sx=x0+span*.06;sy=y0+(y1-y0)*.08
  ax.plot([sx,sx+length],[sy,sy],color='#111',lw=2,zorder=15);ax.text(sx+length/2,sy+(y1-y0)*.025,f'{length:g} m',fontsize=6,ha='center',bbox={'facecolor':'white','alpha':.8,'edgecolor':'none','pad':1},zorder=16)
  if mode=='full':ax.annotate('N',xy=(.95,.96),xytext=(.95,.82),xycoords='axes fraction',ha='center',fontsize=8,arrowprops={'arrowstyle':'->'})
 legend=[Patch(facecolor=COL['hdr'],label='HDR, unit-footprint intersection'),Patch(facecolor=COL['lmdr'],label='LMDR, unit-footprint intersection'),Patch(facecolor=COL['os/r'],alpha=.4,label='OS/R, larger site-record context'),Patch(facecolor=COL['p'],alpha=.4,label='P, larger site-record context'),Line2D([0],[0],color='black',ls='--',label='Unit parcel footprint'),Line2D([0],[0],color='#777',ls=':',label='Larger un-unitized site record')]
 with PdfPages(out/'qc-atlas.pdf',metadata={'Title':'Rule 004 manual QC: two geometry groups'}) as atlas:
  for c in cases:
   rep=c['representative'];hdr=next(x for x in c['districts'] if x['normalizedZoningCode']=='hdr');lm=next(x for x in c['districts'] if x['normalizedZoningCode']=='lmdr')
   fig=plt.figure(figsize=(8.5,11));fig.suptitle(f"{c['caseId']} | {rep['address']}",fontsize=12,y=.978)
   fig.text(.06,.937,f"Parcel {rep['parcelId']} | {c['addressCount']} address / parcel ID(s) in geometry group\nOriginal HDR / REVIEW; unapproved. Raw land-use code {rep['landUseCode']}; rights/use not established.",fontsize=8)
   fig.text(.06,.887,f"Frozen diagnostic footprint {c['parcelAreaM2']:,.3f} m² ({c['parcelAreaM2']*10.7639104167:,.2f} ft²)\nHDR {hdr['intersectionAreaSquareMeters']:,.3f} m² / {hdr['percentOfParcel']:.6f}% | LMDR {lm['intersectionAreaSquareMeters']:.3f} m² / {lm['percentOfParcel']:.6f}%",fontsize=8)
   ax=fig.add_axes([.08,.455,.84,.39]);draw(ax,c,labels=True);ax.set_title('Full footprint and larger site-record context — no aerial imagery',fontsize=9)
   ax=fig.add_axes([.08,.29,.56,.11]);draw(ax,c,'strip');ax.set_title('Entire mapped LMDR strip, true proportions',fontsize=8)
   ax=fig.add_axes([.71,.27,.22,.16]);draw(ax,c,'micro');ax.set_title('3 × 3 m close-up',fontsize=8)
   fig.legend(handles=legend,loc='lower left',bbox_to_anchor=(.055,.175),ncol=2,fontsize=6,frameon=False)
   fig.text(.06,.137,f"Zoning references: HDR OBJECTID 10707 / source index 224; LMDR OBJECTID 10764 / index 281.\nParcel OBJECTID {rep['parcelObjectId']}; address OBJECTID {rep['addressId']}. Scale axes are approximate metres.",fontsize=6.5)
   fig.text(.06,.094,'Inspection only: a narrow edge may be a real legal boundary or a mapping artifact.\nThe larger site record also maps OS/R and P; its ownership relationship to units is unverified.\nAnswer the blank worksheet. No starting-guidance or prominent-notice decision is inferred.',fontsize=7,linespacing=1.5)
   fig.text(.06,.025,f"September 28 frozen GIS | group hash {c['footprintSha256'][:20]}…\nTwo geometry variants are visually coincident at map scale; differences are documented, not corrected.",fontsize=6)
   fig.savefig(out/'maps'/f"{c['caseId']}.png",dpi=300);fig.savefig(out/'maps'/f"{c['caseId']}.pdf");atlas.savefig(fig);plt.close(fig)
 # One-page contact sheet with both map contexts and both secondary-strip windows.
 fig=plt.figure(figsize=(8.5,11));fig.suptitle('Rule 004 — two-case contact sheet',fontsize=16,y=.97)
 fig.text(.06,.92,'364 addresses / 364 parcel IDs | one site context, two exact geometry variants\nHuman conclusions blank. Inspect high-resolution case maps and worksheet before deciding.',fontsize=9)
 for j,c in enumerate(cases):
  top=.59 if j==0 else .27
  ax=fig.add_axes([.06,top,.52,.25]);draw(ax,c);ax.set_title(f"{c['caseId']} · {c['addressCount']} records\n{c['representative']['address']}",fontsize=8)
  ax=fig.add_axes([.64,top+.08,.30,.08]);draw(ax,c,'strip');ax.set_title('LMDR strip — 0.094078%',fontsize=8)
  fig.text(.64,top+.015,f"LMDR 22.759 m²\nParcel …{c['representative']['parcelId'][-8:]}\nAtlas page {j+1}",fontsize=7)
 fig.legend(handles=legend,loc='lower left',bbox_to_anchor=(.045,.15),fontsize=6,ncol=2,frameon=False)
 fig.text(.06,.08,'Primary group: 363 parcel IDs; outlier: UNIT N-1005.\nCU examples (raw codes 09 and 17) are separate worksheet rows sharing the primary footprint.\nNo approved notice threshold applies to Rule 004. Shared-land/project restrictions remain uncertain.',fontsize=8)
 fig.savefig(out/'contact-sheet.png',dpi=220);fig.savefig(out/'contact-sheet.pdf');plt.close(fig)
 # Printable worksheet: every decision cell deliberately blank.
 worksheet=list(csv.DictReader((inp/'review-worksheet.csv').open()))
 fig=plt.figure(figsize=(11,8.5));fig.text(.05,.94,'Rule 004 — human review worksheet',fontsize=16)
 fig.text(.05,.88,'Reviewer: __________________________    Date: __________________________\nVisual assessment is not a legal boundary determination. Use yes / no / uncertain and notes.',fontsize=9)
 ax=fig.add_axes([.04,.27,.92,.53]);ax.axis('off')
 headers=['Case / address / parcel ID','Meaningful\nsecondary zone?','Likely\nboundary artifact?','HDR starting\nguidance appropriate?','Prominent\nnotice warranted?','Further legal /\nownership review?','Notes']
 cells=[[r['caseId']+'\n'+r['address']+'\n'+r['parcelId'],'','','','','',''] for r in worksheet]
 t=ax.table(cellText=cells,colLabels=headers,colWidths=[.30,.11,.12,.13,.10,.13,.11],cellLoc='left',loc='center',bbox=[0,0,1,1]);t.auto_set_font_size(False);t.set_fontsize(7)
 for (row,col),cell in t.get_celld().items():
  cell.set_edgecolor('#777');cell.set_linewidth(.5)
  if row==0:cell.set_facecolor('#e6edf2')
 fig.text(.05,.15,'R004-01 and R004-02 are geometry groups; CU09/CU17 prompts share the primary footprint.\nDo not infer ownership or permitted use from raw land-use codes. Larger site-record OS/R/P context remains unresolved.\nNo Rule 004 approvals, legal conclusions or prominent-notice policy have been supplied.',fontsize=9,linespacing=1.6)
 fig.savefig(out/'review-worksheet.pdf');plt.close(fig)
 provenance={'preparedChecksumsSha256':digest(inp/'checksums.json'),'rendererSha256':digest(pathlib.Path(__file__)),'dpi':300,'caseMaps':2,'atlasPages':2,'contactSheetPages':1,'humanConclusions':'BLANK','noAerialOrOwnershipEvidence':True}
 (out/'render-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
 (out/'checksums.json').write_text(json.dumps({str(p.relative_to(out)):digest(p) for p in sorted(out.rglob('*')) if p.is_file()},indent=2)+'\n')
 print(json.dumps(provenance,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('prepared');p.add_argument('output');a=p.parse_args();run(a.prepared,a.output)
