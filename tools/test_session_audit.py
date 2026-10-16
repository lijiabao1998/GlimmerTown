"""T642 session_audit 的單元測試：用錄好格式的 API 樣本。四筆違規都要被列出，改合規後消失；require-gate 有繞過者要報警；合併前檢查（--premerge）擋得住該擋的。"""
import base64
import copy
import datetime as dt
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import session_audit as sa  # noqa: E402

R = 'o/r'
SINCE = dt.datetime(2026, 10, 14, tzinfo=dt.timezone.utc)
CARD = '# T650 測試\n<!-- card: families=fire; valve=__noT650; owner_ok=全部沒問題（2026-10-15）; removed_asserts=0 -->\n'
P1 = '**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Remove the hard-coded approval commit**\n\nbody'
SHA = {n: ('%02d' % n) * 20 for n in (49, 50, 51, 52)}  # 前綴就不同，「Reviewed commit」前綴比對才測得出來


def summary(sha, status='completed', at='2026-10-15T00:30:00Z'):
    # Codex 摘要的實際格式：HTML 註解裡有機讀 JSON（headSha、status）
    body = '<!-- %s -->\n<!-- codex-security-review:v1 {"headSha":"%s","status":"%s"} -->\n## Codex Review Summary' % (sa.SUMMARY_TAG, sha, status)
    return {'user': {'login': sa.CODEX}, 'body': body, 'created_at': at}


def gate_run(n, conclusion='success'):
    # 真實格式：details_url 帶 workflow run ID，查 actions/runs/<id> 看 event
    return {'conclusion': conclusion, 'details_url': 'https://github.com/o/r/actions/runs/7%d/job/1' % n}


def pr(n, ref, merged='2026-10-15T01:00:00Z'):
    return {'number': n, 'merged_at': merged, 'head': {'ref': ref, 'sha': SHA[n]}}


def base_fixture():
    f = {
        'repos/%s/actions/runs?branch=main&per_page=20' % R: {'workflow_runs': [{'id': 9, 'name': sa.MAIN_WORKFLOW, 'status': 'completed', 'conclusion': 'success', 'head_sha': 'abcdef1234'}]},
        'repos/%s/actions/runs/9/jobs?per_page=100' % R: {'jobs': [{'name': 'deploy', 'conclusion': 'success'}, {'name': 'verify-published', 'conclusion': 'success'}]},
        'repos/%s' % R: {'allow_merge_commit': True, 'allow_squash_merge': False, 'allow_rebase_merge': False, 'delete_branch_on_merge': True},
        'repos/%s/rulesets' % R: [{'id': 1, 'name': 'protect-main'}, {'id': 2, 'name': 'require-gate'}],
        'repos/%s/rulesets/2' % R: {'enforcement': 'active', 'bypass_actors': [], 'rules': [{'type': 'required_status_checks', 'parameters': {'required_status_checks': [{'context': 'gate'}]}}]},
        'repos/%s/rulesets/rule-suites?time_period=week' % R: [{'result': 'pass', 'ref': 'refs/heads/main'}],
        'repos/%s/pulls?state=closed&sort=updated&direction=desc&per_page=50' % R: [pr(50, 'claude/a'), pr(51, 'gpt/b'), pr(52, 'claude/c'), pr(49, 'claude/old', merged='2026-10-01T00:00:00Z')],
        'repos/%s/pulls?state=open&per_page=100' % R: [{'number': 60}],
        'repos/%s/branches?per_page=100' % R: [{'name': 'main'}, {'name': 'claude/x'}],
        'repos/%s/pulls/52' % R: {'number': 52, 'head': {'ref': 'claude/c', 'sha': SHA[52]}},
    }
    for n in (50, 51, 52):
        f['repos/%s/commits/%s/check-runs?check_name=gate' % (R, SHA[n])] = {'check_runs': [gate_run(n)]}
        f['repos/%s/actions/runs/7%d' % (R, n)] = {'event': 'pull_request', 'head_branch': {50: 'claude/a', 51: 'gpt/b', 52: 'claude/c'}[n], 'pull_requests': [{'number': n}]}
        f['repos/%s/issues/%d/comments' % (R, n)] = [summary(SHA[n])]
        f['repos/%s/pulls/%d/comments' % (R, n)] = []
        f['repos/%s/pulls/%d/reviews' % (R, n)] = []
        f['repos/%s/pulls/%d/files?per_page=100' % (R, n)] = [{'filename': 'README.md'}]
        f['repos/%s/pulls/%d/commits?per_page=100' % (R, n)] = [{'commit': {'author': {'name': 'GPT (Codex)' if n == 51 else 'Claude'}}}]
    # 卡頭 owner_ok 原話
    f['repos/%s/pulls/50/files?per_page=100' % R] = [{'filename': 'docs/tasks/T650-測試.md'}]
    f['repos/%s/contents/docs/tasks/T650-測試.md?ref=%s' % (R, SHA[50])] = {'content': base64.b64encode(CARD.encode()).decode()}
    return f


