#!/usr/bin/env python3
"""T642 開工巡檢：唯讀，只呼叫 gh api，不擋任何東西。Claude 每次開工跑一次，給業主四行內的結論。

用法：python tools/session_audit.py [--repo lijiabao1998/GlimmerTown] [--since 2026-10-14T00:00:00Z] [--findings docs/REVIEW-FINDINGS.md] [--json 路徑]
沒給 --since 時看最近 7 天合併的 PR。詳細結果用 --json 寫到倉庫外（例如 scratchpad），不進倉庫。
合併前檢查：python tools/session_audit.py --premerge <PR 號> && gh pr merge <PR 號> --merge
（head 的 gate 綠、Codex 審過當前 head、沒有未回覆的 P0／P1，不過就 exit 1）。

四段：① main 最近一輪 Town main 的結論與 deploy／verify-published；② 設定有沒有被動過
（require-gate 規則集在且沒有繞過者、只准 merge commit、自動刪分支、近 7 天規則集被繞過的次數）；
③ 期間內合併的 PR：gate 結論、是否在 Codex 摘要之前就合了、沒回覆也沒登記的 Codex P0／P1、
卡頭 owner_ok 原話（列給業主過目）、gpt/ PR 是否碰守衛或規則路徑、分支前綴與 commit 作者是否相符；④ 開著的 PR 數、遠端分支數。
"""
import argparse
import base64
import datetime as dt
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scope  # noqa: E402  卡頭解析、規則檔與守衛路徑沿用 T641 的定義

MAIN_WORKFLOW = 'Town main Pages validation and publication'
CODEX = 'chatgpt-codex-connector[bot]'
BADGE = re.compile(r'!\[(P[0-3]) Badge\]')
SUMMARY_TAG = 'codex-pull-request-review-summary'
SUMMARY_HEAD = re.compile(r'"headSha":"([0-9a-f]{40})"')
SUMMARY_STATUS = re.compile(r'"status":"([a-z_]+)"')
REVIEWED_COMMIT = re.compile(r'Reviewed commit:\*\*\s*`([0-9a-f]{7,40})`')
EXPECT_AUTHOR = {'claude/': {'Claude'}, 'gpt/': {'GPT (Codex)'}}


class GhApi:
    def get(self, path, paginate=False):
        # 分頁時用 --jq '.[]' 讓每個元素各占一行，再逐行解析（多頁陣列直接相接不好切）
        args = ['gh', 'api'] + (['--paginate', '--jq', '.[]'] if paginate else []) + [path]
        r = subprocess.run(args, capture_output=True)
        if r.returncode != 0:
            raise RuntimeError('gh api %s：%s' % (path, r.stderr.decode('utf-8', 'replace').strip()[:300]))
        text = r.stdout.decode('utf-8')
        if paginate:
            return [json.loads(l) for l in text.splitlines() if l.strip()]
        return json.loads(text) if text.strip() else None


def _t(s):
    if not s:
        return None
    t = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)  # --since 只給日期時沒有時區，一律當 UTC


def unanswered_p01(comments):
    """Codex 的 P0／P1 審查意見裡，PR 上還沒有人回覆的：[(等級, 意見)]。"""
    replied = {c.get('in_reply_to_id') for c in comments if c.get('in_reply_to_id')}
    out = []
    for c in comments:
        m = BADGE.search(c.get('body') or '')
        if c.get('user', {}).get('login') == CODEX and m and m.group(1) in ('P0', 'P1') and c['id'] not in replied:
            out.append((m.group(1), c))
    return out


def summary_state(body):
    """Codex 摘要裡機讀的 (headSha, status)；舊格式沒有就回 (None, None)。"""
    h = SUMMARY_HEAD.search(body or '')
    s = SUMMARY_STATUS.search(body or '')
    return (h.group(1) if h else None, s.group(1) if s else None)


def registered(findings_text, n, c):
    """發現帳裡有沒有登記這一條：同一行要有 `| #N |` 和完整位置 `路徑:行號`（Codex #29 P2：只比路徑會一條蓋兩條）。"""
    loc = re.escape('%s:%s' % (c.get('path') or '', c.get('line') or c.get('original_line') or '')) + r'(?!\d)'
    pr = r'\|\s*#%d\s*\|' % n
    return any(re.search(pr, row) and re.search(loc, row) for row in (findings_text or '').splitlines())


