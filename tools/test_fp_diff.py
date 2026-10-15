"""T643 fp_diff 的單元測試：臨時 git 倉庫當夾具（重用 test_scope 的 Repo），每條規則一個該紅、一個不該紅。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fp_diff  # noqa: E402
import fp_snapshot  # noqa: E402
from test_scope import Repo, card  # noqa: E402

BASE_PINS = {'park/0': ['a1'], 'parkA/0': ['b2'], 'fire/0': ['c3', 'c4'], 'bld/r.1': ['d5']}


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

    def test_dumps_pins_round_trip_and_layout(self):
        t = pins_text(BASE_PINS)
        self.assertTrue(t.startswith('{"__meta":{"count":4},\n') and t.endswith('\n}\n'))
        self.assertEqual(t.count('\n'), len(BASE_PINS) + 2)
        self.assertEqual(fp_snapshot.parse_pins(t), (BASE_PINS, None))
        bad = t.replace('"a1"', '"A1"')
        self.assertIsNotNone(fp_snapshot.parse_pins(bad)[1])


if __name__ == '__main__':
    unittest.main()