class Fake:
    """沒要求分頁時，清單只回第一頁（GitHub 預設 30 筆），跟真的 API 一樣（Codex #29 P1）。"""
    def __init__(self, f):
        self.f = f

    def get(self, path, paginate=False):
        if path not in self.f:
            raise KeyError(path)
        v = copy.deepcopy(self.f[path])
        return v[:30] if isinstance(v, list) and not paginate else v


def kinds(r):
    return sorted(x['kind'] for x in r['flags'])


def p1_at(cid, path, line):
    return {'id': cid, 'user': {'login': sa.CODEX}, 'body': P1, 'path': path, 'line': line}


class AuditTests(unittest.TestCase):
    def test_compliant_has_no_flags_and_lists_owner_quote(self):
        r = sa.audit(Fake(base_fixture()), R, SINCE)
        self.assertEqual(kinds(r), [])
        self.assertEqual(len(r['prs']), 3)
        self.assertIn('全部沒問題（2026-10-15）', sa.four_lines(r))

    def test_four_violations_listed_then_gone(self):
        f = base_fixture()
        f['repos/%s/rulesets/rule-suites?time_period=week' % R] = [{'result': 'bypass', 'ref': 'refs/heads/main'}]
        f['repos/%s/pulls/52/comments' % R] = [p1_at(7, '.github/workflows/x.yml', 3)]
        f['repos/%s/pulls/51/files?per_page=100' % R] = [{'filename': 'tools/verify.py'}]
        f['repos/%s/pulls/50/commits?per_page=100' % R] = [{'commit': {'author': {'name': 'lixiaming01027592891-crypto'}}}]
        r = sa.audit(Fake(f), R, SINCE)
        self.assertEqual(kinds(r), ['author', 'bypass', 'codex-unanswered', 'gpt-lane'])
        # 改合規：沒有繞過、P1 已在發現帳登記、gpt/ 只動文件、作者是 Claude
        f['repos/%s/rulesets/rule-suites?time_period=week' % R] = []
        f['repos/%s/pulls/51/files?per_page=100' % R] = [{'filename': 'docs/x.md'}]
        f['repos/%s/pulls/50/commits?per_page=100' % R] = [{'commit': {'author': {'name': 'Claude'}}}]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P1 | .github/workflows/x.yml:3 | → T647 |')
        self.assertEqual(kinds(r), [])

    def test_registration_must_match_location(self):
        # 發現帳登記了同一個 PR 的別條意見，不能把這條也算成已登記
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [p1_at(7, '.github/workflows/x.yml', 3)]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P2 | AGENTS.md:16 | 照改 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])

    def test_registration_must_match_line_not_just_path(self):
        # 同一個檔兩條 P1，只登記第 3 行：第 30 行那條仍要報（Codex #29 P2）；#5 的登記也不能算成 #52 的
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [p1_at(7, 'a.yml', 3), p1_at(8, 'a.yml', 30)]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P1 | a.yml:3 | → T647 |\n| #5 | P1 | a.yml:30 | 舊的 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])
        self.assertIn('a.yml:30', r['flags'][0]['detail'])

    def test_replied_p1_is_not_flagged(self):
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [p1_at(7, 'a.yml', 1), {'id': 8, 'user': {'login': 'x'}, 'body': '修了 abc123', 'in_reply_to_id': 7, 'author_association': 'OWNER'}]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), [])

    def test_merged_with_red_or_missing_gate_is_flagged(self):
        f = base_fixture()
        f['repos/%s/commits/%s/check-runs?check_name=gate' % (R, SHA[50])] = {'check_runs': [{'conclusion': 'failure'}]}
        f['repos/%s/commits/%s/check-runs?check_name=gate' % (R, SHA[51])] = {'check_runs': []}
        r = sa.audit(Fake(f), R, SINCE)
        self.assertEqual(kinds(r), ['gate-not-green', 'gate-not-green'])
        self.assertIn('gate', sa.four_lines(r).split('\n')[2])

    def test_require_gate_bypass_alarms(self):
        f = base_fixture()
        f['repos/%s/rulesets/2' % R]['bypass_actors'] = [{'actor_type': 'RepositoryRole', 'actor_id': 5}]
        r = sa.audit(Fake(f), R, SINCE)
        self.assertEqual(kinds(r), ['setting'])
        self.assertIn('require-gate', r['flags'][0]['detail'])

    def test_missing_ruleset_and_squash_allowed(self):
        f = base_fixture()
        f['repos/%s/rulesets' % R] = [{'id': 1, 'name': 'protect-main'}]
        f['repos/%s' % R]['allow_squash_merge'] = True
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['setting', 'setting'])

    def test_merged_before_codex_summary(self):
        f = base_fixture()
        f['repos/%s/issues/50/comments' % R] = [summary(SHA[50], at='2026-10-15T02:00:00Z')]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['merged-before-codex'])

    def test_premerge_clean_passes(self):
        self.assertEqual(sa.premerge(Fake(base_fixture()), R, 52), [])

    def test_premerge_blocks_unanswered_p1_until_replied(self):
        # #28 那天的情形：P1 印出來了，合併步驟卻沒停
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [p1_at(7, 'AGENTS.md', 20)]
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 1); self.assertIn('P1', bad[0])
        # 外人的回覆不算（Codex #29 P1：公開 PR 誰都能回）
        f['repos/%s/pulls/52/comments' % R].append({'id': 9, 'user': {'login': 'stranger'}, 'body': 'fixed', 'in_reply_to_id': 7, 'author_association': 'NONE'})
        self.assertEqual(len(sa.premerge(Fake(f), R, 52)), 1)
        f['repos/%s/pulls/52/comments' % R].append({'id': 8, 'user': {'login': 'x'}, 'body': '不成立：作者是 Claude', 'in_reply_to_id': 7, 'author_association': 'OWNER'})
        self.assertEqual(sa.premerge(Fake(f), R, 52), [])

    def test_premerge_sees_p1_past_first_page(self):
        # 第 31 條才是沒回覆的 P1：只看第一頁就會漏（Codex #29 P1）
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [{'id': i, 'user': {'login': 'x'}, 'body': 'nit'} for i in range(100, 130)] + [p1_at(7, 'a.yml', 1)]
        self.assertEqual(len(sa.premerge(Fake(f), R, 52)), 1)

    def test_premerge_blocks_missing_summary_and_red_gate(self):
        f = base_fixture()
        f['repos/%s/issues/52/comments' % R] = []
        f['repos/%s/commits/%s/check-runs?check_name=gate' % (R, SHA[52])] = {'check_runs': [{'conclusion': 'failure'}]}
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 2)
        self.assertTrue(any('gate' in b for b in bad)); self.assertTrue(any('摘要' in b for b in bad))

    def test_premerge_blocks_summary_of_older_head(self):
        # 摘要審的是舊 head，之後又推了提交：不算審過（Codex #29 P1）；審查跑到一半也不算
        f = base_fixture()
        f['repos/%s/issues/52/comments' % R] = [summary(SHA[51])]
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 1); self.assertIn('@codex review', bad[0])
        f['repos/%s/issues/52/comments' % R] = [summary(SHA[52], status='in_progress')]
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 1); self.assertIn('還沒跑完', bad[0])

    def test_premerge_accepts_rereview_by_review_object_or_comment(self):
        # `@codex review` 重審時 Codex 不更新摘要，只回審查物件（#29）或「Reviewed commit」留言（#30）
        f = base_fixture()
        f['repos/%s/issues/52/comments' % R] = [summary(SHA[51])]
        self.assertEqual(len(sa.premerge(Fake(f), R, 52)), 1)
        f['repos/%s/pulls/52/reviews' % R] = [{'user': {'login': sa.CODEX}, 'commit_id': SHA[51], 'state': 'COMMENTED'}]  # 審的是舊提交（#29 推修補前）
        self.assertEqual(len(sa.premerge(Fake(f), R, 52)), 1)
        f['repos/%s/pulls/52/reviews' % R] = [{'user': {'login': sa.CODEX}, 'commit_id': SHA[52], 'state': 'COMMENTED'}]
        self.assertEqual(sa.premerge(Fake(f), R, 52), [])
        f['repos/%s/pulls/52/reviews' % R] = [{'user': {'login': 'x'}, 'commit_id': SHA[52]}]  # 別人的審查不算
        self.assertEqual(len(sa.premerge(Fake(f), R, 52)), 1)
        f['repos/%s/issues/52/comments' % R].append({'user': {'login': sa.CODEX}, 'body': "Codex Review: Didn't find any major issues.\n\n**Reviewed commit:** `%s`" % SHA[52][:10]})
        self.assertEqual(sa.premerge(Fake(f), R, 52), [])
        f['repos/%s/issues/52/comments' % R][-1]['body'] = "**Reviewed commit:** `%s`" % SHA[51][:10]  # 審的是別的提交
        self.assertEqual(len(sa.premerge(Fake(f), R, 52)), 1)

    def test_spoofed_summary_by_other_user_is_ignored(self):
        # 公開倉庫任何人都能貼帶摘要標記、headSha 正確的留言冒充「Codex 已審」（Codex #29 P1）
        f = base_fixture()
        fake = summary(SHA[52]); fake['user'] = {'login': 'someone'}
        f['repos/%s/issues/52/comments' % R] = [summary(SHA[51]), fake]
        self.assertEqual(len(sa.premerge(Fake(f), R, 52)), 1)
        f['repos/%s/issues/50/comments' % R] = [dict(summary(SHA[50], at='2026-10-15T02:00:00Z'), user={'login': 'someone'})]
        self.assertNotIn('merged-before-codex', kinds(sa.audit(Fake(f), R, SINCE)))

    def test_audit_flags_merged_head_codex_never_reviewed(self):
        # #26、#27 的情形：摘要早於合併，但合併時的 head 是之後推的修補提交，Codex 沒審過（Codex #29 P2）
        f = base_fixture()
        f['repos/%s/issues/52/comments' % R] = [summary(SHA[51])]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['unreviewed-head'])
        f['repos/%s/pulls/52/reviews' % R] = [{'user': {'login': sa.CODEX}, 'commit_id': SHA[52]}]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), [])

    def test_premerge_cli_prints_only_validated_sha(self):
        # stdout 只有驗過的 head SHA，才能接 gh pr merge --match-head-commit（Codex #29 P1：檢查後到合併前的競態）
        import contextlib
        import io
        from unittest import mock
        f = base_fixture()
        out, err = io.StringIO(), io.StringIO()
        with mock.patch.object(sa, 'GhApi', lambda: Fake(f)), contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            rc = sa.main(['--repo', R, '--premerge', '52'])
        self.assertEqual((rc, out.getvalue()), (0, SHA[52] + '\n'))
        f['repos/%s/commits/%s/check-runs?check_name=gate' % (R, SHA[52])] = {'check_runs': [{'conclusion': 'failure'}]}
        out, err = io.StringIO(), io.StringIO()
        with mock.patch.object(sa, 'GhApi', lambda: Fake(f)), contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            rc = sa.main(['--repo', R, '--premerge', '52'])
        self.assertEqual((rc, out.getvalue()), (1, ''))
        self.assertIn('gate', err.getvalue())

    def test_gate_from_manual_dispatch_does_not_count(self):
        # 手動 dispatch 跑出的綠 gate 不能蓋掉 PR 那一輪（Codex #29 P1）；巡檢也照同一規則看
        f = base_fixture()
        f['repos/%s/actions/runs/752' % R] = {'event': 'workflow_dispatch'}
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 1); self.assertIn('workflow_dispatch', bad[0])
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['gate-not-green'])
        f['repos/%s/actions/runs/752' % R] = {'event': 'pull_request', 'head_branch': 'claude/c', 'pull_requests': [{'number': 52}]}
        self.assertEqual(sa.premerge(Fake(f), R, 52), [])

    def test_premerge_gate_run_must_belong_to_this_pr_number(self):
        # 同一分支同一提交開了兩個 PR、指向不同 base：別的 PR 那一輪的綠 gate 不能拿來放行這個 PR（Codex #29 P1）
        f = base_fixture()
        f['repos/%s/actions/runs/752' % R]['pull_requests'] = [{'number': 99}]
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 1); self.assertIn('#52', bad[0])
        # 已合併、分支已自動刪除時 pull_requests 會變空（#28、#30 實測）：巡檢不能因此誤報
        f['repos/%s/actions/runs/752' % R]['pull_requests'] = []
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), [])

    def test_gate_from_another_branch_on_same_sha_does_not_count(self):
        # 兩個 PR 指向同一個提交：別的分支跑出的綠 gate 不能蓋掉這個 PR 的（Codex #29 P1，scope 規則依分支名而定）
        f = base_fixture()
        f['repos/%s/actions/runs/752' % R] = {'event': 'pull_request', 'head_branch': 'claude/other'}
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 1); self.assertIn('claude/other', bad[0])
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['gate-not-green'])

    def test_bypass_past_first_page_of_rule_suites(self):
        f = base_fixture()
        f['repos/%s/rulesets/rule-suites?time_period=week' % R] = [{'result': 'pass', 'ref': 'refs/heads/main'}] * 30 + [{'result': 'bypass', 'ref': 'refs/heads/main'}]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['bypass'])

    def test_unanswered_message_uses_original_line_when_outdated(self):
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [{'id': 7, 'user': {'login': sa.CODEX}, 'body': P1, 'path': 'a.yml', 'line': None, 'original_line': 12}]
        self.assertIn('a.yml:12', sa.premerge(Fake(f), R, 52)[0])
        self.assertIn('a.yml:12', sa.audit(Fake(f), R, SINCE)['flags'][0]['detail'])

    def test_since_date_only_is_utc(self):
        # 實跑 `--since 2026-10-14` 曾因不帶時區的時間跟 API 時間比較而崩潰
        self.assertEqual(sa._t('2026-10-14'), SINCE)
        self.assertEqual(kinds(sa.audit(Fake(base_fixture()), R, sa._t('2026-10-14'))), [])

    def test_main_red(self):
        f = base_fixture()
        f['repos/%s/actions/runs?branch=main&per_page=20' % R]['workflow_runs'][0]['conclusion'] = 'failure'
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['main-red'])

    # ---------- T656：發現帳認意見 ID；巡檢的 gpt 越道用 scope 的完整判定 ----------

    def test_id_row_registers_only_that_comment(self):
        # 同一位置跨輪兩條 P1（Codex #29 P2）：寫了「意見 7」的行只登記 7，8 照報，訊息帶 ID 方便登記
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [p1_at(7, 'a.yml', 3), p1_at(8, 'a.yml', 3)]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P1 | a.yml:3 | 意見 7：→ T647 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])
        self.assertIn('（意見 8）', r['flags'][0]['detail'])
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P1 | a.yml:3 | 意見 7：→ T647 |\n| #52 | P1 | a.yml:3 | 意見 8：照改 |')
        self.assertEqual(kinds(r), [])

    def test_legacy_row_without_id_is_ambiguous_when_two_comments_share_a_location(self):
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [p1_at(7, 'a.yml', 3), p1_at(8, 'a.yml', 3)]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P1 | a.yml:3 | → T647 |')
        self.assertEqual(kinds(r), ['codex-unanswered', 'codex-unanswered'])
        # 回覆過的那條仍算同位置的兄弟：舊行可能是替它寫的，不能拿來蓋另一條
        f['repos/%s/pulls/52/comments' % R].append({'id': 99, 'in_reply_to_id': 7, 'author_association': 'OWNER', 'user': {'login': 'x'}, 'body': '照改'})
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P1 | a.yml:3 | → T647 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])
        self.assertIn('（意見 8）', r['flags'][0]['detail'])

    def test_legacy_p2_row_does_not_cover_a_p1_at_the_same_location(self):
        # T656 審查：P2 照 T651 直接登記、通常不帶 ID；後一輪同位置冒出 P1，舊的 P2 行不能把它蓋掉
        f = base_fixture()
        p2 = p1_at(7, 'a.yml', None); p2['original_line'] = 3; p2['body'] = P1.replace('P1', 'P2')
        f['repos/%s/pulls/52/comments' % R] = [p2, p1_at(8, 'a.yml', 3)]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P2 | a.yml:3 | → T660 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])
        self.assertIn('（意見 8）', r['flags'][0]['detail'])
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P2 | a.yml:3 | → T660 |\n| #52 | P1 | a.yml:3 | → T661 |')
        self.assertEqual(kinds(r), [])

    def test_pr_that_deletes_a_card_does_not_crash_the_audit(self):
        # T656 審查：revert PR 刪卡時，head 讀不到那張卡（API 404），原本整個巡檢會崩掉
        f = base_fixture()
        f['repos/%s/pulls/52/files?per_page=100' % R] = [{'filename': 'docs/tasks/T649-x.md', 'status': 'removed', 'deletions': 9}]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), [])

    def test_id_row_for_another_comment_does_not_cover_by_location(self):
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [p1_at(8, 'a.yml', 3)]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P1 | a.yml:3 | 意見 7：舊的那條 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])
        # ID 要在同一個 PR 的行裡才算
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #5 | P1 | a.yml:3 | 意見 8 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])

    def gpt_files(self, files):
        f = base_fixture()
        f['repos/%s/pulls/51/files?per_page=100' % R] = files
        return sa.audit(Fake(f), R, SINCE)

    def test_gpt_lane_uses_the_full_scope_predicate(self):
        # 原本巡檢只粗查守衛與規則檔（Codex #29 P2）；現在 test_fixde 刪改行、別張卡的台架目錄也算（T653 起 SPR_PINS、登記冊不再是路徑越道）
        for files, path in [
            ([{'filename': 'test_fixde.js', 'status': 'modified', 'additions': 3, 'deletions': 1}], 'test_fixde.js'),
            ([{'filename': 'docs/tasks/t635-shots/x.cjs', 'status': 'added', 'deletions': 0}], 'docs/tasks/t635-shots/x.cjs'),
            ([{'filename': 'AGENTS.md', 'status': 'modified', 'deletions': 1}], 'AGENTS.md'),
            ([{'filename': 'docs/x.py', 'previous_filename': 'tools/x.py', 'status': 'renamed', 'deletions': 0}], 'tools/x.py'),
        ]:
            r = self.gpt_files(files)
            self.assertEqual(kinds(r), ['gpt-lane'], path)
            self.assertIn(path, r['flags'][0]['detail'])

    def test_gpt_lane_allows_what_scope_allows(self):
        for files in [
            [{'filename': 'test_fixde.js', 'status': 'modified', 'additions': 3, 'deletions': 0}],
            [{'filename': 'docs/tasks/T641-x.md', 'status': 'added', 'deletions': 0}, {'filename': 'docs/tasks/t641-shots/own.cjs', 'status': 'added', 'deletions': 0}],
            [{'filename': 'index.html', 'status': 'modified', 'deletions': 9}],
            [{'filename': 'docs/SPR_PINS.json', 'status': 'modified', 'deletions': 1}, {'filename': 'docs/APPROVED_ART.json', 'status': 'modified', 'deletions': 0}],  # T653
        ]:
            f = base_fixture()
            f['repos/%s/pulls/51/files?per_page=100' % R] = files
            for x in files:
                if x['filename'].endswith('.md'):
                    f['repos/%s/contents/%s?ref=%s' % (R, x['filename'], SHA[51])] = {'content': base64.b64encode(b'# T641\n').decode()}
            self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), [], files)

    def registry_merge(self, before, after):
        # gpt/b（#51）合併時改了登記冊：合併提交 m51，第一個父提交 p51
        import json
        f = base_fixture()
        f['repos/%s/pulls?state=closed&sort=updated&direction=desc&per_page=50' % R][1]['merge_commit_sha'] = 'm51'
        f['repos/%s/pulls/51/files?per_page=100' % R] = [{'filename': 'docs/APPROVED_ART.json', 'status': 'modified', 'deletions': 1}]
        f['repos/%s/commits/m51' % R] = {'parents': [{'sha': 'p51'}, {'sha': 'x'}]}
        for rev, reg in (('p51', before), ('m51', after)):
            f['repos/%s/contents/docs/APPROVED_ART.json?ref=%s' % (R, rev)] = {'content': base64.b64encode(json.dumps(reg).encode()).decode()}
        return sa.audit(Fake(f), R, SINCE)

    def test_gpt_registry_valves_only_is_not_flagged_but_approved_is(self):
        # T653 審查：gpt/ 只准改登記冊的 valves；scope 在 CI 擋，巡檢回頭看也要看得到（比照 CI：合併提交對它的第一個父提交）
        base = {'schema': 1, 'approved': {'T635': {'commit': 'c'}}, 'valves': {'T635': '__noT635'}}
        self.assertEqual(kinds(self.registry_merge(base, dict(base, valves={'T635': '__noT635', 'T670': '__noT670'}))), [])
        r = self.registry_merge(base, dict(base, approved={'T635': {'commit': 'e'}}))
        self.assertEqual(kinds(r), ['gpt-lane']); self.assertIn('approved', r['flags'][0]['detail'])

    def test_api_files_matches_scope_changed_shape(self):
        out, deleted = sa.api_files([
            {'filename': 'b.js', 'previous_filename': 'a.js', 'status': 'renamed', 'deletions': 2},
            {'filename': 'c.js', 'previous_filename': 'a.js', 'status': 'copied', 'deletions': 0},
            {'filename': 'd.js', 'status': 'removed', 'deletions': 5},
            {'filename': 'e.js', 'status': 'added', 'deletions': 0},
            {'filename': 'f.js', 'status': 'modified', 'deletions': 1},
        ])
        self.assertEqual(out, [('D', 'a.js'), ('A', 'b.js'), ('A', 'c.js'), ('D', 'd.js'), ('A', 'e.js'), ('M', 'f.js')])
        self.assertEqual(deleted['f.js'], 1)

    def test_gpt_copying_a_guard_file_out_is_not_a_lane_violation(self):
        # Codex #41 P2：scope 用 git diff -M，不偵測複製；巡檢不能把沒改的來源 tools/x.py 記成修改而誤報越道
        r = self.gpt_files([{'filename': 'docs/x.py', 'previous_filename': 'tools/x.py', 'status': 'copied', 'deletions': 0}])
        self.assertEqual(kinds(r), [])


if __name__ == '__main__':
    unittest.main()