def codex_reviewed(api, repo, n, sha):
    """Codex 有沒有審完當前 head：(True, 訊號) 或 (False, 原因)。
    三種訊號任一即可：摘要的 headSha＝head 且 completed；Codex 審查物件的 commit_id＝head；
    Codex 留言裡的「Reviewed commit: `前綴`」對得上 head。`@codex review` 重審時，Codex 只回後兩種，不更新摘要
    （#29、#30 實測：照只認摘要的寫法，兩個都被誤擋 45 分鐘）。"""
    issue = api.get('repos/%s/issues/%d/comments' % (repo, n), paginate=True) or []
    summaries = [c for c in issue if SUMMARY_TAG in (c.get('body') or '')]
    head, status = summary_state(summaries[-1].get('body')) if summaries else (None, None)
    if head == sha and status == 'completed':
        return True, 'summary'
    for c in issue:
        m = REVIEWED_COMMIT.search(c.get('body') or '') if c.get('user', {}).get('login') == CODEX else None
        if m and sha.startswith(m.group(1)):
            return True, 'comment'
    for r in api.get('repos/%s/pulls/%d/reviews' % (repo, n), paginate=True) or []:
        if r.get('user', {}).get('login') == CODEX and r.get('commit_id') == sha:
            return True, 'review'
    if not summaries:
        return False, 'Codex 審查摘要還沒到'
    if head == sha:
        return False, 'Codex 審查還沒跑完（status=%s）' % status
    return False, 'Codex 還沒審過當前 head %s（摘要停在 %s；留言 @codex review 重審）' % (sha[:7], (head or '？')[:7])


def premerge(api, repo, n):
    """合併前檢查：head 的 gate 綠、Codex 審過**當前 head**、沒有未回覆的 P0／P1。回傳不過的原因清單（空＝可以合）。
    2026-10-15 #28 的合併步驟把 Codex P1 印了出來卻沒有停，先合後回；之後合併一律 `--premerge N && gh pr merge N`。
    推了新提交以後，舊的審查不算數（Codex #29 P1）：在 PR 上留言 `@codex review` 讓它重審。"""
    bad = []
    pr = api.get('repos/%s/pulls/%d' % (repo, n)) or {}
    sha = pr.get('head', {}).get('sha', '')
    cr = (api.get('repos/%s/commits/%s/check-runs?check_name=gate' % (repo, sha)) or {}).get('check_runs', [])
    if not cr or cr[0].get('conclusion') != 'success':
        bad.append('gate 不是綠（head %s：%s）' % (sha[:7], cr[0].get('conclusion') if cr else '沒有 gate'))
    ok, why = codex_reviewed(api, repo, n, sha)
    if not ok:
        bad.append(why)
    for lvl, c in unanswered_p01(api.get('repos/%s/pulls/%d/comments' % (repo, n), paginate=True) or []):
        bad.append('未回覆的 %s：%s:%s（comment %s）' % (lvl, c.get('path'), c.get('line') or c.get('original_line'), c.get('id')))
    return bad


