/* T652 獨立英式店屋樣張；沒有遊戲接線、不寫 SPR、不取世界亂數。 */
(function(root){
  'use strict';
  /* 每個量體：[u,v,du,dv,簷高,樓層,屋頂,屋脊高]；一格=64×32原生像素。 */
  const designs=[
    {id:'W01-01',name:'藥劑師店',label:'CHEMIST',brick:'#a87755',trim:'#d0bfa1',shop:'#344d46',m:[[.12,.12,.76,.72,25,2,'parapet',3]],door:.5,chimney:[.23,.3,29],detail:'recess'},
    {id:'W01-02',name:'五金行',label:'IRON',brick:'#945b47',trim:'#baa78c',shop:'#40515a',m:[[.1,.12,.48,.72,30,2,'gable',9],[.58,.24,.3,.6,12,1,'lean',4]],door:.33,chimney:[.22,.3,37],detail:'loading'},
    {id:'W01-03',name:'魚販店',label:'FISH',brick:'#c3b59a',trim:'#e0d4ba',shop:'#335661',m:[[.11,.1,.78,.28,23,1,'gable',6],[.11,.38,.78,.47,13,1,'flat',0]],door:.5,detail:'awning'},
    {id:'W01-04',name:'修鞋鋪',label:'SHOES',brick:'#a86b50',trim:'#cab797',shop:'#52443a',m:[[.23,.1,.52,.68,31,3,'gable',11],[.23,.78,.26,.11,8,1,'lean',2]],door:.35,chimney:[.3,.26,40],detail:'side-entry'},
    {id:'W01-05',name:'裁縫店',label:'TAILOR',brick:'#ae8b68',trim:'#d7cbb4',shop:'#344954',m:[[.09,.13,.82,.72,36,3,'butterfly',5]],door:.43,chimney:[.18,.3,41],detail:'studio'},
    {id:'W01-06',name:'鐘錶店',label:'CLOCKS',brick:'#a86750',trim:'#d7c4a3',shop:'#31524d',m:[[.14,.13,.67,.6,29,2,'hip',9],[.59,.73,.22,.13,23,2,'bay',4]],door:.22,chimney:[.25,.27,35],detail:'clock'},
    {id:'W01-07',name:'花店',label:'FLOWERS',brick:'#b4785b',trim:'#d2c3a3',shop:'#486246',m:[[.12,.1,.48,.42,28,2,'gable',9],[.12,.52,.48,.33,11,1,'glass',6]],door:.6,chimney:[.23,.23,36],detail:'garden'},
    {id:'W01-08',name:'自行車店',label:'CYCLES',brick:'#9f6b51',trim:'#cbbd9f',shop:'#354e5a',m:[[.1,.1,.79,.48,16,1,'barrel',8],[.1,.58,.34,.27,24,2,'flat',1]],door:.53,detail:'cycle'},
    {id:'W01-09',name:'攝影館',label:'PHOTO',brick:'#96765f',trim:'#d6c9b0',shop:'#3c4859',m:[[.1,.11,.76,.68,29,2,'northlight',11]],door:.5,chimney:[.17,.24,32],detail:'studio'},
    {id:'W01-10',name:'理髮店',label:'BARBER',brick:'#ad7359',trim:'#d0bf9f',shop:'#443e47',m:[[.14,.12,.56,.69,26,2,'cross',9],[.7,.35,.19,.46,11,1,'lean',3]],door:.3,chimney:[.22,.26,34],detail:'barber'}
  ];
  const palettes={spring:'#839779',summer:'#75896a',autumn:'#99845f',winter:'#8d9689'};
  function validate(list=designs){
    const ids=new Set(),signatures=new Set();
    if(list.length!==10)throw Error('count: expected exactly ten designs');
    for(const d of list){
      if(ids.has(d.id))throw Error('identity: duplicate '+d.id);ids.add(d.id);
      const signature=JSON.stringify(d.m);if(signatures.has(signature))throw Error('structure: duplicate mass plan '+d.id);signatures.add(signature);
      for(const m of d.m){const[u,v,du,dv,h,f,roof,pitch]=m;
        if(![u,v,du,dv,h,f,pitch].every(Number.isFinite)||u<.07||v<.07||du<=0||dv<=0||u+du>.94||v+dv>.94||h<7||h>40||pitch<0||pitch>12)throw Error('footprint: invalid mass '+d.id);
        if(!['parapet','gable','lean','flat','butterfly','hip','bay','glass','barrel','northlight','cross'].includes(roof))throw Error('roof: unsupported '+d.id);
      }
      for(let i=0;i<d.m.length;i++)for(let j=i+1;j<d.m.length;j++){const a=d.m[i],b=d.m[j];if(Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])>1e-6&&Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1])>1e-6)throw Error('intersection: overlapping masses '+d.id);}
    }
    return {count:ids.size,structuralPlans:signatures.size};
  }
  function render(canvas,d,state={}){
    const rot=((state.rot||0)%4+4)%4,sea=state.season||'summer',snow=!!state.snow,night=!!state.night;
    canvas.width=100;canvas.height=112;const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,100,112);
    const turn=(u,v)=>rot===0?[u,v]:rot===1?[1-v,u]:rot===2?[1-u,1-v]:[v,1-u];
    const P=(u,v,z=0)=>{const[a,b]=turn(u,v);return[Math.round(50+(a-b)*32),Math.round(76+(a+b)*16-z)];};
    const color=(c,n=0)=>{const k=night?.54:1;return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round((parseInt(c.slice(i,i+2),16)+n)*k))).toString(16).padStart(2,'0')).join('');};
    const poly=(ps,c,lit=false)=>{g.fillStyle=lit?c:color(c);g.beginPath();ps.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();};
    const line=(a,b,c,w=1)=>{g.strokeStyle=color(c);g.lineWidth=w;g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();};
    const rect=(u,v,du,dv,z,c)=>poly([P(u,v,z),P(u+du,v,z),P(u+du,v+dv,z),P(u,v+dv,z)],c);
    const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    rect(0,0,1,1,0,snow?'#dce4df':palettes[sea]);
    rect(.06,.83,.88,.12,.1,'#a99b88');
    function mass(m){
      const[u,v,du,dv,h,f,roof,pitch]=m;
      const corners=[[u,v],[u+du,v],[u+du,v+dv],[u,v+dv]],projected=corners.map(p=>P(...p)),top=corners.map(p=>P(...p,h));
      const visible=[];for(let i=0;i<4;i++){const j=(i+1)%4,a=projected[i],b=projected[j];if(b[0]<a[0])visible.push({i,j,depth:(a[1]+b[1])/2});}
      visible.sort((a,b)=>a.depth-b.depth);
      for(const {i,j}of visible){
        const a=projected[i],b=projected[j],ta=top[i],tb=top[j],shade=i===1?0:-24;
        poly([a,b,tb,ta],shade?color(d.brick,-16):d.brick);
        const at=(t,z)=>{const p=lerp(a,b,t);return[p[0],p[1]-z];};
        for(let z=3;z<h-2;z+=4){line(at(0,z),at(1,z),'#8e6f5b');for(let t=(Math.round(z/4)%2)*.12+.06;t<1;t+=.24)line(at(t,z),at(t,z-2),'#987962');}
        line(at(0,2),at(1,2),d.trim,2);line(at(0,h-1),at(1,h-1),d.trim,2);
        const width=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.round(width/10));
        for(let floor=0;floor<f;floor++)for(let q=0;q<count;q++){
          const t=(q+.5)/count,half=.26/count,z0=floor*h/f+4,z1=Math.min(h-4,z0+(floor===0?7:6));if(z1<=z0)continue;
          poly([at(t-half,z0-1),at(t+half,z0-1),at(t+half,z1+1),at(t-half,z1+1)],d.trim);
          poly([at(t-half+.035,z0),at(t+half-.035,z0),at(t+half-.035,z1),at(t-half+.035,z1)],night?'#f1d39b':'#415a64',night);
          line(at(t,z0),at(t,z1),d.trim);line(at(t-half,z0+3),at(t+half,z0+3),d.trim);
        }
        if(i===2&&dv>.3){const t=d.door||.5,half=.07;poly([at(t-half,1),at(t+half,1),at(t+half,10),at(t-half,10)],d.shop);line(at(t-half,10),at(t+half,10),d.trim,2);const c=at(t,5);g.fillStyle='#bea578';g.fillRect(c[0],c[1],1,1);}
      }
      const rc=snow?'#e5ece7':'#55616a',rd=snow?'#c3d3d0':'#3d4b56';
      if(['flat','parapet','bay'].includes(roof)){poly(top,rc);if(roof==='parapet')for(let i=0;i<4;i++)line(top[i],top[(i+1)%4],d.trim,2);}
      else if(roof==='hip'){
        const a=P(u+du*.5,v+dv*.22,h+pitch),b=P(u+du*.5,v+dv*.78,h+pitch);poly([top[0],top[1],a],rd);poly([top[0],a,b,top[3]],rc);poly([top[1],top[2],b,a],rd);poly([top[3],b,top[2]],rc);
      }else if(roof==='barrel'){
        for(let j=0;j<6;j++){const t=j/6,t1=(j+1)/6,z=h+Math.sin(t*Math.PI)*pitch,z1=h+Math.sin(t1*Math.PI)*pitch;poly([P(u+du*t,v,z),P(u+du*t1,v,z1),P(u+du*t1,v+dv,z1),P(u+du*t,v+dv,z)],j<3?rc:rd);}
      }else if(roof==='lean'||roof==='northlight'){
        const z=h+pitch;poly([P(u,v,z),top[1],top[2],P(u,v+dv,z)],roof==='northlight'&&!snow?'#7c999f':rc);poly([P(u,v+dv,z),top[2],top[3]],d.brick);
        if(roof==='northlight')for(let t=.15;t<1;t+=.2)line(P(u+du*t,v,h+pitch*(1-t)),P(u+du*t,v+dv,h+pitch*(1-t)),d.trim);
      }else{
        const inv=roof==='butterfly',z=h+(inv?0:pitch),e=h+(inv?pitch:0),a=P(u+du*.5,v,z),b=P(u+du*.5,v+dv,z),edges=corners.map(p=>P(...p,e));
        poly([edges[0],a,b,edges[3]],roof==='glass'&&!snow?'#86a4a5':rc);poly([a,edges[1],edges[2],b],rd);poly([edges[3],edges[2],b],d.brick);line(a,b,snow?'#f0f3f0':'#879093');
        if(roof==='glass')for(let t=.2;t<1;t+=.2)line(lerp(edges[0],edges[3],t),lerp(a,b,t),d.trim);
        if(roof==='cross'){const c=P(u+du*.2,v+dv*.64,h+pitch+1);poly([P(u,v+dv*.45,h),c,P(u+du*.55,v+dv,h)],rc);}
      }
      if(!snow)for(let i=0;i<3;i++)line(lerp(top[0],top[3],(i+1)/4),lerp(top[1],top[2],(i+1)/4),'#596773');
    }
    d.m.map(m=>({m,depth:turn(m[0]+m[2]/2,m[1]+m[3]/2).reduce((a,b)=>a+b,0)})).sort((a,b)=>a.depth-b.depth).forEach(o=>mass(o.m));
    if(d.chimney){const[u,v,h]=d.chimney;const a=P(u,v,h);g.fillStyle=color('#855746');g.fillRect(a[0]-2,a[1]-6,4,7);g.fillStyle=color(d.trim);g.fillRect(a[0]-3,a[1]-6,6,2);}
    if(d.detail==='garden')for(const [u,v]of[[.74,.3],[.8,.55],[.73,.78]]){const p=P(u,v,4);g.fillStyle=color(sea==='autumn'?'#a57b40':'#547143');g.fillRect(p[0]-3,p[1]-3,6,5);g.fillStyle=color(snow?'#e4ece6':'#c59a99');g.fillRect(p[0]-2,p[1]-4,2,2);}
    if(d.detail==='awning'){const m=d.m[1];rect(m[0],.84,m[2],.08,12,snow?'#e4e9e2':d.shop);}
    if(d.detail==='barber'){const p=P(.76,.79,9);g.fillStyle=color('#e4d3bc');g.fillRect(p[0],p[1]-7,2,8);g.fillStyle=color('#a95547');for(let z=0;z<7;z+=3)g.fillRect(p[0],p[1]-z,2,1);}
    if(d.detail==='clock'){const p=P(.47,.73,25);g.fillStyle=color('#dbcaa3');g.fillRect(p[0]-2,p[1]-2,5,5);line(p,[p[0],p[1]-2],'#3b4141');line(p,[p[0]+2,p[1]+1],'#3b4141');}
    return canvas;
  }
  const api={designs,validate,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Wave652=api;
})(typeof window!=='undefined'?window:globalThis);
