"""T641 scope.py 的單元測試：臨時 git 倉庫當夾具，每條規則一個該紅、一個不該紅。"""
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scope  # noqa: E402

HDR = '<!-- card: families={f}; valve={v}; owner_ok={o}; removed_asserts={r} -->'


def card(num, f='無', v='', o='', r='0', body='內容'):
    return '# T%s 測試卡\n%s\n\n%s\n' % (num, HDR.format(f=f, v=v, o=o, r=r), body)


class Repo:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='glimmer-scope-test-')
        self.dir = self.tmp.name
        self.git('init', '-q', '-b', 'main')
        self.git('config', 'user.name', 'T')
        self.git('config', 'user.email', 't@example.com')
        self.write('index.html', '<html>v1</html>\n')
        self.write('test_fixde.js', 'assert(1);\nassert(2);\n')
        self.write('tools/verify.py', 'print(1)\n')
        self.write('README.md', '# readme\n')
        self.write('AGENTS.md', '# agents\n')
        self.write('docs/tasks/T600-舊卡.md', '# T600 舊卡\n\n沒有卡頭的舊卡\n')
        self.commit('base')

    def git(self, *a):
        r = subprocess.run(['git', *a], cwd=self.dir, capture_output=True)
        if r.returncode:
            raise AssertionError(r.stderr.decode('utf-8', 'replace'))
        return r.stdout.decode('utf-8', 'replace').strip()

    def write(self, path, text):
        p = os.path.join(self.dir, path)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)

    def commit(self, msg):
        self.git('add', '-A')
        self.git('commit', '-q', '-m', msg)
        return self.git('rev-parse', 'HEAD')

    def branch(self, name):
        self.git('checkout', '-q', '-b', name)

    def run(self, base='main', head='HEAD', ref=''):
        return scope.analyse(self.dir, self.git('rev-parse', base), self.git('rev-parse', head), ref)

    def close(self):
        self.tmp.cleanup()


