"""T643 fp_diff 的單元測試：臨時 git 倉庫當夾具（重用 test_scope 的 Repo），每條規則一個該紅、一個不該紅。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fp_diff  # noqa: E402
import fp_snapshot  # noqa: E402
from test_scope import Repo, card  # noqa: E402

BASE_PINS = {'park/0': ['a1'], 'parkA/0': ['b2'], 'fire/0': ['c3', 'c4'], 'bld/r.1': ['d5']}
ART_PINS = {'art638/6_1_0_1': ['a1', 'a2'], 'art603/29_0_2_0_1': ['b1', 'b2'], 'art634/L29_0_1_2_0_1': ['c1', 'c2']}


def pins_text(p):
    return fp_snapshot.dumps_pins(p)


class FpDiffTests(unittest.TestCase):
    def setUp(self):
        self.r = Repo()
        self.r.write('docs/SPR_PINS.json', pins_text(BASE_PINS))
        self.r.commit('pins')

    def tearDown(self):
        self.r.close()

    def run_diff(self, computed=None):
        return fp_diff.analyse(self.r.dir, self.r.git('rev-parse', 'main'), self.r.git('rev-parse', 'HEAD'),
                               pins_text(computed) if isinstance(computed, dict) else computed)

    def rules(self, res):
        return sorted({x['rule'] for x in res['violations']})

    def change(self, mutate, header=None):
        self.r.branch('claude/a')
        p = dict(BASE_PINS); mutate(p)
        self.r.write('docs/SPR_PINS.json', pins_text(p))
        self.r.write('docs/tasks/T650-x.md', header or card(650))
        self.r.commit('art')
        return p

    def test_unchanged_pins_and_matching_computation_is_green(self):
        self.r.branch('claude/a'); self.r.write('index.html', 'v2\n'); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('x')
        res = self.run_diff(BASE_PINS)
        self.assertTrue(res['ok'], res); self.assertEqual(res['touched'], [])

    def test_computed_must_equal_committed_file(self):
        # 不准手改：檔案是 a1、實算是 ff → 紅
        p = self.change(lambda p: p.__setitem__('park/0', ['ff']), card(650, f='park', o='同意（2026-10-15）'))
        self.assertTrue(self.run_diff(p)['ok'])
        self.assertEqual(self.rules(self.run_diff(BASE_PINS)), ['computed-mismatch'])
        self.assertEqual(self.rules(self.run_diff('{"__meta":')), ['computed-invalid'])  # 實算檔本身壞了也是紅

    def test_missing_unparseable_or_inconsistent_file_is_red(self):
        self.r.branch('claude/a'); self.r.git('rm', '-q', 'docs/SPR_PINS.json'); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('rm')
        self.assertEqual(self.rules(self.run_diff()), ['pins-missing'])
        self.r.write('docs/SPR_PINS.json', '{"__meta":{"count":'); self.r.commit('broken')
        self.assertEqual(self.rules(self.run_diff()), ['pins-invalid'])
        self.r.write('docs/SPR_PINS.json', '{"__meta":{"count":9},\n"park/0":["a1"]\n}\n'); self.r.commit('count')
        self.assertEqual(self.rules(self.run_diff()), ['pins-invalid'])

    def test_declared_family_with_owner_ok_is_green(self):
        p = self.change(lambda p: p.__setitem__('fire/0', ['c3', 'ee']), card(650, f='fire', o='全部沒問題（2026-10-15）'))
        res = self.run_diff(p)
        self.assertTrue(res['ok'], res); self.assertEqual(res['touched'], ['fire'])

    def test_undeclared_family_is_red(self):
        p = self.change(lambda p: p.__setitem__('bld/r.1', ['99']), card(650, f='fire', o='同意（2026-10-15）'))
        self.assertEqual(self.rules(self.run_diff(p)), ['families'])

    def test_prefix_collision_park_vs_parkA_is_red(self):
        # 宣告 park 不能蓋到 parkA
        p = self.change(lambda p: p.__setitem__('parkA/0', ['77']), card(650, f='park', o='同意（2026-10-15）'))
        res = self.run_diff(p)
        self.assertEqual(self.rules(res), ['families']); self.assertEqual(res['touched'], ['parkA'])

    def test_touched_family_needs_owner_ok(self):
        p = self.change(lambda p: p.__setitem__('fire/0', ['c3', 'ee']), card(650, f='fire'))
        self.assertEqual(self.rules(self.run_diff(p)), ['owner-ok'])

    def test_added_and_removed_keys_count_as_touched(self):
        def mut(p):
            del p['park/0']; p['tree/0'] = ['12']
        p = self.change(mut, card(650, f='park', o='同意（2026-10-15）'))
        res = self.run_diff(p)
        self.assertEqual(res['touched'], ['park', 'tree']); self.assertEqual(self.rules(res), ['families'])

    def test_declared_but_untouched_only_warns(self):
        self.r.branch('claude/a'); self.r.write('index.html', 'v2\n'); self.r.write('docs/tasks/T650-x.md', card(650, f='art638', o='同意（2026-10-15）')); self.r.commit('x')
        res = self.run_diff(BASE_PINS)
        self.assertTrue(res['ok'], res); self.assertIn('declared-untouched', [x['rule'] for x in res['warnings']])

    def test_touched_without_any_headered_card_is_red(self):
        self.r.branch('claude/a')
        p = dict(BASE_PINS); p['fire/0'] = ['c3', 'ee']
        self.r.write('docs/SPR_PINS.json', pins_text(p)); self.r.commit('no card')
        self.assertIn('no-card', self.rules(self.run_diff(p)))

    def test_pure_revert_skips_family_checks_but_not_equality(self):
        # main 上合進一張改 fire 的卡，之後純 revert：免家族與 owner_ok，但實算仍要等於檔案
        p = self.change(lambda p: p.__setitem__('fire/0', ['c3', 'ee']), card(650, f='fire', o='同意（2026-10-15）'))
        self.r.git('checkout', '-q', 'main'); self.r.git('merge', '-q', '--no-ff', 'claude/a', '-m', 'Merge art')
        m = self.r.git('rev-parse', 'HEAD')
        self.r.git('checkout', '-q', '-b', 'claude/revert'); self.r.git('revert', '--no-edit', '-m', '1', m)
        res = self.run_diff(BASE_PINS)
        self.assertTrue(res['ok'], res); self.assertEqual(res['touched'], ['fire'])
        self.assertIn('pure-revert', [x['rule'] for x in res['warnings']])
        self.assertEqual(self.rules(self.run_diff(p)), ['computed-mismatch'])

    def test_old_single_line_base_format_still_compares(self):
        # base 是舊排版（單行、__meta 帶 ver），head 是新排版且內容相同 → 沒碰到任何家族
        import json
        old = dict(BASE_PINS); old['__meta'] = {'ver': '11.222', 'count': len(BASE_PINS)}
        self.r.write('docs/SPR_PINS.json', json.dumps(old, separators=(',', ':'))); self.r.commit('old format on main')
        self.r.branch('claude/a'); self.r.write('docs/SPR_PINS.json', pins_text(BASE_PINS)); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('reformat')
        res = self.run_diff(BASE_PINS)
        self.assertTrue(res['ok'], res); self.assertEqual(res['touched'], [])

    # ---------- T646 新美術清冊 docs/ART_PINS.json ----------

    def art_on_main(self):
        self.r.write('docs/ART_PINS.json', pins_text(ART_PINS)); self.r.commit('art pins on main')

    def art_change(self, mutate, header):
        self.r.branch('claude/a')
        p = dict(ART_PINS); mutate(p)
        self.r.write('docs/ART_PINS.json', pins_text(p)); self.r.write('docs/tasks/T650-x.md', header); self.r.commit('art')
        return p

    def run_art(self, art, spr=None):
        art = pins_text(art) if isinstance(art, dict) else art
        return fp_diff.analyse(self.r.dir, self.r.git('rev-parse', 'main'), self.r.git('rev-parse', 'HEAD'),
                               pins_text(spr or BASE_PINS), art)

    def test_art_bootstrap_builds_the_baseline_without_touching_families(self):
        self.r.branch('claude/a'); self.r.write('docs/ART_PINS.json', pins_text(ART_PINS)); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('bootstrap')
        res = self.run_art(ART_PINS)
        self.assertTrue(res['ok'], res); self.assertEqual(res['touched'], [])
        self.assertIn('art-bootstrap', [x['rule'] for x in res['warnings']])
        self.assertEqual(self.rules(self.run_art({'art638/6_1_0_1': ['ff']})), ['computed-mismatch'])  # 建立基線也要等於實算

    def test_art_computed_must_equal_committed_file(self):
        self.art_on_main(); self.r.branch('claude/a'); self.r.write('index.html', 'v2\n'); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('x')
        self.assertTrue(self.run_art(ART_PINS)['ok'])
        changed = dict(ART_PINS); changed['art638/6_1_0_1'] = ['ff', '01']
        res = self.run_art(changed)
        self.assertEqual(self.rules(res), ['computed-mismatch']); self.assertIn('ART_PINS', res['violations'][0]['detail'])

    def test_art_change_needs_family_and_owner_ok(self):
        self.art_on_main()
        p = self.art_change(lambda p: p.__setitem__('art638/6_1_0_1', ['ff', '01']), card(650))
        res = self.run_art(p)
        self.assertEqual(self.rules(res), ['families', 'owner-ok']); self.assertEqual(res['touched'], ['art638'])
        self.assertEqual(res['changed'], ['ART:art638/6_1_0_1'])

    def test_art_change_declared_with_owner_ok_is_green(self):
        self.art_on_main()
        p = self.art_change(lambda p: p.__setitem__('art638/6_1_0_1', ['ff', '01']), card(650, f='art638', o='上綫吧（2026-10-15）'))
        res = self.run_art(p)
        self.assertTrue(res['ok'], res); self.assertEqual(res['touched'], ['art638'])

    def test_art_and_spr_families_are_checked_together(self):
        # 改 T603 的畫法會同時動到 art603（園區）與 art634（縮放舊版）；SPR 那邊只宣告 park 不夠
        self.art_on_main(); self.r.branch('claude/a')
        a = dict(ART_PINS); a['art603/29_0_2_0_1'] = ['ee', 'ef']; a['art634/L29_0_1_2_0_1'] = ['dd', 'de']
        s = dict(BASE_PINS); s['park/0'] = ['ff']
        self.r.write('docs/ART_PINS.json', pins_text(a)); self.r.write('docs/SPR_PINS.json', pins_text(s))
        self.r.write('docs/tasks/T650-x.md', card(650, f='park,art603', o='同意（2026-10-15）')); self.r.commit('both')
        res = self.run_art(a, s)
        self.assertEqual(res['touched'], ['art603', 'art634', 'park']); self.assertEqual(self.rules(res), ['families'])
        self.assertIn('art634', res['violations'][0]['detail'])

    def test_art_baseline_cannot_be_deleted_or_left_without_an_atlas(self):
        self.art_on_main(); self.r.branch('claude/a'); self.r.git('rm', '-q', 'docs/ART_PINS.json'); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('rm art')
        self.assertEqual(self.rules(self.run_art(ART_PINS)), ['pins-missing'])                           # 遊戲還有清冊，基線卻沒了
        self.assertEqual(self.rules(fp_diff.analyse(self.r.dir, self.r.git('rev-parse', 'main'), 'HEAD')), ['pins-missing'])  # 本機不給實算也一樣
        self.assertTrue(self.run_art(fp_diff.MISSING)['ok'])                                              # 清冊和基線一起撤（撤掉 T646）
        self.r.write('docs/ART_PINS.json', pins_text(ART_PINS)); self.r.commit('back')
        self.assertEqual(self.rules(self.run_art(fp_diff.MISSING)), ['art-not-computable'])               # 有基線、沒清冊

    def test_unparseable_art_baseline_is_red(self):
        self.art_on_main(); self.r.branch('claude/a'); self.r.write('docs/ART_PINS.json', '{"__meta":{"count":1}}\n'); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('broken art')
        res = self.run_art(ART_PINS)
        self.assertEqual(self.rules(res), ['pins-invalid']); self.assertIn('ART_PINS', res['violations'][0]['detail'])

    def test_no_art_anywhere_is_green(self):
        # T646 以前的提交：兩邊都沒有 ART_PINS、遊戲也沒有清冊
        self.r.branch('claude/a'); self.r.write('index.html', 'v2\n'); self.r.write('docs/tasks/T650-x.md', card(650)); self.r.commit('x')
        self.assertTrue(self.run_art(fp_diff.MISSING)['ok'])

    def test_default_repo_follows_cwd_when_script_is_copied(self):
        # CI 把 fp_snapshot.py 從 base 複製到 $RUNNER_TEMP 跑：倉庫根目錄要跟著目前目錄，不能跟著腳本位置（PR #31 第一輪實踩）
        old = os.getcwd()
        try:
            self.r.write('index.html', 'x\n'); os.chdir(self.r.dir)
            self.assertEqual(os.path.realpath(fp_snapshot.default_repo()), os.path.realpath(self.r.dir))
        finally:
            os.chdir(old)

    def test_dumps_pins_round_trip_and_layout(self):
        t = pins_text(BASE_PINS)
        self.assertTrue(t.startswith('{"__meta":{"count":4},\n') and t.endswith('\n}\n'))
        self.assertEqual(t.count('\n'), len(BASE_PINS) + 2)
        self.assertEqual(fp_snapshot.parse_pins(t), (BASE_PINS, None))
        bad = t.replace('"a1"', '"A1"')
        self.assertIsNotNone(fp_snapshot.parse_pins(bad)[1])


if __name__ == '__main__':
    unittest.main()
