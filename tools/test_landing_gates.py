"""T644 landing_gates 的單元測試：臨時 git 倉庫當夾具（重用 test_scope 的 Repo），每道閘一個該紅、一個不該紅。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import landing_gates as lg  # noqa: E402
from test_scope import Repo  # noqa: E402

HEAD = '# CHANGELOG — 每完成一張任務卡追加一行\n'
E600 = '2026-10-01 | T600 | 舊卡 | 驗收:Claude 出卡＝施工同一方，未經第三方覆核，如實聲明\n'
E601 = '2026-10-02 | T601 | 舊卡二 | 驗收:通過（Kimi 非作者覆核）\n'


def entry(card, signoff='驗收:Claude 出卡＝施工同一方，未經第三方覆核，如實聲明'):
    return '2026-10-15 | %s | 新卡 | %s\n' % (card, signoff)


class LandingGateTests(unittest.TestCase):
    def setUp(self):
        self.r = Repo()
        self.r.write('docs/CHANGELOG.md', HEAD + E601 + E600)
        self.r.commit('ledger')
        self.r.branch('claude/a')

    def tearDown(self):
        self.r.close()

    def ledger(self, *lines):
        self.r.write('docs/CHANGELOG.md', HEAD + ''.join(lines))

    def run_gates(self, base='main', head='HEAD'):
        return lg.analyse(self.r.dir, self.r.git('rev-parse', base), self.r.git('rev-parse', head))

    def gates(self, res):
        return sorted({p['gate'] for p in res['problems']})

    def test_new_entry_with_named_signoff_is_green(self):
        self.ledger(entry('T650'), E601, E600); self.r.commit('add')
        res = self.run_gates()
        self.assertTrue(res['ok'], res); self.assertEqual(res['added'], ['T650'])

    def test_pending_signoff_is_red(self):
        self.ledger(entry('T650', '驗收:待覆核'), E601, E600); self.r.commit('pending')
        res = self.run_gates()
        self.assertEqual(self.gates(res), ['signoff']); self.assertIn('still pending', res['problems'][0]['detail'])

    def test_signoff_without_party_is_red(self):
        self.ledger(entry('T650', '驗收:通過'), E601, E600); self.r.commit('no party')
        res = self.run_gates()
        self.assertEqual(self.gates(res), ['signoff']); self.assertIn('names no reviewer', res['problems'][0]['detail'])

    def test_entry_without_signoff_field_is_red(self):
        self.ledger('2026-10-15 | T650 | 新卡沒有驗收欄\n', E601, E600); self.r.commit('no field')
        res = self.run_gates()
        self.assertEqual(self.gates(res), ['signoff']); self.assertIn('no 驗收 field', res['problems'][0]['detail'])

    def test_removed_entry_needs_its_own_correction_line(self):
        self.ledger(E601); self.r.commit('drop T600')
        self.assertIn('only-grows', self.gates(self.run_gates()))
        # 宣告的是別張卡：照樣紅（逐條點名）
        self.r.write('note.md', 'x\n'); self.r.commit('fix\n\nCHANGELOG-CORRECTION: T601 typo')
        self.assertIn('only-grows', self.gates(self.run_gates()))
        self.r.write('note.md', 'y\n'); self.r.commit('fix\n\nCHANGELOG-CORRECTION: T600 duplicate of T601')
        res = self.run_gates()
        self.assertNotIn('only-grows', self.gates(res))

    def test_declaring_a_longer_card_id_does_not_authorize_its_prefix(self):
        # Codex #32 P1：倉庫裡同時有 T425 與 T425A；宣告 T425A 不能放行 T425 的刪除（兩道都要紅）
        e425 = '2026-08-01 | T425 | 舊卡 | 驗收:通過（Kimi 非作者覆核）\n'
        e425a = '2026-08-02 | T425A | 舊卡 A | 驗收:通過（Kimi 非作者覆核）\n'
        self.r.git('checkout', '-q', 'main'); self.ledger(e425a, e425, E601, E600); self.r.commit('ledger with prefix pair')
        self.r.git('checkout', '-q', 'claude/a'); self.r.git('merge', '-q', 'main')
        self.ledger(e425a, E601, E600)
        self.r.commit('drop T425\n\nCHANGELOG-CORRECTION: T425A typo fix')
        res = self.run_gates()
        self.assertEqual(self.gates(res), ['keeps', 'only-grows'], res)

    def test_card_must_appear_as_a_whole_word(self):
        # 宣告照舊是自由文字；卡號緊貼中文或全形標點也算，緊貼英數字不算
        self.assertTrue(lg.is_declared('T998', ['CHANGELOG-CORRECTION: 移除T998條目，理由是該卡從未落地']))
        self.assertTrue(lg.is_declared('T600', ['CHANGELOG-CORRECTION: T600：重複']))
        self.assertTrue(lg.is_declared('T425', ['CHANGELOG-CORRECTION: T425、T425A 兩條都重複']))
        self.assertFalse(lg.is_declared('T425', ['CHANGELOG-CORRECTION: T425A typo']))
        self.assertFalse(lg.is_declared('T42', ['CHANGELOG-CORRECTION: T425 typo']))
        self.assertFalse(lg.is_declared('T425', ['CHANGELOG-CORRECTION: XT425 typo']))
        self.assertFalse(lg.is_declared('T600', []))

    def test_rewrite_in_place_counts_as_removal(self):
        # T423–T425A 就是這樣丟的：原地改寫（+1/-1）也算刪除
        self.ledger(E601, E600.replace('舊卡', '舊卡（改寫）')); self.r.commit('rewrite')
        res = self.run_gates()
        self.assertIn('only-grows', self.gates(res)); self.assertIn('T600', res['removed'])

    def test_declared_rewrite_passes_both_only_grows_and_keeps(self):
        # #18 的情形：正式宣告改寫既有條目（例如補簽核），兩道閘都要放行
        self.ledger(E601, E600.replace('如實聲明', '如實聲明；補記 CI 證據'))
        self.r.commit('rewrite\n\nCHANGELOG-CORRECTION: T600 signoff updated with CI evidence')
        res = self.run_gates()
        self.assertTrue(res['ok'], res)

    def test_whole_ledger_deleted_is_red(self):
        self.r.git('rm', '-q', 'docs/CHANGELOG.md'); self.r.commit('delete ledger')
        res = self.run_gates()
        self.assertIn('keeps', self.gates(res))
        self.assertTrue(any('整本帳' in p['detail'] for p in res['problems']), res)  # 要明說是整本被刪，不是少幾條

    def test_no_ledger_at_base_is_fine(self):
        r2 = Repo()
        try:
            r2.branch('claude/a'); r2.write('docs/CHANGELOG.md', HEAD + entry('T650')); r2.commit('first ledger')
            res = lg.analyse(r2.dir, r2.git('rev-parse', 'main'), r2.git('rev-parse', 'HEAD'))
            self.assertTrue(res['ok'], res)
        finally:
            r2.close()

    def test_missing_entries_catches_conflict_resolution_direction(self):
        # T433 R03：三點 diff 只看到 +T003，但整合時解衝突吃掉了 main 後來加的 T002
        before = HEAD + '2026-10-03 | T002 | main 後加\n' + E601 + E600
        after = HEAD + '2026-10-04 | T003 | 分支加\n' + E601 + E600
        self.assertEqual([lg.card_of(e) for e in lg.missing_entries(before, after)], ['T002'])
        self.assertEqual(lg.missing_entries(None, after), [])
        self.assertEqual(len(lg.missing_entries(before, None)), 3)

    def test_entries_in_diff_ignores_headers_and_non_entries(self):
        diff = '--- a/docs/CHANGELOG.md\n+++ b/docs/CHANGELOG.md\n+# 標題\n+' + E600 + '-' + E601 + ' ' + E600
        self.assertEqual(lg.entries_in_diff(diff, '+'), [E600.rstrip('\n')])
        self.assertEqual(lg.entries_in_diff(diff, '-'), [E601.rstrip('\n')])


WORKFLOW = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.github', 'workflows', 'town-main-pages-candidate.yml')


def run_blocks(text):
    """把工作流裡每個 `run: |` 區塊切出來：[(行號, 區塊內文)]。只認多行區塊，單行 run 沒有 tee。"""
    lines = text.splitlines()
    blocks = []
    for i, line in enumerate(lines):
        if line.strip() != 'run: |':
            continue
        indent = len(line) - len(line.lstrip())
        body = []
        for nxt in lines[i + 1:]:
            if nxt.strip() and len(nxt) - len(nxt.lstrip()) <= indent:
                break
            body.append(nxt)
        blocks.append((i + 1, '\n'.join(body)))
    return blocks


def unprotected_tee(text):
    return [n for n, body in run_blocks(text) if '| tee' in body and 'set -o pipefail' not in body]


class WorkflowPipefailTests(unittest.TestCase):
    """T644 紅源實踩：GitHub 預設 shell 是 bash -e、沒有 pipefail，`cmd | tee` 的紅會被 tee 吃掉、這一步顯示成功。"""

    def test_parser_catches_unprotected_tee(self):
        sample = ('    steps:\n      - name: a\n        run: |\n          set -o pipefail\n          x | tee a.log\n'
                  '      - name: b\n        run: |\n          y | tee b.log\n      - name: c\n        run: z\n')
        self.assertEqual(unprotected_tee(sample), [7])

    def test_every_tee_step_sets_pipefail(self):
        with open(WORKFLOW, encoding='utf-8') as f:
            text = f.read()
        self.assertGreater(len(run_blocks(text)), 10)
        self.assertEqual(unprotected_tee(text), [], 'run 區塊有 | tee 卻沒 set -o pipefail（行號是 run: | 那一行）')


if __name__ == '__main__':
    unittest.main()
