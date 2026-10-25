const fs=require('fs'),cp=require('child_process');
cp.execFileSync(process.execPath,['build.cjs'],{cwd:'../port-p02',stdio:'inherit'});
let h=fs.readFileSync('../port-p02/native-preview.html','utf8');
function patch(a,b){if(h.split(a).length!==2)throw Error('Nonunique P03 anchor '+a);h=h.replace(a,b);}
patch('  objs.sort((a,b2)=>a.dep-b2.dep);','  if(window.P03?.active())for(const p of P03.objects())objs.push({dep:p.dep,p03:p});\n  objs.sort((a,b2)=>a.dep-b2.dep);');
patch('    if(o.p02){','    if(o.p03){ctx.save();P03.paint(ctx,o.p03,(x,y,h=0)=>[sxOf(x,y)+32*z,syOf(x,y)+16*z-h*z],z);ctx.restore();continue;}\n    if(o.p02){');
patch('})();\n</script>\n<details',fs.readFileSync('vessel-navigation.js','utf8')+'\n'+fs.readFileSync('vessel-bridge.js','utf8')+'\n})();\n</script>\n<details');
h=h.replace('P02 空載岸橋作業候選','P03 船舶進出港候選').replace('僅美術預覽；無經濟流量或新船舶邏輯。','船舶導航示範，無經濟或真實流體動力學。');
h=h.replace('16 秒循環，初始暫停，空載示範。','岸橋16秒空載循環。船舶完整循環約127秒，初始暫停。<br><button onclick="P03.play()">船舶播放</button><button onclick="P03.pause()">船舶暫停</button><button onclick="P03.reset()">船舶重設</button><button onclick="P03.toggle()">P03開／關</button><button onclick="P03.seek(P03.plan.phases.find(p=>p.name===\'berthed\').start)">靠泊畫面</button><br><input aria-label="船舶時間" type="range" min="0" max="127" step=".1" oninput="P03.seek(+this.value*1000)"><button onclick="GV.setZoom(.4);GV.lookAt(34,53)">全航道</button><button onclick="GV.setZoom(1.05);GV.lookAt(29,35)">港口近景</button>');
fs.writeFileSync('native-preview.html',h);