def audit(api, repo, since, findings_text=''):
    flags, notes = [], []
    # ① main
    runs = api.get('repos/%s/actions/runs?branch=main&per_page=20' % repo) or {}
    latest = next((r for r in runs.get('workflow_runs', []) if r.get('name') == MAIN_WORKFLOW and r.get('status') == 'completed'), None)
    main = {'run': None}
    if latest:
        jobs = {j['name']: j.get('conclusion') for j in (api.get('repos/%s/actions/runs/%d/jobs?per_page=100' % (repo, latest['id'])) or {}).get('jobs', [])}
        main = {'run': latest['id'], 'sha': latest['head_sha'][:7], 'conclusion': latest.get('conclusion'),
                'deploy': jobs.get('deploy'), 'verify_published': jobs.get('verify-published')}
        if latest.get('conclusion') != 'success':
            flags.append({'kind': 'main-red', 'detail': 'main 最近一輪 %s：%s' % (latest['head_sha'][:7], latest.get('conclusion'))})
    else:
        flags.append({'kind': 'main-unknown', 'detail': '找不到 main 最近一輪 Town main'})

    # ② 設定
    info = api.get('repos/%s' % repo) or {}
    settings = {k: info.get(k) for k in ('allow_merge_commit', 'allow_squash_merge', 'allow_rebase_merge', 'delete_branch_on_merge')}
    if info.get('allow_squash_merge') or info.get('allow_rebase_merge'):
        flags.append({'kind': 'setting', 'detail': '合併方式不只 merge commit（squash=%s、rebase=%s）' % (info.get('allow_squash_merge'), info.get('allow_rebase_merge'))})
    if not info.get('delete_branch_on_merge'):
        flags.append({'kind': 'setting', 'detail': '沒開自動刪分支'})
    rulesets = api.get('repos/%s/rulesets' % repo) or []
    gate = next((r for r in rulesets if r.get('name') == 'require-gate'), None)
    if not gate:
        flags.append({'kind': 'setting', 'detail': '沒有 require-gate 規則集（gate 不是必要檢查）'})
    else:
        g = api.get('repos/%s/rulesets/%d' % (repo, gate['id'])) or {}
        contexts = [c.get('context') for r in g.get('rules', []) if r.get('type') == 'required_status_checks'
                    for c in r.get('parameters', {}).get('required_status_checks', [])]
        if g.get('enforcement') != 'active' or g.get('bypass_actors') or 'gate' not in contexts:
            flags.append({'kind': 'setting', 'detail': 'require-gate 被動過：enforcement=%s、繞過者 %d 個、必要檢查 %s' % (
                g.get('enforcement'), len(g.get('bypass_actors') or []), contexts)})
    suites = api.get('repos/%s/rulesets/rule-suites?time_period=week' % repo, paginate=True) or []  # Codex #29 P2：要分頁
    bypass = [s for s in suites if s.get('result') == 'bypass']
    if bypass:
        flags.append({'kind': 'bypass', 'detail': '近 7 天規則集被繞過 %d 次（%s）' % (len(bypass), '、'.join(sorted({s.get('ref', '') for s in bypass})))})

    # ③ 期間內合併的 PR
    prs = []
    for pr in api.get('repos/%s/pulls?state=closed&sort=updated&direction=desc&per_page=50' % repo) or []:
        if not pr.get('merged_at') or _t(pr['merged_at']) < since:
            continue
        n, ref, sha = pr['number'], pr['head']['ref'], pr['head']['sha']
        row = {'pr': n, 'ref': ref, 'merged_at': pr['merged_at']}
        cr = (api.get('repos/%s/commits/%s/check-runs?check_name=gate' % (repo, sha)) or {}).get('check_runs', [])
        row['gate'] = cr[0].get('conclusion') if cr else '無'
        if row['gate'] != 'success':  # Codex #29 P2：沒綠就合的要報出來，這正是繞過保護的痕跡
            flags.append({'kind': 'gate-not-green', 'detail': '#%d 合併時 head 的 gate：%s' % (n, row['gate'])})
        summary = [c for c in api.get('repos/%s/issues/%d/comments' % (repo, n), paginate=True) or [] if SUMMARY_TAG in (c.get('body') or '')]
        row['codex_summary_at'] = summary[0]['created_at'] if summary else None
        if summary and _t(pr['merged_at']) < _t(summary[0]['created_at']):
            flags.append({'kind': 'merged-before-codex', 'detail': '#%d 在 Codex 摘要之前就合了（合 %s、摘要 %s）' % (n, pr['merged_at'], summary[0]['created_at'])})
        elif summary:
            ok, why = codex_reviewed(api, repo, n, sha)  # Codex #29 P2：合併時的 head 要真的被審過（#26、#27 就是修補提交沒被審）
            if not ok:
                flags.append({'kind': 'unreviewed-head', 'detail': '#%d 合併時的 head %s Codex 沒審過' % (n, sha[:7])})
        for lvl, c in unanswered_p01(api.get('repos/%s/pulls/%d/comments' % (repo, n), paginate=True) or []):
            if registered(findings_text, n, c):
                continue
            title = (c.get('body') or '').split('\n')[0]
            for pat in (r'!\[[^\]]*\]\([^)]*\)', r'</?sub>', r'\*'):
                title = re.sub(pat, '', title)
            title = title.strip()
            flags.append({'kind': 'codex-unanswered', 'detail': '#%d %s %s:%s 沒回覆也沒登記：%s' % (n, lvl, c.get('path'), c.get('line') or c.get('original_line'), title[:120])})
        files = api.get('repos/%s/pulls/%d/files?per_page=100' % (repo, n), paginate=True) or []
        paths = [f['filename'] for f in files]
        owner_quotes = []
        for p in paths:
            if scope.CARD_RE.match(p):
                got = api.get('repos/%s/contents/%s?ref=%s' % (repo, p, sha))
                text = base64.b64decode(got['content']).decode('utf-8') if got and got.get('content') else ''
                h, _ = scope.parse_header(text)
                if h and h.get('owner_ok'):
                    owner_quotes.append('%s：%s' % (p, h['owner_ok']))
        row['owner_ok'] = owner_quotes
        if ref.startswith('gpt/'):
            bad = [p for p in paths if p.startswith(scope.GUARD_PREFIXES) or p in scope.RULE_FILES]
            if bad:
                flags.append({'kind': 'gpt-lane', 'detail': '#%d（gpt/）碰了守衛或規則路徑：%s' % (n, '、'.join(bad[:6]))})
        for prefix, want in EXPECT_AUTHOR.items():
            if ref.startswith(prefix):
                authors = {c['commit']['author']['name'] for c in api.get('repos/%s/pulls/%d/commits?per_page=100' % (repo, n), paginate=True) or []}
                if not authors <= want:
                    flags.append({'kind': 'author', 'detail': '#%d 分支 %s 的 commit 作者有 %s（應為 %s）' % (n, ref, '、'.join(sorted(authors - want)), '／'.join(sorted(want)))})
        prs.append(row)

    # ④ 數量
    open_prs = api.get('repos/%s/pulls?state=open&per_page=100' % repo) or []
    branches = api.get('repos/%s/branches?per_page=100' % repo, paginate=True) or []
    counts = {'open_prs': len(open_prs), 'branches': len(branches)}
    return {'repo': repo, 'since': since.isoformat(), 'main': main, 'settings': settings, 'prs': prs, 'counts': counts, 'flags': flags, 'notes': notes}


