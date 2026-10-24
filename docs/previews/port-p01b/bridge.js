// Independent P01-B preview bridge. World, terrain, roads, camera, sprites and object queue are native.
window.P01B={phase:55,parts:[],stats:{},
diag(){const seen=new Set();let canvasCount=0,pixels=0;const walk=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(o instanceof HTMLCanvasElement){canvasCount++;pixels+=o.width*o.height;return;}if(o instanceof Map){for(const v of o.values())walk(v);return;}for(const v of Object.values(o))walk(v);};walk(SPR);walk(CACHE634);walk(this.freightCache);return{cam:{...cam},sim:{running,speed},cache:{canvasCount,pixels,rgbaBytes:pixels*4,native634:CACHE634.size,freight:this.freightCache?.size||0},bake:{...(window.__p01cBake||{count:0,totalMs:0,firstMs:null})},parts:this.parts.length};},

freightDraw(T){
 const I=industryKit634(T);
 I.rail(.06,.12,.88);I.rail(.06,.28,.88);
 // Rear ground containers FIRST: they must be occluded by the foreground shed.
 I.container(.17,.17,.24,.1,12,'#96745a');I.container(.54,.17,.25,.1,12,'#759293');
 if(t661On())for(let i=0;i<3;i++)I.container(.14+i*.16,.38,.12,.06,7,'#7f8a84');
 I.shed(.09,.44,.59,.26,42,'saw');
 I.crane(.8,.6,.2,47);I.dock(.09,.7,.59,.06);
 // T661 yard containers moved outside shed footprint; still on ground and within the 4x4 lot.
 if(t661On()){for(let i=0;i<4;i++)I.container(.10+i*.16,.77,.12,.06,4,'#6d7873');I.L(I.P(.74,.58,10),I.P(.74,.78,10),'#8d9891',2);I.L(I.P(.88,.58,10),I.P(.88,.78,10),'#8d9891',2);I.box(.08,.82,.18,.10,8,'#9aa39b',0);}
 I.road(.06,.85,.88,.095);I.truck(.51,.88);I.sign(.23,.82,24,'FREIGHT');I.fence();
},
freightSprite(bd,v,winter){if(v%3!==1)return null;const key=[v,winter,season(),t661On()].join('/');this.freightCache ||= new Map();if(!this.freightCache.has(key)){window.__p01bFreightBake=true;try{this.freightCache.set(key,bake634(110,v,4,1,1,2,winter,season()));}finally{window.__p01bFreightBake=false;}}return this.freightCache.get(key);},
setup(){GV.setMapSize(72);newWorld(707);running=false;speed=0;GV.ai(false);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)(Object.keys(T(idx(x,y))).forEach(k=>delete T(idx(x,y))[k]),Object.assign(T(idx(x,y)),{t:y>=35?0:2,tree:0,gv:0,road:0,rc:0,mask:0,bridge:0,zone:0,bld:null,deco:0,rail:0,tram:0,dock:0,el:0,rp:0,wp:0,wr:0,wm:0,em:0}));
 for(const a of[cars,citizens,smokes,trains,cargoShips,tramCars,ambulances,recycleTrucks,ladderTrucks,policeCars,schoolBuses,buses,rbuses,lifeShips,rain,fxParts,confetti])a.length=0;
 const put=(k,x,y,n,v=1)=>{x+=20;y+=20;const b={k,lv:1,v,age:60,pw:true,wa:true,h:1,we:1,den:3,sz:n,lot574:n};T(idx(x,y)).bld=b;for(let j=0;j<n;j++)for(let i=0;i<n;i++)if(i||j)T(idx(x+i,y+j)).bld={k,ref:[x,y]};};
 put(18,3,12,3);put(18,9,12,3);put(64,3,7,3);put(64,7,7,3,2);put(110,11,7,4);
 for(let x=2;x<=23;x++)T(idx(x+20,31)).road=1;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)recalcMask(x,y);
 computeFoam();groundDirty=true;tool='pan';selTile=null;hover.x=hover.y=-1;quality=1;weather=0;trafClock=12;waterT=waterF=0;shakeT=0;money=1e9;
 this.build();GV.setZoom(1.05);GV.setRot(0);GV.lookAt(32.5,31.5);document.querySelector('#start').style.display='none';stopTitleAnim();this.view(55,0);
},
redraw(){updateZoomAnim(.016);visT=this.phase;trafClock=12;waterT=waterF=0;draw(0);},
view(phase,sea){trafClock=12;waterT=waterF=0;shakeT=0;this.phase=phase;GV.setSeason(sea);rainDays=sea===3?6:0;groundDirty=true;this.redraw();},rotate(){GV.setRot((GV.rot()+1)%4);GV.lookAt(32.5,31.5);GV.forceDraw();},
build(){this.parts=[];const add=p=>this.parts.push(p);
 // Small independent quays and yard slabs, never a giant sprite.
 for(let x=3;x<15;x++)for(let y=12;y<15;y++)add({type:'slab',x:x+.5,y:y+.5,w:.98,d:.98,h:2,color:'#829097'});
 for(let x=3;x<15;x++)add({type:'edge',x:x+.5,y:14.96,w:1,d:.13,h:5,color:'#cad2cd'});
 const colors=['#c95538','#dba346','#527d8b','#47796a','#d9d4b7'];
 for(const base of[6,12])for(let row=0;row<3;row++)for(let col=0;col<2;col++)for(let level=0;level<(3-row);level++)add({type:'box',x:base+.6+col*1.15,y:(window.__p01cLegacyClearance?[12.35,13.2,14.05]:[12.35,13.05,14.05])[row],w:1.0,d:.7,h:10,base:level*10+2,color:colors[(row*2+col+base)%5]});
 for(const x of[4,7,10,13])add({type:'crane',x,y:window.__p01cLegacyClearance?14:14.08,w:1.15,d:1.15,h:87,color:'#dfb448'});
 for(let x=3;x<16;x+=2)add({type:'lamp',x,y:10.9,h:39});
 for(let x=2;x<24;x++)add({type:'reserve',x:x+.5,y:4.5});
 for(let x=18;x<23;x++)for(let y=10;y<15;y++)if(y!==11)add({type:'reserve',x:x+.5,y:y+.5,shipyard:true});
},
paint(c,p,P,z,bright){const base=p.base||0,night=this.phase===0,winter=season()===3;
 const poly=(a,color)=>{c.beginPath();a.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q)});c.closePath();c.fillStyle=color;c.fill();};
 const line=(a,b,col,width=1)=>{c.beginPath();c.moveTo(...P(...a));c.lineTo(...P(...b));c.strokeStyle=col;c.lineWidth=width*z;c.stroke();};
 const tint=col=>{const n=parseInt(col.slice(1),16),f=night?.43:1;return `rgb(${(n>>16)*f},${(n>>8&255)*f},${(n&255)*f})`;};
 const box=(x,y,w,d,h,col,lo=0)=>{const x0=x-w/2,x1=x+w/2,y0=y-d/2,y1=y+d/2;const faces=[[[x0,y0,lo],[x1,y0,lo],[x1,y0,lo+h],[x0,y0,lo+h]],[[x1,y0,lo],[x1,y1,lo],[x1,y1,lo+h],[x1,y0,lo+h]],[[x1,y1,lo],[x0,y1,lo],[x0,y1,lo+h],[x1,y1,lo+h]],[[x0,y1,lo],[x0,y0,lo],[x0,y0,lo+h],[x0,y1,lo+h]]];faces.sort((a,b)=>a.reduce((n,v)=>n+viewDep(v[0]+20,v[1]+20),0)-b.reduce((n,v)=>n+viewDep(v[0]+20,v[1]+20),0));for(let fi=0;fi<faces.length;fi++){poly(faces[fi],tint(col));poly(faces[fi],`rgba(0,0,0,${[.05,.20,.12,.30][fi]})`);}poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],winter?'#dce4df':tint(col));if(!winter)poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],'rgba(255,255,255,.16)');};
 if(['slab','edge','box'].includes(p.type)){box(p.x,p.y,p.w,p.d,p.h,p.color,base);if(p.type==='box'&&viewDep(p.x+20,p.y+20+.1)>viewDep(p.x+20,p.y+20))for(let i=1;i<6;i++)line([p.x-p.w/2+i*p.w/6,p.y+p.d/2,base+1],[p.x-p.w/2+i*p.w/6,p.y+p.d/2,base+p.h-1],night?'#182b34':'#344c52',.7);if(p.type==='slab'&&p.y===12.5)line([p.x-.35,p.y-.24,2.2],[p.x+.35,p.y-.24,2.2],night?'#90988d':'#ebe3c3',1.3);if(p.type==='slab'&&(p.y===13.5||p.y===14.5))line([p.x-.49,p.y-.12,2.2],[p.x+.49,p.y-.12,2.2],night?'#414951':'#4f6167',1.6);if(p.type==='edge'){line([p.x-.32,p.y,6],[p.x+.32,p.y,6],'#dfb449',2);box(p.x,p.y+.08,.14,.13,3,'#293b43');}return;}
 if(p.type==='crane'){for(const dx of[-.48,.48])for(const dy of[-.52,.52]){box(p.x+dx,p.y+dy,.12,.15,65,p.color,2);box(p.x+dx,p.y+dy,.22,.22,4,'#283842');}for(const dx of[-.48,.48]){line([p.x+dx,p.y-.52,5],[p.x+dx,p.y+.52,61],tint(p.color),3);line([p.x+dx,p.y+.52,5],[p.x+dx,p.y-.52,61],tint(p.color),3);line([p.x+dx,p.y-.7,68],[p.x+dx,p.y+2.15,68],tint(p.color),5);line([p.x+dx,p.y-.6,87],[p.x+dx,p.y+2.15,68],tint(p.color),2);line([p.x+dx,p.y-.6,68],[p.x+dx,p.y-.6,87],tint(p.color),3);line([p.x+dx,p.y+1.5,68],[p.x+dx,p.y+1.5,26],night?'#859596':'#3a4a50',.7);}box(p.x,p.y,.95,.5,8,p.color,59);box(p.x,p.y+.5,.4,.35,7,'#386b80',56);box(p.x,p.y+1.5,.95,.16,3,'#d1a345',23);for(let rung=8;rung<58;rung+=5)line([p.x+.41,p.y-.55,rung],[p.x+.55,p.y-.55,rung],night?'#9e9b7b':'#e9d99a',1);for(const dx of[-.5,.5]){box(p.x+dx,p.y,.12,.17,2,'#e9e5bd',68);if(night){const q=P(p.x+dx,p.y,70);c.fillStyle='#fff0b9';c.beginPath();c.arc(...q,2.7*z,0,Math.PI*2);c.fill();}}return;}
 if(p.type==='lamp'){line([p.x,p.y,0],[p.x,p.y,p.h],night?'#899591':'#4e6065',2);line([p.x,p.y,p.h],[p.x+.25,p.y,p.h],night?'#ffeea0':'#59686b',3);if(night){const q=P(p.x+.25,p.y,p.h);c.fillStyle='#ffe5a0';c.beginPath();c.arc(...q,3*z,0,Math.PI*2);c.fill();}return;}
 if(p.type==='reserve'){const col=p.shipyard?'#85958a':'#a4ac92';line([p.x-.35,p.y-.3,1],[p.x+.35,p.y+.3,1],tint(col),1);if(!p.shipyard){line([p.x-.5,p.y-.2,1],[p.x+.5,p.y-.2,1],tint('#626c68'),2);line([p.x-.5,p.y+.2,1],[p.x+.5,p.y+.2,1],tint('#626c68'),2);}return;}
}
};
