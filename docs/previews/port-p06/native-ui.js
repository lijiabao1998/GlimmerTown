/* 只讀呈現＋明確玩家動作；不包裝、不修改 P06 狀態機及原生輸入處理。 */
(()=>{
  'use strict';
  const byId=id=>document.getElementById(id),panel=byId('p06-panel'),select=byId('p06-port'),diagnostics=byId('p06-diagnostics');
  let ports=[],checked=null,checking=false,discovered=false,boundsQueued=false,lastReasons='';
  const text=(id,value)=>{const e=byId(id),s=String(value);if(e.textContent!==s)e.textContent=s;};
  const friendly={NO_CITY:'請先開啟城市',PORT_MISSING:'找不到可營運港口',LAYOUT_CHANGED:'港區配置已變動，營運已暫停',RESET_REQUIRED:'這批貨物仍屬於原港口，切換港口前需重設候選帳',WORLD_REPLACED:'城市已重新載入，請先重設候選帳',PLAN_GEOMETRY_CHANGED:'貨運路線已變動，請先重設候選帳',PORT_SIZE:'港口尺寸不適用',PORT_CONSTRUCTION:'港口仍在施工中',APRON_BLOCKED:'岸橋或堆場空間不足',SHORE_DIRECTION:'靠岸方向缺少完整水岸',DOCK_MISSING:'岸線缺少碼頭',EQUIPMENT_BLOCKED:'港區設備空間被占用',CRANE_OCCUPIED:'岸橋作業範圍被占用',ROAD_GATE:'貨車接駁或出閘道路不通',WAREHOUSE_UNREACHABLE:'找不到道路連通的倉庫',FREIGHT_UNREACHABLE:'找不到道路連通的貨運站',GATE_OCCUPIED:'出閘空間被占用',LANDSIDE_SWEEP:'陸側吊架作業範圍被占用',WATER_ROUTE:'船舶進出航道不通',HANDOFF_GEOMETRY:'貨物交接空間不安全'};
  const portLabel=p=>{const i=ports.findIndex(v=>v.key===p?.key),w=P06.world().cells,l=P06.worldCells===w?P06.layout:null,c=checked?.portKey===p?.key&&checked.cells===w&&checked.revision===P06.revision?checked:null;return'港口 '+(i<0?'（原港）':i+1)+(l?.port.key===p?.key?' · '+l.orientation:c?.orientation?' · '+c.orientation:' · 待檢查');};
  function currentCheck(){return checked&&checked.portKey===select.value&&checked.cells===P06.world().cells&&checked.revision===P06.revision?checked:null;}
  function discover(){
    const previous=select.value,inv=P06.scan();ports=inv.ports;discovered=true;
    select.replaceChildren(...ports.map(p=>{const o=document.createElement('option');o.value=p.key;o.textContent=portLabel(p);return o;}));
    if(!ports.length){const o=document.createElement('option');o.value='';o.textContent=inv.reasons?.[0]?.code==='NO_CITY'?'請先開啟城市':'城市中沒有港口';select.append(o);}
    select.value=ports.some(p=>p.key===previous)?previous:ports.some(p=>p.key===P06.layout?.port.key)?P06.layout.port.key:ports[0]?.key||'';
    select.disabled=!ports.length;render();return inv;
  }
  function render(){
    if(!window.P06)return;
    const s=P06.inspect(),c=currentCheck(),counts=s.frame?.counts,selected=select.value,ledgerKey=s.layout?.port.key;
    const frozen=s.frame&&s.reasons.filter(r=>['WORLD_REPLACED','RESET_REQUIRED','PLAN_GEOMETRY_CHANGED','LAYOUT_CHANGED'].includes(r.code));
    const reasons=s.enabled?s.reasons:frozen?.length?frozen:c?.errors||(discovered&&!ports.length?[{code:P06.world().cells.length?'PORT_MISSING':'NO_CITY',message:P06.world().cells.length?'城市沒有原生港口 k18':'請先開啟正常城市'}]:[]);
    let status='尚未啟用營運',note='檢查布局不會啟用或搬動貨物。',tone='idle',chip='未啟用';
    if(s.enabled){
      if(reasons.length){status=friendly[reasons[0].code]||'港區暫時無法營運';note='貨物與營運時間保留；修復後重新檢查。';tone='blocked';chip='需檢查';}
      else if(s.active){status=s.mode==='replay'?'固定時間重播中':counts?.dispatched?'本批交接已完成':'營運已啟用';note=s.mode==='replay'?'這是驗收重播，不是城市產量。':'跟隨城市時間；暫停與速度由城市控制。';tone='ready';chip=s.mode==='replay'?'重播中':'已啟用';}
      else{status='營運尚未開始';note=window.__noP06?'候選回退開關已關閉營運。':'請檢查港區布局。';}
    }else if(reasons.length){status=friendly[reasons[0].code]||'港區暫時無法營運';note='查看詳細原因，調整城市後重新檢查。';tone='blocked';}
    else if(c?.valid){status='布局檢查通過 · 尚未啟用';note='按「啟用營運」開始；啟用時會再次核對貨物帳。';tone='ready';}
    else if(counts){status='營運已停用';note='貨物與時間已保留，可再次啟用。';}
    if(checking){status='正在檢查港區…';note='只核對真實地格、航道與道路。';}
    if(selected&&ledgerKey&&selected!==ledgerKey&&counts)note='已選擇另一座港口；下方貨物仍屬於'+portLabel(s.layout.port)+'。';
    text('p06-player-status',status);text('p06-player-note',note);text('p06-chip-status',chip);byId('p06-state-card').dataset.tone=tone;
    for(const name of['ship','yard','truck','dispatched'])text('p06-count-'+name,counts?counts[name]:'—');
    text('p06-cargo-note',counts?(counts.crane?'岸橋正在交接 '+counts.crane+' 件 · 全港共 '+counts.total+' 件':'全港共 '+counts.total+' 件 · 同一批貨物'):'尚未啟用候選貨物帳');
    byId('p06-enable').hidden=s.enabled;byId('p06-disable').hidden=!s.enabled;byId('p06-enable').disabled=checking||!ports.length;byId('p06-scan').disabled=checking;
    text('p06-scan',checking?'檢查中…':c||s.enabled?'重新檢查':'檢查港區');byId('p06-live-player').hidden=s.mode!=='replay';
    byId('p06-reasons').hidden=!reasons.length;
    const reasonText=JSON.stringify(reasons);if(reasonText!==lastReasons){lastReasons=reasonText;byId('p06-reason-list').replaceChildren(...reasons.map(r=>{const li=document.createElement('li');li.textContent=r.code+' · '+r.message+(r.cells?.length?'（'+r.cells.join('、')+'）':'');return li;}));}
    if(document.activeElement!==select)for(const o of select.options){const p=ports.find(p=>p.key===o.value);if(p&&o.textContent!==portLabel(p))o.textContent=portLabel(p);}
    if(diagnostics.open)text('p06-detail',JSON.stringify({clock:s.clock,enabled:s.enabled,active:s.active,port:s.layout?.port||null,orientation:s.layout?.orientation||null,watchCount:s.layout?.watchCount||0,counts:counts||null,reasons:s.reasons,readonlyCheck:c?{valid:c.valid,portKey:c.portKey,orientation:c.orientation,errors:c.errors}:null},null,2));
  }
  function check(){
    if(checking)return;discover();
    if(P06.enabled){checked=null;P06.enable(select.value);render();return;}
    const w=P06.world(),revision=P06.revision,p=ports.find(p=>p.key===select.value);if(!p){checked=null;render();return;}
    checking=true;render();
    /* 讓按鈕先回應；合法性仍完全交給既有檢查器，不提交任何營運計畫。 */
    requestAnimationFrame(()=>setTimeout(()=>{
      try{
        if(P06.world().cells!==w.cells||P06.revision!==revision)return;
        let best=null;for(let q=0;q<4;q++){const r=NativeHarborLayout.inspect(w,p,q,window.P01B.parts,P06.api());if(!best||r.errors.length<best.errors.length)best=r;if(r.valid){best=r;break;}}
        checked={portKey:p.key,cells:w.cells,revision,valid:best.valid,orientation:best.orientation,errors:best.errors};
      }finally{checking=false;render();}
    },0));
  }
  function bounds(){
    boundsQueued=false;const vw=document.documentElement.clientWidth,vh=window.visualViewport?.height||window.innerHeight,left=panel.getBoundingClientRect().left,width=byId('p06-expanded').hidden?byId('p06-toggle').getBoundingClientRect().width:Math.min(360,vw-left-8);
    const hud=byId('hud').getBoundingClientRect(),top=Math.max(8,hud.bottom+8);let bottom=vh-8;
    for(const id of['tools','toolcats','zoomer']){const e=byId(id),r=e.getBoundingClientRect();if(r.width&&r.height&&r.right>left&&r.left<left+(vw<=600?vw-left-8:width)&&r.top>top)bottom=Math.min(bottom,r.top-8);}
    panel.style.setProperty('--p06-top',top+'px');panel.style.setProperty('--p06-height',Math.max(48,bottom-top)+'px');
  }
  function queueBounds(){if(!boundsQueued){boundsQueued=true;requestAnimationFrame(bounds);}}
  function open(){byId('p06-toggle').hidden=true;byId('p06-toggle').setAttribute('aria-expanded','true');byId('p06-expanded').hidden=false;discover();bounds();}
  function collapse(){byId('p06-expanded').hidden=true;byId('p06-toggle').hidden=false;byId('p06-toggle').setAttribute('aria-expanded','false');byId('p06-toggle').focus({preventScroll:true});bounds();}
  byId('p06-toggle').addEventListener('click',open);byId('p06-collapse').addEventListener('click',collapse);byId('p06-scan').addEventListener('click',check);
  select.addEventListener('change',()=>{checked=null;render();});
  byId('p06-enable').addEventListener('click',()=>{checked=null;P06.enable(select.value);P06.focus();render();});
  byId('p06-disable').addEventListener('click',()=>{P06.disable();GV.forceDraw();render();});
  for(const id of['p06-live','p06-live-player'])byId(id).addEventListener('click',()=>{P06.live();render();});
  byId('p06-reset').addEventListener('click',()=>{if(confirm('重設候選示範帳？不改城市財政。')){checked=null;P06.reset();render();}});
  byId('p06-demo').addEventListener('click',()=>{checked=null;P06Test.buildCity(byId('p06-demo-layout').value,true);P06Test.setRun(true,0);discover();bounds();});
  for(const name of['pickup','loaded','finished'])byId('p06-replay-'+name).addEventListener('click',()=>{P06.replay(P06.inspect().plan?.[name]||0);render();});
  diagnostics.addEventListener('toggle',render);
  /* 滑鼠從面板開始、移出面板放開仍屬介面手勢；不碰任何畫布開始的 capture。
     select 完全交給瀏覽器；觸控的隱式 capture／pan-y 也保持原生。 */
  const gestures=new Map();let draggedClick=false;
  panel.addEventListener('pointerdown',e=>{draggedClick=false;if(e.target.closest('select'))return;gestures.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:false});if(e.pointerType==='mouse')e.target.setPointerCapture?.(e.pointerId);});
  panel.addEventListener('pointermove',e=>{const g=gestures.get(e.pointerId);if(g&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>8)g.moved=true;});
  for(const type of['pointerup','pointercancel'])panel.addEventListener(type,e=>{const g=gestures.get(e.pointerId);if(g)draggedClick=g.moved;gestures.delete(e.pointerId);});
  panel.addEventListener('click',e=>{if(draggedClick&&e.detail!==0){draggedClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
  /* 只阻止冒泡：保留 select 的原生選單、focus、捲動和隱式 pointer capture。 */
  for(const type of['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture','mousedown','mousemove','mouseup','click','dblclick','touchstart','touchmove','touchend','touchcancel','wheel','contextmenu','keydown','keyup','change','input'])panel.addEventListener(type,e=>e.stopPropagation(),{passive:true});
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.tagName!=='SELECT')collapse();});
  new MutationObserver(render).observe(byId('p06-status'),{childList:true,characterData:true,subtree:true});
  const ro=new ResizeObserver(queueBounds);for(const id of['hud','tools','toolcats','zoomer'])ro.observe(byId(id));
  window.addEventListener('resize',queueBounds);window.visualViewport?.addEventListener('resize',queueBounds);
  window.p06RefreshPorts=discover;
  /* 沿用原 P06 的狀態刷新頻率；收合不掃描、不新增模擬時鐘。 */
  setInterval(()=>window.P06?.refresh(),400);bounds();
})();