def four_lines(r):
    m = r['main']
    l1 = '① main：%s（run %s）deploy=%s verify-published=%s' % (m.get('conclusion', '？'), m.get('run'), m.get('deploy'), m.get('verify_published')) if m.get('run') else '① main：找不到最近一輪'
    st = [f['detail'] for f in r['flags'] if f['kind'] in ('setting', 'bypass')]
    l2 = '② 設定：' + ('沒變' if not st else '；'.join(st))
    pf = [f['detail'] for f in r['flags'] if f['kind'] in ('gate-not-green', 'merged-before-codex', 'unreviewed-head', 'codex-unanswered', 'gpt-lane', 'author')]
    quotes = [q for p in r['prs'] for q in p['owner_ok']]
    l3 = '③ 期間合併 %d 個 PR：%s%s' % (len(r['prs']), '沒有異常' if not pf else '；'.join(pf),
                                    ('；owner_ok 原話：' + '／'.join(quotes)) if quotes else '')
    l4 = '④ 開著的 PR %d 個、遠端分支 %d 條' % (r['counts']['open_prs'], r['counts']['branches'])
    return '\n'.join([l1, l2, l3, l4])


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default='lijiabao1998/GlimmerTown')
    ap.add_argument('--since')
    ap.add_argument('--findings', default='docs/REVIEW-FINDINGS.md')
    ap.add_argument('--json')
    ap.add_argument('--premerge', type=int, metavar='PR', help='合併前檢查，不過 exit 1：python tools/session_audit.py --premerge N && gh pr merge N --merge')
    a = ap.parse_args(argv)
    if a.premerge:
        bad = premerge(GhApi(), a.repo, a.premerge)
        for b in bad:
            print('PREMERGE ✗ #%d %s' % (a.premerge, b))
        if not bad:
            print('PREMERGE ✓ #%d：gate 綠、Codex 審過當前 head、沒有未回覆的 P0／P1' % a.premerge)
        return 1 if bad else 0
    since = _t(a.since) if a.since else dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
    findings = open(a.findings, encoding='utf-8').read() if os.path.exists(a.findings) else ''
    r = audit(GhApi(), a.repo, since, findings)
    print(four_lines(r))
    if a.json:
        with open(a.json, 'w', encoding='utf-8') as f:
            json.dump(r, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main())