class ScopeTests(unittest.TestCase):
    def setUp(self):
        self.r = Repo()

    def tearDown(self):
        self.r.close()

    def rules(self, res):
        return sorted({x['rule'] for x in res['violations']})

    def test_docs_lane_only_md(self):
        self.r.branch('claude/a'); self.r.write('README.md', '# readme 2\n'); self.r.commit('doc')
        res = self.r.run()
        self.assertEqual(res['lane'], 'docs'); self.assertTrue(res['ok'], res)

    def test_shots_script_is_full_lane(self):
        self.r.branch('claude/a'); self.r.write('docs/tasks/T641-x.md', card(641))
        self.r.write('docs/tasks/t635-shots/release635.cjs', 'x\n'); self.r.commit('c')
        self.assertEqual(self.r.run()['lane'], 'full')

    def test_full_lane_needs_a_card(self):
        self.r.branch('claude/a'); self.r.write('index.html', '<html>v2</html>\n'); self.r.commit('x')
        self.assertEqual(self.rules(self.r.run()), ['one-card'])
        self.r.write('docs/tasks/T641-x.md', card(641)); self.r.commit('card')
        self.assertTrue(self.r.run()['ok'])

    def test_two_new_cards_is_red(self):
        self.r.branch('claude/a'); self.r.write('index.html', 'v2\n')
        self.r.write('docs/tasks/T641-x.md', card(641)); self.r.write('docs/tasks/T642-y.md', card(642)); self.r.commit('x')
        self.assertIn('one-card', self.rules(self.r.run()))

    def test_new_card_without_header_is_red(self):
        self.r.branch('claude/a'); self.r.write('index.html', 'v2\n')
        self.r.write('docs/tasks/T641-x.md', '# T641 x\n\n沒卡頭\n'); self.r.commit('x')
        self.assertIn('card-header', self.rules(self.r.run()))

    def test_frozen_families_change_is_red(self):
        self.r.branch('claude/a'); self.r.write('docs/tasks/T641-x.md', card(641)); self.r.commit('card first')
        self.r.write('index.html', 'v2\n'); self.r.write('docs/tasks/T641-x.md', card(641, f='bld')); self.r.commit('impl')
        self.assertIn('card-frozen', self.rules(self.r.run()))

    def test_owner_ok_only_from_empty(self):
        self.r.branch('claude/a'); self.r.write('docs/tasks/T641-x.md', card(641, f='bld')); self.r.commit('card first')
        self.r.write('index.html', 'v2\n'); self.r.write('docs/tasks/T641-x.md', card(641, f='bld', o='全部沒問題（2026-10-14）')); self.r.commit('ok')
        self.assertTrue(self.r.run()['ok'])
        self.r.write('docs/tasks/T641-x.md', card(641, f='bld', o='')); self.r.commit('erase')
        self.assertIn('card-owner-ok', self.rules(self.r.run()))

    def test_number_collision_is_red(self):
        self.r.branch('claude/a'); self.r.write('index.html', 'v2\n')
        self.r.write('docs/tasks/T600-另一張.md', card(600)); self.r.commit('x')
        self.assertIn('card-number', self.rules(self.r.run()))

    def test_gpt_touching_tools_is_red_but_adding_assert_is_not(self):
        self.r.branch('gpt/a'); self.r.write('docs/tasks/T641-x.md', card(641))
        self.r.write('test_fixde.js', 'assert(1);\nassert(2);\nassert(3);\n'); self.r.write('index.html', 'v2\n'); self.r.commit('add')
        self.assertTrue(self.r.run(ref='gpt/a')['ok'])
        self.r.write('tools/verify.py', 'print(2)\n'); self.r.commit('tools')
        res = self.r.run(ref='gpt/a')
        self.assertEqual(self.rules(res), ['gpt-lane'])
        self.assertTrue(self.r.run(ref='claude/a')['ok'])

    def test_gpt_editing_existing_assert_is_red(self):
        self.r.branch('gpt/a'); self.r.write('docs/tasks/T641-x.md', card(641))
        self.r.write('test_fixde.js', 'assert(1);\nassert(20);\n'); self.r.commit('edit')
        self.assertEqual(self.rules(self.r.run(ref='gpt/a')), ['gpt-lane'])

    def test_gpt_rule_file_and_foreign_shots_are_red(self):
        self.r.branch('gpt/a'); self.r.write('docs/tasks/T641-x.md', card(641)); self.r.write('docs/tasks/t641-shots/own.js', 'ok\n'); self.r.commit('own')
        self.assertTrue(self.r.run(ref='gpt/a')['ok'])
        self.r.write('AGENTS.md', '# agents 2\n'); self.r.write('docs/tasks/t635-shots/release635.cjs', 'x\n'); self.r.commit('foreign')
        res = self.r.run(ref='gpt/a')
        self.assertEqual(sorted(x['path'] for x in res['violations']), ['AGENTS.md', 'docs/tasks/t635-shots/release635.cjs'])

    def test_hardcoded_sha_in_guard_code(self):
        sha = 'a' * 7 + '1234567890abcdef1234567890abcdef1'
        self.assertEqual(len(sha), 40)
        self.r.branch('claude/a'); self.r.write('docs/tasks/T641-x.md', card(641))
        self.r.write('docs/tasks/t641-shots/evidence.json', '{"commit":"%s"}\n' % sha)
        self.r.write('docs/APPROVED_ART.json', '{"approved":"%s"}\n' % sha); self.r.commit('ok')
        self.assertTrue(self.r.run()['ok'])
        self.r.write('.github/workflows/x.yml', 'env:\n  APPROVED_BASE: %s\n' % sha); self.r.commit('bad')
        self.assertEqual(self.rules(self.r.run()), ['hardcoded-sha'])

    def test_sha256_only_warns(self):
        self.r.branch('claude/a'); self.r.write('docs/tasks/T641-x.md', card(641))
        self.r.write('tools/x.py', "H='%s'\n" % ('b' * 64)); self.r.commit('w')
        res = self.r.run()
        self.assertTrue(res['ok']); self.assertEqual([x['rule'] for x in res['warnings']], ['hardcoded-sha256'])

    def test_pure_revert_needs_no_card(self):
        self.r.branch('claude/feat'); self.r.write('docs/tasks/T641-x.md', card(641)); self.r.write('index.html', '<html>v2</html>\n'); self.r.commit('feat')
        self.r.git('checkout', '-q', 'main'); self.r.git('merge', '-q', '--no-ff', 'claude/feat', '-m', 'Merge feat')
        m = self.r.git('rev-parse', 'HEAD')
        self.r.branch('claude/revert'); self.r.git('revert', '--no-edit', '-m', '1', m)
        res = self.r.run(base='main')
        self.assertTrue(res['ok'], res); self.assertEqual(res['revert_of'], m)
        self.r.write('index.html', '<html>v3</html>\n'); self.r.commit('extra')
        self.assertEqual(self.rules(self.r.run(base='main')), ['one-card'])

    def test_removed_asserts_reported(self):
        self.r.branch('claude/a'); self.r.write('docs/tasks/T641-x.md', card(641, r='2')); self.r.write('test_fixde.js', 'assert(1);\n'); self.r.commit('x')
        self.assertEqual(self.r.run()['removed_asserts'], 2)

    def test_legacy_card_edit_is_fine(self):
        self.r.branch('claude/a'); self.r.write('docs/tasks/T600-舊卡.md', '# T600 舊卡\n\n補記\n'); self.r.commit('x')
        res = self.r.run()
        self.assertEqual(res['lane'], 'docs'); self.assertTrue(res['ok'])


if __name__ == '__main__':
    unittest.main()
