# -*- coding: utf-8 -*-
"""T549 像素指紋快照（ARCH §10.6 收口）；T643 起 CI 的 fp job 是正本，本機（Windows）跑只是預覽。

用法（從倉庫根執行）：
  python tools/fp_snapshot.py                 # 預覽：重算全部 sprite CRC32，印出與 docs/SPR_PINS.json 的差異，不寫檔
  python tools/fp_snapshot.py --check         # 比對：有差異、或基線缺漏／無法解析／格式不符 → exit 1
  python tools/fp_snapshot.py --out PATH      # 把重算結果（新排版）寫到 PATH（CI 的 rebake 附件）
  python tools/fp_snapshot.py --write         # 覆寫 docs/SPR_PINS.json（只在要原封提交 CI 附件以外的特殊情況用）
  python tools/fp_snapshot.py --report PATH   # 量測紀錄：耗時、瀏覽器版本、清冊數字、「有 nightCity 卻沒有 night」的鍵
Chrome：依序找環境變數 CHROME_PATH、Windows 兩條路徑、/usr/bin/google-chrome、/usr/bin/chromium；Linux 加 --no-sandbox。
結束碼：0＝一致／預覽完成；1＝與基線不符或基線有問題（--check）；2＝環境錯誤（找不到 Chrome、快照失敗）；3＝兩次快照不恆等（G1）。
守衛不用 assert（python -O 會把 assert 拿掉）。

原理：無頭 Chrome 載入 index.html（暫存複本、拋棄式 profile、槽 3 紀律），
經 GV.sprAtlas356() 清冊逐條 CRC32（img/night/nightCity 三列，與 atlas.html bPins 同算法同格式）。
基線不含時間戳也不含版本號＝同碼重跑必逐鍵恆等（確定性由 G1 驗證：每次都冷啟兩次快照逐鍵比對）。
排版（T643）：一鍵一行、鍵排序、結尾換行；__meta 只留 count。兩個 PR 改到不同的鍵時不再整檔衝突。
"""
import argparse
import functools
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(REPO, 'docs', 'SPR_PINS.json')
HEX = re.compile(r'^[0-9a-f]{1,8}$')
CHROME_CANDIDATES = [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                     r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                     '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']

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
      const pins={},ncnn=[];
      for(const e of r.entries){
        const id=e.fam+'/'+e.key;
        pins[id]=[crcOf(e.img)];
        if(e.night)pins[id].push(crcOf(e.night));
        if(e.nightCity){pins[id].push(crcOf(e.nightCity));if(!e.night)ncnn.push(id);}
      }
      done({pins,entries:r.entries.length,families:r.families,skipped:r.skipped,nightCityNoNight:ncnn});return;
    }catch(e){done({err:e.message});return;}
  }
  if(++n>600){done({err:'boot timeout'});return;}
  setTimeout(tick,150);
};tick();
</script></body></html>"""


# ---------- 基線格式（fp_diff 共用） ----------

def dumps_pins(pins):
    """新排版：{"__meta":{"count":N}, 然後一鍵一行（鍵排序）, 結尾 } 與換行。pins 不含 __meta。"""
    keys = sorted(pins)
    lines = ['{"__meta":' + json.dumps({'count': len(keys)}, separators=(',', ':')) + (',' if keys else '')]
    for i, k in enumerate(keys):
        lines.append(json.dumps(k, ensure_ascii=False) + ':' + json.dumps(pins[k], separators=(',', ':'))
                     + (',' if i < len(keys) - 1 else ''))
    lines.append('}')
    return '\n'.join(lines) + '\n'


def parse_pins(text):
    """解析基線（新舊排版都收）。回傳 (pins 不含 __meta, 錯誤字串或 None)。格式不符一律當錯，不放行。"""
    try:
        d = json.loads(text)
    except Exception as e:
        return None, 'SPR_PINS 無法解析：%s' % e
    if not isinstance(d, dict) or not isinstance(d.get('__meta'), dict):
        return None, 'SPR_PINS 缺 __meta'
    count = d['__meta'].get('count')
    pins = {k: v for k, v in d.items() if k != '__meta'}
    if not isinstance(count, int) or count != len(pins):
        return None, 'SPR_PINS __meta.count（%r）不等於實際鍵數（%d）' % (count, len(pins))
    for k, v in pins.items():
        if '/' not in k or not isinstance(v, list) or not 1 <= len(v) <= 3 or not all(isinstance(x, str) and HEX.match(x) for x in v):
            return None, 'SPR_PINS 鍵 %r 格式異常（應為「家族/鍵」對 1～3 個小寫 hex CRC）' % k
    return pins, None


def family_of(key):
    return key.split('/', 1)[0]


def diff_pins(old, new):
    """回傳 (新增, 移除, 變更) 三個排序過的鍵清單。"""
    added = sorted(k for k in new if k not in old)
    removed = sorted(k for k in old if k not in new)
    changed = sorted(k for k in new if k in old and old[k] != new[k])
    return added, removed, changed


# ---------- 快照 ----------

class SnapError(Exception):
    pass


def find_chrome():
    env = os.environ.get('CHROME_PATH')
    if env:
        if not os.path.exists(env):
            raise SnapError('CHROME_PATH=%s 不存在' % env)
        return env
    return next((c for c in CHROME_CANDIDATES if os.path.exists(c)), None)


def chrome_version(chrome):
    try:
        r = subprocess.run([chrome, '--version'], capture_output=True, timeout=30)
        return r.stdout.decode('utf-8', 'replace').strip() or r.stderr.decode('utf-8', 'replace').strip()
    except Exception as e:
        return '（取不到版本：%s）' % e


def snap(chrome, timeout=300):
    """冷啟一次無頭快照，回傳 {pins, entries, families, skipped, nightCityNoNight, seconds}。"""
    report = {}

    class Q(SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            if self.path.startswith('/__report'):
                ln = int(self.headers.get('Content-Length', '0'))
                report['data'] = json.loads(self.rfile.read(ln).decode('utf-8'))
                self.send_response(200); self.send_header('Content-Length', '2'); self.end_headers()
                self.wfile.write(b'ok'); return
            self.send_response(404); self.end_headers()

    lab = tempfile.mkdtemp(prefix='fp549_')
    ud = tempfile.mkdtemp(prefix='fp549p_')
    log = os.path.join(lab, 'chrome.log')
    t0 = time.time()
    try:
        shutil.copy2(os.path.join(REPO, 'index.html'), os.path.join(lab, 'index.html'))
        with open(os.path.join(lab, 'p.html'), 'wb') as f:
            f.write(PROBE.encode('utf-8'))
        srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=lab))  # 臨時埠，不碰 8123／8199
        port = srv.server_address[1]
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        args = [chrome, '--headless=new', '--disable-gpu', '--window-size=800,600', '--user-data-dir=' + ud,
                '--no-first-run', '--disable-extensions']
        if sys.platform.startswith('linux'):
            args.append('--no-sandbox')
        with open(log, 'wb') as lf:
            proc = subprocess.Popen(args + ['http://127.0.0.1:%d/p.html' % port], stdout=lf, stderr=subprocess.STDOUT)
            try:
                while 'data' not in report and time.time() - t0 < timeout:
                    if proc.poll() is not None:
                        break
                    time.sleep(0.3)
            finally:
                proc.kill()
                srv.shutdown()
        d = report.get('data')
        if not d or 'pins' not in d:
            tail = open(log, 'rb').read().decode('utf-8', 'replace')[-1500:]
            why = d.get('err') if isinstance(d, dict) else ('Chrome 提前結束（exit %s）' % proc.returncode if proc.returncode is not None else '逾時 %ds' % timeout)
            raise SnapError('快照失敗：%s\n--- chrome log 尾段 ---\n%s' % (why, tail))
        d['seconds'] = round(time.time() - t0, 1)
        return d
    finally:
        shutil.rmtree(ud, ignore_errors=True)
        shutil.rmtree(lab, ignore_errors=True)


def game_ver():
    m = re.search(r"const GAME_VER='([^']*)'", open(os.path.join(REPO, 'index.html'), 'rb').read().decode('utf-8'))
    return m.group(1) if m else '？'


def main(argv=None):
    ap = argparse.ArgumentParser(description='SPR 像素指紋快照（T549／T643）')
    ap.add_argument('--check', action='store_true', help='與基線比對，有差異或基線有問題就 exit 1')
    ap.add_argument('--write', action='store_true', help='覆寫基線（預設只預覽）')
    ap.add_argument('--out', help='把重算結果寫到這個路徑')
    ap.add_argument('--baseline', default=BASELINE)
    ap.add_argument('--report', help='量測紀錄（JSON）寫到這個路徑')
    ap.add_argument('--timeout', type=int, default=300)
    a = ap.parse_args(argv)

    try:
        chrome = find_chrome()
        if not chrome:
            raise SnapError('找不到 Chrome（可設環境變數 CHROME_PATH）')
        ver = chrome_version(chrome)
        print('fp_snapshot: GAME_VER %s；瀏覽器 %s（%s）' % (game_ver(), ver, chrome))
        s1 = snap(chrome, a.timeout)
        s2 = snap(chrome, a.timeout)
    except SnapError as e:
        print(str(e), file=sys.stderr)
        return 2
    ka, kb = s1['pins'], s2['pins']
    drift = sorted(k for k in set(ka) | set(kb) if ka.get(k) != kb.get(k))
    print('兩次快照耗時 %ss／%ss；entries %d／families %d／skipped %d；有 nightCity 卻沒有 night 的鍵 %d 個'
          % (s1['seconds'], s2['seconds'], s1['entries'], s1['families'], s1['skipped'], len(s1.get('nightCityNoNight') or [])))
    if a.report:
        with open(a.report, 'w', encoding='utf-8') as f:
            json.dump({'browser': ver, 'chrome': chrome, 'game_ver': game_ver(), 'seconds': [s1['seconds'], s2['seconds']],
                       'entries': s1['entries'], 'families': s1['families'], 'skipped': s1['skipped'], 'keys': len(ka),
                       'g1_drift': drift[:50], 'nightCityNoNight': s1.get('nightCityNoNight') or []}, f, ensure_ascii=False, indent=1)
    if drift:
        print('G1 確定性破裂：兩次快照不恆等（%d 鍵）：%s' % (len(drift), '、'.join(drift[:10])), file=sys.stderr)
        return 3
    print('G1 確定性 OK：兩次快照 %d 鍵逐鍵恆等' % len(ka))
    text = dumps_pins(ka)
    if a.out:
        with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print('重算結果已寫到 %s' % a.out)

    old, err = (None, '基線 %s 不存在' % a.baseline)
    if os.path.exists(a.baseline):
        old, err = parse_pins(open(a.baseline, 'rb').read().decode('utf-8'))
    rc = 0
    if err:
        print('基線有問題：%s' % err)
        rc = 1 if a.check else 0
    else:
        added, removed, changed = diff_pins(old, ka)
        print('—— 與基線差異 —— 新增 %d、移除 %d、變更 %d' % (len(added), len(removed), len(changed)))
        for name, ks in (('新增', added), ('移除', removed), ('變更', changed)):
            if ks:
                print('%s：%s%s' % (name, '、'.join(ks[:20]), '…' if len(ks) > 20 else ''))
        if not (added or removed or changed):
            print('像素指紋完全一致 ✓')
        elif a.check:
            rc = 1
        else:
            print('⚠ 這只是預覽；正本是 CI fp job 的 rebake 附件，改圖的 PR 只准原封提交那份檔案')
    if a.write:
        with open(a.baseline, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print('已寫 %s（%d 鍵）' % (a.baseline, len(ka)))
    return rc


if __name__ == '__main__':
    sys.exit(main())
