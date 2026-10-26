/* T677：正式模型清冊；直接呼叫相同繪製器，不使用fixture城市／物流重播。 */
function art677(emit){
  if(!t677On())return;
  const saved={day,viewRot,phase:P01B.phase,frame:P04.frame,layout:P06.layout};
  const model=p=>p.type+(p.type==='box'?p.color:p.type==='slab'?(p.y===12.5?'-marking':'-rail'):'');
  const samples=P01B.parts.filter((p,i,a)=>p.type!=='reserve'&&a.findIndex(q=>model(q)===model(p))===i);
  try{
    P06.layout=null;
    for(const sea of[0,1,2,3])for(const night of[false,true])for(let r=0;r<4;r++){
      day=[1,101,201,301][sea];viewRot=r;P01B.phase=night?0:55;
      const make=(key,x,y,paint)=>{const c=document.createElement('canvas');c.width=256;c.height=192;const g=c.getContext('2d'),origin=isoW2V((x-y)*TW/2,(x+y)*TH/2,0),project=(a,b,h=0)=>{const p=isoW2V((a-b)*TW/2,(a+b)*TH/2,0);return[128+p[0]-origin[0],140+p[1]-origin[1]-h];};paint(g,project);emit('art677',[key,sea,night?1:0,r].join('_'),{img:c});};
      for(const p of samples)make(model(p),p.x,p.y,(c,P)=>{if(p.type==='crane'){P02.paintAssembly.call(P01B,c,p,P,1,1);const b=QuayMotion.bodies(p,0,0);P02.paint(c,{geometry:b},P,1,1);P02.paintAssembly.call(P01B,c,p,P,1,1,true);}else P01B.paint(c,p,P,1,1);});
      const cargo=ContainerTransfer.CARGO;make('transfer-cargo',0,0,(c,P)=>P01B.paint(c,{type:'box',x:0,y:0,w:cargo.length,d:cargo.width,h:cargo.height,color:cargo.color,base:2},P,1,1));
      P04.frame={ship:{visible:true,x:0,y:0,angle:0},owner:'ship'};
      const vessel=P03.objects.call({active:()=>true,plan:null,time:()=>0});
      make('vessel',0,0,(c,P)=>{for(const o of vessel)P03.paint(c,o,P,1);});
      const land={frame:{truck:{x:0,y:0,angle:0},owner:'truck'}};
      make('truck',0,0,(c,P)=>P05.rawPaint.call(land,c,{kind:'truck'},P,1));
      make('gate',22,31.5,(c,P)=>P05.rawPaint.call(land,c,{kind:'gate'},P,1));
      make('landside-crane',29.5,32.8,(c,P)=>{for(const body of LandsideGeometry.craneBodies())P05.rawPaint.call(land,c,{kind:'crane',body},P,1);});
    }
  }finally{day=saved.day;viewRot=saved.viewRot;P01B.phase=saved.phase;P04.frame=saved.frame;P06.layout=saved.layout;}
}
