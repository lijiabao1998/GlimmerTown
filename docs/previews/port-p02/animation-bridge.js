// Runs inside the original game closure, using native projection and depth sorting.
const QuayMotion=window.QuayMotion;
const P02=window.P02={clock:QuayMotion.clock(),enabled:!new URLSearchParams(typeof location==='object'?location.search:'').has('noP02'),frameTime:0,
 active(){return this.enabled&&!window.__noHarborP01B&&!!window.P01B;},
 time(){return this.clock.time(performance.now());},
 play(){this.clock.play(performance.now());},pause(){this.clock.pause(performance.now());},
 reset(){this.clock.reset(performance.now());P01B.redraw();},
 seek(ms){this.clock.seek(ms,performance.now());P01B.redraw();},
 toggle(){this.enabled=!this.enabled;P01B.redraw();},
 objects(){this.frameTime=this.time();return P01B.parts.filter(p=>p.type==='crane').flatMap((p,i)=>{const b=QuayMotion.bodies(p,this.frameTime,i),y=p.y+b.pose.y,dep=viewDep(p.x+20,y+20)+.002;return[{type:'craneMotion',x:p.x,y,w:.8,d:.24,h:66,geometry:b,index:i,dep},{upper:true,crane:p,dep:Math.max(dep,viewDep(p.x+20,p.y+20)+.001)+.001}];});},
 paint(c,p,P,z,bright){const night=P01B.phase===0,g=p.geometry;
 const poly=(pts,color)=>{c.fillStyle=color;c.beginPath();pts.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q);});c.closePath();c.fill();};
 const box=(b,col)=>{const {x0,x1,y0,y1,z0,z1}=b;const faces=[[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]],[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]],[[x1,y1,z0],[x0,y1,z0],[x0,y1,z1],[x1,y1,z1]],[[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1]]];faces.sort((a,b)=>a.reduce((n,v)=>n+viewDep(v[0]+20,v[1]+20),0)-b.reduce((n,v)=>n+viewDep(v[0]+20,v[1]+20),0));faces.forEach((f,i)=>{poly(f,col);poly(f,`rgba(0,0,0,${[.05,.20,.12,.30][i]})`);});poly([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],season()===3?'#dce4df':col);};
 box(g.spreader,night?'#b4a35e':'#e2b84f');
 for(const r of g.ropes){c.strokeStyle=night?'#bac8ca':'#33474d';c.lineWidth=.7*z;c.beginPath();c.moveTo(...P((r.x0+r.x1)/2,(r.y0+r.y1)/2,r.z0));c.lineTo(...P((r.x0+r.x1)/2,(r.y0+r.y1)/2,r.z1));c.stroke();}
 box(g.trolley,night?'#b2a671':'#efd278');
 }
};
