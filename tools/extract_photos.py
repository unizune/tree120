from PIL import Image, ImageDraw, ImageFont
import numpy as np,json,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
rows=[x.split('\t') for x in (root/'research/catalog.tsv').read_text().splitlines()]
ocr={int(j['file'][:4]):j['rows'] for j in map(json.loads,(root/'research/ocr.jsonl').read_text().splitlines())}
skip={118,125,167,203,242,365,395,117,221,5,60,77,78,94,95,126,147,149,168,175,176,188,204,205,206,207,209,210,211,212,233,250,251,252,254,255,259,260,263,276,277,349,350,357,358,359,360,361,362,366,370,371,374,390,396,397,398,431,432,433,434,435,458}
def runs(a):
 inds=np.flatnonzero(np.diff(np.r_[False,a,False]));return [(int(s),int(e)) for s,e in zip(inds[::2],inds[1::2])]
def cropbox(im):
 a=np.array(im).astype(int); chrom=a.max(2)-a.min(2);mask=(chrom>14)&(a.min(2)<210)
 cols=mask[150:655].mean(0)>.18
 # Bridge minor gaps inside photographs
 for s,e in runs(~cols):
  if 0<s<e<len(cols) and e-s<14:cols[s:e]=True
 candidates=[]
 for x1,x2 in runs(cols):
  if x2-x1<180:continue
  rs=mask[:660,x1:x2].mean(1)>.12
  for s,e in runs(~rs):
   if 0<s<e<len(rs) and e-s<18:rs[s:e]=True
  for y1,y2 in runs(rs):
   if y2-y1>130:candidates.append((x1+3,y1+3,x2-3,y2-3))
 if not candidates:return (200,160,1200,650)
 return max(candidates,key=lambda b:(b[2]-b[0])*(b[3]-b[1]))
manifest=[]
for id,name,start,end in rows:
 candidates=[]
 for n in ([1001]+list(range(int(start),int(end)+1)) if int(id)==1 else range(int(start),int(end)+1)):
  if n in skip:continue
  im=Image.open(root/f'research/frames/{n:04}.jpg');b=cropbox(im)
  # Trim any recognized top text overlapping the photo, keeping photo below.
  for r in ocr.get(n,[]):
   x,y,w,h=r['x']*1280,(1-r['y']-r['h'])*720,r['w']*1280,r['h']*720
   if y<230 and y+h>b[1] and x+w>b[0]+30 and x<b[2]-30 and len(r['text'])>2 and r['h']>.035:
    b=(b[0],max(b[1],int(y+h+8)),b[2],b[3])
  if int(id)>=101: b=(max(205,b[0]),b[1],b[2],b[3])
  if n==1001:b=(523,5,1275,660)
  if n in [35,74,85,93,99,191,298]: b=(b[0],max(b[1],160),b[2],b[3])
  if n==439:b=(210,5,640,515)
  if n==173:b=(903,170,1275,650)
  if b[3]-b[1]<130:continue
  cr=im.crop(b);ar=np.array(cr.resize((16,16)).convert('L'));ph=(ar>ar.mean()).flatten()
  if any(np.mean(ph!=z[3])<.12 for z in candidates):continue
  candidates.append((n,b,cr,ph))
 # Keep representative first, middle and last distinct frame, at most 3.
 preferred={1:[1001,4,6],2:[9,7],9:[29,30],10:[32,31],15:[54,53,51],16:[56,55],19:[67,65,66],22:[75,72],26:[87,89],30:[100,101],34:[113,114],35:[120,119],36:[123,127,121],39:[142,144],40:[146,145,148],41:[155,150,153],44:[165,160],48:[179,180],50:[186,185,187],51:[191,189],57:[219,218,216],60:[232,234],61:[237,235],63:[245,243,247],72:[281,279],75:[295,291],76:[301,303],80:[320,318,322],82:[325,326],85:[334,335],87:[341,340],88:[343,344],89:[347,345],93:[368,369],101:[401,399,402],102:[404,405],105:[414,415,413],106:[418,419],107:[421,422],109:[427,425],111:[437,438],114:[442,443],116:[448,449,446],119:[457,456],120:[460,461,462]}
 picked=[next(c for c in candidates if c[0]==f) for f in preferred.get(int(id),[]) if any(c[0]==f for c in candidates)]
 if not picked:picked=candidates if len(candidates)<=3 else [candidates[0],candidates[len(candidates)//2],candidates[-1]]
 pics=[]
 for i,(n,b,cr,_) in enumerate(picked):
  out=f'assets/{int(id):03}-{i+1}.jpg';cr.thumbnail((950,720));cr.save(root/'web'/out,quality=90)
  pics.append({'src':out,'time':42 if n==1001 else 424 if n==0 else n*20-10,'frame':n,'crop':b})
 manifest.append({'id':int(id),'name':name,'start':424 if int(start)==0 else int(start)*20-10,'images':pics})
(root/'research/images.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf',18)
for block in range(6):
 sheet=Image.new('RGB',(1200,1050),'#eef1ea');d=ImageDraw.Draw(sheet)
 for j,t in enumerate(manifest[block*20:(block+1)*20]):
  x=(j%4)*300;y=(j//4)*210
  im=Image.open(root/'web'/t['images'][0]['src']);im.thumbnail((290,170));sheet.paste(im,(x+(290-im.width)//2,y))
  d.text((x+8,y+174),f"{t['id']:03} {t['name']} (f{t['images'][0]['frame']})",font=font,fill='#153823')
 sheet.save(root/f'research/contact-{block+1}.jpg')
print('Trees',len(manifest),'photos',sum(len(t['images']) for t in manifest))
