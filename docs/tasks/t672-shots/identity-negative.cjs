/* T672：執行原 drawOrder helper 與原 G23f 斷言，測未知／漏畫影像不能計數。 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../../../test_fixde.js'),'utf8');
const start=src.indexOf('  drawOrder:(points,z,night)=>'),end=src.indexOf('  ground:lotGround574',start),helper=src.slice(start,end).trim().replace(/^drawOrder:/,'').replace(/,$/,'');
const mark=src.indexOf("'T574 G23f 真實draw"),check=src.slice(src.lastIndexOf('      assert(',mark),src.indexOf('\n',mark)+1);
function run(mode){let count=0;for(let r=0;r<4;r++)for(const z of[.75,1.5,2])for(const night of[false,true]){
 const points=[{id:'mall',x:24,y:24,k:65,n:5},{id:'house',x:24,y:29,k:1,n:1},{id:'oldStadium',x:29,y:24,k:9,n:2},{id:'school',x:21,y:24,k:7,n:3},{id:'police',x:24,y:22,k:11,n:2}],images=points.map(p=>({name:p.id})),actual={name:'independent-house'},unknown={name:'wrong-image'},tiles=[];
 const idx=(x,y)=>x*100+y;points.forEach(p=>tiles[idx(p.x,p.y)]={bld:{k:p.k,sz:p.n}});
 const C={Map,Math,JSON,assert,points,r,z,night,tiles,idx,cam:{x:0,y:0,z:1},ctx:{drawImage(){}},SPR:{bld:Object.fromEntries(points.map((p,i)=>[p.k+'_1_0',{img:images[i]}]))},visT:55,shakeT:0,zoomAnim:null,tool:'pan',selTile:null,weather:0,groundDirty:false,lotObjectOrder574:a=>a,lotOrder574:a=>Object.assign(a,{cycles574:0}),lotNightLayer574:()=>{},lotViewBase574:()=>[0,0],reflectSprite:()=>({img:actual})};
 C.draw=()=>{C.lotOrder574([],true);C.lotObjectOrder574(points.map(p=>({x:p.x,y:p.y,t:tiles[idx(p.x,p.y)]})));for(let i=0;i<points.length;i++){if(i===1&&mode==='not-drawn')continue;C.ctx.drawImage(i===1?(mode==='wrong-image'?unknown:actual):images[i]);}if(night)C.lotNightLayer574(points.map(()=>({occlude574:true})));};
 let body=helper;if(mode==='missing-recognition')body=body.split('\n').filter(l=>!l.includes('const s=reflectSprite(b,p.x,p.y)')).join('\n');
 vm.createContext(C);vm.runInContext('q=('+body+')(points,z,night);'+check,C);count++;
 }return count;}
const passed=run('good'),negative=[];for(const mode of['missing-recognition','not-drawn','wrong-image']){let reason='';try{run(mode);}catch(e){reason=e.message;}assert(reason.includes('T574 G23f'),'negative must fail original G23f: '+mode);negative.push({mode,firstFailure:reason.split('\n')[0]});}
console.log(JSON.stringify({passed,originalHelper:true,originalAssertion:true,negative},null,2));
