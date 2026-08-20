# -*- coding: utf-8 -*-
"""T549 像素指紋快照（ARCH §10.6 收口）
用法：python tools/fp_snapshot.py            # 從倉庫根執行；重算全部 sprite CRC32 → docs/SPR_PINS.json
     python tools/fp_snapshot.py --check    # 只比對不覆寫（差異非零時 exit 1）

原理：無頭 Chrome 載入 index.html（暫存複本、拋棄式 profile、槽 3 紀律），
經 GV.sprAtlas356() 清冊逐條 CRC32（img/night/nightCity 三列，與 atlas.html bPins 同算法同格式）。
基線不含時間戳＝同碼重跑必逐鍵恆等（確定性由 T549 G1 驗證）。
收束順序（T549 起）：bump → arch --fix → ARCH 行 → **fp_snapshot（審差異）** → 套件。
"""
import io, json, os, shutil, subprocess, threading, functools, time, sys, tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(REPO, 'docs', 'SPR_PINS.json')
CHECK_ONLY = '--check' in sys.argv
CHROME = next((c for c in [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                           r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"] if os.path.exists(c)), None)
assert CHROME, 'Chrome not found'

PROBE = r"""<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="fr"></div><script>
try{localStorage.setItem('glimmerville.v1.slot','3');}catch(e){}
const f=document.createElement('iframe');f.style.cssText='width:64px;height:64px;border:0';
f.src='/index.html';document.getElementById('fr').appendChild(f);
const done=(payload)=>fetch('/__report',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload)});
const CT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}return t;})();
const crc32=u8=>{let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CT[(c^u8[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
const crcOf=cvs=>{const g=cvs.getContext('2d');const d=g.getImageData(0,0,cvs.width,cvs.height).data;
  return crc32(new Uint8Array(d.buffer,d.byteOffset,d.byteLength)).toString(16);};
let n=0;
const tick=()=>{
  const w=f.contentWindow;
  let b0=null;try{b0=(w&&typeof w.__boot426==='function')?w.__boot426():null;}catch(e){}
  if(b0&&b0.ready&&w.GV&&w.GV.sprAtlas356){
    try{
      const r=w.GV.sprAtlas356();
      if(!r.entries.length){done({err:'sprAtlas356 empty after boot'});return;}
      const pins={};
      for(const e of r.entries){
        const id=e.fam+'/'+e.key;
        pins[id]=[crcOf(e.img)];
        if(e.night)pins[id].push(crcOf(e.night));
        if(e.nightCity)pins[id].push(crcOf(e.nightCity));
      }
      done({pins,entries:r.entries.length,families:r.families,skipped:r.skipped});return;
    }catch(e){done({err:e.message});return;}
  }
  if(++n>600){done({err:'boot timeout'});return;}
  setTimeout(tick,150);
};tick();
</script></body></html>"""

REPORT = {}
class Q(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        if self.path.startswith('/__report'):
            ln = int(self.headers.get('Content-Length', '0'))
            REPORT['data'] = json.loads(self.rfile.read(ln).decode('utf-8'))
            self.send_response(200); self.send_header('Content-Length', '2'); self.end_headers()
            self.wfile.write(b'ok'); return
        self.send_response(404); self.end_headers()

def snap(port):
    """跑一次無頭快照，回傳 {pins,...}"""
    REPORT.clear()
    lab = tempfile.mkdtemp(prefix='fp549_')
    try:
        shutil.copy2(os.path.join(REPO, 'index.html'), os.path.join(lab, 'index.html'))
        open(os.path.join(lab, 'p.html'), 'wb').write(PROBE.encode('utf-8'))
        srv = ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Q, directory=lab))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        ud = tempfile.mkdtemp(prefix='fp549p_')
        proc = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--window-size=800,600',
                                 '--user-data-dir=' + ud, '--no-first-run', '--disable-extensions',
                                 'http://127.0.0.1:%d/p.html' % port],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        t0 = time.time()
        while 'data' not in REPORT and time.time() - t0 < 300: time.sleep(0.3)
        proc.kill(); srv.shutdown()
        shutil.rmtree(ud, ignore_errors=True)
    finally:
        shutil.rmtree(lab, ignore_errors=True)
    d = REPORT.get('data')
    assert d and 'pins' in d, 'snapshot failed: %r' % (d,)
    return d

def game_ver():
    b = open(os.path.join(REPO, 'index.html'), 'rb').read().decode('utf-8')
    import re
    m = re.search(r"const GAME_VER='([^']*)'", b)
    return m.group(1)

def main():
    ver = game_ver()
    print('fp_snapshot: GAME_VER %s' % ver)
    a = snap(8397)
    b = snap(8398)
    ka, kb = a['pins'], b['pins']
    drift = [k for k in ka if ka[k] != kb.get(k)] + [k for k in kb if k not in ka]
    assert not drift, 'G1 確定性破裂：兩次快照不恆等（%d 鍵）：%s' % (len(drift), drift[:10])
    print('G1 確定性 OK：兩次快照 %d 鍵逐鍵恆等（entries %d／families %d／skipped %d）'
          % (len(ka), a['entries'], a['families'], a['skipped']))
    new = {'__meta': {'ver': ver, 'count': len(ka)}}
    for k in sorted(ka): new[k] = ka[k]
    old = None
    if os.path.exists(BASELINE):
        try: old = json.loads(open(BASELINE, 'rb').read().decode('utf-8'))
        except Exception as e: print('舊基線解析失敗（視為無）：%s' % e)
    if old:
        added = [k for k in new if k != '__meta' and k not in old]
        removed = [k for k in old if k != '__meta' and k not in new]
        changed = [k for k in new if k != '__meta' and k in old and old[k] != new[k]]
        print('—— 與舊基線（ver %s）差異 ——' % old.get('__meta', {}).get('ver', '?'))
        print('新增 %d：%s' % (len(added), '、'.join(added[:10])))
        print('移除 %d：%s' % (len(removed), '、'.join(removed[:10])))
        print('變更 %d：%s' % (len(changed), '、'.join(changed[:10])))
        if not (added or removed or changed): print('像素指紋完全一致 ✓')
        elif CHECK_ONLY:
            print('--check 模式：存在差異，exit 1'); sys.exit(1)
        else:
            print('⚠ 收束者必須逐條確認以上差異是本卡預期內的（意外差異＝亂數位移/誤傷素材）')
    else:
        print('（無舊基線＝首次入庫）')
    if not CHECK_ONLY:
        open(BASELINE, 'wb').write(json.dumps(new, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
        print('已寫 docs/SPR_PINS.json（%d 鍵、ver %s）' % (len(new) - 1, ver))

if __name__ == '__main__':
    main()
