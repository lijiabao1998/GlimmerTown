"""T642 session_audit 的單元測試：用錄好格式的 API 樣本。四筆違規都要被列出，改合規後消失；require-gate 有繞過者要報警。"""
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


def pr(n, ref, sha, merged='2026-10-15T01:00:00Z'):
    return {'number': n, 'merged_at': merged, 'head': {'ref': ref, 'sha': sha}}


def base_fixture():
    f = {
        'repos/%s/actions/runs?branch=main&per_page=20' % R: {'workflow_runs': [{'id': 9, 'name': sa.MAIN_WORKFLOW, 'status': 'completed', 'conclusion': 'success', 'head_sha': 'abcdef1234'}]},
        'repos/%s/actions/runs/9/jobs?per_page=100' % R: {'jobs': [{'name': 'deploy', 'conclusion': 'success'}, {'name': 'verify-published', 'conclusion': 'success'}]},
        'repos/%s' % R: {'allow_merge_commit': True, 'allow_squash_merge': False, 'allow_rebase_merge': False, 'delete_branch_on_merge': True},
        'repos/%s/rulesets' % R: [{'id': 1, 'name': 'protect-main'}, {'id': 2, 'name': 'require-gate'}],
        'repos/%s/rulesets/2' % R: {'enforcement': 'active', 'bypass_actors': [], 'rules': [{'type': 'required_status_checks', 'parameters': {'required_status_checks': [{'context': 'gate'}]}}]},
        'repos/%s/rulesets/rule-suites?time_period=week' % R: [{'result': 'pass', 'ref': 'refs/heads/main'}],
        'repos/%s/pulls?state=closed&sort=updated&direction=desc&per_page=50' % R: [pr(50, 'claude/a', 's50'), pr(51, 'gpt/b', 's51'), pr(52, 'claude/c', 's52'), pr(49, 'claude/old', 's49', merged='2026-10-01T00:00:00Z')],
        'repos/%s/pulls?state=open&per_page=100' % R: [{'number': 60}],
        'repos/%s/branches?per_page=100' % R: [{'name': 'main'}, {'name': 'claude/x'}],
    }
    for n, sha in ((50, 's50'), (51, 's51'), (52, 's52')):
        f['repos/%s/commits/%s/check-runs?check_name=gate' % (R, sha)] = {'check_runs': [{'conclusion': 'success'}]}
        f['repos/%s/issues/%d/comments' % (R, n)] = [{'body': '<!-- %s -->' % sa.SUMMARY_TAG, 'created_at': '2026-10-15T00:30:00Z'}]
        f['repos/%s/pulls/%d/comments' % (R, n)] = []
        f['repos/%s/pulls/%d/files?per_page=100' % (R, n)] = [{'filename': 'README.md'}]
        f['repos/%s/pulls/%d/commits?per_page=100' % (R, n)] = [{'commit': {'author': {'name': 'GPT (Codex)' if n == 51 else 'Claude'}}}]
    # 卡頭 owner_ok 原話
    f['repos/%s/pulls/50/files?per_page=100' % R] = [{'filename': 'docs/tasks/T650-測試.md'}]
    f['repos/%s/contents/docs/tasks/T650-測試.md?ref=s50' % R] = {'content': base64.b64encode(CARD.encode()).decode()}
    return f


class Fake:
    def __init__(self, f):
        self.f = f

    def get(self, path, paginate=False):
        if path not in self.f:
            raise KeyError(path)
        return copy.deepcopy(self.f[path])


def kinds(r):
    return sorted(x['kind'] for x in r['flags'])


class AuditTests(unittest.TestCase):
    def test_compliant_has_no_flags_and_lists_owner_quote(self):
        r = sa.audit(Fake(base_fixture()), R, SINCE)
        self.assertEqual(kinds(r), [])
        self.assertEqual(len(r['prs']), 3)
        self.assertIn('全部沒問題（2026-10-15）', sa.four_lines(r))

    def test_four_violations_listed_then_gone(self):
        f = base_fixture()
        f['repos/%s/rulesets/rule-suites?time_period=week' % R] = [{'result': 'bypass', 'ref': 'refs/heads/main'}]
        f['repos/%s/pulls/52/comments' % R] = [{'id': 7, 'user': {'login': sa.CODEX}, 'body': P1, 'path': '.github/workflows/x.yml', 'line': 3}]
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
        f['repos/%s/pulls/52/comments' % R] = [{'id': 7, 'user': {'login': sa.CODEX}, 'body': P1, 'path': '.github/workflows/x.yml', 'line': 3}]
        r = sa.audit(Fake(f), R, SINCE, findings_text='| #52 | P2 | AGENTS.md:16 | 照改 |')
        self.assertEqual(kinds(r), ['codex-unanswered'])

    def test_replied_p1_is_not_flagged(self):
        f = base_fixture()
        f['repos/%s/pulls/52/comments' % R] = [{'id': 7, 'user': {'login': sa.CODEX}, 'body': P1, 'path': 'a.yml', 'line': 1},
                                                {'id': 8, 'user': {'login': 'x'}, 'body': '修了 abc123', 'in_reply_to_id': 7}]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), [])

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
        f['repos/%s/issues/50/comments' % R] = [{'body': '<!-- %s -->' % sa.SUMMARY_TAG, 'created_at': '2026-10-15T02:00:00Z'}]
        self.assertEqual(kinds(sa.audit(Fake(f), R, SINCE)), ['merged-before-codex'])

    def premerge_fixture(self):
        f = base_fixture()
        f['repos/%s/pulls/52' % R] = {'number': 52, 'head': {'ref': 'claude/c', 'sha': 's52'}}
        return f

    def test_premerge_clean_passes(self):
        self.assertEqual(sa.premerge(Fake(self.premerge_fixture()), R, 52), [])

    def test_premerge_blocks_unanswered_p1_until_replied(self):
        # #28 那天的情形：P1 印出來了，合併步驟卻沒停
        f = self.premerge_fixture()
        f['repos/%s/pulls/52/comments' % R] = [{'id': 7, 'user': {'login': sa.CODEX}, 'body': P1, 'path': 'AGENTS.md', 'line': 20}]
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 1); self.assertIn('P1', bad[0])
        f['repos/%s/pulls/52/comments' % R].append({'id': 8, 'user': {'login': 'x'}, 'body': '不成立：作者是 Claude', 'in_reply_to_id': 7})
        self.assertEqual(sa.premerge(Fake(f), R, 52), [])

    def test_premerge_blocks_missing_summary_and_red_gate(self):
        f = self.premerge_fixture()
        f['repos/%s/issues/52/comments' % R] = []
        f['repos/%s/commits/s52/check-runs?check_name=gate' % R] = {'check_runs': [{'conclusion': 'failure'}]}
        bad = sa.premerge(Fake(f), R, 52)
        self.assertEqual(len(bad), 2)
        self.assertTrue(any('gate' in b for b in bad)); self.assertTrue(any('摘要' in b for b in bad))

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
