// Candidate-only native closure bridge. Reads real tile types once; never writes world state.
const P03=window.P03={clock:QuayMotion.clock(),enabled:!new URLSearchParams(typeof location==='object'?location.search:'').has('noP03'),plan:null,error:null,buildCount:0,
 init(){const started=performance.now();try{this.plan=VesselNavigation.compile({width:N,height:N,cells:Array.from({length:N*N},(_,i)=>T(i).t===0&&!T(i).bld&&!T(i).road)});this.buildCount++;this.planMs=performance.now()-started;this.error=null;}catch(e){this.error=e.message;this.plan=null;}},
 active(){return this.enabled&&!window.__noHarborP01B&&!!this.plan;},
 time(){return this.clock.time(performance.now());},play(){this.clock.play(performance.now());P02.play();},pause(){this.clock.pause(performance.now());P02.pause();},reset(){this.clock.reset(performance.now());P02.reset();},seek(ms){this.clock.seek(ms,performance.now());P02.clock.seek(ms,performance.now());P01B.redraw();},toggle(){this.enabled=!this.enabled;P01B.redraw();},
 objects(){if(!this.active())return[];const p=this.plan.at(this.time());this.frame=p;if(!p.visible)return[];const c=Math.cos(p.angle),s=Math.sin(p.angle),world=([x,y,h])=>[p.x+c*x-s*y,p.y+s*x+c*y,h];
 const groups=[];const prism=(xy,lo,hi,col)=>{const a=xy.map(v=>world([...v,lo])),b=xy.map(v=>world([...v,hi]));const faces=xy.map((_,i)=>[a[i],a[(i+1)%a.length],b[(i+1)%a.length],b[i]]);faces.sort((a,b)=>a.reduce((v,q)=>v+viewDep(q[0],q[1]),0)-b.reduce((v,q)=>v+viewDep(q[0],q[1]),0));faces.push(b);const group=faces.map((points,i)=>({points,color:col,top:i===faces.length-1,shade:i%3*.10}));groups.push({faces:group,dep:b.reduce((v,q)=>v+viewDep(q[0],q[1]),0)/b.length,lo});};
 // Exact visible hull lies inside the same 5 x 1.4 footprint used by navigation.
 prism([[-2.5,-.55],[1.65,-.7],[2.5,0],[1.65,.7],[-2.5,.55]],1,6,'#234d62');
 prism([[-2.35,-.5],[1.6,-.6],[2.25,0],[1.6,.6],[-2.35,.5]],6,7,'#b1b5a5');
 const box=(x,y,l,w,lo,hi,col)=>prism([[x-l/2,y-w/2],[x+l/2,y-w/2],[x+l/2,y+w/2],[x-l/2,y+w/2]],lo,hi,col);
 for(let row=0;row<2;row++)for(let col=0;col<3;col++)box(-.75+col*.72,-.31+row*.62,.65,.5,7,12,['#b44f3b','#d6a348','#497f77'][(row+col)%3]);
 box(-1.85,0,.62,1,7,15,'#e0ddd1');box(-1.85,0,.66,1.06,13,15,'#42697a');box(-1.95,0,.25,.3,15,17,'#d5d2bb');const base=groups.slice(0,2),cabin={dep:groups[8].dep,lo:7,faces:groups.slice(8).flatMap(g=>g.faces)},upper=[...groups.slice(2,8),cabin].sort((a,b)=>a.dep-b.dep||a.lo-b.lo);return[{dep:viewDep(p.x,p.y)+.0001,faces:[...base,...upper].flatMap(g=>g.faces)}];},
 paint(c,object,P,z){for(const o of object.faces){c.beginPath();o.points.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q)});c.closePath();c.fillStyle=o.top&&season()===3?'#e2e8e2':o.color;c.fill();c.fillStyle=`rgba(0,0,0,${(P01B.phase===0?.52:0)+o.shade})`;c.fill();c.strokeStyle=P01B.phase===0?'#172c35':'#294650';c.lineWidth=.35*z;c.stroke();}}
};
const setupP03=P01B.setup.bind(P01B);P01B.setup=function(){setupP03();P03.init();};
