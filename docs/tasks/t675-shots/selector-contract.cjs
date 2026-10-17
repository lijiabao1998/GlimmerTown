'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../../..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),src=fs.readFileSync(path.join(__dirname,'selector675.js'),'utf8');
const preview=html.split('\n').find(l=>l.startsWith('function t596On('));
assert(html.includes(src.trim()),'runtime selector must be exact tested source');
assert(html.includes(fs.readFileSync(path.join(__dirname,'art675.js'),'utf8').trim()),'runtime bake must be exact reviewed source');
let count=2;
function probe(mode,hash=.01,b={k:3,lv:2}){let baked=0;const ctx={window:{},location:{search:mode==='url-preview'?'?T596=1':mode==='url-valve'?'?noT675=1':''},Map,Math,season:()=>1,streetHash:()=>hash,bake675:(v,winter,season)=>{baked++;return {v,winter,season};}};if(mode==='window-preview')ctx.window.__t596=true;if(mode==='window-valve')ctx.window.__noT675=true;vm.createContext(ctx);vm.runInContext(preview+'\n'+src+'\nthis.spr=spr675;this.variant=variant675;',ctx);return {ctx,result:ctx.spr(b,12,21,false),baked:()=>baked};}
for(const mode of['off','window-preview','url-preview','window-valve','url-valve']){const p=probe(mode);assert(mode==='off'?p.result&&p.result.v===0:p.result===null,mode);assert.equal(p.baked(),mode==='off'?1:0);count++;}
for(let i=0;i<22;i++){const p=probe('off',(i+.1)/22);assert.equal(p.ctx.variant({k:3,lv:2},0,0),i<10?i:-1);count++;}
for(const b of[null,{k:1,lv:2},{k:2,lv:2},{k:3,lv:1},{k:3,lv:3},{k:3,lv:2,sz:2},{k:3,lv:2,ref:1},{k:3,lv:2,lot574:1}]){assert.equal(probe('off',.01,b).result,null);count++;}
const p=probe('off'),b=Object.freeze({k:3,lv:2,v:7,age:15}),before=JSON.stringify(b),a=p.ctx.spr(b,12,21,false);assert.strictEqual(p.ctx.spr(b,12,21,false),a);assert.equal(p.baked(),1);assert.equal(JSON.stringify(b),before);p.ctx.window.__noT675=true;assert.equal(p.ctx.spr(b,12,21,false),null);p.ctx.window.__noT675=false;assert.strictEqual(p.ctx.spr(b,12,21,false),a);p.ctx.window.__t596=true;assert.equal(p.ctx.spr(b,12,21,false),null);count+=6;
const cacheProbe=probe('off');for(let sea=0;sea<4;sea++)for(const winter of[false,true])for(let i=0;i<10;i++){cacheProbe.ctx.season=()=>sea;cacheProbe.ctx.streetHash=()=>(i+.1)/22;const r=cacheProbe.ctx.spr({k:3,lv:2},10,20,winter);assert.equal(r.v,i);assert.equal(r.season,sea);assert.equal(r.winter,winter);assert(cacheProbe.ctx.spr.cache.size<=50);count++;}assert.equal(cacheProbe.ctx.spr.cache.size,50);
// Negative controls must expose a missing preview guard and a widened kind selector.
assert.throws(()=>{const bad=src.replace('||t596On()',''),q={window:{__t596:true},location:{search:''},Map,Math,season:()=>1,streetHash:()=>.01,bake675:()=>({})};vm.createContext(q);assert.equal(vm.runInContext(preview+'\n'+bad+'\nspr675({k:3,lv:2},0,0)',q),null);},assert.AssertionError);
assert.throws(()=>{const bad=src.replace('b.k!==3','b.k!==1'),q={window:{},location:{search:''},Map,Math,season:()=>1,streetHash:()=>.01,bake675:()=>({})};vm.createContext(q);assert.equal(vm.runInContext(preview+'\n'+bad+'\nspr675({k:1,lv:2},0,0)',q),null);},assert.AssertionError);
console.log(JSON.stringify({status:'pass',checks:count,negativeControls:2,scope:'runtime source equality plus isolated selector; no draw or Chrome claim'}));
