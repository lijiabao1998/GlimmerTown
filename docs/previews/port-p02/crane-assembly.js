// Native queue splits lower frame, moving rig and upper boom into separate nodes.
// Lower frame y <=14.755, motion y>=15.06. Upper boom z>=68, motion z<=66.
P02.paintAssembly=function(c,p,P,z,bright,upperOnly=false){const base=p.base||0,night=this.phase===0,winter=season()===3;
 const poly=(a,color)=>{c.beginPath();a.forEach((v,i)=>{const q=P(...v);i?c.lineTo(...q):c.moveTo(...q)});c.closePath();c.fillStyle=color;c.fill();};
 const line=(a,b,col,width=1)=>{c.beginPath();c.moveTo(...P(...a));c.lineTo(...P(...b));c.strokeStyle=col;c.lineWidth=width*z;c.stroke();};
 const tint=col=>{const n=parseInt(col.slice(1),16),f=night?.43:1;return `rgb(${(n>>16)*f},${(n>>8&255)*f},${(n&255)*f})`;};
 const box=(x,y,w,d,h,col,lo=0)=>{const x0=x-w/2,x1=x+w/2,y0=y-d/2,y1=y+d/2;const faces=[[[x0,y0,lo],[x1,y0,lo],[x1,y0,lo+h],[x0,y0,lo+h]],[[x1,y0,lo],[x1,y1,lo],[x1,y1,lo+h],[x1,y0,lo+h]],[[x1,y1,lo],[x0,y1,lo],[x0,y1,lo+h],[x1,y1,lo+h]],[[x0,y1,lo],[x0,y0,lo],[x0,y0,lo+h],[x0,y1,lo+h]]];faces.sort((a,b)=>a.reduce((n,v)=>n+viewDep(v[0]+20,v[1]+20),0)-b.reduce((n,v)=>n+viewDep(v[0]+20,v[1]+20),0));for(let fi=0;fi<faces.length;fi++){poly(faces[fi],tint(col));poly(faces[fi],`rgba(0,0,0,${[.05,.20,.12,.30][fi]})`);}poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],winter?'#dce4df':tint(col));if(!winter)poly([[x0,y0,lo+h],[x1,y0,lo+h],[x1,y1,lo+h],[x0,y1,lo+h]],'rgba(255,255,255,.16)');};

 const lower=()=>{for(const dx of[-.48,.48])for(const dy of[-.52,.52]){box(p.x+dx,p.y+dy,.12,.15,65,p.color,2);box(p.x+dx,p.y+dy,.22,.22,4,'#283842');}for(const dx of[-.48,.48]){line([p.x+dx,p.y-.52,5],[p.x+dx,p.y+.52,61],tint(p.color),3);line([p.x+dx,p.y+.52,5],[p.x+dx,p.y-.52,61],tint(p.color),3);}box(p.x,p.y,.95,.5,8,p.color,59);box(p.x,p.y+.5,.4,.35,7,'#386b80',56);for(let rung=8;rung<58;rung+=5)line([p.x+.41,p.y-.55,rung],[p.x+.55,p.y-.55,rung],night?'#9e9b7b':'#e9d99a',1);};
 const upper=()=>{for(const dx of[-.48,.48]){line([p.x+dx,p.y-.7,68],[p.x+dx,p.y+2.15,68],tint(p.color),5);line([p.x+dx,p.y-.6,87],[p.x+dx,p.y+2.15,68],tint(p.color),2);line([p.x+dx,p.y-.6,68],[p.x+dx,p.y-.6,87],tint(p.color),3);}for(const dx of[-.5,.5]){box(p.x+dx,p.y,.12,.17,2,'#e9e5bd',68);if(night){const q=P(p.x+dx,p.y,70);c.fillStyle='#fff0b9';c.beginPath();c.arc(...q,2.7*z,0,Math.PI*2);c.fill();}}};
 if(upperOnly)upper();else lower();
};
