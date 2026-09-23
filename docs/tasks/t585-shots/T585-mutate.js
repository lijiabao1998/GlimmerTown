/* T585 拋棄式紅源：node -r ./docs/tasks/t585-shots/T585-mutate.js test_fixde.js
   只在此進程攔截讀入的 index.html，完全不改磁碟產品檔。 */
const fs=require('fs');
const path=require('path');
const read=fs.readFileSync;
const product=path.resolve(__dirname,'..','..','..','index.html');
const cases={
  s16Switch:{
    from:'    if(artOff585())return;\n    const seen=new Set();',
    to:'    if(false&&artOff585())return;\n    const seen=new Set();',
  },
  s16Canvas:{
    from:'    const seen=new Set();\n    const one=(s,kind,v)=>',
    to:'    const seen=new Set();\n    const extraCanvas585=cv(1,1);\n    const one=(s,kind,v)=>',
  },
  drawState:{
    from:'  forceDraw:()=>{draw(.016);return true;},',
    to:'  forceDraw:()=>{draw(.016);money++;return true;},',
  },
  home:{
    from:"    }else if(kind==='home585'){",
    to:"    }else if(false&&kind==='home585'){",
  },
  towerClip:{
    from:'put(ax+leg-3,y0,2,by-y0-5,',
    to:'put(ax+leg+80,y0,2,by-y0-5,',
  },
  farmSkip:{
    from:"for(let v=0;v<16;v++)for(const si of[0,1,2])one(SPR.farmGrow[si][2]['22_1_'+v],'farmSmall',v);",
    to:"for(let v=0;v<15;v++)for(const si of[0,1,2])one(SPR.farmGrow[si][2]['22_1_'+v],'farmSmall',v);",
  },
  farmMissing:{
    from:"    for(let v=0;v<4;v++)for(const suffix of['','_w0','_w2'])one(SPR.bld['1_1_'+v+suffix],'home585',v);\n  }",
    to:"    for(let v=0;v<4;v++)for(const suffix of['','_w0','_w2'])one(SPR.bld['1_1_'+v+suffix],'home585',v);\n    delete SPR.farmGrow[0][2]['22_1_0'];\n  }",
  },
  cropDead:{
    from:"    if(artOff585())return;\n    foot('crop-bed'",
    to:"    if(true)return;\n    foot('crop-bed'",
  },
  cropSwitch:{
    from:"    if(artOff585())return;\n    foot('crop-bed'",
    to:"    if(false)return;\n    foot('crop-bed'",
  },
  graveFlat:{
    from:"  const headstone585=(u,vv)=>{\n    if(artOff585()){",
    to:"  const headstone585=(u,vv)=>{\n    if(true){",
  },
  graveSwitch:{
    from:"  const headstone585=(u,vv)=>{\n    if(artOff585()){",
    to:"  const headstone585=(u,vv)=>{\n    if(false){",
  },
};
const pick=cases[process.env.T585_MUTATE];
if(!pick)throw Error('Set T585_MUTATE to '+Object.keys(cases).join('/'));
fs.readFileSync=function(file,options){
  const result=read.apply(this,arguments);
  if(typeof file!=='string'||path.resolve(file)!==product||options!=='utf8')return result;
  if(typeof result!=='string'||result.split(pick.from).length!==2)throw Error('T585 mutation anchor not unique');
  return result.replace(pick.from,pick.to);
};
