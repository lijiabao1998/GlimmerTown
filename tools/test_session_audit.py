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
        f['repos/%s/actions/runs/7%d' % (R, n)] = {'event': 'pull_request'}
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
        f['repos/%s/actions/runs/752' % R] = {'event': 'pull_request'}
        self.assertEqual(sa.premerge(Fake(f), R, 52), [])

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


if __name__ == '__main__':
    unittest.main()
