/* T634 英式公共與休閒候選：獨立幾何、三款結構變體；實際足跡 n 不外擴。 */
function civicKit634(T){
  const K=kit634(T),n=T.n,V=((T.v%3)+3)%3,W=T.winter,sea=T.sea||0;
  const stone={left:'#d4c5a8',right:'#b5a88f',top:W?'#e7eded':'#ddd1b8',edge:'#827969'};
  const brick={left:'#ad6652',right:'#824d43',top:W?'#e7eded':'#ba7c61',edge:'#684c42'};
  const iron={left:'#52666a',right:'#394d53',top:'#79898a',edge:'#2e4249'};
  const p=(a,b,z=0)=>T.P(a*n,b*n,z),f=(a,c)=>K.face(a,c),l=(a,b,c,w=1)=>K.ln(a,b,c,w);
  const L=(a,b,c,w=1)=>l(p(...a),p(...b),c,w);
  const H=(base=20,grow=3)=>Math.min(90,base+Math.max(0,n-1)*grow);
  const g=(a,b,c,d,col)=>K.face(T.quad(a*n,b*n,c*n,d*n),col);
  /* 磚石保留完整大面；暗砂漿疏排、薄勒腳與簷下陰影，不再逐層砌奶油色角框。 */
  const B=(a,b,c,d,h,col=stone,z=0)=>{const out=T.box(a*n,b*n,c*n,d*n,h,col,z);if(h>=12&&(col===stone||col===brick)){
    const course=col===stone?9:7;for(let zz=course;zz<h-3;zz+=course){L([a,b+d,z+zz],[a+c,b+d,z+zz],T.shade(col.left,-9));L([a+c,b,z+zz],[a+c,b+d,z+zz],T.shade(col.right,-8));}
    if(c*n>.85)for(let zz=course;zz<h-5;zz+=course*2){const at=a+c*(Math.floor(zz/course)%4===1?.34:.66);L([at,b+d,z+zz],[at,b+d,z+zz+course],T.shade(col.left,-8));}
    L([a,b+d,z+1],[a+c,b+d,z+1],T.shade(col.left,-27),2);L([a+c,b,z+1],[a+c,b+d,z+1],T.shade(col.right,-23),2);
    L([a,b+d,z+h-1],[a+c,b+d,z+h-1],T.shade(col.left,-19));L([a+c,b,z+h-1],[a+c,b+d,z+h-1],T.shade(col.right,-20));
  }return out;};
  const home=(a,b,c,d,h,opt={})=>K.house(a*n,b*n,c*n,d*n,h,opt);
  const tree=(a,b,r=.06)=>K.tree(a*n,b*n,Math.max(.09,r*n));
  const fence=(a,b,c,d)=>{for(const[x0,y0,x1,y1]of[[a,b,a+c,b],[a+c,b,a+c,b+d],[a+c,b+d,a,b+d],[a,b+d,a,b]]){L([x0,y0,5],[x1,y1,5],'#40534e');L([x0,y0,2],[x1,y1,2],'#748270');const count=Math.max(2,Math.ceil((Math.abs(x1-x0)+Math.abs(y1-y0))*n/.17));for(let i=0;i<=count;i++){const t=i/count,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;L([x,y,0],[x,y,6],'#394e48');}}};
  const hedge=(a,b,c,d)=>K.hedge(a*n,b*n,c*n,d*n);
  const lamp=(a,b,h=16)=>{K.lamp(a*n,b*n,h);(T.hooks.lamps||(T.hooks.lamps=[])).push(p(a,b,h));};
  const sign=(a,b,z,s,c='#254d52')=>{const q=p(a,b,z),scale=n===1?.62:n===2?.84:1,ww=Math.min(43,String(s).length*4+5)*scale;if(z<=12){for(const dx of[-ww*.34,ww*.34])l([q[0]+dx,q[1]+2],[q[0]+dx,p(a,b)[1]],'#49534c');}T.g.save();T.ng.save();for(const ctx of[T.g,T.ng]){ctx.translate(q[0],q[1]);ctx.scale(scale,scale);ctx.translate(-q[0],-q[1]);}K.sign(a*n,b*n,z,s,c);T.g.restore();T.ng.restore();T.hooks.sign=q;};
  const path=(a,b,c,d)=>{g(a,b,c,d,W?'#dce4e1':'#b9ae96');if(c>.13&&d>.13){const e=Math.min(.016,.035/n);g(a+e,b+e,c-2*e,d-2*e,W?'#e3e9e3':'#c9bda4');}};
  const lawn=(a=0,b=0,c=1,d=1)=>g(a,b,c,d,W?'#dce4e1':['#819a70','#789165','#9a9167','#869180'][sea]);
  const ring=(a,b,ra,rb,z,col,count=24)=>{const ps=[];for(let i=0;i<count;i++){const t=i*Math.PI*2/count;ps.push(p(a+Math.cos(t)*ra,b+Math.sin(t)*rb,z));}f(ps,col);return ps;};
  const outline=(ps,col,w=1)=>{for(let i=0;i<ps.length;i++)l(ps[i],ps[(i+1)%ps.length],col,w);};
  const ellipse=(a,b,z,rx,ry,col)=>{const q=p(a,b,z),ps=[];for(let i=0;i<24;i++){const t=i*Math.PI/12;ps.push([q[0]+Math.cos(t)*rx,q[1]+Math.sin(t)*ry]);}T.occlude(ps);T.ell(T.g,q[0],q[1],rx,ry,col);};
  const cyl=(a,b,r,h,col=stone,z=0)=>{const count=20,low=[],top=[];for(let i=0;i<count;i++){const t=i*Math.PI*2/count;low.push(p(a+r*Math.cos(t),b+r*Math.sin(t),z));top.push(p(a+r*Math.cos(t),b+r*Math.sin(t),z+h));}for(let i=0;i<count;i++){const j=(i+1)%count,t=(i+.5)*Math.PI*2/count;if(Math.cos(t)+Math.sin(t)>0){const light=Math.sin(t)>Math.cos(t);f([low[i],low[j],top[j],top[i]],light?col.left:col.right);if(h>=15&&col!==iron)for(let zz=9;zz<h-2;zz+=9){const t1=i*Math.PI*2/count,t2=j*Math.PI*2/count;l(p(a+r*Math.cos(t1),b+r*Math.sin(t1),z+zz),p(a+r*Math.cos(t2),b+r*Math.sin(t2),z+zz),T.shade(light?col.left:col.right,-8));}if(col===iron&&i%3===0)l(low[i],top[i],T.shade(light?col.left:col.right,-11));}}f(top,col.top);outline(top,col.edge||T.shade(col.right,-12));return top;};
  /* 連續板岩坡面、低反差順坡排片與實厚簷口：屋頂先讀作一個量體。 */
  const pyramid=(a,b,c,d,z,h,col='#55636d')=>{const q=[p(a,b,z),p(a+c,b,z),p(a+c,b+d,z),p(a,b+d,z)],ap=p(a+c/2,b+d/2,z+h),main=W?'#e2e9e4':col,side=W?'#c8d5d2':T.shade(col,-19);f([q[0],q[1],ap],main);f([q[1],q[2],ap],side);f([q[2],q[3],ap],main);for(let t=.24;t<.88;t+=.24){const row=q.map(v=>[v[0]+(ap[0]-v[0])*t,v[1]+(ap[1]-v[1])*t]);l(row[3],row[2],W?'#cbd7d2':T.shade(col,-9));l(row[2],row[1],W?'#b8cbc5':T.shade(col,-26));}for(const i of[1,2]){l([q[i][0],q[i][1]+2],[q[i+1][0],q[i+1][1]+2],'#39464f',2);l(q[i],q[i+1],W?'#eef2e9':T.shade(col,9));}l(q[2],ap,W?'#e5ece4':T.shade(col,4));};
  const dome=(a,b,r,z,h,slit=false)=>{const q=p(a,b,z),rx=Math.max(5,r*n*44),ry=Math.max(3,r*n*18),ps=[[q[0]-rx,q[1]]];for(let i=0;i<=20;i++){const t=Math.PI-i*Math.PI/20;ps.push([q[0]+Math.cos(t)*rx,q[1]-Math.sin(t)*h]);}ps.push([q[0]+rx,q[1]+ry],[q[0],q[1]+ry+1],[q[0]-rx,q[1]+ry]);f(ps,W?'#dce8e5':'#618780');const shadePs=[[q[0]+rx*.24,q[1]-h*.97]];for(let i=0;i<=10;i++){const t=Math.PI*.5-i*Math.PI*.05;shadePs.push([q[0]+Math.cos(t)*rx,q[1]-Math.sin(t)*h]);}shadePs.push([q[0]+rx,q[1]+ry],[q[0]+rx*.28,q[1]+ry]);f(shadePs,W?'#bdceca':'#476b6a');T.ell(T.g,q[0],q[1],rx,ry,W?'#c8d9d5':'#4b706d');for(const off of[-.55,.14,.62]){let prev=null;for(let j=0;j<=10;j++){const t=j/10,pt=[q[0]+rx*off*Math.sqrt(1-t*t),q[1]-h*t];if(prev)l(prev,pt,W?'#bccfc9':off>.3?'#557c76':'#799890');prev=pt;}}l([q[0]-rx,q[1]+ry*.25],[q[0],q[1]+ry+1],W?'#e6eee7':'#486760',2);l([q[0],q[1]+ry+1],[q[0]+rx,q[1]+ry*.25],W?'#d0dfd9':'#365751',2);if(slit){l([q[0]+rx*.28,q[1]-h*.9],[q[0]+rx*.55,q[1]],'#30484f',Math.max(2,n));l([q[0]+rx*.18,q[1]-h*.91],[q[0]+rx*.43,q[1]],W?'#dae4dc':'#9eb2aa');}};
  const window=(a,b,z,w=3,h=5)=>{const q=p(a,b,z),ww=Math.max(2,w),hh=Math.max(3,h);K.px(q[0]-ww/2-1,q[1]-hh-1,'#53605d',ww+2,hh+2);K.px(q[0]-ww/2,q[1]-hh,'#293e47',ww,hh);T.LIT(q[0]-ww/2+1,q[1]-hh+1,Math.max(1,ww-1),Math.max(2,hh-2),'#4f6a71','#d9c494');K.px(q[0]-ww/2-1,q[1]+1,'#aa9f87',ww+2,1);if(ww>=5&&hh>=7)K.px(q[0]-ww/2,q[1]-Math.floor(hh*.46),'#909782',ww,1);};
  const clock=(a,b,z,r=4)=>{const q=p(a,b,z);ellipse(a,b,z,r+2,r+2,'#b7a27f');ellipse(a,b,z,r+1,r+1,'#55584f');ellipse(a,b,z,r,r,'#eee1bc');for(let i=0;i<12;i++){const t=i*Math.PI/6;l([q[0]+Math.sin(t)*r*.72,q[1]-Math.cos(t)*r*.72],[q[0]+Math.sin(t)*r*.94,q[1]-Math.cos(t)*r*.94],'#6d6654');}l(q,[q[0]-r*.18,q[1]-r*.63],'#303d3d');l(q,[q[0]+r*.56,q[1]+r*.2],'#303d3d');K.px(q[0],q[1],'#a8844e',1,1);};
  const arch=(a,b,w,d,h,col=stone)=>{const pier=w*.23;B(a,b,pier,d,h,col);B(a+w-pier,b,pier,d,h,col);B(a,b,w,d,h*.24,col,h*.76);const ps=[p(a+pier,b+d,h*.45),p(a+pier,b+d,h*.7),p(a+w*.4,b+d,h*.86),p(a+w*.6,b+d,h*.86),p(a+w-pier,b+d,h*.7),p(a+w-pier,b+d,h*.45)];f([p(a+pier,b+d,0),...ps,p(a+w-pier,b+d,0)],'#35433e');f([p(a+pier,b+d,0),p(a+pier,b+d,h*.68),p(a+pier+.035,b+d,h*.65),p(a+pier+.035,b+d,0)],T.shade(col.right,-20));for(let i=0;i<ps.length-1;i++)l(ps[i],ps[i+1],T.shade(col.left,-4),Math.max(1,n*.55));for(const x of[a,a+w-pier])B(x,b+d-.008,pier,.016,2,col,2);L([a,b+d,h-1],[a+w,b+d,h-1],T.shade(col.left,4));L([a+pier,b+d,1],[a+w-pier,b+d,1],'#a89d86');};
  const canopy=(a,b,c,d,h,col='#55636d')=>{for(const q of [[a,b],[a+c,b],[a+c,b+d],[a,b+d]]){L([q[0],q[1],0],[q[0],q[1],h],'#39464f',Math.max(2,n*.65));L([q[0],q[1],h-5],[q[0]+(q[0]===a?1:-1)*Math.min(c*.19,.05),q[1],h],'#687c75');}pyramid(a-.018,b-.018,c+.036,d+.036,h,Math.max(6,Math.min(13,n*2.3)),col);for(const q of[[[a-.018,b+d+.018,h],[a+c+.018,b+d+.018,h]],[[a+c+.018,b-.018,h],[a+c+.018,b+d+.018,h]]])L([q[0][0],q[0][1],h-2],[q[1][0],q[1][1],h-2],'#34484b',2);};
  const bench=(a,b)=>{B(a,b,.11,.035,2,{left:'#8b6b4b',right:'#654d38',top:'#ab895c'},3);for(const x of[a+.012,a+.096]){L([x,b+.031,0],[x,b+.031,8],'#344548');L([x,b+.005,0],[x,b+.005,3],'#344548');}for(const z of[5,7])L([a,b+.034,z],[a+.11,b+.034,z],'#997749');L([a,b+.012,5],[a+.11,b+.012,5],'#c0a374');};
  const flag=(a,b,z=25,c='#9e3436')=>{T.hooks.flag=p(a,b,z);L([a,b,0],[a,b,z],'#7b827c');const q=p(a,b,z);f([q,[q[0]+Math.max(5,n*3),q[1]+1],[q[0]+Math.max(5,n*3),q[1]+5],[q[0],q[1]+4]],c);};
  const pool=(a,b,c,d,lanes=0)=>{B(a-.023,b-.023,c+.046,d+.046,2,stone);f(T.quad(a*n,b*n,c*n,d*n,2.05),W?'#a6c0c6':'#426f83');const e=Math.min(.024,c*.08,d*.08);f(T.quad((a+e)*n,(b+e)*n,(c-2*e)*n,(d-2*e)*n,2.1),W?'#bad0d1':'#6095a8');L([a,b,2.2],[a+c,b,2.2],W?'#d8e4dd':'#789eaa');L([a,b+d,2.2],[a+c,b+d,2.2],W?'#e3e9e0':'#d3c8ad',2);for(let i=1;i<=lanes;i++){const x=a+c*i/(lanes+1);L([x,b+.025,2.2],[x,b+d-.025,2.2],W?'#dce8df':'#b8c9bd');L([x-.013,b+.035,2.2],[x+.013,b+.035,2.2],'#355d71');L([x-.013,b+d-.035,2.2],[x+.013,b+d-.035,2.2],'#355d71');}for(const x of[a+c*.16,a+c*.16+.025]){L([x,b+d-.035,2],[x,b+d-.035,7],'#92aaa5');L([x,b+d-.035,7],[x,b+d+.012,7],'#c8d4c7');L([x,b+d+.012,7],[x,b+d+.012,2],'#657e7b');}for(let j=1;j<3;j++)L([a+c*.16,b+d-.035,j*2],[a+c*.16+.025,b+d-.035,j*2],'#c6d1bf');};
  const court=(a,b,c,d,type='tennis')=>{const basket=type==='basket',outer=basket?'#9b765c':'#688372',inner=basket?'#b08b6a':'#5a786c';g(a-.025,b-.025,c+.05,d+.05,W?'#cfd8ce':'#a99e85');g(a,b,c,d,W?'#b8c7c0':outer);g(a+c*.12,b+d*.12,c*.76,d*.76,W?'#c4d1c8':inner);const q=[p(a+.02,b+.02,.4),p(a+c-.02,b+.02,.4),p(a+c-.02,b+d-.02,.4),p(a+.02,b+d-.02,.4)];outline(q,'#d7d9bd');L([a+.02,b+d/2,.4],[a+c-.02,b+d/2,.4],'#d7d9bd');if(!basket){L([a+c*.18,b+.02,.4],[a+c*.18,b+d-.02,.4],'#d7d9bd');L([a+c*.82,b+.02,.4],[a+c*.82,b+d-.02,.4],'#d7d9bd');for(const y of[b+d*.26,b+d*.74])L([a+c*.18,y,.4],[a+c*.82,y,.4],'#d7d9bd');L([a+c/2,b+d*.26,.4],[a+c/2,b+d*.74,.4],'#d7d9bd');f([p(a,b+d/2,1),p(a+c,b+d/2,1),p(a+c,b+d/2,5),p(a,b+d/2,5)],'#455e57');L([a,b+d/2,5],[a+c,b+d/2,5],'#c8cfb6');for(const x of[a,a+c])L([x,b+d/2,0],[x,b+d/2,6],'#344c49',2);}else{outline(ring(a+c/2,b+d/2,c*.13,c*.13,.5,W?'#c4d1c8':inner,16),'#d7d9bd');for(const y of[b+.025,b+d-.025]){const yy=y<b+d/2?y+d*.2:y-d*.2;f([p(a+c*.3,y,.45),p(a+c*.7,y,.45),p(a+c*.7,yy,.45),p(a+c*.3,yy,.45)],W?'#aabbae':'#9c7459');L([a+c*.3,y,.5],[a+c*.3,yy,.5],'#d7d9bd');L([a+c*.7,y,.5],[a+c*.7,yy,.5],'#d7d9bd');L([a+c*.3,yy,.5],[a+c*.7,yy,.5],'#d7d9bd');L([a+c/2,y,0],[a+c/2,y,12],'#4a6160',2);const q0=p(a+c/2,y,12);K.px(q0[0]-4,q0[1]-3,'#c7cebf',8,5);K.px(q0[0]-2,q0[1]-1,'#69827b',4,2);K.px(q0[0]-2,q0[1]+2,'#a9533e',5,1);}}};
  const grave=(a,b,kind=0)=>{B(a,b,.05,.095,1,stone);if(kind===1){B(a+.02,b,.015,.025,8,stone);B(a+.004,b,.047,.025,2,stone,5);}else{B(a,b,.05,.025,kind===2?6:4,stone);if(kind===2)pyramid(a,b,.05,.025,6,2,'#b4aa90');if(n>=2){L([a+.013,b+.026,3],[a+.039,b+.026,3],'#7b8172');L([a+.017,b+.026,2],[a+.034,b+.026,2],'#a5997c');}}};
  const graves=(a,b,cols,rows,step=.1)=>{for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)grave(a+i*step,b+j*step,(i+j+V)%3);};
  const edge=()=>{fence(.025,.025,.95,.95);};
  return {T,K,n,V,W,sea,stone,brick,iron,p,f,l,L,H,g,B,home,tree,fence,hedge,lamp,sign,path,lawn,ring,outline,ellipse,cyl,pyramid,dome,window,clock,arch,canopy,bench,flag,pool,court,grave,graves,edge};
}
/* 每族在自己的立面與地腳補筆，不用全圖噪點或染色代替建築細節。 */
function civicDetail634(T){
  const C=civicKit634(T),{K,V,n,W,p,f,l,L,B,H,stone,brick,iron}=C;
  const panel=(a,b,z,w,h,col)=>f([p(a,b,z),p(a+w,b,z),p(a+w,b,z+h),p(a,b,z+h)],col);
  const steps=(a,b,w,d=.075,count=3)=>{for(let i=0;i<count;i++){const q=.008*i;B(a+q,b+i*d/count,w-q*2,d/count,Math.max(1,count-i),stone);L([a+q,b+(i+1)*d/count,Math.max(1,count-i)],[a+w-q,b+(i+1)*d/count,Math.max(1,count-i)],W?'#e8eee7':'#b5aa91');}};
  const door=(a,b,w=.08,h=10,col='#354f48')=>{panel(a-.009,b,0,w+.018,h+1,'#897f6a');panel(a,b,0,w,h,'#253b3c');panel(a+.009,b+.002,.5,w-.018,h-1,col);L([a+w*.5,b+.004,1],[a+w*.5,b+.004,h-1],'#5a7067');L([a+.015,b+.004,h*.7],[a+w-.015,b+.004,h*.7],'#798c7e');const q=p(a+w*.72,b+.005,4);K.px(q[0],q[1],'#cfad67',1,2);};
  const rail=(a,b,c,d,z,h=5)=>{for(const[a0,b0,a1,b1]of[[a,b+d,a+c,b+d],[a+c,b,a+c,b+d]]){L([a0,b0,z+h],[a1,b1,z+h],'#485d56');L([a0,b0,z+1],[a1,b1,z+1],'#849083');const count=Math.max(2,Math.ceil((Math.abs(a1-a0)+Math.abs(b1-b0))*n*8));for(let i=0;i<=count;i++){const t=i/count;L([a0+(a1-a0)*t,b0+(b1-b0)*t,z],[a0+(a1-a0)*t,b0+(b1-b0)*t,z+h],'#43574f');}}};
  const circleRail=(a,b,r,z,h=5)=>{const qs=[],count=Math.max(8,Math.min(16,Math.ceil(r*n*18)));for(let i=0;i<count;i++){const t=i*Math.PI*2/count,x=a+r*Math.cos(t),y=b+r*Math.sin(t);qs.push(p(x,y,z+h));L([x,y,z],[x,y,z+h],'#435852');}C.outline(qs,'#76877c');};
  const ladder=(a,b,z,h,w=.05)=>{for(const x of[a,a+w])L([x,b,z],[x,b,z+h],'#9faea1');for(let zz=z+3;zz<z+h;zz+=4)L([a,b,zz],[a+w,b,zz],'#d0d7c3');};
  const planter=(a,b,r=.045)=>{C.cyl(a,b,r,4,{left:'#a97851',right:'#79523e',top:W?'#dfe6dc':'#6a6243'});C.ellipse(a,b,6,Math.max(2,r*n*29),Math.max(1,r*n*15),W?'#e7ece3':T.sea===2?'#a7834b':'#788b51');};
  const plaque=(a,b,z,w=.095)=>{panel(a,b,z,w,6,'#8f8b72');panel(a+.008,b+.001,z+1,w-.016,4,'#41594f');for(let i=0;i<2;i++)L([a+w*.2,b+.003,z+2+i],[a+w*.78,b+.003,z+2+i],'#cfc59d');};
  const rose=(a,b,z,r=4)=>{C.ellipse(a,b,z,r+2,r+2,'#9d947f');C.ellipse(a,b,z,r+1,r+1,'#394a47');C.ellipse(a,b,z,r,r,'#567780');const q=p(a,b,z);for(let i=0;i<8;i++){const t=i*Math.PI/4;l(q,[q[0]+Math.cos(t)*r,q[1]+Math.sin(t)*r],'#cbb995');}T.LIT(q[0],q[1],1,1,'#d4bb78','#eed29b');};
  switch(T.k){
    case 9:
      if(V===0){door(.46,.945,.09,9);steps(.425,.944,.165,.04,2);for(const a of[.052,.872])for(let j=0;j<6;j++)L([a,.25+j*.08,5],[a+.063,.25+j*.08,5],'#ddd0ad');rail(.21,.832,.55,.07,H(9,1)+4,4);}
      else if(V===1){door(.46,.207,.09,10);steps(.41,.22,.18);plaque(.81,.875,8,.075);for(let i=0;i<4;i++)B(.075,.3+i*.13,.06,.055,2,stone);}
      else{door(.365,.205,.09,10);steps(.335,.215,.155);rail(.17,.08,.48,.11,H(12,2)+1,4);for(const a of[.468,.49,.512])L([a,.385,0],[a,.385,5],'#e5dbc0');}
      break;
    case 16:
      if(V===0){door(.22,.342,.08,10);steps(.185,.35,.145);rose(.26,.342,H(14,2)+3,3);}
      else if(V===1){rail(.425,.183,.145,0,0,9);steps(.405,.195,.19,.055,2);}
      else{door(.69,.332,.09,9);steps(.66,.34,.15);}
      break;
    case 24:
      if(V===0){door(.47,.545,.08,13);steps(.425,.57,.18,.09,4);plaque(.22,.75,9);}
      else if(V===1){for(const a of[.3,.43,.57,.68]){panel(a,.704,H(20,2),.025,8,'#3b4d4b');L([a-.01,.705,H(20,2)+7],[a+.035,.705,H(20,2)+7],'#e3d2ad');}steps(.38,.79,.25,.075,3);}
      else{for(let i=0;i<7;i++){const a=.18+i*.105;B(a-.012,.615,.059,.11,2,stone);B(a-.012,.615,.059,.11,2,stone,H(17,2)-2);}steps(.32,.83,.37,.08,4);}
      break;
    case 31:
      rail(.405,.973,.19,0,0,13);for(const a of[.075,.867]){ladder(a,.965,1,H(18,2),.035);plaque(a,.969,H(15,1),.055);}L([.03,.974,H(9,1)+1],[.34,.974,H(9,1)+1],'#606e64');L([.66,.974,H(9,1)+1],[.97,.974,H(9,1)+1],'#606e64');break;
    case 45:
      if(V===0){door(.46,.562,.08,12);steps(.425,.58,.16);C.window(.28,.633,H(15,1),4,6);}
      else if(V===1){door(.46,.656,.08,10);steps(.415,.67,.18);rail(.39,.42,.21,.24,H(9,1)+1,4);}
      else{door(.31,.473,.08,12);steps(.275,.49,.155);plaque(.64,.694,9,.12);}
      planter(.14,.82);planter(.85,.81);break;
    case 54:
      C.arch(.395,.895,.21,.045,12,stone);rail(.43,.944,.135,0,0,7);steps(.42,.948,.15,.037,2);for(const a of[.1,.83])plaque(a,.575,1,.07);break;
    case 67:
      door(V===1?.455:.46,V===1?.525:.655,.085,11);steps(.405,V===1?.57:.72,.2,.09,3);plaque(.34,.8,1,.085);break;
    case 68:{
      const domes=V===0?[[.48,.36,.23,H(27,2)]]:V===1?[[.27,.3,.17,H(24,2)],[.73,.32,.14,H(19,2)]]:[[.64,.35,.24,H(21,2)]];
      for(const[a,b,r,h]of domes){for(let i=0;i<4;i++){const t=.14+i*.43;C.window(a+r*Math.cos(t),b+r*Math.sin(t),h-5,Math.max(2,Math.min(4,n)),6);}circleRail(a,b,r+.015,h-1,4);}
      if(V===0){door(.47,.605,.08,10);steps(.425,.625,.17);}else if(V===1){door(.46,.745,.08,10);steps(.425,.76,.16);}else{door(.2,.704,.08,10);steps(.175,.73,.15);}break;}
    case 69:{const a=V===1?.68:.5,b=V===1?.39:.44,z=V===0?39:37;circleRail(a,b,.225,z+3,4);ladder(a+.06,b+.135,9,z-9,.035);door(a-.025,b+.2,.065,9);plaque(.285,.805,0,.14);break;}
    case 70:door(.455,V===1?.7:.674,.075,9);steps(.4,.77,.18,.08,3);for(const a of[.16,.78])B(a,.77,.045,.045,3,stone);break;
    case 71:
      if(V===0){for(let i=0;i<16;i++){const t=i*Math.PI/8;L([.5+.29*Math.cos(t),.48+.29*Math.sin(t),4],[.5+.33*Math.cos(t),.48+.33*Math.sin(t),4],'#8e8d76');}C.cyl(.5,.48,.03,2,iron,27);}
      else if(V===1){for(const a of[.27,.73])for(let i=0;i<8;i++){const t=i*Math.PI/4;L([a+.18*Math.cos(t),.48+.18*Math.sin(t),3],[a+.21*Math.cos(t),.48+.21*Math.sin(t),3],'#8a8a76');}}
      else{for(let i=0;i<8;i++)L([.16+i*.08,.585,2],[.16+i*.08,.606,2],'#938d75');}planter(.13,.13);planter(.84,.75);break;
    case 72:plaque(.43,.722,8,.145);for(const a of[.31,.62])B(a,.78,.075,.045,1,{left:'#8e8760',right:'#726b4c',top:'#9d8157'});steps(.36,.82,.29,.1,3);break;
    case 73:
      if(V===0){rail(.25,.25,.5,.5,H(39,2)+4,6);ladder(.465,.66,0,H(39,2),.05);}
      else if(V===1){door(.45,.712,.1,12);steps(.4,.74,.19);plaque(.36,.713,H(20,1),.08);}
      else{circleRail(.5,.46,.26,H(39,2)+8,6);door(.43,.674,.08,10);steps(.385,.7,.175);}break;
    case 74:
      if(V===1){rail(.17,.27,.64,.38,3,6);steps(.37,.69,.23,.09,3);}else{circleRail(.5,.45,V===0?.32:.31,4,5);steps(.39,.76,.2,.08,3);}break;
    case 75:steps(V===1?.32:.32,V===1?.68:.68,.36,.14,4);for(const a of[.14,.82])B(a,.82,.055,.065,3,stone);if(V===0)plaque(.39,.66,H(40,3),.19);break;
    case 76:{const q=T.hooks.wheel;if(q){const count=V===0?12:V===1?10:16;for(let i=0;i<count;i++){const t=i*Math.PI*2/count,x=q[0]+q[2]*Math.cos(t),y=q[1]+q[3]*Math.sin(t);K.px(x-4,y,'#5b695e',9,1);K.px(x-3,y+5,'#c6ad79',7,1);if(i%2===0)T.LIT(x-1,y+2,2,2,'#b8c2ac','#f2d39d');}}rail(.21,.83,.59,.035,0,5);break;}
    case 77:
      if(V===0){ladder(.66,.6,1,27,.04);door(.46,.697,.075,10);C.cyl(.5,.43,.275,2,stone,26);}
      else if(V===1){ladder(.69,.64,0,43,.04);circleRail(.5,.445,.33,44,4);}else{door(.445,.679,.08,12);steps(.39,.73,.19);plaque(.29,.679,18,.09);}break;
    case 78:
      for(const q of(V===2?[[.43,.45,.31,.42,27],[.54,.52,.68,.55,30]]:[[.51,.5,.48,.5,25]])){L([q[0]-.015,q[1],2],[q[2]-.01,q[3],q[4]],'#b0a076');L([q[0]+.015,q[1],3],[q[2]+.01,q[3],q[4]-3],'#4e4c36');}for(const q of[[.29,.66],[.69,.67],[.5,.81]])L([.5,.5,4],[q[0],q[1],0],'#958360',2);break;
    case 79:
      for(const[a,b]of(V===0?[[.23,.72],[.76,.72]]:V===1?[[.12,.67],[.88,.67]]:[[.19,.76],[.81,.76]])){L([a,b,2],[a,b,-3],'#6f5941',3);C.cyl(a,b,.021,5,iron);C.ellipse(a,b,5,2,1,'#d2c5a1');}if(V===1)door(.33,.665,.08,9);break;
    case 80:{const h=V===1?33:27,r=V===2?.36:.33;for(let i=0;i<12;i++){const t=i*Math.PI/6,q=p(.5+r*Math.cos(t),.49+r*Math.sin(t),h);K.px(q[0]-1,q[1],'#d8bc7d',3,2);if(i%3===0)T.LIT(q[0],q[1]+1,1,1,'#e8d7a6','#f8dc9b');}steps(.37,.84,.24,.08,3);break;}
    case 82:
      if(V===0){door(.46,.665,.1,12);steps(.385,.78,.28,.11,4);for(const a of[.35,.7])planter(a,.8,.045);}
      else if(V===1){steps(.445,.655,.22,.095,3);door(.685,.595,.085,12);planter(.56,.71);planter(.8,.77);}
      else{rail(.425,.818,.17,0,0,7);steps(.4,.84,.23,.085,3);planter(.28,.8);planter(.77,.8);}break;
    case 83:
      if(V===0){door(.46,.325,.09,12);steps(.415,.355,.18,.055,3);rail(.34,.795,.31,.045,0,5);}else if(V===1){door(.285,.405,.095,12);steps(.245,.43,.18);planter(.59,.49);planter(.85,.59);}else{door(.465,.295,.09,12);steps(.42,.315,.18,.055,3);rail(.34,.85,.33,.025,0,5);}break;
    case 86:
      if(V===0){for(let i=0;i<5;i++){const a=.23+i*.125;B(a-.013,.578,.071,.105,2,stone);B(a-.013,.578,.071,.105,2,stone,H(21,2)-2);}door(.46,.587,.11,14);}
      else if(V===1){door(.23,.66,.12,13);steps(.2,.675,.185,.09,4);plaque(.62,.615,14,.09);}else{door(.45,.775,.11,13);steps(.39,.8,.23,.09,4);plaque(.25,.665,14,.08);}break;
    case 90:{const pts=V===0?[[.305,.43],[.635,.6],[.875,.8]]:V===1?[[.25,.355],[.73,.595],[.82,.83]]:[[.495,.76],[.23,.57],[.76,.57]];for(const[a,b]of pts){C.cyl(a,b,.018,4,iron,3);const q=p(a,b,8);K.px(q[0]-2,q[1],'#b5bfb0',5,1);}const q=p(.12,.19,10);C.ellipse(.12,.19,10,4,4,'#d7c29a');C.ellipse(.12,.19,10,2,2,'#a3523c');break;}
    case 93:for(const a of[.12,.88]){B(a,.91,.035,.035,3,stone);L([a,.91,3],[a,.91,17],'#425a56');}panel(.12,.91,12,.76,6,'#496966');for(const a of[.22,.65])plaque(a,.914,12,.12);break;
    case 94:
      if(V===0){C.outline(C.ring(.45,.43,.262,.256,1,'#00000000'),'#d6dbc9');rail(.68,.61,.2,.18,12,4);}else if(V===1){rail(.13,.43,.3,0,16,5);rail(.56,.34,.29,0,16,5);}else{rail(.24,.61,.35,.02,5,5);for(let i=0;i<5;i++)L([.16+i*.045,.425,2+i*2],[.205+i*.045,.425,2+i*2],'#e4dfc4');}break;
    case 96:
      B(.085,.8,.075,.06,2,stone);ladder(.097,.85,0,15,.045);panel(.09,.8,12,.07,3,'#bdae7f');rail(.09,.79,.07,.05,15,4);planter(.88,.11);break;
    case 98:
      for(let i=0;i<3;i++){const a=.46+i*.12,b=.85,q=p(a,b,3);C.ellipse(a,b,3,3,3,'#40584f');C.ellipse(a,b,3,2,2,'#beb697');l([q[0],q[1]],[q[0]+5,q[1]-4],'#8a6450');l([q[0]+5,q[1]-4],[q[0]+8,q[1]],'#8a6450');l([q[0]+4,q[1]-5],[q[0]+7,q[1]-5],'#394d48');}steps(.21,V===0?.72:V===1?.79:.665,.15,.055,3);break;
    case 99:
      if(V===0){rose(.51,.645,H(26,2),4);door(.51,.724,.09,12);steps(.455,.75,.18,.07,4);}else if(V===1){rose(.49,.704,H(23,2),4);door(.39,.705,.09,11);steps(.36,.73,.16,.065,3);}else{rose(.57,.576,H(26,3),5);door(.555,.657,.095,12);steps(.515,.68,.17);}break;
    case 101:
      if(V===0)ladder(.155,.315,0,H(30,2),.07);else if(V===1)ladder(.745,.285,0,H(32,2),.065);else ladder(.63,.285,0,H(28,2),.075);C.arch(.39,.88,.23,.055,11,stone);rail(.43,.94,.15,0,0,6);break;
    case 103:
      if(V===0){circleRail(.5,.455,.34,H(39,4),6);door(.44,.64,.09,12);steps(.4,.685,.18,.09,4);}else if(V===1){rail(.23,.26,.5,.34,H(39,4)+9,5);door(.44,.68,.09,12);steps(.395,.84,.2,.065,3);}else{rail(.14,.26,.75,.47,H(39,4),5);steps(.4,.69,.18,.09,4);}break;
    case 107:{const q=V===0?[.77,.17,H(38,3)]:V===1?[.83,.16,H(33,2)]:[.13,.13,H(43,2)];f(T.quad((q[0]+.017)*n,(q[1]+.017)*n,.05*n,.05*n,q[2]+3),'#3e443b');if(V===0){door(.335,.648,.09,11);steps(.3,.75,.16);}else if(V===1){door(.445,.655,.09,12);steps(.405,.705,.17);}else{door(.225,.675,.09,11);steps(.19,.7,.165);}break;}
    case 112:
      if(V===0){for(const a of[.12,.68])for(const b of[.11,.64])rail(a,b,.2,.18,0,3);steps(.44,.615,.13,.065,3);}else if(V===1){rail(.655,.36,.07,.17,3,4);door(.735,.305,.075,10);steps(.7,.325,.145);}else{door(.24,.393,.08,10);steps(.21,.405,.145);rail(.64,.7,.17,.14,0,5);}break;
    case 115:
      if(V===0){steps(.35,.49,.29,.11,4);door(.44,.36,.115,13);for(let i=0;i<5;i++)B(.342+i*.072,.365,.044,.097,2,stone,13);}else if(V===1){door(.455,.546,.1,12);steps(.42,.565,.175);}else{door(.69,.784,.09,11);steps(.665,.8,.145);}planter(.2,.85,.045);planter(.81,.86,.045);break;
    case 124:for(const a of[.36,.57]){B(a,.92,.06,.025,5,{left:'#a2764a',right:'#75543d',top:'#c4a571'});L([a,.925,3],[a+.06,.925,3],'#d4c3a0');}plaque(.42,.105,1,.15);break;
    case 125:if(V===2){door(.16,.555,.07,10);steps(.13,.57,.13,.035,2);}else{C.bench(.32,.94);C.bench(.56,.94);}B(.81,.095,.07,.05,6,{left:'#687e5b',right:'#45594d',top:'#a2aa86'});break;
    case 126:
      if(V===0){rail(.61,.25,.18,.18,15,5);ladder(.65,.28,0,15,.05);}else if(V===1){rail(.19,.32,.35,.2,7,4);for(const a of[.26,.38,.5]){const q=p(a,.575,5);C.ellipse(a,.575,5,2,2,'#ddd0a8');C.ellipse(a,.575,5,1,1,'#695b43');}}else{for(const q of[[.2,.22],[.65,.22],[.2,.61]])rail(q[0],q[1],.15,.15,17,4);}break;
    case 127:if(V===0){C.arch(.415,.85,.17,.04,11,brick);rail(.45,.892,.105,0,0,6);}else if(V===1){steps(.425,.825,.15,.06,3);plaque(.745,.825,9,.07);}else{steps(.43,.815,.15,.065,3);door(.46,.282,.065,10);}break;
    case 132:{const q=V===0?[.11,.62]:V===1?[.71,.68]:[.68,.14],a=q[0],b=q[1];panel(a+.025,b+.096,2,.07,4,'#486554');L([a+.04,b+.098,4],[a+.08,b+.098,4],'#e8dfc0',2);L([a+.06,b+.098,2],[a+.06,b+.098,6],'#e8dfc0');L([a+.15,b+.06,1],[a+.19,b+.06,1],'#9daca2',2);ladder(a+.19,b+.075,0,9,.025);break;}
  }
}
const CIVIC634={
  9:{name:'英式球場與看台',draw(T){
    const C=civicKit634(T),{V,n,p,f,l,L,B,home,ring,outline,H,stone,brick,lawn,flag,lamp}=C;lawn();
    if(V===0){
      C.g(.2,.2,.59,.56,'#62814e');for(let i=0;i<6;i++)C.g(.2+i*.098,.2,.049,.56,'#6b8953');
      outline([p(.23,.23),p(.76,.23),p(.76,.73),p(.23,.73)],'#e5dfbe');L([.23,.48,0],[.76,.48,0],'#e5dfbe');outline(ring(.495,.48,.072,.072,.2,'#62814e'),'#e5dfbe');
      for(const y of [.22,.73]){L([.43,y,0],[.43,y,8],'#e7e3cb');L([.56,y,0],[.56,y,8],'#e7e3cb');L([.43,y,8],[.56,y,8],'#e7e3cb');}
      home(.11,.03,.76,.13,H(11,1),{roof:'gable',floors:1,chimney:false,sign:'TOWN FC'});B(.035,.21,.12,.56,H(8,1),brick);B(.84,.21,.12,.56,H(8,1),brick);
      for(let i=0;i<4;i++){L([.05+i*.026,.24,4+i*2],[.05+i*.026,.74,4+i*2],'#c1ada1',2);L([.85+i*.026,.24,10-i*2],[.85+i*.026,.74,10-i*2],'#c1ada1',2);}
      home(.18,.83,.63,.11,H(9,1),{roof:'gable',floors:1,chimney:false});
    }else if(V===1){
      ring(.5,.52,.43,.39,0,'#a36c50');ring(.5,.52,.33,.28,.2,'#70925b');for(let i=0;i<3;i++)outline(ring(.5,.52,.36+i*.024,.3+i*.024,.3,'#00000000'),'#dfcaae');
      home(.15,.045,.66,.16,H(13,1),{roof:'gable',floors:1,chimney:false});C.sign(.48,.22,11,'ATHLETICS');
      for(let i=0;i<5;i++)L([.08,.29+i*.09,4],[.14,.29+i*.09,4],'#c2b193',2);B(.79,.74,.13,.13,H(20,1),brick);C.clock(.86,.88,H(15,1),4);
    }else{
      ring(.49,.53,.44,.41,0,'#739052');C.g(.455,.37,.075,.29,'#cbbb91');outline(ring(.49,.53,.4,.36,.4,'#00000000'),'#dbddbc');
      home(.13,.04,.57,.16,H(12,2),{roof:'hip',floors:1,chimney:true,porch:true});home(.05,.11,.14,.22,H(18,1),{roof:'gable',floors:2,chimney:false});
      C.canopy(.72,.08,.2,.22,H(13,1));for(let j=0;j<3;j++)C.bench(.73,.47+j*.13);C.sign(.38,.235,8,'CRICKET');
    }
    for(const q of [[.07,.09],[.93,.09],[.07,.91],[.93,.91]])lamp(q[0],q[1],H(28,2));flag(.87,.13,H(26,1));
    civicDetail634(T);
  }},
  16:{name:'英式教區墓園',draw(T){
    const C=civicKit634(T),{V,home,lawn,path,graves,grave,tree,H,stone}=C;lawn();
    if(V===0){home(.1,.1,.32,.24,H(14,2),{stone:true,roof:'gable',floors:1,chimney:false});C.B(.13,.12,.12,.13,H(25,2),stone);C.pyramid(.13,.12,.12,.13,H(25,2),13);path(.47,.06,.08,.88);graves(.63,.16,3,4,.105);graves(.1,.48,3,3,.1);}
    else if(V===1){C.arch(.33,.06,.34,.12,H(20,2),stone);C.window(.365,.18,H(15,1),2,4);path(.46,.2,.08,.72);graves(.13,.27,3,5,.11);graves(.63,.27,3,5,.11);C.cyl(.5,.76,.1,8,stone);C.tree(.12,.13,.095);C.tree(.84,.13,.095);}
    else{path(.12,.55,.76,.07);home(.59,.1,.29,.23,H(12,1),{stone:true,roof:'hip',floors:1,chimney:false});for(let i=0;i<7;i++)grave(.1+i*.105,.76,i%3);graves(.13,.18,3,2,.13);tree(.48,.24,.12);tree(.78,.48,.095);}
    C.edge();tree(.12,.88,.06);tree(.86,.86,.06);C.sign(.44,.97,5,'CHURCHYARD');
    civicDetail634(T);
  }},
  24:{name:'英倫歷史地標',draw(T){
    const C=civicKit634(T),{V,B,home,H,stone,brick,path,lawn}=C;lawn();path(.1,.1,.8,.8);
    if(V===0){home(.15,.31,.7,.26,H(24,3),{stone:true,roof:'hip',floors:2,chimney:true});B(.41,.27,.2,.27,H(52,4),brick);C.clock(.51,.545,H(42,3),5);C.pyramid(.39,.25,.24,.31,H(52,4),15);home(.09,.45,.2,.3,H(21,2),{stone:true,roof:'hip',floors:2});home(.72,.45,.2,.3,H(21,2),{stone:true,roof:'hip',floors:2});}
    else if(V===1){B(.22,.2,.55,.5,H(30,3),stone);for(const q of [[.2,.18],[.68,.18],[.2,.63],[.68,.63]]){B(q[0],q[1],.15,.15,H(43,4),stone);for(let i=0;i<3;i++)B(q[0]+i*.052,q[1]+.11,.03,.04,4,stone,H(43,4));}C.arch(.38,.705,.25,.075,H(18,1),stone);for(let i=0;i<4;i++)C.window(.29+i*.12,.706,H(24,2),3,7);}
    else{C.cyl(.5,.4,.26,H(23,3),stone);C.dome(.5,.4,.28,H(23,3),H(20,2));for(let i=0;i<7;i++){const a=.18+i*.105;B(a,.62,.035,.1,H(17,2),stone);}C.pyramid(.13,.61,.75,.19,H(18,2),9,'#af9e7e');C.arch(.35,.75,.3,.08,H(15,1),stone);}
    C.flag(.51,.45,H(74,2));C.lamp(.12,.87,17);C.lamp(.89,.87,17);
    civicDetail634(T);
  }},
  31:{name:'維多利亞監獄',draw(T){
    const C=civicKit634(T),{V,B,home,H,stone,brick,path}=C;path(0,0,1,1);
    if(V===0){home(.21,.15,.57,.18,H(24,3),{roof:'gable',floors:3,chimney:true});home(.38,.3,.2,.45,H(25,3),{roof:'gable',floors:3,chimney:false});home(.12,.42,.76,.17,H(23,3),{roof:'gable',floors:3,chimney:true});}
    else if(V===1){home(.15,.15,.68,.16,H(25,3),{roof:'hip',floors:3});home(.15,.33,.17,.42,H(21,3),{roof:'gable',floors:3});home(.66,.33,.17,.42,H(21,3),{roof:'gable',floors:3});C.court(.37,.38,.23,.29,'basket');}
    else{home(.17,.17,.25,.58,H(29,3),{roof:'gable',floors:3});home(.58,.17,.25,.58,H(29,3),{roof:'gable',floors:3});C.canopy(.41,.31,.18,.11,H(15,2));C.B(.44,.55,.1,.12,7,stone);}
    for(const q of [[.025,.025,.95,.035],[.025,.025,.035,.95],[.94,.025,.035,.95],[.025,.94,.34,.035],[.65,.94,.325,.035]])B(...q,H(9,1),brick);
    for(const q of [[.04,.04],[.83,.04],[.04,.83],[.83,.83]]){B(q[0],q[1],.12,.12,H(21,2),stone);C.pyramid(q[0]-.01,q[1]-.01,.14,.14,H(21,2),6);C.window(q[0]+.06,q[1]+.12,H(18,2),4,3);}
    C.arch(.355,.9,.3,.095,H(15,1),stone);C.fence(.41,.92,.18,.01);C.sign(.43,.999,H(16,1),'HMP');
    civicDetail634(T);
  }},
  45:{name:'英式科研學院',draw(T){
    const C=civicKit634(T),{V,home,H,path,lawn}=C;lawn();path(.06,.12,.89,.78);
    if(V===0){home(.1,.17,.27,.46,H(21,3),{stone:true,roof:'gable',floors:2});home(.63,.17,.27,.46,H(21,3),{stone:true,roof:'gable',floors:2});home(.35,.36,.3,.2,H(25,3),{stone:true,roof:'flat',floors:2,chimney:false});C.dome(.5,.45,.16,H(25,3),15);C.canopy(.33,.25,.36,.07,10,'#82999a');}
    else if(V===1){home(.13,.12,.72,.19,H(25,2),{roof:'gable',floors:3});home(.13,.34,.19,.37,H(20,2),{roof:'gable',floors:2});home(.67,.34,.19,.37,H(20,2),{roof:'gable',floors:2});C.B(.4,.41,.19,.24,H(9,1),{left:'#86a2a5',right:'#557177',top:'#bdced0'});for(let i=0;i<4;i++)C.L([.4+i*.064,.41,H(10,1)],[.4+i*.064,.65,H(10,1)],'#d2ddd6');}
    else{home(.08,.2,.56,.27,H(32,3),{stone:true,roof:'hip',floors:3});home(.52,.5,.36,.19,H(17,2),{roof:'gable',floors:2});C.cyl(.78,.25,.14,H(17,2),C.brick);C.dome(.78,.25,.15,H(17,2),14,true);C.B(.2,.61,.17,.14,9,C.stone);C.K.tank(.29*T.n,.68*T.n,.065*T.n,15,'#849ba0');}
    C.sign(.43,.83,9,'RESEARCH');C.tree(.1,.84,.075);C.tree(.86,.84,.075);C.lamp(.69,.82,17);
    civicDetail634(T);
  }},
  54:{name:'英式大墓園',draw(T){
    const C=civicKit634(T),{V,home,H,graves,lawn,path,tree,stone}=C;lawn();path(.455,.05,.09,.92);path(.08,.52,.84,.065);
    if(V===0){home(.33,.1,.34,.22,H(22,3),{stone:true,roof:'gable',floors:2,chimney:false});C.B(.43,.09,.13,.14,H(37,3),stone);C.pyramid(.43,.09,.13,.14,H(37,3),13);graves(.1,.15,3,3,.1);graves(.66,.15,3,3,.1);graves(.1,.63,3,3,.1);graves(.66,.63,3,3,.1);}
    else if(V===1){for(let i=0;i<5;i++){const a=.13+i*.16;home(a,.11+Math.abs(2-i)*.055,.13,.13,H(10,1),{stone:true,roof:'hip',floors:1,chimney:false});}C.cyl(.5,.42,.08,H(15,1),stone);graves(.12,.46,3,4,.1);graves(.66,.46,3,4,.1);C.arch(.39,.84,.23,.08,H(14,1),stone);}
    else{home(.17,.14,.24,.44,H(19,3),{stone:true,roof:'gable',floors:2,chimney:false});home(.08,.29,.43,.14,H(15,2),{stone:true,roof:'gable',floors:1,chimney:false});graves(.62,.15,3,6,.105);graves(.12,.69,4,2,.085);C.ring(.5,.68,.09,.09,0,'#b3a483');C.grave(.48,.65,1);}
    for(let i=0;i<6;i++){tree(.045,.09+i*.155,.055);tree(.955,.09+i*.155,.055);}C.edge();C.sign(.45,.96,8,'MEMORIAL');
    civicDetail634(T);
  }},
  67:{name:'英式市集鐘樓',draw(T){
    const C=civicKit634(T),{V,B,H,stone,brick,home}=C;C.path(0,0,1,1);
    if(V===0){B(.25,.25,.5,.4,34,brick);B(.2,.22,.6,.46,4,stone);B(.22,.22,.56,.46,3,stone,33);C.clock(.5,.66,27,4.5);C.pyramid(.22,.22,.56,.46,36,12);C.window(.5,.65,17,3,6);C.arch(.32,.64,.34,.08,10,stone);}
    else if(V===1){C.arch(.12,.21,.75,.32,15,stone);B(.29,.25,.42,.33,21,stone,15);B(.26,.23,.48,.37,2,stone,35);C.clock(.51,.59,28,5);C.pyramid(.26,.23,.48,.37,37,10,'#556f70');C.cyl(.5,.43,.035,5,stone,47);}
    else{home(.13,.22,.7,.43,16,{stone:true,roof:'hip',floors:1,chimney:false});B(.36,.24,.32,.34,35,stone);B(.34,.22,.36,.38,2,stone,34);C.clock(.52,.59,28,4.5);C.pyramid(.34,.22,.36,.38,36,17);C.window(.52,.585,17,3,6);}
    C.bench(.13,.8);C.bench(.68,.8);C.lamp(.8,.72,15);
    civicDetail634(T);
  }},
  68:{name:'英式天文台',draw(T){
    const C=civicKit634(T),{V,H,home,cyl,dome,stone,path,lawn}=C;lawn();path(.38,.45,.18,.5);
    if(V===0){home(.15,.34,.69,.26,H(16,2),{stone:true,roof:'flat',floors:1,chimney:false});cyl(.48,.36,.23,H(27,2),stone);dome(.48,.36,.25,H(27,2),H(20,2),true);C.home(.11,.61,.26,.14,H(11,1),{stone:true,roof:'gable',floors:1});}
    else if(V===1){home(.16,.29,.69,.16,H(12,1),{stone:true,roof:'flat',floors:1,chimney:false});for(const q of [[.27,.3,.17,24],[.73,.32,.14,19]]){cyl(q[0],q[1],q[2],H(q[3],2),stone);dome(q[0],q[1],q[2]+.01,H(q[3],2),H(14,1),true);}C.home(.32,.55,.35,.19,H(17,2),{roof:'gable',floors:2});}
    else{home(.09,.24,.31,.46,H(16,1),{roof:'gable',floors:2});cyl(.64,.35,.24,H(21,2),stone);dome(.64,.35,.25,H(21,2),H(19,2),true);C.B(.69,.72,.09,.075,7,stone);const p=C.p(.735,.758,17);C.f([[p[0]-11,p[1]-7],[p[0]-7,p[1]+2],[p[0]+7,p[1]+5],[p[0]+14,p[1]-1],[p[0]+2,p[1]-2]],'#b9c9c5');C.l([p[0]+1,p[1]-1],[p[0]+6,p[1]-12],'#5c7074');}
    C.sign(.45,.89,8,'OBSERVATORY');C.tree(.1,.83,.08);C.tree(.86,.86,.08);C.lamp(.7,.89,16);
    civicDetail634(T);
  }},
  69:{name:'英式海岸燈塔',draw(T){
    const C=civicKit634(T),{V,H,B,cyl,stone,brick,p,L}=C;C.g(0,0,1,1,'#93a297');C.ring(.5,.52,.42,.4,0,'#b6b098');let a=.5,b=.44,z=0;
    if(V===0){cyl(a,b,.22,10,stone);cyl(a,b,.185,15,{...stone,left:'#ad6652',right:'#824d43'},10);cyl(a,b,.16,14,stone,25);z=39;}
    else if(V===1){C.home(.06,.38,.45,.34,16,{stone:true,roof:'gable',floors:1,chimney:true});a=.68;b=.39;B(.53,.24,.3,.3,35,stone);B(.51,.22,.34,.34,3,brick,34);C.window(.68,.545,25,3,7);z=37;}
    else{cyl(a,b,.25,13,brick);cyl(a,b,.195,21,stone,13);cyl(a,b,.225,3,C.iron,34);z=37;C.arch(.33,.62,.34,.1,11,stone);}
    cyl(a,b,.23,3,stone,z);cyl(a,b,.145,9,{left:'#759297',right:'#49656f',top:'#627b7e',edge:'#39464f'},z+3);
    for(let i=0;i<6;i++){const t=i*Math.PI/3;L([a+.145*Math.cos(t),b+.145*Math.sin(t),z+3],[a+.145*Math.cos(t),b+.145*Math.sin(t),z+12],'#39464f');}
    C.pyramid(a-.175,b-.175,.35,.35,z+12,7,'#55636d');const q=p(a,b,z+7);T.LIT(q[0]-3,q[1]-2,6,4,'#c4caaa','#ffe9aa');T.hooks.aviation=p(a,b,z+7);C.fence(.2,.74,.61,.04);
    civicDetail634(T);
  }},
  70:{name:'英式古風車',draw(T){
    const C=civicKit634(T),{V,B,p,f,l,L,stone,brick}=C;C.lawn();let hub,z,rr=23;
    if(V===0){C.cyl(.49,.46,.235,31,stone);C.pyramid(.245,.215,.49,.49,31,10);hub=p(.49,.705,30);z=30;rr=21;C.window(.5,.665,16,4,6);}
    else if(V===1){const lo=[p(.22,.26),p(.78,.26),p(.78,.72),p(.22,.72)],hi=[p(.32,.34,29),p(.67,.34,29),p(.67,.63,29),p(.32,.63,29)];f([lo[3],lo[2],hi[2],hi[3]],'#514d43');f([lo[2],lo[1],hi[1],hi[2]],'#7c7762');for(let h=5;h<29;h+=6)L([.22+h*.0034,.72-h*.0031,h],[.78-h*.0038,.72-h*.0031,h],'#665f4d');C.pyramid(.30,.32,.39,.33,29,11);hub=p(.49,.66,29);z=29;rr=21;C.window(.5,.66,16,3,5);}
    else{for(const a of [.32,.65])L([a,.48,0],[.49,.48,24],'#544b3e',4);C.home(.19,.27,.61,.4,18,{roof:'gable',floors:1,chimney:false,color:'#ad8b67'});B(.37,.35,.23,.23,10,brick,18);hub=p(.5,.68,26);z=26;rr=20;}
    for(let i=0;i<4;i++){const t=Math.PI/4+i*Math.PI/2,dx=Math.cos(t),dy=Math.sin(t),u=[-dy,dx];l([hub[0]-dx*5,hub[1]-dy*5],[hub[0]+dx*rr,hub[1]+dy*rr],'#e0d2ac',2);const q=[6,rr].map(r=>[hub[0]+dx*r,hub[1]+dy*r]);f([[q[0][0]+u[0]*2,q[0][1]+u[1]*2],[q[1][0]+u[0]*2,q[1][1]+u[1]*2],[q[1][0]+u[0]*7,q[1][1]+u[1]*7],[q[0][0]+u[0]*5,q[0][1]+u[1]*5]],'#cbbd99');for(let j=8;j<rr;j+=4)l([hub[0]+dx*j+u[0],hub[1]+dy*j+u[1]],[hub[0]+dx*j+u[0]*7,hub[1]+dy*j+u[1]*7],'#786c54');}
    C.K.px(hub[0]-2,hub[1]-2,'#65513b',5,5);C.path(.43,.75,.15,.2);C.sign(.49,.91,6,'MILL');
    civicDetail634(T);
  }},
  71:{name:'英式噴泉廣場',draw(T){
    const C=civicKit634(T),{V,cyl,stone,p,L}=C;C.path(0,0,1,1);
    if(V===0){cyl(.5,.48,.33,4,stone);C.ring(.5,.48,.29,.29,4,'#659aa9');cyl(.5,.48,.075,14,stone,4);cyl(.5,.48,.17,2,stone,18);C.ring(.5,.48,.14,.14,20,'#87b9c5');cyl(.5,.48,.025,7,stone,20);for(let i=0;i<8;i++){const t=i*Math.PI/4;L([.5,.48,24],[.5+Math.cos(t)*.25,.48+Math.sin(t)*.25,5],'#afdae0');}}
    else if(V===1){for(const a of [.27,.73]){cyl(a,.48,.21,3,stone);C.ring(a,.48,.18,.18,3,'#75a7b3');cyl(a,.48,.045,14,stone,3);for(let j=0;j<5;j++)L([a,.48,21],[a+(j-2)*.06,.57,4],'#bdd8d6');}C.arch(.36,.23,.28,.08,20,stone);}
    else{C.pool(.14,.35,.72,.23);cyl(.5,.47,.07,16,stone,3);C.B(.475,.43,.05,.05,9,stone,19);for(const a of [.24,.36,.64,.76])L([a,.465,2],[a,.465,15],'#c9e5df',2);C.hedge(.12,.18,.75,.06);C.hedge(.12,.73,.75,.06);}
    C.bench(.1,.83);C.bench(.76,.83);C.lamp(.09,.13,17);C.lamp(.91,.13,17);C.tree(.92,.9,.07);
    civicDetail634(T);
  }},
  72:{name:'英式紀念碑',draw(T){
    const C=civicKit634(T),{V,B,stone,H}=C;C.path(0,0,1,1);B(.2,.2,.6,.6,3,stone);B(.28,.28,.44,.44,4,stone,3);
    if(V===0){C.cyl(.5,.5,.14,29,stone,7);C.cyl(.5,.5,.185,3,stone,35);B(.45,.45,.1,.1,9,{left:'#63786a',right:'#3d514b',top:'#849680'},38);C.ellipse(.5,.5,49,3,3,'#637d6b');}
    else if(V===1){const a=C.p(.32,.32,7),b=C.p(.68,.32,7),c=C.p(.68,.68,7),d=C.p(.32,.68,7),t=C.p(.5,.5,49);C.f([a,b,t],'#d4c5a8');C.f([b,c,t],'#a99d86');C.f([c,d,t],'#c6b89e');C.sign(.5,.66,13,'REMEMBER');}
    else{B(.29,.3,.42,.38,26,stone,7);B(.26,.27,.48,.44,3,stone,33);B(.32,.31,.36,.36,7,stone,36);C.sign(.5,.69,21,'PEACE');C.flag(.19,.7,33);C.flag(.81,.7,33);}
    C.ring(.5,.75,.085,.04,8,'#6b7748');for(let i=0;i<5;i++)C.K.px(C.p(.46+i*.023,.76,9)[0],C.p(.46+i*.023,.76,9)[1],'#ad4d40',2,2);C.bench(.09,.9);
    civicDetail634(T);
  }},
  73:{name:'英式觀景塔',draw(T){
    const C=civicKit634(T),{V,B,H,stone,iron,L}=C;C.lawn();C.path(.33,.15,.37,.73);let top=H(39,2);
    if(V===0){for(const q of[[.24,.24],[.76,.24],[.24,.76],[.76,.76]])L([q[0],q[1],0],[.5+(q[0]-.5)*.6,.5+(q[1]-.5)*.6,top],'#394e51',3);for(let z=5;z<top-6;z+=11){const lo=.24+z/top*.104,hi=.76-z/top*.104,up=.24+(z+10)/top*.104,far=.76-(z+10)/top*.104;L([lo,hi,z],[far,far,z+10],'#657d74',2);L([hi,lo,z],[far,far,z+10],'#4e6864',2);}B(.2,.2,.6,.6,4,stone,top);C.canopy(.2,.2,.6,.6,top+12,'#556b6d');}
    else if(V===1){B(.25,.25,.5,.46,top,stone);for(let i=0;i<3;i++){C.window(.5,.72,9+i*10,3,6);B(.23+i*.19,.67,.085,.08,4,stone,top);}B(.23,.23,.54,.5,3,stone,top-3);C.flag(.5,.5,top+16);}
    else{C.home(.13,.23,.74,.45,16,{roof:'hip',floors:1,chimney:false});for(const a of [.35,.65])L([a,.46,16],[a,.46,top],'#39464f',4);for(let z=15;z<top;z+=8){L([.37,.46,z],[.62,.46,z+8],'#859490');L([.62,.46,z],[.37,.46,z+8],'#859490');}C.cyl(.5,.46,.26,8,iron,top);C.dome(.5,.46,.27,top+8,10);}
    C.fence(.25,.25,.5,.5);C.sign(.49,.88,7,'LOOKOUT');C.lamp(.8,.83,15);
    civicDetail634(T);
  }},
  74:{name:'英式公園涼亭',draw(T){
    const C=civicKit634(T),{V,p,L,stone}=C;C.lawn();C.path(.4,.52,.2,.43);
    if(V===0){C.cyl(.5,.45,.38,4,stone);for(let i=0;i<8;i++){const t=i*Math.PI/4,a=.5+.32*Math.cos(t),b=.45+.32*Math.sin(t);L([a,b,4],[a,b,19],'#7d8c7b',2);}C.dome(.5,.45,.39,19,12);C.cyl(.5,.45,.03,5,stone,30);C.fence(.26,.28,.47,.4);}
    else if(V===1){C.B(.14,.24,.7,.44,3,stone);C.canopy(.15,.25,.68,.42,18,'#556b67');C.B(.17,.6,.2,.03,4,stone,3);C.B(.62,.6,.19,.03,4,stone,3);C.bench(.23,.46);C.bench(.65,.46);}
    else{C.cyl(.5,.45,.37,3,stone);for(let i=0;i<6;i++){const t=i*Math.PI/3,a=.5+.31*Math.cos(t),b=.45+.31*Math.sin(t);L([a,b,3],[a,b,20],'#3d5a54',2);}C.pyramid(.15,.1,.7,.7,20,13,'#48665f');for(let i=0;i<3;i++)C.bench(.3+i*.15,.56);}
    C.tree(.11,.8,.075);C.tree(.89,.75,.075);C.lamp(.76,.88,14);
    civicDetail634(T);
  }},
  75:{name:'英式石造凱旋門',draw(T){
    const C=civicKit634(T),{V,stone,B,arch,H}=C;C.path(0,0,1,1);
    if(V===0){arch(.18,.3,.64,.32,H(33,3),stone);B(.14,.27,.72,.38,4,stone,H(33,3));B(.31,.3,.38,.31,9,stone,H(37,3));C.sign(.5,.695,H(26,2),'VICTORIA');}
    else if(V===1){arch(.32,.28,.36,.37,H(38,3),stone);arch(.05,.34,.27,.27,H(24,2),stone);arch(.68,.34,.27,.27,H(24,2),stone);B(.035,.32,.3,.31,3,stone,H(24,2));B(.665,.32,.3,.31,3,stone,H(24,2));C.pyramid(.3,.26,.4,.4,H(39,3),8,'#a28f73');}
    else{arch(.22,.29,.56,.34,H(29,3),stone);for(const a of [.12,.71]){B(a,.25,.17,.43,H(40,3),C.brick);C.pyramid(a-.02,.23,.21,.47,H(40,3),13);}B(.33,.28,.34,.36,4,stone,H(30,3));C.clock(.5,.66,H(27,2),5);}
    C.flag(.12,.18,H(37,2));C.flag(.9,.18,H(37,2));C.lamp(.16,.86,15);C.lamp(.84,.86,15);
    civicDetail634(T);
  }},
  76:{name:'英式遊樂摩天輪',draw(T){
    const C=civicKit634(T),{V,n,H,p,f,l,L,stone}=C;C.path(0,0,1,1);
    const wheel=(a,b,rx,ry,z,gondolas,col)=>{const q=p(a,b,z);L([a-.2,b+.04,0],[a,b,z],'#597273',Math.max(3,n));L([a+.2,b+.04,0],[a,b,z],'#394f54',Math.max(3,n));L([a-.13,b+.04,9],[a+.13,b+.04,9],'#637a76',2);let prev=null;for(let i=0;i<=48;i++){const t=i*Math.PI/24,r=[q[0]+rx*Math.cos(t),q[1]+ry*Math.sin(t)];if(prev)l(prev,r,'#879f96',2);prev=r;}for(let i=0;i<gondolas;i++){const t=i*Math.PI*2/gondolas,r=[q[0]+rx*Math.cos(t),q[1]+ry*Math.sin(t)];l(q,r,'#9baa93');C.K.px(r[0]-4,r[1]+1,'#3e5559',9,6);C.K.px(r[0]-3,r[1]+2,col,7,4);C.K.px(r[0]-2,r[1]+2,'#89a3a4',5,2);}C.K.px(q[0]-3,q[1]-3,'#ddd1ad',7,7);return [...q,rx,ry];};
    if(V===0){C.home(.14,.08,.38,.17,H(12,1),{roof:'gable',floors:1,chimney:false,sign:'WHEEL'});T.hooks.wheel=wheel(.54,.59,Math.max(18,n*13),H(29,4),H(39,5),12,'#a34c40');}
    else if(V===1){T.hooks.wheel=wheel(.35,.41,Math.max(15,n*9),H(24,3),H(32,4),10,'#4e797d');wheel(.7,.7,Math.max(11,n*7),H(18,2),H(24,3),8,'#bd8553');C.home(.08,.8,.24,.11,10,{roof:'gable',floors:1,chimney:false});}
    else{C.g(.08,.08,.84,.82,'#b49e7c');for(let i=0;i<9;i++)L([.1,.1+i*.09,0],[.9,.1+i*.09,0],'#8e795f');T.hooks.wheel=wheel(.5,.51,Math.max(21,n*14),H(32,5),H(43,6),16,'#a9a883');C.canopy(.16,.81,.68,.1,10,'#815c54');}
    C.fence(.13,.84,.74,.02);C.lamp(.89,.85,15);
    civicDetail634(T);
  }},
  77:{name:'英式歷史水塔',draw(T){
    const C=civicKit634(T),{V,stone,brick,iron,B,L}=C;C.lawn();C.path(.31,.37,.4,.57);
    if(V===0){C.cyl(.5,.43,.26,28,brick);C.cyl(.5,.43,.31,12,stone,28);C.pyramid(.17,.1,.66,.66,40,10);C.window(.49,.685,19,3,7);C.window(.7,.55,19,3,7);}
    else if(V===1){for(const q of [[.29,.23],[.72,.23],[.29,.66],[.72,.66]])L([q[0],q[1],0],[q[0],q[1],29],'#394f53',3);for(let z=4;z<25;z+=10){L([.29,.66,z],[.72,.66,z+10],'#759088');L([.72,.66,z],[.29,.66,z+10],'#759088');}C.cyl(.5,.445,.34,16,iron,28);C.dome(.5,.445,.34,44,6);C.home(.06,.69,.32,.2,12,{roof:'gable',floors:1});}
    else{B(.24,.22,.52,.45,35,stone);B(.2,.18,.6,.53,4,stone,33);for(let i=0;i<3;i++){B(.2+i*.26,.67,.08,.055,3,stone,37);C.window(.33+i*.17,.68,25,3,7);}C.pyramid(.2,.18,.6,.53,40,10,'#55636d');C.arch(.38,.67,.24,.06,14,stone);}
    C.sign(.49,.91,7,'WATERWORKS');C.fence(.1,.1,.8,.8);
    civicDetail634(T);
  }},
  78:{name:'英式千年古樹',draw(T){
    const C=civicKit634(T),{V,n,p,f,l,L,sea,W}=C;C.lawn();C.ring(.5,.5,.44,.42,0,'#b7ab86');C.ring(.5,.5,.36,.34,.2,W?'#d7e0dc':'#859264');
    const foliage=sea===2?['#70593b','#a1783e','#c0954c']:sea===3?['#536559','#748471','#91a084']:['#405741','#647b50','#8a9c68'];
    const limb=(a,b,z,aa,bb,zz,w)=>L([a,b,z],[aa,bb,zz],'#71614a',w);
    const crown=(a,b,z,r)=>{const q=p(a,b,z),rx=Math.max(10,r*n*65),ry=Math.max(7,r*n*28);C.ellipse(a,b,z,rx,ry,foliage[0]);C.ellipse(a-.025,b-.015,z+2,rx*.86,ry*.77,foliage[1]);C.ellipse(a-.07,b+.02,z+ry*.29,rx*.49,ry*.44,W?'#e6eee3':foliage[2]);C.ellipse(a+.08,b-.025,z+ry*.2,rx*.42,ry*.4,W?'#d9e4d8':foliage[1]);};
    if(V===0){limb(.51,.5,0,.48,.5,28,9);limb(.49,.5,14,.16,.42,30,5);limb(.49,.5,16,.79,.51,32,5);for(const q of [[.17,.41,32,.23],[.48,.32,39,.29],[.79,.51,33,.24],[.49,.69,31,.24]])crown(...q);}
    else if(V===1){limb(.5,.48,0,.5,.48,30,11);for(const q of [[.16,.43],[.81,.47],[.48,.19],[.51,.76]])limb(.5,.48,15,q[0],q[1],30,6);crown(.5,.48,37,.4);crown(.21,.43,28,.23);crown(.79,.47,29,.23);C.fence(.17,.17,.66,.66);}
    else{limb(.43,.45,0,.31,.42,29,8);limb(.54,.52,0,.68,.55,32,8);limb(.42,.46,17,.2,.57,29,5);for(const q of [[.27,.38,36,.26],[.7,.5,41,.27],[.24,.65,29,.23],[.64,.75,31,.24]])crown(...q);}
    for(const q of [[.32,.52],[.68,.5],[.49,.71]])L([.5,.5,3],[q[0],q[1],0],'#6e6048',3);C.bench(.15,.82);C.sign(.62,.91,6,'ANCIENT OAK');
    civicDetail634(T);
  }},
  79:{name:'英式碼頭亭',draw(T){
    const C=civicKit634(T),{V,L,B,stone}=C;C.g(0,0,1,1,'#708f95');const plank=(a,b,c,d)=>{C.g(a,b,c,d,'#af9675');for(let j=0;j<8;j++)L([a,b+d*j/8,0],[a+c,b+d*j/8,0],'#826c53');};
    if(V===0){plank(.2,.12,.6,.83);C.canopy(.18,.14,.64,.44,19,'#556d68');C.bench(.33,.38);C.fence(.19,.59,.61,.02);}
    else if(V===1){plank(.09,.3,.84,.4);plank(.4,.65,.2,.3);C.home(.16,.32,.41,.34,18,{roof:'gable',floors:1,chimney:false,porch:true,color:'#c7bc9c'});C.canopy(.62,.32,.24,.32,17,'#597f7a');}
    else{plank(.14,.18,.73,.65);C.cyl(.5,.46,.32,3,stone);for(let i=0;i<6;i++){const t=i*Math.PI/3;L([.5+.28*Math.cos(t),.46+.28*Math.sin(t),3],[.5+.28*Math.cos(t),.46+.28*Math.sin(t),18],'#9eaa93',2);}C.dome(.5,.46,.33,18,12);C.fence(.15,.74,.7,.02);}
    for(const a of [.22,.79])B(a,.79,.035,.035,6,{left:'#877459',right:'#665b47',top:'#ab9670'});C.lamp(.83,.88,17);
    civicDetail634(T);
  }},
  80:{name:'英式古典旋轉木馬',draw(T){
    const C=civicKit634(T),{V,n,p,f,l,L,stone}=C;C.path(0,0,1,1);const z=V===1?29:23,r=V===2?.36:.33;
    C.cyl(.5,.49,r,4,stone);C.cyl(.5,.49,.065,z,{left:'#c69257',right:'#9f6749',top:'#e0b96c'},4);
    if(V===1){C.cyl(.5,.49,r*.87,3,stone,15);C.fence(.27,.3,.45,.4);}
    const horses=(h,count,rad)=>{for(let i=0;i<count;i++){const t=i*Math.PI*2/count,a=.5+rad*Math.cos(t),b=.49+rad*Math.sin(t),q=p(a,b,h+9);L([a,b,h],[a,b,z+3],'#b6a067');C.K.px(q[0]-4,q[1],i%2?'#ac6750':'#ddcba2',9,4);C.K.px(q[0]+3,q[1]-4,'#dbcfb0',3,6);for(const dx of [-2,3])l([q[0]+dx,q[1]+3],[q[0]+dx+1,q[1]+7],'#b39666');}};
    horses(4,V===2?8:6,r*.73);if(V===1)horses(17,4,r*.64);
    if(V===2){C.canopy(.12,.15,.76,.66,z+4,'#8a604e');C.home(.1,.78,.22,.12,10,{roof:'gable',floors:1,chimney:false});}
    else{for(let i=0;i<12;i++){const t=i*Math.PI/6,t2=(i+1)*Math.PI/6;f([p(.5+r*1.1*Math.cos(t),.49+r*1.1*Math.sin(t),z+4),p(.5+r*1.1*Math.cos(t2),.49+r*1.1*Math.sin(t2),z+4),p(.5,.49,z+18)],i%2?'#d4b67d':'#a45b4a');}C.cyl(.5,.49,.035,6,stone,z+18);}
    C.flag(.5,.49,z+32,'#ad4c43');C.sign(.46,.92,6,'CAROUSEL');C.lamp(.84,.9,15);
    civicDetail634(T);
  }},
  82:{name:'英式商務旅館',draw(T){
    const C=civicKit634(T),{V,home,H,path,stone}=C;path(0,0,1,1);
    if(V===0){home(.14,.14,.7,.51,H(32,4),{stone:true,roof:'hip',floors:3,bay:true,porch:true});home(.05,.37,.19,.29,H(24,2),{stone:true,roof:'gable',floors:2});C.B(.4,.65,.23,.11,3,stone);C.canopy(.37,.63,.3,.15,13,'#3c5d58');C.sign(.51,.672,H(26,3),'GRAND HOTEL');}
    else if(V===1){home(.08,.13,.36,.69,H(29,3),{roof:'gable',floors:3,bay:true});home(.42,.13,.43,.26,H(26,3),{roof:'hip',floors:3});home(.62,.37,.25,.25,H(37,3),{stone:true,roof:'hip',floors:3});C.canopy(.43,.48,.24,.16,11);C.sign(.535,.655,13,'HOTEL');C.hedge(.42,.75,.38,.07);}
    else{home(.15,.16,.7,.22,H(30,4),{stone:true,roof:'hip',floors:3});home(.15,.39,.23,.34,H(29,3),{roof:'gable',floors:3});home(.64,.39,.21,.34,H(29,3),{roof:'gable',floors:3});C.cyl(.51,.6,.085,3,stone);C.ring(.51,.6,.06,.06,3,'#6a9ba5');C.arch(.42,.72,.18,.09,13,stone);C.sign(.51,.82,14,'INN');}
    C.lamp(.08,.86,17);C.lamp(.9,.86,17);C.tree(.1,.09,.055);C.tree(.91,.09,.055);
    civicDetail634(T);
  }},
  83:{name:'英式莊園度假酒店',draw(T){
    const C=civicKit634(T),{V,home,H,path,lawn,stone}=C;lawn();path(.04,.47,.92,.41);
    if(V===0){home(.24,.09,.53,.23,H(31,4),{stone:true,roof:'hip',floors:3,porch:true});home(.1,.2,.2,.33,H(26,3),{stone:true,roof:'gable',floors:3});home(.72,.2,.2,.33,H(26,3),{stone:true,roof:'gable',floors:3});C.pool(.32,.46,.34,.24,3);C.canopy(.32,.78,.35,.09,12,'#b7a383');C.sign(.49,.335,17,'ROYAL RESORT');}
    else if(V===1){home(.1,.1,.48,.3,H(28,4),{roof:'gable',floors:3,bay:true,porch:true});home(.65,.1,.24,.22,H(19,2),{stone:true,roof:'hip',floors:2});for(const q of [[.1,.61],[.35,.69],[.67,.68]])home(q[0],q[1],.2,.18,H(13,1),{stone:true,roof:'gable',floors:1});C.ring(.76,.45,.16,.13,0,'#d4c8a1');C.ring(.76,.45,.13,.1,1,'#679daa');C.sign(.35,.41,14,'COUNTRY INN');}
    else{home(.08,.12,.24,.56,H(31,4),{stone:true,roof:'hip',floors:4,bay:true});home(.71,.12,.22,.56,H(31,4),{stone:true,roof:'hip',floors:4,bay:true});home(.31,.13,.4,.16,H(23,2),{roof:'gable',floors:2});C.pool(.4,.42,.22,.39,4);C.court(.07,.75,.22,.18,'tennis');C.sign(.51,.31,16,'SPA HOTEL');}
    for(let i=0;i<4;i++){C.B(.34+i*.1,.73,.06,.08,3,{left:'#c1ad80',right:'#a38c66',top:'#ddd3b2'});}C.tree(.96,.3,.06);C.tree(.04,.5,.06);C.lamp(.62,.88,19);C.lamp(.19,.87,19);
    civicDetail634(T);
  }},
  86:{name:'英式銀行',draw(T){
    const C=civicKit634(T),{V,H,home,B,stone,brick,L}=C;C.path(0,0,1,1);
    if(V===0){home(.17,.18,.65,.4,H(28,3),{stone:true,roof:'hip',floors:2,chimney:false});for(let i=0;i<5;i++)B(.23+i*.125,.58,.045,.095,H(21,2),stone);C.pyramid(.17,.55,.65,.17,H(23,2),10,'#a69372');C.sign(.49,.72,H(19,1),'BANK');for(let i=0;i<3;i++)B(.23-i*.025,.75+i*.03,.5+i*.05,.04,3-i,stone);}
    else if(V===1){home(.11,.18,.72,.37,H(28,3),{roof:'hip',floors:3,bay:true});B(.62,.38,.24,.23,H(46,3),brick);C.pyramid(.6,.36,.28,.27,H(46,3),13);C.clock(.745,.625,H(37,3),5);C.arch(.18,.55,.28,.1,15,stone);C.sign(.44,.61,H(21,2),'SAVINGS');}
    else{B(.14,.2,.72,.46,H(24,3),stone);B(.28,.27,.44,.29,H(13,2),stone,H(24,3));B(.39,.32,.22,.2,8,stone,H(37,3));for(let i=0;i<6;i++)C.window(.22+i*.11,.675,H(19,2),4,12);B(.36,.65,.28,.12,3,stone);C.canopy(.34,.63,.32,.16,14,'#4a5d60');C.sign(.5,.65,H(25,2),'BANK');}
    C.flag(.84,.11,H(31,2));C.lamp(.1,.82,16);C.lamp(.88,.82,16);
    civicDetail634(T);
  }},
  90:{name:'英式遊艇碼頭',draw(T){
    const C=civicKit634(T),{V,n,p,f,L,home,H}=C;C.g(0,0,1,1,T.winter?'#a5c0c5':'#688f9b');for(let j=0;j<7;j++)L([.05,.12+j*.13,0],[.9,.12+j*.13,0],T.winter?'#d9e3dd':'#9bbabf');
    const jetty=(a,b,c,d)=>{C.B(a,b,c,d,3,{left:'#8a795f',right:'#685c48',top:T.winter?'#dce4dc':'#c3ab82'});for(let j=0;j<6;j++)L([a,b+d*j/6,3],[a+c,b+d*j/6,3],'#8f7a5e');};
    const yacht=(a,b,wide=false)=>{const q=[p(a-.05,b-.09,3),p(a+.05,b-.09,3),p(a+.07,b+.035,3),p(a,b+.12,3),p(a-.07,b+.035,3)];f(q,'#e1dac3');L([a-.06,b+.025,4],[a+.06,b+.025,4],'#314f62',2);L([a,b-.01,4],[a,b-.01,H(18,1)],'#bba87a');const m=p(a,b-.01,H(18,1)),s=p(a,b-.01,7);f([m,s,p(a+.105,b+.035,8)],wide?'#b25b4b':'#f0e4c3');};
    if(V===0){jetty(.08,.05,.84,.17);home(.09,.04,.32,.14,H(16,1),{roof:'gable',floors:1,chimney:true});for(const a of [.28,.61,.85])jetty(a,.22,.045,.62);for(const q of [[.17,.39],[.17,.69],[.5,.4],[.5,.7],[.75,.48]])yacht(q[0],q[1]);}
    else if(V===1){jetty(.06,.1,.19,.8);jetty(.25,.78,.68,.08);home(.06,.1,.17,.29,H(18,2),{stone:true,roof:'hip',floors:2});for(const b of [.33,.57])jetty(.25,b,.56,.045);for(const q of [[.36,.21],[.59,.22],[.42,.46],[.69,.46],[.48,.69]])yacht(q[0],q[1],true);}
    else{jetty(.09,.08,.82,.14);jetty(.45,.22,.07,.7);jetty(.13,.53,.73,.06);home(.55,.08,.32,.14,H(15,2),{roof:'gable',floors:1});for(const q of [[.25,.34],[.72,.34],[.25,.76],[.72,.75]])yacht(q[0],q[1]);C.canopy(.08,.08,.25,.13,15,'#586f67');}
    C.sign(.48,.2,9,'YACHT CLUB');C.lamp(.09,.89,18);C.lamp(.91,.13,18);
    civicDetail634(T);
  }},
  93:{name:'英式溜冰場',draw(T){
    const C=civicKit634(T),{V,H,home,B,stone,L}=C;C.path(0,0,1,1);const ice=(a,b,c,d)=>{C.g(a,b,c,d,'#c8dfe0');C.outline([C.p(a,b),C.p(a+c,b),C.p(a+c,b+d),C.p(a,b+d)],'#f1eee1',2);L([a+c/2,b,.4],[a+c/2,b+d,.4],'#b35a59');for(const x of [a+c*.22,a+c*.78])C.outline(C.ring(x,b+d/2,c*.11,d*.12,.5,'#00000000'),'#7195a8');};
    if(V===0){home(.13,.07,.74,.17,H(15,2),{roof:'gable',floors:1,chimney:true});ice(.15,.32,.68,.5);C.fence(.13,.29,.72,.56);for(let i=0;i<3;i++)C.bench(.2+i*.24,.9);}
    else if(V===1){ice(.2,.3,.63,.49);home(.1,.1,.19,.63,H(18,2),{stone:true,roof:'gable',floors:2});for(let i=0;i<5;i++){const a=.25+i*.13;L([a,.27,0],[a,.27,H(28,2)],'#819391',2);L([a,.82,0],[a,.82,H(28,2)],'#819391',2);L([a,.27,H(28,2)],[a,.55,H(40,2)],'#8babae',3);L([a,.55,H(40,2)],[a,.82,H(28,2)],'#a7c5c3',3);}L([.22,.55,H(40,2)],[.89,.55,H(40,2)],'#577985',2);}
    else{ice(.22,.22,.54,.58);B(.07,.22,.11,.56,9,C.brick);B(.81,.22,.11,.56,9,C.brick);for(let j=0;j<5;j++){L([.08,.27+j*.095,10],[.18,.27+j*.095,10],'#c9b395',2);L([.81,.27+j*.095,10],[.92,.27+j*.095,10],'#c9b395',2);}for(const a of [.24,.74])C.arch(a,.4,.07,.17,7,stone);home(.26,.05,.48,.11,12,{roof:'gable',floors:1,chimney:false});}
    C.sign(.49,.945,8,'ICE RINK');C.lamp(.07,.86,H(23,2));C.lamp(.92,.86,H(23,2));
    civicDetail634(T);
  }},
  94:{name:'英式滑板公園',draw(T){
    const C=civicKit634(T),{V,p,f,L,stone}=C;C.lawn();C.path(.07,.08,.86,.82);
    const ramp=(a,b,c,d,h)=>{const q=[p(a,b),p(a+c,b),p(a+c,b+d,h),p(a,b+d,h)];f(q,'#9ca7a1');f([p(a+c,b),p(a+c,b+d),p(a+c,b+d,h)],'#747e79');L([a,b+d,h],[a+c,b+d,h],'#dde1cf',2);};
    if(V===0){C.ring(.45,.43,.29,.28,1,'#c7c7b5');C.ring(.45,.43,.245,.24,1,'#788c8b');C.ring(.45,.43,.185,.18,1,'#9fb0ab');ramp(.68,.6,.2,.2,12);C.L([.13,.8,5],[.57,.8,5],'#4c6565',2);}
    else if(V===1){ramp(.13,.24,.3,.22,16);ramp(.56,.56,.29,-.22,16);C.g(.13,.45,.72,.09,'#c3c1ab');for(const a of [.19,.29,.39])C.L([a,.72,6],[a+.25,.72,6],'#465f60',2);C.B(.58,.13,.22,.12,4,stone);}
    else{for(let i=0;i<5;i++)C.B(.16+i*.045,.2,.045,.22,2+i*2,stone);ramp(.57,.16,.25,.2,13);C.B(.24,.62,.35,.12,5,stone);C.L([.24,.65,9],[.59,.65,9],'#4c6365',2);C.ring(.75,.73,.11,.12,1,'#788a88');}
    C.bench(.15,.93);C.sign(.6,.93,6,'SKATE');C.lamp(.94,.3,19);C.fence(.04,.04,.92,.92);
    civicDetail634(T);
  }},
  96:{name:'英式市民游泳池',draw(T){
    const C=civicKit634(T),{V,H,home,pool,stone}=C;C.path(0,0,1,1);
    if(V===0){home(.13,.09,.74,.17,H(16,2),{roof:'gable',floors:1,chimney:true});pool(.17,.35,.65,.49,5);C.B(.78,.31,.06,.1,13,stone);C.L([.8,.38,13],[.68,.38,13],'#dacda5',3);}
    else if(V===1){home(.1,.13,.19,.6,H(17,2),{stone:true,roof:'hip',floors:2});home(.29,.13,.54,.15,H(14,1),{stone:true,roof:'gable',floors:1});pool(.37,.35,.46,.4,4);C.cyl(.22,.84,.12,2,stone);C.ring(.22,.84,.095,.095,2,'#72afbc');C.canopy(.43,.83,.39,.08,11,'#728d80');}
    else{pool(.11,.16,.36,.65,3);pool(.56,.23,.31,.42,2);home(.53,.69,.35,.16,H(12,1),{roof:'gable',floors:1,chimney:false});C.cyl(.71,.1,.09,2,stone);C.ring(.71,.1,.07,.07,2,'#74aeba');C.B(.46,.51,.04,.13,10,stone);}
    C.sign(.5,.96,8,'LIDO');C.lamp(.07,.89,17);C.lamp(.92,.89,17);for(let i=0;i<3;i++)C.bench(.23+i*.22,.915);
    civicDetail634(T);
  }},
  98:{name:'英式青年旅舍',draw(T){
    const C=civicKit634(T),{V,H,home}=C;C.lawn();C.path(.05,.53,.9,.41);
    if(V===0){home(.12,.15,.29,.55,H(27,3),{roof:'gable',floors:3,bay:true});home(.47,.16,.35,.34,H(19,2),{stone:true,roof:'gable',floors:2});C.canopy(.45,.57,.38,.15,12,'#70856e');C.sign(.28,.715,13,'YOUTH HOSTEL');}
    else if(V===1){for(let i=0;i<3;i++)home(.12+i*.24,.13,.21,.28,H(25,2),{roof:'gable',floors:3,chimney:true});home(.13,.45,.21,.34,H(17,2),{stone:true,roof:'hip',floors:2});C.ring(.65,.64,.17,.16,0,'#a79572');C.bench(.57,.75);C.sign(.5,.44,11,'HOSTEL');}
    else{home(.12,.12,.49,.52,H(31,3),{stone:true,roof:'hip',floors:3,bay:true});home(.6,.2,.23,.21,H(15,1),{roof:'gable',floors:1});C.canopy(.59,.54,.27,.2,12);for(let i=0;i<4;i++){const q=C.p(.62+i*.05,.7,4);C.l([q[0]-3,q[1]],[q[0]+3,q[1]],'#4d6461');}C.sign(.35,.665,15,'HOSTEL');}
    C.tree(.9,.12,.075);C.tree(.92,.83,.075);C.fence(.07,.84,.35,.05);C.lamp(.51,.89,17);
    civicDetail634(T);
  }},
  99:{name:'英式婚禮教堂',draw(T){
    const C=civicKit634(T),{V,H,home,B,stone}=C;C.lawn();C.path(.4,.4,.2,.55);let cross;
    if(V===0){home(.3,.16,.42,.48,H(21,2),{stone:true,roof:'gable',pitch:16,floors:1,chimney:false});B(.24,.42,.19,.25,H(37,2),stone);C.pyramid(.22,.4,.23,.29,H(37,2),21);C.arch(.47,.64,.19,.08,13,stone);cross=[.515,.18,H(46,2)];}
    else if(V===1){home(.22,.19,.52,.37,H(20,2),{stone:true,roof:'gable',pitch:19,floors:1,chimney:false});home(.34,.08,.23,.62,H(18,2),{stone:true,roof:'gable',floors:1,chimney:false});B(.58,.48,.2,.2,H(33,2),C.brick);C.pyramid(.56,.46,.24,.24,H(33,2),26);cross=[.68,.58,H(61,2)];}
    else{home(.18,.23,.62,.34,H(22,3),{stone:true,roof:'gable',pitch:17,floors:1,chimney:false});C.cyl(.2,.4,.15,H(20,2),stone);C.dome(.2,.4,.16,H(20,2),12);C.arch(.5,.56,.21,.09,15,stone);B(.66,.25,.095,.1,H(32,3),stone);C.pyramid(.65,.24,.115,.12,H(32,3),15);cross=[.51,.25,H(46,2)];}
    C.L([cross[0],cross[1],cross[2]-6],[cross[0],cross[1],cross[2]+5],'#cbb98e',2);C.L([cross[0]-.04,cross[1],cross[2]+1],[cross[0]+.04,cross[1],cross[2]+1],'#cbb98e',2);C.arch(.38,.82,.24,.06,12,stone);C.hedge(.09,.79,.22,.07);C.hedge(.72,.79,.19,.07);C.tree(.88,.2,.08);C.sign(.45,.97,6,'CHAPEL');
    civicDetail634(T);
  }},
  101:{name:'英式水上樂園',draw(T){
    const C=civicKit634(T),{V,H,p,L,f,stone}=C;C.lawn();C.path(.04,.08,.92,.84);
    const slide=(points,col)=>{for(let i=0;i<points.length-1;i++){const a=p(...points[i]),b=p(...points[i+1]);C.l(a,b,'#e0d5b4',Math.max(5,T.n*2));C.l(a,b,col,Math.max(3,T.n*1.3));}for(const q of [points[0],points[1]])L([q[0],q[1],0],q,'#657b71',2);};
    if(V===0){C.pool(.18,.42,.62,.39);C.B(.13,.13,.18,.18,H(30,2),C.brick);C.canopy(.11,.11,.22,.22,H(31,2));slide([[.24,.26,H(30,2)],[.53,.2,H(24,2)],[.69,.34,H(15,1)],[.62,.57,2]],'#aa744b');slide([[.2,.29,H(28,2)],[.09,.46,H(18,1)],[.31,.68,2]],'#648b80');}
    else if(V===1){C.ring(.52,.5,.4,.36,1,'#62a0ad');C.ring(.52,.5,.24,.2,1,T.winter?'#d8e2dc':'#899863');C.home(.13,.1,.27,.16,H(14,1),{roof:'gable',floors:1,chimney:false});C.B(.72,.15,.13,.13,H(32,2),stone);slide([[.76,.22,H(32,2)],[.9,.47,H(23,1)],[.66,.77,H(13,1)],[.37,.74,2]],'#b67f53');C.canopy(.4,.4,.18,.14,12);}
    else{C.pool(.1,.18,.33,.6,3);C.pool(.58,.4,.3,.36);C.B(.61,.13,.15,.13,H(28,2),C.brick);slide([[.67,.23,H(28,2)],[.49,.35,H(19,1)],[.32,.53,2]],'#7e9b83');slide([[.72,.24,H(28,2)],[.89,.32,H(18,1)],[.74,.58,2]],'#a15c47');C.cyl(.51,.8,.095,3,stone);C.ring(.51,.8,.075,.075,3,'#75b4c1');}
    C.sign(.48,.96,8,'AQUA PARK');C.lamp(.07,.86,20);C.lamp(.92,.87,20);C.fence(.025,.025,.95,.95);
    civicDetail634(T);
  }},
  103:{name:'英式天際觀景餐廳',draw(T){
    const C=civicKit634(T),{V,H,B,home,stone,iron}=C;C.path(0,0,1,1);let h=H(39,4);
    if(V===0){home(.29,.24,.42,.4,h,{stone:true,roof:'flat',floors:4,chimney:false});C.cyl(.5,.455,.34,12,{left:'#7c9da0',right:'#466a73',top:'#718786'},h);C.dome(.5,.455,.36,h+12,12);for(let i=0;i<7;i++)C.window(.27+i*.076,.59,h+8,3,6);C.sign(.5,.73,h+2,'SKY DINING');}
    else if(V===1){home(.1,.14,.76,.54,h,{roof:'hip',floors:4,chimney:true});B(.23,.26,.5,.34,13,{left:'#789a9f',right:'#4d737d',top:'#aebdba'},h+9);C.pyramid(.21,.24,.54,.38,h+22,12);C.canopy(.2,.7,.55,.13,13);C.sign(.49,.6,h+16,'ROOFTOP');}
    else{for(const a of [.22,.61])home(a,.31,.18,.33,h,{stone:true,roof:'flat',floors:4,chimney:false});B(.14,.26,.75,.47,12,{left:'#7e999f',right:'#4e6971',top:'#b4beb4'},h);for(let i=0;i<8;i++)C.window(.19+i*.09,.742,h+9,3,6);C.pyramid(.12,.24,.79,.51,h+12,12);C.sign(.5,.77,h+3,'PANORAMA');C.arch(.36,.5,.26,.15,13,stone);}
    C.tree(.11,.83,.08);C.tree(.91,.81,.08);C.lamp(.15,.93,18);C.lamp(.87,.93,18);
    civicDetail634(T);
  }},
  107:{name:'英式紀念火葬場',draw(T){
    const C=civicKit634(T),{V,H,home,B,stone,brick}=C;C.lawn();C.path(.08,.46,.84,.44);
    const stack=(a,b,h)=>{B(a,b,.085,.085,h,brick);B(a-.012,b-.012,.109,.109,3,stone,h);const q=C.p(a+.043,b+.043,h+3);(T.hooks.smoke||(T.hooks.smoke=[])).push(q);};
    if(V===0){home(.12,.23,.68,.28,H(17,2),{roof:'gable',floors:1,chimney:false});home(.24,.44,.27,.2,H(22,2),{stone:true,roof:'gable',floors:2,chimney:false});stack(.77,.17,H(38,3));C.canopy(.29,.64,.25,.1,11,'#4e665d');C.sign(.5,.54,12,'MEMORIAL');}
    else if(V===1){home(.32,.13,.32,.44,H(24,2),{stone:true,roof:'gable',pitch:16,floors:2,chimney:false});home(.09,.34,.29,.2,H(14,1),{stone:true,roof:'hip',floors:1,chimney:false});home(.65,.34,.25,.2,H(14,1),{stone:true,roof:'hip',floors:1,chimney:false});stack(.83,.16,H(33,2));C.arch(.4,.58,.17,.07,13,stone);C.sign(.5,.67,10,'REMEMBRANCE');}
    else{home(.13,.13,.25,.54,H(20,2),{roof:'hip',floors:2,chimney:false});B(.37,.22,.45,.25,H(13,1),stone);for(let i=0;i<7;i++)C.window(.4+i*.061,.48,H(11,1),3,7);C.pyramid(.35,.2,.5,.3,H(14,1),7);stack(.13,.13,H(43,2));C.ring(.67,.68,.14,.11,0,'#b8aa87');C.cyl(.67,.68,.035,11,stone);C.sign(.5,.52,10,'MEMORIAL');}
    C.hedge(.12,.82,.25,.07);C.hedge(.62,.82,.26,.07);C.tree(.9,.68,.09);C.tree(.07,.69,.075);C.lamp(.52,.92,16);
    civicDetail634(T);
  }},
  112:{name:'英式中央公園',draw(T){
    const C=civicKit634(T),{V,H,lawn,path,tree,home,stone}=C;lawn();
    if(V===0){path(.465,.04,.075,.93);path(.04,.465,.92,.075);for(const a of [.11,.67])for(const b of [.1,.63]){C.hedge(a,b,.22,.04);C.hedge(a,b+.18,.22,.04);C.g(a+.03,b+.045,.16,.12,T.winter?'#d7dfd7':T.sea===2?'#ae865c':'#8b8f59');}C.cyl(.5,.5,.125,3,stone);C.canopy(.38,.38,.24,.24,H(17,1),'#526e62');home(.11,.78,.24,.12,H(13,1),{stone:true,roof:'gable',floors:1,chimney:false});}
    else if(V===1){C.ring(.4,.43,.31,.29,0,T.winter?'#bed2d2':'#6b98a0');C.ring(.4,.43,.06,.065,1,T.winter?'#d7e1db':'#8c9b65');tree(.4,.43,.09);path(.77,.07,.07,.88);path(.08,.8,.76,.065);home(.61,.08,.3,.22,H(17,2),{stone:true,roof:'hip',floors:2,porch:true});C.B(.65,.32,.08,.22,3,{left:'#988267',right:'#70604c',top:'#b9a27c'});for(let i=0;i<5;i++)C.bench(.16+i*.15,.87);}
    else{path(.12,.12,.76,.055);path(.12,.12,.055,.77);C.ring(.55,.51,.29,.28,.1,T.winter?'#dce3dc':'#8f9b65');C.court(.54,.17,.27,.21,'tennis');home(.16,.21,.29,.18,H(15,2),{roof:'gable',floors:1,chimney:true,porch:true});C.canopy(.63,.69,.19,.16,H(17,1),'#587a67');tree(.3,.62,.18);tree(.4,.69,.14);C.sign(.52,.53,7,'COMMON');}
    for(let i=0;i<5;i++){tree(.05,.1+i*.185,.055);tree(.95,.1+i*.185,.055);}C.lamp(.48,.94,19);C.lamp(.9,.49,19);C.sign(.41,.97,7,T.n===1?'TOWN PARK':'CENTRAL PARK');
    civicDetail634(T);
  }},
  115:{name:'英式市民中心',draw(T){
    const C=civicKit634(T),{V,H,home,B,stone,brick}=C;C.path(0,0,1,1);
    if(V===0){home(.18,.13,.63,.23,H(28,3),{stone:true,roof:'hip',floors:3});home(.08,.3,.24,.31,H(21,2),{stone:true,roof:'gable',floors:2});home(.68,.3,.24,.31,H(21,2),{stone:true,roof:'gable',floors:2});B(.43,.12,.15,.2,H(47,3),brick);C.clock(.505,.325,H(38,3),5);C.pyramid(.41,.1,.19,.24,H(47,3),14);for(let i=0;i<5;i++)B(.35+i*.072,.37,.027,.09,15,stone);C.pyramid(.31,.35,.39,.13,17,7,'#b19b7e');}
    else if(V===1){home(.1,.16,.24,.51,H(23,3),{roof:'gable',floors:3});home(.64,.16,.24,.51,H(23,3),{roof:'gable',floors:3});home(.31,.16,.36,.18,H(29,3),{stone:true,roof:'hip',floors:3});C.B(.36,.39,.26,.15,12,{left:'#8ca9aa',right:'#587b80',top:'#afc0bb'});C.cyl(.49,.68,.11,3,stone);C.ring(.49,.68,.085,.085,3,'#6997a1');C.canopy(.26,.45,.11,.07,11);C.canopy(.62,.45,.11,.07,11);}
    else{home(.09,.12,.38,.25,H(31,3),{stone:true,roof:'hip',floors:3});home(.55,.12,.32,.25,H(24,2),{roof:'gable',floors:3});C.cyl(.32,.59,.22,H(18,2),brick);C.dome(.32,.59,.23,H(18,2),12);home(.64,.47,.22,.31,H(22,2),{stone:true,roof:'gable',floors:2});C.canopy(.42,.44,.26,.07,12);C.sign(.3,.8,12,'CIVIC HALL');}
    C.flag(.52,.43,H(50,2));C.sign(.49,.88,9,'CIVIC CENTRE');C.tree(.08,.85,.07);C.tree(.91,.84,.07);C.lamp(.31,.9,19);C.lamp(.72,.9,19);
    civicDetail634(T);
  }},
  124:{name:'英式社區籃球場',draw(T){
    const C=civicKit634(T),{V,H,court,home,L}=C;C.lawn();
    if(V===0){court(.15,.17,.7,.66,'basket');C.fence(.08,.08,.84,.83);C.bench(.24,.94);C.bench(.61,.94);}
    else if(V===1){court(.1,.15,.35,.69,'basket');court(.56,.15,.34,.69,'basket');C.fence(.05,.08,.9,.83);L([.5,.12,0],[.5,.88,0],'#c4b79b',2);home(.36,.02,.27,.09,10,{roof:'gable',floors:1,chimney:false});}
    else{court(.15,.28,.7,.58,'basket');home(.1,.08,.4,.12,H(12,1),{roof:'gable',floors:1,chimney:false});for(const a of [.12,.87])for(const b of [.27,.55,.86])L([a,b,0],[a,b,H(23,1)],'#697a70',2);for(const b of [.27,.55,.86]){L([.12,b,H(23,1)],[.5,b,H(32,1)],'#8a9b89',2);L([.5,b,H(32,1)],[.87,b,H(23,1)],'#8a9b89',2);}L([.5,.27,H(32,1)],[.5,.86,H(32,1)],'#687f74',2);C.fence(.08,.24,.83,.66);}
    C.sign(.45,.96,7,'BASKETBALL');C.lamp(.07,.13,H(24,2));C.lamp(.93,.13,H(24,2));C.lamp(.07,.91,H(24,2));C.lamp(.93,.91,H(24,2));
    civicDetail634(T);
  }},
  125:{name:'英式網球俱樂部',draw(T){
    const C=civicKit634(T),{V,H,court,home}=C;C.lawn();
    if(V===0){court(.17,.16,.66,.66,'tennis');C.fence(.09,.08,.82,.82);C.bench(.17,.94);C.bench(.67,.94);}
    else if(V===1){court(.09,.17,.36,.67,'tennis');court(.55,.17,.36,.67,'tennis');C.fence(.04,.11,.92,.8);home(.32,.015,.36,.095,H(11,1),{roof:'gable',floors:1,chimney:false});}
    else{court(.4,.23,.48,.63,'tennis');home(.07,.1,.24,.45,H(18,2),{stone:true,roof:'gable',floors:2,porch:true});C.canopy(.07,.61,.25,.14,13,'#64806e');C.hedge(.38,.09,.52,.065);C.fence(.35,.19,.59,.73);C.bench(.09,.85);}
    C.sign(.47,.96,7,'TENNIS CLUB');C.lamp(.06,.15,H(22,1));C.lamp(.94,.15,H(22,1));C.lamp(.07,.93,H(22,1));C.lamp(.93,.93,H(22,1));
    civicDetail634(T);
  }},
  126:{name:'英式兒童遊樂場',draw(T){
    const C=civicKit634(T),{V,H,p,f,L,stone,brick}=C;C.lawn();C.ring(.5,.49,.42,.39,0,T.winter?'#d7e1d9':'#b49c73');
    const swing=(a,b,c)=>{for(const x of [a,a+c]){L([x,b,0],[x,b+.075,20],'#646d58',2);L([x,b+.15,0],[x,b+.075,20],'#646d58',2);}L([a,b+.075,20],[a+c,b+.075,20],'#866c46',2);for(const x of [a+c*.28,a+c*.7]){L([x,b+.075,20],[x,b+.075,5],'#9eafaa');const q=p(x,b+.075,5);C.K.px(q[0]-3,q[1],'#a6744c',7,2);}};
    const slide=(a,b,z)=>{L([a,b,0],[a,b,z],'#69766b',2);L([a+.08,b,0],[a+.08,b,z],'#69766b',2);f([p(a,b,z),p(a+.08,b,z),p(a+.08,b+.23,1),p(a,b+.23,1)],'#b89d62');L([a,b,z],[a,b+.23,1],'#ead7ac');};
    if(V===0){swing(.13,.22,.4);C.B(.61,.25,.18,.18,15,brick);C.pyramid(.59,.23,.22,.22,15,10,'#638474');slide(.66,.43,15);C.B(.2,.71,.27,.09,3,stone);}
    else if(V===1){const q=[p(.13,.31,8),p(.62,.31,8),p(.79,.43,8),p(.6,.57,8),p(.13,.57,8)];f(q,'#b29159');C.B(.2,.32,.35,.2,7,{left:'#ac8250',right:'#836040',top:'#c5a66e'});L([.39,.42,8],[.39,.42,34],'#705d3e',2);f([p(.39,.42,32),p(.39,.42,14),p(.64,.42,17)],'#d6c6a1');slide(.63,.54,9);swing(.21,.75,.35);}
    else{for(const q of [[.2,.22],[.65,.22],[.2,.61]]){C.B(q[0],q[1],.15,.15,17,stone);C.pyramid(q[0]-.015,q[1]-.015,.18,.18,17,9,'#8b644f');}for(let i=0;i<5;i++){L([.34,.3+i*.03,10],[.67,.3+i*.03,10],'#aa9971');L([.34+i*.08,.3,8],[.34+i*.08,.3,15],'#847654');}slide(.25,.77,16);for(let i=0;i<5;i++)L([.67,.48+i*.05,0],[.82,.48+i*.05,11],'#8c9b81');}
    C.fence(.04,.04,.92,.92);C.bench(.12,.93);C.sign(.62,.94,6,'PLAY');C.tree(.92,.11,.07);C.lamp(.91,.83,16);
    civicDetail634(T);
  }},
  127:{name:'英式公共住宅',draw(T){
    const C=civicKit634(T),{V,H,home,lawn,path}=C;lawn();path(.08,.64,.84,.24);
    if(V===0){for(let i=0;i<4;i++)home(.08+i*.215,.1,.19,.27,H(26,3),{roof:'gable',floors:3,chimney:true});home(.08,.4,.22,.33,H(26,3),{roof:'gable',floors:3});home(.73,.4,.22,.33,H(26,3),{roof:'gable',floors:3});C.ring(.5,.57,.13,.13,0,T.winter?'#d5dfd6':'#96a071');C.tree(.5,.57,.1);C.bench(.4,.73);}
    else if(V===1){home(.09,.11,.7,.2,H(33,3),{roof:'flat',floors:4,chimney:false});home(.17,.39,.68,.19,H(27,2),{roof:'flat',floors:3,chimney:false});home(.25,.68,.64,.17,H(22,2),{roof:'flat',floors:2,chimney:false});for(const q of [[.19,.27],[.47,.54],[.64,.82]])C.home(q[0],q[1],.075,.09,H(14,2),{stone:true,roof:'flat',floors:2,chimney:false});C.tree(.09,.66,.08);C.tree(.92,.42,.08);}
    else{home(.1,.11,.27,.52,H(32,3),{roof:'hip',floors:4,bay:true});home(.62,.11,.27,.52,H(32,3),{roof:'hip',floors:4,bay:true});home(.37,.11,.25,.17,H(22,2),{stone:true,roof:'gable',floors:3});C.court(.41,.36,.14,.25,'basket');C.canopy(.43,.71,.3,.1,11);C.hedge(.1,.78,.22,.06);}
    C.sign(.44,.965,7,'COUNCIL HOMES');C.lamp(.12,.9,17);C.lamp(.88,.9,17);C.fence(.05,.9,.28,.025);C.fence(.68,.9,.27,.025);
    civicDetail634(T);
  }},
  132:{name:'英式防災避難公園',draw(T){
    const C=civicKit634(T),{V,H,home,lawn,path,stone}=C;lawn();path(.44,.04,.11,.91);path(.05,.44,.9,.11);
    const emergency=(a,b)=>{C.B(a,b,.12,.095,8,stone);C.sign(a+.06,b+.1,9,'AID','#46635e');C.K.tank((a+.2)*T.n,(b+.05)*T.n,.055*T.n,10,'#8ba7a2');};
    if(V===0){home(.1,.09,.29,.2,H(15,1),{stone:true,roof:'gable',floors:1,chimney:false,porch:true});C.canopy(.61,.11,.27,.2,H(16,1),'#566e64');emergency(.11,.62);C.ring(.72,.73,.13,.13,0,'#adac87');C.sign(.72,.73,7,'ASSEMBLY');}
    else if(V===1){C.court(.11,.15,.52,.47,'basket');home(.67,.12,.24,.4,H(17,2),{roof:'gable',floors:2,chimney:false});C.canopy(.14,.7,.48,.13,15,'#61766c');emergency(.71,.68);C.B(.17,.8,.11,.06,5,stone);C.B(.37,.8,.11,.06,5,stone);}
    else{for(let i=0;i<3;i++)C.B(.13,.16+i*.13,.61,.08,2+i*2,stone);home(.13,.63,.3,.18,H(14,1),{stone:true,roof:'hip',floors:1,chimney:false});emergency(.68,.14);C.canopy(.59,.64,.3,.18,H(16,1));C.sign(.47,.57,8,'MEETING POINT');}
    C.flag(.88,.52,H(28,1),'#65836f');C.sign(.45,.97,7,'SAFE ASSEMBLY');for(const q of [[.04,.15],[.04,.87],[.96,.16],[.96,.88]])C.tree(q[0],q[1],.05);C.lamp(.44,.88,19);C.lamp(.57,.12,19);
    civicDetail634(T);
  }}
};
/* T634 公共與休閒候選結束。 */
