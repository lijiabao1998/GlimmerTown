const fs=require('fs'),cp=require('child_process');
cp.execFileSync(process.execPath,['build.cjs'],{cwd:'../port-p03',stdio:'inherit'});
let h=fs.readFileSync('../port-p03/native-preview.html','utf8');
function patch(a,b){if(h.split(a).length!==2)throw Error('Nonunique P04 anchor '+a);h=h.replace(a,b);}
patch('function drawMeasuredP01C(dt){','function drawMeasuredP01C(dt){\n if(window.P04)P04.begin();');
patch('  objs.sort((a,b2)=>a.dep-b2.dep);','  if(window.P04?.active())for(const p of P04.objects())objs.push({dep:p.dep,p04:p});\n  objs.sort((a,b2)=>a.dep-b2.dep);');
patch('    if(o.p03){','    if(o.p04){ctx.save();P04.paint(ctx,o.p04,(x,y,h=0)=>[sxOf(x,y)+32*z,syOf(x,y)+16*z-h*z,h],z,b);ctx.restore();continue;}\n    if(o.p03){');
patch('for(let row=0;row<2;row++)for(let col=0;col<3;col++)box(',"for(let row=0;row<2;row++)for(let col=0;col<3;col++)if(window.P04?.active()&&row===1&&col===0&&!P04.onShip()){groups.push({faces:[],dep:0,lo:7});}else box(");
patch('const p=this.plan.at(this.time());this.frame=p;','const p=window.P04?.active()&&P04.frame?P04.frame.ship:this.plan.at(this.time());this.frame=p;');
patch('})();\n</script>\n<details',['geometry.js','transfer-state.js','transfer-occlusion.js','transfer-bridge.js'].map(p=>fs.readFileSync(p,'utf8')).join('\n')+'\n})();\n</script>\n<details');
h=h.replace('P03 船舶進出港候選','P04 船岸貨櫃交接候選').replace('船舶導航示範，無經濟或真實流體動力學。','單件真實交接候選，無正式經濟帳或真實物理驗證。');
h=h.replace('岸橋16秒空載循環。船舶完整循環約127秒，初始暫停。','P04首航延長54秒，僅第3岸橋交接1件；完成後貨櫃永久留場，重設才還原。<br><button onclick="P04.toggle()">P04開／關</button><button onclick="P04.seek(P04.plan.start+14000)">裝卸對位</button><button onclick="P04.seek(P04.plan.pickup+2000)">吊起畫面</button><button onclick="P04.seek(P04.plan.delivery+1000)">交付畫面</button><output id="p04Status"></output><br>');
h=h.replace('max="127"','max="182"');
h=h.replace('</body>','<script>setInterval(()=>{const o=document.getElementById("p04Status");if(o&&window.P04)o.textContent=P04.status();},150);</script></body>');
fs.writeFileSync('native-preview.html',h);
