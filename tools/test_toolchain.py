# -*- coding: utf-8 -*-
"""Failure-injection regression tests for the T358 toolchain.

The tests use disposable repositories only.  They never invoke the real
Glimmer Town merge command, player deployment directory, or 1902-test suite.
"""
from __future__ import annotations

import json
import io
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tools import merge_bay
from tools import verify


class TempRepo:
    def __init__(self):
        self.temp = None

    def __enter__(self):
        self.temp = tempfile.TemporaryDirectory(prefix='glimmer-t358-test-')
        self.base = Path(self.temp.name).resolve()
        self.root = self.base / 'master'
        self.bay = self.base / 'bay-kimi'
        self.integration = self.base / 'integration'
        self.deploy = self.base / 'deploy'
        self.root.mkdir()
        self.deploy.mkdir()
        self.env = os.environ.copy()
        self.env.update(
            {
                'GIT_CONFIG_NOSYSTEM': '1',
                'GIT_CONFIG_GLOBAL': os.devnull,
                'GIT_TERMINAL_PROMPT': '0',
            }
        )
        self.git(self.root, 'init', '--initial-branch=master')
        self.git(self.root, 'config', 'user.name', 'T358 Test')
        self.git(self.root, 'config', 'user.email', 't358@example.invalid')
        self.git(self.root, 'config', 'core.autocrlf', 'false')
        self.git(self.root, 'config', 'commit.gpgsign', 'false')
        self.git(self.root, 'config', 'core.hooksPath', '.git/no-hooks')
        self.write(self.root, 'index.html', "<script>const GAME_VER='1.0';</script>\n")
        self.write(self.root, 'sw.js', "const APP_VER='1.0';\n")
        self.write(
            self.root,
            'test_fixde.js',
            "// stats().pop === 1\n// stats().pop === 2\n",
        )
        self.write(self.root, 'shared.txt', 'base\n')
        self.write(self.root, 'tools/verify.py', '# trusted verifier placeholder\n')
        self.git(self.root, 'add', '-A')
        self.git(self.root, 'commit', '-m', 'base')
        self.base_oid = self.oid(self.root)
        self.git(self.root, 'worktree', 'add', '-b', 'bay/kimi', self.bay, 'master')
        (self.deploy / 'index.html').write_bytes(b'old-index')
        (self.deploy / 'sw.js').write_bytes(b'old-sw')
        (self.deploy / merge_bay.DEPLOY_MARKER).write_text(
            'test deployment marker\n',
            encoding='utf-8',
        )
        self.config = merge_bay.MergeConfig(
            root=self.root,
            deploy=self.deploy,
            bays={'kimi': self.bay},
            integration_path=self.integration,
        )
        return self

    def __exit__(self, exc_type, exc, traceback):
        if self.temp is not None:
            self.temp.cleanup()

    def git(self, cwd, *args, check=True):
        result = subprocess.run(
            ['git', *[str(arg) for arg in args]],
            cwd=str(cwd),
            env=self.env,
            capture_output=True,
            text=True,
        )
        if check and result.returncode != 0:
            raise AssertionError(
                'git %s failed:\n%s\n%s'
                % (' '.join(str(arg) for arg in args), result.stdout, result.stderr)
            )
        return result

    def write(self, cwd, relative, text):
        path = Path(cwd) / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8', newline='\n')
        return path

    def commit(self, cwd, message):
        self.git(cwd, 'add', '-A')
        self.git(cwd, 'commit', '-m', message)
        return self.oid(cwd)

    def oid(self, cwd, ref='HEAD'):
        return self.git(cwd, 'rev-parse', ref).stdout.strip().lower()


class GateRunner:
    """Delegate Git to the real runner and inject trusted-verifier outcomes."""

    def __init__(self, gate_codes, gate_passes=None, on_gate=None):
        self.gate_codes = list(gate_codes)
        self.gate_passes = list(
            gate_passes
            if gate_passes is not None
            else [verify.MIN_PASS] * len(self.gate_codes)
        )
        if len(self.gate_passes) != len(self.gate_codes):
            raise ValueError('gate_codes and gate_passes must have the same length')
        self.on_gate = on_gate
        self.gate_calls = []
        self.commands = []

    def __call__(self, args, cwd, timeout):
        rendered = [str(arg) for arg in args]
        self.commands.append((rendered, Path(cwd)))
        if len(rendered) >= 2 and Path(rendered[1]).name == 'verify.py':
            self.gate_calls.append((rendered, Path(cwd)))
            index = len(self.gate_calls) - 1
            if self.on_gate is not None:
                self.on_gate(index)
            code = self.gate_codes[index]
            if code == 0:
                return merge_bay.CommandResult(
                    0,
                    '  [OK]   suite green: PASS=%d exit=0\nRESULT: ALL GREEN\n'
                    % self.gate_passes[index],
                    '',
                )
            return merge_bay.CommandResult(code, 'RESULT: RED\n', 'injected gate failure')
        return merge_bay.run_cmd(rendered, Path(cwd), timeout)


class ToolchainRegressionTests(unittest.TestCase):
    @staticmethod
    def _deploy_tree_bytes(deploy):
        """Snapshot every regular deployment file for zero-write assertions."""
        return {
            path.name: path.read_bytes()
            for path in sorted(Path(deploy).iterdir(), key=lambda candidate: candidate.name)
            if path.is_file()
        }

    @staticmethod
    def _optional_bytes(path):
        return path.read_bytes() if path.exists() else None

    def test_suite_rejects_nonzero_without_fail_lines(self):
        stdout = ''.join('PASS: case %d\n' % index for index in range(verify.MIN_PASS))
        stdout += verify.DONE_MARKER + '\n'
        result = verify.assess_suite(7, stdout, '', verify.MIN_PASS)
        self.assertFalse(result.green)
        self.assertEqual(result.passes, verify.MIN_PASS)
        self.assertEqual(result.failures, ())
        self.assertIn('process exit code 7', result.reasons)

    def test_suite_rejects_low_pass_and_accepts_exact_baseline(self):
        low = ''.join('PASS: low %d\n' % index for index in range(verify.MIN_PASS - 1))
        low += verify.DONE_MARKER + '\n'
        low_result = verify.assess_suite(0, low, '', verify.MIN_PASS)
        self.assertFalse(low_result.green)
        self.assertIn(
            'PASS=%d below baseline %d' % (verify.MIN_PASS - 1, verify.MIN_PASS),
            low_result.reasons,
        )

        exact = ''.join('PASS: exact %d\n' % index for index in range(verify.MIN_PASS))
        exact += verify.DONE_MARKER + '\n'
        exact_result = verify.assess_suite(0, exact, '', verify.MIN_PASS)
        self.assertTrue(exact_result.green)
        self.assertGreaterEqual(verify.MIN_PASS, 1902)

    def test_suite_requires_completion_marker_as_final_stdout_line(self):
        stdout = ''.join('PASS: case %d\n' % index for index in range(verify.MIN_PASS))
        stdout += verify.DONE_MARKER + '\nlate noise\n'
        result = verify.assess_suite(0, stdout, '', verify.MIN_PASS)
        self.assertFalse(result.green)
        self.assertIn('completion marker is not the final stdout line', result.reasons)

    def test_assert_noop_and_fake_pass_producer_break_harness_contract(self):
        healthy = (
            verify.ASSERT_CONTRACT
            + '\n'
            + verify.DONE_CONTRACT
        )
        self.assertEqual(verify.harness_contract_reasons(healthy), ())
        no_op = healthy.replace(
            "if (!cond) { console.error('FAIL:', msg); process.exit(1); }",
            "if (!cond) { console.log('PASS:', msg); }",
        )
        reasons = verify.harness_contract_reasons(no_op)
        self.assertIn('assert implementation differs from the fail-fast contract', reasons)
        self.assertIn('PASS output has an unexpected producer', reasons)

    def test_status_failure_is_not_clean(self):
        def broken_runner(args, cwd, timeout):
            return merge_bay.CommandResult(128, '', 'fatal: injected status failure')

        with self.assertRaisesRegex(merge_bay.ToolError, 'failed'):
            merge_bay.worktree_status(Path('unused'), runner=broken_runner)

    def test_rejects_detached_bay_even_when_clean(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'bay.txt', 'ahead\n')
            repo.commit(repo.bay, 'bay ahead')
            repo.git(repo.bay, 'checkout', '--detach', repo.base_oid)
            self.assertEqual(repo.git(repo.bay, 'status', '--porcelain').stdout, '')
            with self.assertRaises(merge_bay.ToolError):
                merge_bay.validate_bay_identity(repo.config, 'kimi')
            self.assertEqual(repo.oid(repo.root), repo.base_oid)

    def test_failed_integration_gate_keeps_master_unchanged(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            repo.commit(repo.bay, 'incoming feature')
            original_oid = repo.oid(repo.root)
            original_shared = (repo.root / 'shared.txt').read_bytes()
            runner = GateRunner([0, 0, 9])
            with self.assertRaisesRegex(merge_bay.ToolError, 'integration gate failed'):
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    False,
                    runner=runner,
                )
            self.assertEqual(repo.oid(repo.root), original_oid)
            self.assertEqual((repo.root / 'shared.txt').read_bytes(), original_shared)
            self.assertEqual(repo.git(repo.root, 'status', '--porcelain').stdout, '')
            self.assertEqual(
                repo.git(repo.root, 'rev-parse', '-q', '--verify', 'MERGE_HEAD', check=False).returncode,
                1,
            )
            self.assertEqual(len(runner.gate_calls), 3)
            integration_target = Path(runner.gate_calls[2][0][3]).resolve()
            self.assertTrue((integration_target / 'feature.txt').is_file())
            merge_bay.abort_transaction(repo.config, 'kimi')

    def test_pass_ratchet_rejects_source_below_base(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            repo.commit(repo.bay, 'incoming feature')
            original_oid = repo.oid(repo.root)
            runner = GateRunner(
                [0, 0],
                gate_passes=[verify.MIN_PASS + 1, verify.MIN_PASS],
            )
            with self.assertRaisesRegex(
                merge_bay.ToolError,
                r'PASS\(S\)=1902 < PASS\(B\)=1903; master is unchanged',
            ):
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    False,
                    runner=runner,
                )
            self.assertEqual(repo.oid(repo.root), original_oid)
            state_path, _ = merge_bay.state_locations(repo.config)
            self.assertFalse(state_path.exists())
            self.assertFalse(repo.integration.exists())

    def test_pass_ratchet_rejects_integration_below_source_after_conflict_resolution(self):
        with TempRepo() as repo:
            repo.write(repo.root, 'shared.txt', 'master version\n')
            base = repo.commit(repo.root, 'master side')
            repo.write(repo.bay, 'shared.txt', 'bay version\n')
            repo.commit(repo.bay, 'bay side')
            runner = GateRunner(
                [0, 0, 0, 0, 0],
                gate_passes=[
                    verify.MIN_PASS,
                    verify.MIN_PASS + 1,
                    verify.MIN_PASS,
                    verify.MIN_PASS + 1,
                    verify.MIN_PASS,
                ],
            )
            self.assertEqual(
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    False,
                    runner=runner,
                ),
                2,
            )
            repo.write(repo.integration, 'shared.txt', 'resolved union\n')
            repo.git(repo.integration, 'add', 'shared.txt')
            with self.assertRaisesRegex(
                merge_bay.ToolError,
                r'PASS\(M\)=1902 < PASS\(S\)=1903; master is unchanged',
            ):
                merge_bay.resume_transaction(repo.config, 'kimi', runner=runner)
            self.assertEqual(repo.oid(repo.root), base)
            state_path, _ = merge_bay.state_locations(repo.config)
            state = merge_bay.load_state(state_path)
            self.assertIsNotNone(state)
            self.assertEqual(state['phase'], 'INTEGRATION_RED')
            merge_bay.abort_transaction(repo.config, 'kimi')

    def test_new_merge_requires_explicit_deployment_choice(self):
        with mock.patch('sys.stderr', new=io.StringIO()):
            with self.assertRaises(SystemExit) as caught:
                merge_bay.parse_args(['kimi'])
        self.assertEqual(caught.exception.code, 2)
        no_deploy = merge_bay.parse_args(['kimi', '--no-deploy'])
        self.assertFalse(no_deploy.deploy_requested)
        self.assertTrue(merge_bay.parse_args(['--status']).status)
        self.assertEqual(merge_bay.parse_args(['--resume', 'kimi']).resume, 'kimi')

    def test_deploy_flags_are_mutually_exclusive(self):
        with mock.patch('sys.stderr', new=io.StringIO()):
            with self.assertRaises(SystemExit) as caught:
                merge_bay.parse_args(['kimi', '--deploy', '--no-deploy'])
        self.assertEqual(caught.exception.code, 2)

    def test_master_advance_during_integration_gate_is_not_overwritten(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            repo.commit(repo.bay, 'incoming feature')
            concurrent_oid = []

            def advance_master(gate_index):
                if gate_index == 2:
                    repo.write(repo.root, 'concurrent.txt', 'other writer\n')
                    concurrent_oid.append(repo.commit(repo.root, 'concurrent master advance'))

            runner = GateRunner([0, 0, 0], on_gate=advance_master)
            with self.assertRaisesRegex(merge_bay.ToolError, 'transaction is stale'):
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    False,
                    runner=runner,
                )
            self.assertEqual(len(concurrent_oid), 1)
            self.assertEqual(repo.oid(repo.root), concurrent_oid[0])
            self.assertEqual((repo.root / 'concurrent.txt').read_text(encoding='utf-8'), 'other writer\n')
            self.assertEqual(repo.git(repo.root, 'status', '--porcelain').stdout, '')

    def test_promotion_targets_frozen_oid_even_if_integration_ref_moves(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            repo.commit(repo.bay, 'incoming feature')
            delegate = GateRunner([0, 0, 0])
            frozen = []
            raced = []

            def race_runner(args, cwd, timeout):
                rendered = [str(arg) for arg in args]
                if (
                    rendered[:3] == ['git', 'merge', '--ff-only']
                    and Path(cwd).resolve() == repo.root
                    and not raced
                ):
                    frozen.append(rendered[3])
                    repo.write(repo.integration, 'unverified.txt', 'raced ref\n')
                    raced.append(repo.commit(repo.integration, 'unverified ref advance'))
                return delegate(rendered, Path(cwd), timeout)

            with self.assertRaisesRegex(
                merge_bay.ToolError,
                'integration cleanup HEAD is outside',
            ):
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    False,
                    runner=race_runner,
                )
            self.assertEqual(len(frozen), 1)
            self.assertEqual(repo.oid(repo.root), frozen[0])
            self.assertNotEqual(repo.oid(repo.root), raced[0])

    def test_resume_finishes_cleanup_after_worktree_was_already_removed(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            repo.commit(repo.bay, 'incoming feature')
            delegate = GateRunner([0, 0, 0])
            blocked_branch_delete = []

            def cleanup_crash_runner(args, cwd, timeout):
                rendered = [str(arg) for arg in args]
                if (
                    rendered[:3] == ['git', 'branch', '-d']
                    and rendered[3].startswith('_merge/')
                    and not blocked_branch_delete
                ):
                    blocked_branch_delete.append(rendered[3])
                    return merge_bay.CommandResult(9, '', 'injected cleanup interruption')
                return delegate(rendered, Path(cwd), timeout)

            with self.assertRaisesRegex(merge_bay.ToolError, 'injected cleanup interruption'):
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    False,
                    runner=cleanup_crash_runner,
                )
            self.assertFalse(repo.integration.exists())
            state_path, _ = merge_bay.state_locations(repo.config)
            self.assertTrue(state_path.exists())
            self.assertEqual(len(blocked_branch_delete), 1)

            resumed = merge_bay.resume_transaction(
                repo.config,
                'kimi',
                runner=GateRunner([]),
            )
            self.assertEqual(resumed, 0)
            self.assertFalse(state_path.exists())
            self.assertNotEqual(
                repo.git(
                    repo.root,
                    'show-ref',
                    '--verify',
                    '--quiet',
                    'refs/heads/' + blocked_branch_delete[0],
                    check=False,
                ).returncode,
                0,
            )

    def test_forged_state_cannot_make_abort_remove_a_real_bay(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            source = repo.commit(repo.bay, 'incoming feature')
            state_path, _ = merge_bay.state_locations(repo.config)
            state_path.parent.mkdir(parents=True, exist_ok=True)
            state_path.write_text(
                json.dumps(
                    {
                        'schema': merge_bay.STATE_SCHEMA,
                        'txn_id': 'forged',
                        'phase': 'PREFLIGHTED',
                        'bay_name': 'kimi',
                        'source_ref': 'refs/heads/bay/kimi',
                        'base_master_oid': repo.base_oid,
                        'source_oid': source,
                        'integration_branch': 'bay/kimi',
                        'integration_path': str(repo.bay),
                        'deploy_requested': False,
                        'deployed': False,
                    }
                ),
                encoding='utf-8',
            )
            with self.assertRaises(merge_bay.ToolError):
                merge_bay.abort_transaction(repo.config, 'kimi')
            self.assertTrue(repo.bay.is_dir())
            self.assertEqual(repo.oid(repo.bay), source)
            self.assertEqual(
                repo.git(
                    repo.root,
                    'show-ref',
                    '--verify',
                    '--quiet',
                    'refs/heads/bay/kimi',
                    check=False,
                ).returncode,
                0,
            )

    def test_conflict_is_resumable_and_master_never_holds_conflict(self):
        with TempRepo() as repo:
            repo.write(repo.root, 'shared.txt', 'master version\n')
            base = repo.commit(repo.root, 'master side')
            repo.write(repo.bay, 'shared.txt', 'bay version\n')
            source = repo.commit(repo.bay, 'bay side')
            runner = GateRunner([0, 0, 0, 0, 0])

            result = merge_bay.start_transaction(
                repo.config,
                'kimi',
                False,
                runner=runner,
            )
            self.assertEqual(result, 2)
            self.assertEqual(repo.oid(repo.root), base)
            self.assertEqual(repo.git(repo.root, 'status', '--porcelain').stdout, '')
            self.assertEqual(
                repo.git(repo.root, 'rev-parse', '-q', '--verify', 'MERGE_HEAD', check=False).returncode,
                1,
            )
            self.assertTrue(repo.integration.is_dir())
            self.assertNotEqual(
                repo.git(repo.integration, 'diff', '--name-only', '--diff-filter=U').stdout.strip(),
                '',
            )

            repo.write(repo.integration, 'shared.txt', 'resolved union\n')
            repo.git(repo.integration, 'add', 'shared.txt')
            resumed = merge_bay.resume_transaction(repo.config, 'kimi', runner=runner)
            self.assertEqual(resumed, 0)
            self.assertEqual(len(runner.gate_calls), 5)
            merged = repo.oid(repo.root)
            parents = repo.git(repo.root, 'show', '-s', '--format=%P', merged).stdout.split()
            self.assertEqual(parents, [base, source])
            self.assertFalse(repo.integration.exists())
            state_path, _ = merge_bay.state_locations(repo.config)
            self.assertFalse(state_path.exists())
            self.assertEqual(repo.git(repo.root, 'status', '--porcelain').stdout, '')

    def test_sync_skips_ahead_and_diverged_without_merge(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'bay.txt', 'ahead\n')
            ahead_oid = repo.commit(repo.bay, 'bay ahead')
            spy = GateRunner([])
            status, _ = merge_bay.sync_one_bay(repo.config, 'kimi', runner=spy)
            self.assertEqual(status, 'SKIPPED_AHEAD')
            self.assertEqual(repo.oid(repo.bay), ahead_oid)
            self.assertFalse(
                any(command[:2] == ['git', 'merge'] for command, _ in spy.commands)
            )

            repo.write(repo.root, 'master.txt', 'master ahead too\n')
            repo.commit(repo.root, 'master ahead')
            spy = GateRunner([])
            status, _ = merge_bay.sync_one_bay(repo.config, 'kimi', runner=spy)
            self.assertEqual(status, 'SKIPPED_DIVERGED')
            self.assertEqual(repo.oid(repo.bay), ahead_oid)
            self.assertFalse(
                any(command[:2] == ['git', 'merge'] for command, _ in spy.commands)
            )

    def test_sync_only_behind_uses_ff_only(self):
        with TempRepo() as repo:
            repo.write(repo.root, 'master.txt', 'new master\n')
            master_oid = repo.commit(repo.root, 'master forward')
            spy = GateRunner([])
            status, _ = merge_bay.sync_one_bay(repo.config, 'kimi', runner=spy)
            self.assertEqual(status, 'SYNCED')
            self.assertEqual(repo.oid(repo.bay), master_oid)
            merge_commands = [
                command for command, _ in spy.commands if command[:2] == ['git', 'merge']
            ]
            self.assertEqual(len(merge_commands), 1)
            self.assertIn('--ff-only', merge_commands[0])

    def test_second_publish_failure_rolls_back_both_runtime_files(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'new runtime')
            source = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            (repo.deploy / 'atlas.html').write_bytes(b'deploy-atlas')

            def fail_on_sw_publish(src, dst):
                src_path = Path(src)
                dst_path = Path(dst)
                if src_path.suffix == '.new' and dst_path.name == 'sw.js':
                    raise OSError('injected second publish failure')
                return os.replace(src_path, dst_path)

            with self.assertRaises(merge_bay.DeployError):
                merge_bay.deploy_runtime_atomic(
                    repo.config,
                    source,
                    'rollback-test',
                    source_oid,
                    replace_fn=fail_on_sw_publish,
                )
            self.assertEqual((repo.deploy / 'index.html').read_bytes(), b'old-index')
            self.assertEqual((repo.deploy / 'sw.js').read_bytes(), b'old-sw')
            self.assertEqual((repo.deploy / 'atlas.html').read_bytes(), b'deploy-atlas')
            leftovers = [
                path.name
                for path in repo.deploy.iterdir()
                if path.name.startswith('.glimmer-')
            ]
            self.assertEqual(leftovers, [])

    def test_rollback_failure_keeps_journal_until_resume_restores_both_files(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'new runtime')
            source = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)

            def fail_publish_and_rollback(src, dst):
                src_path = Path(src)
                dst_path = Path(dst)
                if src_path.suffix == '.new' and dst_path.name == 'sw.js':
                    raise OSError('injected second publish failure')
                if src_path.suffix == '.rollback':
                    raise OSError('injected rollback failure')
                return os.replace(src_path, dst_path)

            with self.assertRaisesRegex(merge_bay.DeployError, 'rollback ALSO failed'):
                merge_bay.deploy_runtime_atomic(
                    repo.config,
                    source,
                    'rollback-retry',
                    source_oid,
                    replace_fn=fail_publish_and_rollback,
                )
            self.assertTrue((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(
                merge_bay.recover_deployment(
                    repo.config,
                    expected_txn='rollback-retry',
                    expected_source_oid=source_oid,
                ),
                'rolled_back',
            )
            self.assertEqual((repo.deploy / 'index.html').read_bytes(), b'old-index')
            self.assertEqual((repo.deploy / 'sw.js').read_bytes(), b'old-sw')
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())

    def test_journal_is_durable_before_first_artifact_and_recovers_all_old(self):
        for cut_at in range(1, 5):
            with self.subTest(cut_at=cut_at):
                with TempRepo() as repo:
                    source = merge_bay.runtime_bytes_at_commit(repo.config, repo.base_oid)
                    original_write = merge_bay._durable_write
                    calls = 0

                    def kill_at_artifact_boundary(path, data, exclusive=True):
                        nonlocal calls
                        calls += 1
                        if calls == cut_at:
                            raise KeyboardInterrupt(
                                'injected hard kill at artifact boundary %d' % cut_at
                            )
                        return original_write(path, data, exclusive=exclusive)

                    with mock.patch.object(
                        merge_bay,
                        '_durable_write',
                        side_effect=kill_at_artifact_boundary,
                    ):
                        with self.assertRaises(KeyboardInterrupt):
                            merge_bay.prepare_deployment(
                                repo.config,
                                source,
                                'journal-first',
                                repo.base_oid,
                            )
                    self.assertTrue((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
                    self.assertEqual((repo.deploy / 'index.html').read_bytes(), b'old-index')
                    self.assertEqual((repo.deploy / 'sw.js').read_bytes(), b'old-sw')
                    self.assertEqual(
                        merge_bay.recover_deployment(
                            repo.config,
                            expected_txn='journal-first',
                            expected_source_oid=repo.base_oid,
                        ),
                        'rolled_back',
                    )
                    self.assertFalse(
                        any(
                            path.name.startswith('.glimmer-')
                            for path in repo.deploy.iterdir()
                        )
                    )

    def test_unowned_prejournal_artifact_fails_before_writing_evidence_or_runtime(self):
        with TempRepo() as repo:
            source = merge_bay.runtime_bytes_at_commit(repo.config, repo.base_oid)
            backup, _ = merge_bay._artifact_names('orphan-test', 'index.html')
            (repo.deploy / backup).write_bytes(b'unowned')
            with self.assertRaisesRegex(merge_bay.DeployError, 'without a journal'):
                merge_bay.prepare_deployment(
                    repo.config,
                    source,
                    'orphan-test',
                    repo.base_oid,
                )
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual((repo.deploy / 'index.html').read_bytes(), b'old-index')
            self.assertEqual((repo.deploy / 'sw.js').read_bytes(), b'old-sw')

    def test_mixed_hard_kill_state_recovers_from_durable_journal(self):
        with tempfile.TemporaryDirectory(prefix='glimmer-recovery-test-') as raw:
            base = Path(raw)
            source = base / 'source'
            deploy = base / 'deploy'
            source.mkdir()
            deploy.mkdir()
            (source / 'index.html').write_bytes(b'new-index')
            (source / 'sw.js').write_bytes(b'new-sw')
            (deploy / 'index.html').write_bytes(b'old-index')
            (deploy / 'sw.js').write_bytes(b'old-sw')
            (deploy / merge_bay.DEPLOY_MARKER).write_text(
                'test deployment marker\n',
                encoding='utf-8',
            )
            config = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
            )
            journal = merge_bay.prepare_deployment(
                config,
                source,
                'hard-kill-test',
                '2' * 40,
            )
            index_entry = journal['files'][0]
            os.replace(deploy / index_entry['stage'], deploy / index_entry['name'])
            self.assertEqual((deploy / 'index.html').read_bytes(), b'new-index')
            self.assertEqual((deploy / 'sw.js').read_bytes(), b'old-sw')

            recovered = merge_bay.recover_deployment(config)
            self.assertEqual(recovered, 'rolled_back')
            self.assertEqual((deploy / 'index.html').read_bytes(), b'old-index')
            self.assertEqual((deploy / 'sw.js').read_bytes(), b'old-sw')
            self.assertFalse((deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertFalse(
                any(path.name.startswith('.glimmer-') for path in deploy.iterdir())
            )

    def test_stale_foreign_journal_never_overwrites_newer_runtime(self):
        with tempfile.TemporaryDirectory(prefix='glimmer-foreign-test-') as raw:
            base = Path(raw)
            source = base / 'source'
            deploy = base / 'deploy'
            source.mkdir()
            deploy.mkdir()
            (source / 'index.html').write_bytes(b'new-index')
            (source / 'sw.js').write_bytes(b'new-sw')
            (deploy / 'index.html').write_bytes(b'old-index')
            (deploy / 'sw.js').write_bytes(b'old-sw')
            (deploy / merge_bay.DEPLOY_MARKER).write_text('marker\n', encoding='utf-8')
            config = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
            )
            merge_bay.prepare_deployment(config, source, 'foreign-test', '3' * 40)
            (deploy / 'index.html').write_bytes(b'foreign-newer-index')
            before_index = (deploy / 'index.html').read_bytes()
            before_sw = (deploy / 'sw.js').read_bytes()
            with self.assertRaisesRegex(merge_bay.DeployError, 'stale/foreign'):
                merge_bay.recover_deployment(config)
            self.assertEqual((deploy / 'index.html').read_bytes(), before_index)
            self.assertEqual((deploy / 'sw.js').read_bytes(), before_sw)

    def test_malicious_journal_cannot_name_atlas_as_artifact(self):
        with tempfile.TemporaryDirectory(prefix='glimmer-atlas-journal-test-') as raw:
            base = Path(raw)
            source = base / 'source'
            deploy = base / 'deploy'
            source.mkdir()
            deploy.mkdir()
            (source / 'index.html').write_bytes(b'new-index')
            (source / 'sw.js').write_bytes(b'new-sw')
            (deploy / 'index.html').write_bytes(b'old-index')
            (deploy / 'sw.js').write_bytes(b'old-sw')
            (deploy / 'atlas.html').write_bytes(b'must-survive')
            (deploy / merge_bay.DEPLOY_MARKER).write_text('marker\n', encoding='utf-8')
            config = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
            )
            journal = merge_bay.prepare_deployment(
                config,
                source,
                'atlas-attack',
                '4' * 40,
            )
            journal['files'][0]['backup'] = 'atlas.html'
            (deploy / merge_bay.DEPLOY_JOURNAL).write_text(
                json.dumps(journal),
                encoding='utf-8',
            )
            with self.assertRaisesRegex(merge_bay.DeployError, 'artifact name'):
                merge_bay.recover_deployment(config)
            self.assertEqual((deploy / 'atlas.html').read_bytes(), b'must-survive')

    def test_cleanup_lock_keeps_truthful_journal_and_new_runtime(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'new runtime')
            source = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            original_unlink = Path.unlink

            def locked_backup(path, *args, **kwargs):
                if path.name.endswith('.bak'):
                    raise PermissionError('injected OneDrive artifact lock')
                return original_unlink(path, *args, **kwargs)

            with mock.patch.object(Path, 'unlink', locked_backup):
                with self.assertRaises(merge_bay.DeployCleanupPending) as caught:
                    merge_bay.deploy_runtime_atomic(
                        repo.config,
                        source,
                        'cleanup-lock',
                        source_oid,
                    )
            self.assertEqual(caught.exception.runtime_state, 'committed')
            self.assertEqual((repo.deploy / 'index.html').read_bytes(), source['index.html'])
            self.assertEqual((repo.deploy / 'sw.js').read_bytes(), source['sw.js'])
            self.assertTrue((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(merge_bay.recover_deployment(repo.config), 'committed')
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())

    def test_cleanup_pending_all_old_resume_republishes_verified_runtime(self):
        with TempRepo() as repo:
            repo.write(
                repo.bay,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.bay, 'sw.js', "const APP_VER='2.0';\n")
            repo.write(repo.bay, 'feature.txt', 'deploy me\n')
            repo.commit(repo.bay, 'new deployable runtime')
            original_unlink = Path.unlink

            def locked_backup(path, *args, **kwargs):
                if path.name.endswith('.bak'):
                    raise PermissionError('injected cleanup lock')
                return original_unlink(path, *args, **kwargs)

            with mock.patch.object(Path, 'unlink', locked_backup):
                with self.assertRaises(merge_bay.DeployCleanupPending):
                    merge_bay.start_transaction(
                        repo.config,
                        'kimi',
                        True,
                        runner=GateRunner([0, 0, 0]),
                    )

            state_path, _ = merge_bay.state_locations(repo.config)
            state = merge_bay.load_state(state_path)
            self.assertIsNotNone(state)
            self.assertTrue(state['deployed'])
            journal = merge_bay._load_deploy_journal(
                repo.config,
                expected_txn=state['txn_id'],
                expected_source_oid=state['integration_oid'],
            )
            self.assertIsNotNone(journal)

            # Model a late OneDrive/crash rollback while cleanup evidence is
            # still present: both live files return to the journal's old bytes.
            for entry in journal['files']:
                old_data = (repo.deploy / entry['backup']).read_bytes()
                (repo.deploy / entry['name']).write_bytes(old_data)

            original_recover = merge_bay.recover_deployment
            interrupted = []

            def kill_after_recovery(*args, **kwargs):
                result = original_recover(*args, **kwargs)
                if result == 'rolled_back' and not interrupted:
                    interrupted.append(result)
                    raise KeyboardInterrupt('injected kill after journal removal')
                return result

            with mock.patch.object(
                merge_bay,
                'recover_deployment',
                side_effect=kill_after_recovery,
            ):
                with self.assertRaises(KeyboardInterrupt):
                    merge_bay.resume_transaction(
                        repo.config,
                        'kimi',
                        runner=GateRunner([]),
                    )
            interrupted_state = merge_bay.load_state(state_path)
            self.assertIsNotNone(interrupted_state)
            self.assertFalse(interrupted_state['deployed'])
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())

            self.assertEqual(
                merge_bay.resume_transaction(
                    repo.config,
                    'kimi',
                    runner=GateRunner([]),
                ),
                0,
            )
            merged = repo.oid(repo.root)
            expected = merge_bay.runtime_bytes_at_commit(repo.config, merged)
            self.assertEqual((repo.deploy / 'index.html').read_bytes(), expected['index.html'])
            self.assertEqual((repo.deploy / 'sw.js').read_bytes(), expected['sw.js'])
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'match')
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertFalse(state_path.exists())

    def test_receipt_exists_before_journal_unlink_hard_kill_cut(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'new runtime')
            source = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            original_unlink = Path.unlink

            def kill_before_journal_unlink(path, *args, **kwargs):
                if path.name == merge_bay.DEPLOY_JOURNAL:
                    receipt = merge_bay.deploy_receipt_path(repo.config)
                    self.assertTrue(receipt.exists())
                    raise KeyboardInterrupt('injected kill at journal unlink')
                return original_unlink(path, *args, **kwargs)

            with mock.patch.object(
                Path,
                'unlink',
                new=kill_before_journal_unlink,
            ):
                with self.assertRaises(KeyboardInterrupt):
                    merge_bay.deploy_runtime_atomic(
                        repo.config,
                        source,
                        'receipt-before-cleanup',
                        source_oid,
                    )
            self.assertTrue((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(
                merge_bay.recover_deployment(
                    repo.config,
                    expected_txn='receipt-before-cleanup',
                    expected_source_oid=source_oid,
                ),
                'committed',
            )
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'match')
            self.assertEqual((repo.deploy / 'index.html').read_bytes(), source['index.html'])
            self.assertEqual((repo.deploy / 'sw.js').read_bytes(), source['sw.js'])

    def test_all_new_recovery_writes_exact_receipt_before_removing_journal(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'new runtime')
            source = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            journal = merge_bay.prepare_deployment(
                repo.config,
                source,
                'all-new-recovery',
                source_oid,
            )
            for entry in journal['files']:
                os.replace(
                    repo.deploy / entry['stage'],
                    repo.deploy / entry['name'],
                )
            self.assertFalse(merge_bay.deploy_receipt_path(repo.config).exists())
            self.assertEqual(
                merge_bay.recover_deployment(
                    repo.config,
                    expected_txn='all-new-recovery',
                    expected_source_oid=source_oid,
                ),
                'committed',
            )
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'match')

    def test_corrupt_second_backup_causes_zero_rollback_writes(self):
        with tempfile.TemporaryDirectory(prefix='glimmer-backup-corrupt-test-') as raw:
            base = Path(raw)
            source = base / 'source'
            deploy = base / 'deploy'
            source.mkdir()
            deploy.mkdir()
            (source / 'index.html').write_bytes(b'new-index')
            (source / 'sw.js').write_bytes(b'new-sw')
            (deploy / 'index.html').write_bytes(b'old-index')
            (deploy / 'sw.js').write_bytes(b'old-sw')
            (deploy / merge_bay.DEPLOY_MARKER).write_text('marker\n', encoding='utf-8')
            config = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
            )
            journal = merge_bay.prepare_deployment(
                config,
                source,
                'backup-corrupt',
                '6' * 40,
            )
            index_entry, sw_entry = journal['files']
            os.replace(deploy / index_entry['stage'], deploy / index_entry['name'])
            (deploy / sw_entry['backup']).write_bytes(b'corrupt')
            before_index = (deploy / 'index.html').read_bytes()
            before_sw = (deploy / 'sw.js').read_bytes()
            with self.assertRaisesRegex(merge_bay.DeployError, 'backup hash mismatch'):
                merge_bay.recover_deployment(config)
            self.assertEqual((deploy / 'index.html').read_bytes(), before_index)
            self.assertEqual((deploy / 'sw.js').read_bytes(), before_sw)

    def test_deploy_source_bytes_come_from_frozen_commit_not_worktree(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='foreign';</script>\n",
            )
            blobs = merge_bay.runtime_bytes_at_commit(
                repo.config,
                repo.base_oid,
            )
            self.assertEqual(
                blobs['index.html'],
                b"<script>const GAME_VER='1.0';</script>\n",
            )
            self.assertEqual(blobs['sw.js'], b"const APP_VER='1.0';\n")

    def test_wrong_deploy_marker_and_extended_runtime_whitelist_are_rejected(self):
        with tempfile.TemporaryDirectory(prefix='glimmer-deploy-identity-test-') as raw:
            base = Path(raw)
            source = base / 'source'
            deploy = base / 'deploy'
            source.mkdir()
            deploy.mkdir()
            for directory, prefix in ((source, b'new-'), (deploy, b'old-')):
                (directory / 'index.html').write_bytes(prefix + b'index')
                (directory / 'sw.js').write_bytes(prefix + b'sw')
            config = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
            )
            with self.assertRaisesRegex(merge_bay.DeployError, 'marker'):
                merge_bay.prepare_deployment(config, source, 'wrong-marker', '7' * 40)
            (deploy / merge_bay.DEPLOY_MARKER).write_text('marker\n', encoding='utf-8')
            extended = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
                runtime_files=('index.html', 'sw.js', 'atlas.html'),
            )
            with self.assertRaisesRegex(merge_bay.DeployError, 'whitelist'):
                merge_bay.prepare_deployment(
                    extended,
                    source,
                    'extended-runtime',
                    '8' * 40,
                )

    def _pristine_deploy(self, base):
        """T370 helper: a deploy dir holding exactly the allowed runtime set."""
        deploy = base / 'deploy'
        deploy.mkdir()
        (deploy / 'index.html').write_bytes(b'idx')
        (deploy / 'sw.js').write_bytes(b'sw')
        (deploy / merge_bay.DEPLOY_MARKER).write_text('marker\n', encoding='utf-8')
        return deploy

    def test_deploy_residue_scan_accepts_pristine_directory(self):
        """T370: the whitelist must not reject a legitimately clean deploy dir."""
        with tempfile.TemporaryDirectory(prefix='glimmer-residue-clean-') as raw:
            deploy = self._pristine_deploy(Path(raw))
            for name in ('manifest.json', 'icon.svg', 'npu_bench.html'):
                (deploy / name).write_bytes(b'asset')
            self.assertEqual(merge_bay.scan_deploy_residue(deploy), ([], []))
            merge_bay.assert_deploy_pristine(deploy)

    def test_deploy_residue_scan_rejects_review_artefacts(self):
        """T370: review PNG / probe HTML in the player's directory must fail closed.

        Regression for the T359-T369 drift: 66 artefacts (19.1 MB) accumulated in
        the player directory, including 10 probes that iframe the game and call
        newWorldSeeded+addMoney with 0/10 setting slot 3 -- with curSlot()
        defaulting to 1 and a 25s autosave, that is live ordnance over real saves.
        """
        with tempfile.TemporaryDirectory(prefix='glimmer-residue-dirty-') as raw:
            deploy = self._pristine_deploy(Path(raw))
            (deploy / 't368-review-neon.png').write_bytes(b'png')
            (deploy / 't367b-probe.html').write_bytes(b'<iframe src="index.html">')
            strays, stray_dirs = merge_bay.scan_deploy_residue(deploy)
            self.assertEqual(stray_dirs, [])
            self.assertEqual(
                sorted(strays),
                ['t367b-probe.html', 't368-review-neon.png'],
            )
            with self.assertRaisesRegex(merge_bay.DeployError, 'not pristine'):
                merge_bay.assert_deploy_pristine(deploy)

    def test_deploy_residue_scan_rejects_stray_directory(self):
        """T370: a leftover directory is the T349 failure mode (misleading .git)."""
        with tempfile.TemporaryDirectory(prefix='glimmer-residue-dir-') as raw:
            deploy = self._pristine_deploy(Path(raw))
            (deploy / '.git').mkdir()
            strays, stray_dirs = merge_bay.scan_deploy_residue(deploy)
            self.assertEqual(strays, [])
            self.assertEqual(stray_dirs, ['.git'])
            with self.assertRaisesRegex(merge_bay.DeployError, 'unexpected directories'):
                merge_bay.assert_deploy_pristine(deploy)

    def test_residue_scan_skips_transient_and_honours_config_runtime(self):
        """T370: skip our own .bak/.new/journal; accept config-declared runtime files."""
        with tempfile.TemporaryDirectory(prefix='glimmer-residue-gate-') as raw:
            base = Path(raw)
            source = base / 'source'
            source.mkdir()
            deploy = self._pristine_deploy(base)
            config = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
            )
            merge_bay.assert_deploy_pristine(deploy, config)
            # 部署自家的暫存檔不算殘留（否則掃描會跟原子替換打架）
            (deploy / (merge_bay.DEPLOY_TRANSIENT_PREFIX + 'x-index.html.bak')).write_bytes(b'b')
            (deploy / merge_bay.DEPLOY_JOURNAL).write_text('{}', encoding='utf-8')
            merge_bay.assert_deploy_pristine(deploy, config)
            # 但 config 宣告的額外執行期檔要被接受
            extended = merge_bay.MergeConfig(
                root=source,
                deploy=deploy,
                bays={},
                integration_path=base / 'integration',
                runtime_files=('index.html', 'sw.js', 'atlas.html'),
            )
            (deploy / 'atlas.html').write_bytes(b'atlas')
            with self.assertRaisesRegex(merge_bay.DeployError, 'not pristine'):
                merge_bay.assert_deploy_pristine(deploy, config)
            merge_bay.assert_deploy_pristine(deploy, extended)
            # 真正的殘留仍要紅
            (deploy / 't999-review-stray.png').write_bytes(b'png')
            with self.assertRaisesRegex(merge_bay.DeployError, 'not pristine'):
                merge_bay.assert_deploy_pristine(deploy, extended)

    def test_signoff_must_land_before_merge(self):
        """T371: 合併時驗收欄必須已經具名，不能還寫「待」或整個缺欄。

        關掉的兩種實際形態：①已覆核但沒回頭收狀態欄（T367b/T364c/d）
        ②條目根本沒有驗收欄（歷史 23 條）。從倉庫看兩者與「沒覆核」無法區分。
        """
        with TempRepo() as repo:
            cl = repo.root / 'docs'
            cl.mkdir(exist_ok=True)
            repo.write(repo.root, 'docs/CHANGELOG.md', '# CHANGELOG\n')
            repo.commit(repo.root, 'changelog base')
            repo.git(repo.bay, 'merge', 'master', '--no-edit')

            def bay_entry(text):
                repo.write(repo.bay, 'docs/CHANGELOG.md', '# CHANGELOG\n' + text + '\n')
                repo.git(repo.bay, 'add', '-A')
                repo.git(repo.bay, 'commit', '--amend', '-m', 'bay changelog', check=False)

            repo.write(repo.bay, 'docs/CHANGELOG.md',
                       '# CHANGELOG\n2026-07-29 | T999 x | y | 驗收:待非作者覆核\n')
            repo.commit(repo.bay, 'bay changelog pending')
            with self.assertRaisesRegex(merge_bay.ToolError, 'still pending'):
                merge_bay.assert_signoff_landed(repo.config, 'kimi')

            bay_entry('2026-07-29 | T999 x | y | 驗收:通過')
            with self.assertRaisesRegex(merge_bay.ToolError, 'names no reviewer'):
                merge_bay.assert_signoff_landed(repo.config, 'kimi')

            bay_entry('2026-07-29 | T999 x | y')
            with self.assertRaisesRegex(merge_bay.ToolError, 'no 驗收 field'):
                merge_bay.assert_signoff_landed(repo.config, 'kimi')

            bay_entry('2026-07-29 | T999 x | y | 驗收:通過（Kimi 非作者覆核：親跑 42/42）')
            merge_bay.assert_signoff_landed(repo.config, 'kimi')

    def test_changelog_must_only_grow(self):
        """T433: 合併不得刪掉既有 CHANGELOG 條目，除非用 commit message 明示。

        關掉的實際形態（不是假想題）：release tail 把上一張卡的條目**就地覆寫**
        （diff 是 +1/−1）。既有的 changelog_entries_added_by 只掃 '+' 行，
        於是這種刪除連續四次全綠，四條條目真的從檔案裡消失：
          T423 1,304 字（被 d8d2ca1 刪）／T424 1,395 字（37bb901）
          T425 1,641 字（ff19b03）／T425A 1,495 字（46fe8ff）
        四條已由 T433 從 git 物件逐字元救回；本例是止血的那一半。

        設計上刻意讀 **commit message** 而不是程式註解或卡面：
        卡面可以事後改，落地的 commit message 不能。
        """
        with TempRepo() as repo:
            (repo.root / 'docs').mkdir(exist_ok=True)
            base = ('# CHANGELOG\n'
                    '2026-07-29 | T998 舊卡 | 內容 | 驗收:通過（Kimi 非作者覆核）\n')
            repo.write(repo.root, 'docs/CHANGELOG.md', base)
            repo.commit(repo.root, 'changelog base')
            repo.git(repo.bay, 'merge', 'master', '--no-edit')

            good = '2026-07-30 | T999 新卡 | 內容 | 驗收:通過（Kimi 非作者覆核）'
            old = '2026-07-29 | T998 舊卡 | 內容 | 驗收:通過（Kimi 非作者覆核）'

            # ① 純新增：既有條目原樣保留 ⇒ 必須放行（不得誤傷正常路徑）
            repo.write(repo.bay, 'docs/CHANGELOG.md',
                       '# CHANGELOG\n' + good + '\n' + old + '\n')
            repo.commit(repo.bay, 'bay adds one entry')
            merge_bay.assert_changelog_only_grows(repo.config, 'kimi')
            self.assertEqual(
                merge_bay.changelog_entries_removed_by(repo.config, 'kimi'), [])

            # ② 就地覆寫（+1/−1）＝四次事故的形態 ⇒ 必須紅
            repo.write(repo.bay, 'docs/CHANGELOG.md', '# CHANGELOG\n' + good + '\n')
            repo.commit(repo.bay, 'bay release tail overwrites previous entry')
            removed = merge_bay.changelog_entries_removed_by(repo.config, 'kimi')
            self.assertEqual(len(removed), 1)
            self.assertIn('T998', removed[0])
            with self.assertRaisesRegex(merge_bay.ToolError, 'deletes 1 CHANGELOG'):
                merge_bay.assert_changelog_only_grows(repo.config, 'kimi')

            # ③ 明示更正：commit message 帶 CHANGELOG-CORRECTION: ⇒ 放行
            repo.write(repo.bay, 'docs/CHANGELOG.md', '# CHANGELOG\n' + good + '\n')
            repo.git(repo.bay, 'add', '-A')
            repo.git(repo.bay, 'commit', '--allow-empty', '-m',
                     'bay declares the deletion\n\n'
                     'CHANGELOG-CORRECTION: 移除 T998 條目，理由是該卡從未落地',
                     check=False)
            merge_bay.assert_changelog_only_grows(repo.config, 'kimi')

            # ④ 一行宣告不得解鎖整個車位的所有刪除（覆核退修：第一版只要有任一宣告就全放行，
            #    等於「commit 1 合法更正 A、commit 5 順手覆寫 B」照樣過——正是本守衛要止的血）
            repo.write(repo.root, 'docs/CHANGELOG.md',
                       '# CHANGELOG\n' + old + '\n'
                       + '2026-07-28 | T997 另一張舊卡 | 內容 | 驗收:通過（Kimi 非作者覆核）\n')
            repo.commit(repo.root, 'changelog base with two old entries')
            repo.git(repo.bay, 'merge', 'master', '--no-edit', check=False)
            repo.write(repo.bay, 'docs/CHANGELOG.md', '# CHANGELOG\n' + good + '\n')
            repo.git(repo.bay, 'add', '-A')
            repo.git(repo.bay, 'commit', '-m',
                     'bay deletes two, declares only one\n\n'
                     'CHANGELOG-CORRECTION: 移除 T998 條目，理由是該卡從未落地',
                     check=False)
            removed_two = merge_bay.changelog_entries_removed_by(repo.config, 'kimi')
            self.assertEqual(len(removed_two), 2)
            with self.assertRaisesRegex(merge_bay.ToolError, 'not named in any declaration'):
                merge_bay.assert_changelog_only_grows(repo.config, 'kimi')

    def test_no_duplicate_test_names(self):
        """T433 R03：同一個 class 裡不得有同名 test_ 方法。

        起因是本卡自己踩的：`test_changelog_must_only_grow` 被逐字貼了兩份
        （1196 與 1246），Python 只保留後者，前 50 行成為永不執行的死碼——
        而卡面「例數由 54 → 55」的機械閘門**正好因為重複名被靜默吞掉才剛好成立**。
        單看總數分不出「加了一例」與「同一例貼了兩份」，這是本專案鐵訓
        「『恰 N 次』的總數釘容易靠巧合成立」的教科書案例。

        這條自檢讀自己的原始碼，所以它也擋得住未來任何一次同型貼錯。
        """
        with io.open(__file__, encoding='utf-8') as source_file:
            source = source_file.read()
        names = re.findall(r'\n    def (test_\w+)', source)
        duplicates = sorted({n for n in names if names.count(n) > 1})
        self.assertEqual(
            duplicates, [],
            '同名 test_ 方法會被靜默覆蓋成死碼：' + ', '.join(duplicates))
        self.assertEqual(
            len(names), len(set(names)),
            'def test_ 總數 %d 與 unique 數 %d 不符' % (len(names), len(set(names))))

    def test_integration_must_keep_master_changelog_entries(self):
        """T433 R03: 整合解衝突把 master 側條目吃掉，bay 三點 diff 看不見。

        assert_changelog_only_grows 看的是 master...bay/NAME（merge-base→bay），
        擋得住「release tail 就地覆寫車位繼承來的那一行」（＝T423-T425A 的形態），
        但擋不住反方向：master 在 merge-base **之後**新增的條目，在整合工作樹
        解衝突時被丟掉。CHANGELOG 是全庫最容易衝突的單檔（一卡一行全擠檔首）。

        對抗性覆核在暫存 repo 實測過：bay 加 T003、master 加 T002，
        三點 diff 只印 +T003、removed=0、守衛 PASSED——而以 bay 側解衝突會永久吃掉 T002。
        凍結 bay OID 對這條路徑無效：bay OID 根本沒變。
        所以真正該站崗的位置是**即將成為 master 的那個整合 commit**。
        """
        with TempRepo() as repo:
            (repo.root / 'docs').mkdir(exist_ok=True)
            t001 = '2026-07-28 | T001 起始 | 內容 | 驗收:通過（Kimi 非作者覆核）'
            repo.write(repo.root, 'docs/CHANGELOG.md', '# CHANGELOG\n' + t001 + '\n')
            repo.commit(repo.root, 'changelog base')
            repo.git(repo.bay, 'merge', 'master', '--no-edit')

            # bay 加 T003（合法的只增）
            t003 = '2026-07-30 | T003 車位新卡 | 內容 | 驗收:通過（Kimi 非作者覆核）'
            repo.write(repo.bay, 'docs/CHANGELOG.md', '# CHANGELOG\n' + t003 + '\n' + t001 + '\n')
            repo.commit(repo.bay, 'bay adds T003')

            # master 在 merge-base 之後也加了 T002
            t002 = '2026-07-29 | T002 主線新卡 | 內容 | 驗收:通過（Kimi 非作者覆核）'
            repo.write(repo.root, 'docs/CHANGELOG.md', '# CHANGELOG\n' + t002 + '\n' + t001 + '\n')
            repo.commit(repo.root, 'master adds T002')

            # 車位側的三點檢查：看不到任何刪除（這正是缺口）
            self.assertEqual(
                merge_bay.changelog_entries_removed_by(repo.config, 'kimi'), [])
            merge_bay.assert_changelog_only_grows(repo.config, 'kimi')

            # 造一個「以 bay 側解衝突」的整合 commit：T002 被吃掉
            bad = repo.git(repo.root, 'commit-tree', '-p', 'master', '-p', 'bay/kimi',
                           '-m', 'integration that drops T002',
                           input_text=None) if False else None
            # 用 worktree 造整合 commit（與工具實際做法一致）
            repo.git(repo.root, 'checkout', '-q', '-b', 'tmp-int', 'master')
            repo.git(repo.root, 'merge', 'bay/kimi', '--no-commit', '--no-ff', check=False)
            repo.write(repo.root, 'docs/CHANGELOG.md', '# CHANGELOG\n' + t003 + '\n' + t001 + '\n')
            repo.git(repo.root, 'add', '-A')
            repo.git(repo.root, 'commit', '-m', 'integration resolved bay-side (drops T002)')
            merged = repo.git(repo.root, 'rev-parse', 'HEAD').stdout.strip()
            repo.git(repo.root, 'checkout', '-q', 'master')

            with self.assertRaisesRegex(merge_bay.ToolError, 'drops 1 CHANGELOG'):
                merge_bay.assert_integration_keeps_changelog(repo.config, merged)

            # 對照：保留 T002 的整合結果必須放行
            repo.git(repo.root, 'checkout', '-q', '-b', 'tmp-int2', 'master')
            repo.git(repo.root, 'merge', 'bay/kimi', '--no-commit', '--no-ff', check=False)
            repo.write(repo.root, 'docs/CHANGELOG.md',
                       '# CHANGELOG\n' + t003 + '\n' + t002 + '\n' + t001 + '\n')
            repo.git(repo.root, 'add', '-A')
            repo.git(repo.root, 'commit', '-m', 'integration keeps both')
            good = repo.git(repo.root, 'rev-parse', 'HEAD').stdout.strip()
            repo.git(repo.root, 'checkout', '-q', 'master')
            merge_bay.assert_integration_keeps_changelog(repo.config, good)

    def test_resume_also_enforces_deploy_residue_scan(self):
        """T370a (Kimi 非作者覆核): --resume 也必須驗部署目錄純淨。

        T370 只把檢查掛在 start 的 preflight，交易開始後才落入的殘留會整個繞過——
        而那正是實務上最可能發生的時機：有人在等閘門跑完的期間丟了張實拍進玩家目錄。
        """
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            repo.commit(repo.bay, 'incoming feature')
            blocked = []

            def cleanup_crash_runner(args, cwd, timeout):
                rendered = [str(arg) for arg in args]
                if (
                    rendered[:3] == ['git', 'branch', '-d']
                    and rendered[3].startswith('_merge/')
                    and not blocked
                ):
                    blocked.append(rendered[3])
                    return merge_bay.CommandResult(9, '', 'injected cleanup interruption')
                return GateRunner([0, 0, 0])(rendered, Path(cwd), timeout)

            with self.assertRaisesRegex(merge_bay.ToolError, 'injected cleanup interruption'):
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    True,
                    runner=cleanup_crash_runner,
                )
            state_path, _ = merge_bay.state_locations(repo.config)
            self.assertTrue(state_path.exists())
            state = json.loads(state_path.read_text(encoding='utf-8'))
            self.assertTrue(state['deploy_requested'])

            # 交易進行中有人把實拍丟進玩家目錄 -> resume 必須紅
            (repo.deploy / 't999-review-late.png').write_bytes(b'png')
            with self.assertRaisesRegex(merge_bay.DeployError, 'not pristine'):
                merge_bay.resume_transaction(repo.config, 'kimi', runner=GateRunner([]))
            self.assertTrue(state_path.exists(), 'red resume must not discard the transaction')

            # 移走殘留後 resume 應能正常收尾
            (repo.deploy / 't999-review-late.png').unlink()
            self.assertEqual(
                merge_bay.resume_transaction(repo.config, 'kimi', runner=GateRunner([])),
                0,
            )

    def test_deploy_receipt_detects_late_onedrive_style_rollback(self):
        with TempRepo() as repo:
            with self.assertRaisesRegex(merge_bay.DeployError, 'exact source OID'):
                merge_bay.write_deploy_receipt(repo.config, repo.base_oid)
            expected = merge_bay.runtime_bytes_at_commit(repo.config, repo.base_oid)
            for name, data in expected.items():
                (repo.deploy / name).write_bytes(data)
            merge_bay.write_deploy_receipt(repo.config, repo.base_oid)
            receipt_path = merge_bay.deploy_receipt_path(repo.config)
            receipt_before = receipt_path.read_bytes()
            self.assertEqual(
                merge_bay.verify_deploy_receipt(repo.config),
                'match',
            )
            (repo.deploy / 'index.html').write_bytes(b'wrong-before-resign')
            with self.assertRaisesRegex(merge_bay.DeployError, 'exact source OID'):
                merge_bay.write_deploy_receipt(repo.config, repo.base_oid)
            self.assertEqual(receipt_path.read_bytes(), receipt_before)
            (repo.deploy / 'index.html').write_bytes(expected['index.html'])
            (repo.deploy / 'index.html').write_bytes(b'late-rollback')
            with self.assertRaisesRegex(merge_bay.DeployError, 'drifted'):
                merge_bay.verify_deploy_receipt(repo.config)

    def test_forged_receipt_hashes_cannot_bless_bytes_outside_source_commit(self):
        with TempRepo() as repo:
            forged = {
                'schema': 1,
                'source_oid': repo.base_oid,
                'runtime_sha256': {
                    name: merge_bay._sha256_file(repo.deploy / name)
                    for name in merge_bay.RUNTIME
                },
                'written_at': 1,
            }
            merge_bay._atomic_write_json(
                merge_bay.deploy_receipt_path(repo.config),
                forged,
            )
            with self.assertRaisesRegex(merge_bay.DeployError, 'exact source OID'):
                merge_bay.verify_deploy_receipt(repo.config)

    def test_publish_master_writes_exact_master_bytes_receipt_and_status(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'direct master runtime')
            bay_before = repo.oid(repo.bay)
            runner = GateRunner([0])

            self.assertEqual(merge_bay.publish_master(repo.config, runner=runner), 0)

            expected = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            for name in merge_bay.RUNTIME:
                self.assertEqual((repo.deploy / name).read_bytes(), expected[name])
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'match')
            with mock.patch('sys.stdout', new=io.StringIO()) as output:
                self.assertEqual(merge_bay.status_only(repo.config), 0)
            self.assertIn('deploy receipt=match', output.getvalue())
            self.assertEqual(repo.oid(repo.root), source_oid)
            self.assertEqual(repo.oid(repo.bay), bay_before)
            state_path, _ = merge_bay.state_locations(repo.config)
            self.assertFalse(state_path.exists())
            self.assertFalse(repo.integration.exists())
            self.assertEqual(len(runner.gate_calls), 1)
            self.assertEqual(Path(runner.gate_calls[0][0][3]), repo.root)

    def test_publish_master_repairs_a_drifted_receipt_with_current_head(self):
        with TempRepo() as repo:
            base_bytes = merge_bay.runtime_bytes_at_commit(repo.config, repo.base_oid)
            for name in merge_bay.RUNTIME:
                (repo.deploy / name).write_bytes(base_bytes[name])
            merge_bay.write_deploy_receipt(repo.config, repo.base_oid)

            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'master newer than receipt')
            current_bytes = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            for name in merge_bay.RUNTIME:
                (repo.deploy / name).write_bytes(current_bytes[name])

            with self.assertRaisesRegex(merge_bay.DeployError, 'drifted'):
                merge_bay.verify_deploy_receipt(repo.config)
            self.assertEqual(
                merge_bay.publish_master(repo.config, runner=GateRunner([0])),
                0,
            )
            receipt = json.loads(
                merge_bay.deploy_receipt_path(repo.config).read_text(encoding='utf-8')
            )
            self.assertEqual(receipt['source_oid'], source_oid)
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'match')

    def test_publish_master_rejects_dirty_master_without_player_write(self):
        with TempRepo() as repo:
            repo.write(repo.root, 'dirty.txt', 'uncommitted\n')
            before_tree = self._deploy_tree_bytes(repo.deploy)
            receipt_path = merge_bay.deploy_receipt_path(repo.config)
            receipt_before = self._optional_bytes(receipt_path)
            runner = GateRunner([])

            with self.assertRaises(merge_bay.ToolError):
                merge_bay.publish_master(repo.config, runner=runner)

            self.assertEqual(self._deploy_tree_bytes(repo.deploy), before_tree)
            self.assertEqual(self._optional_bytes(receipt_path), receipt_before)
            self.assertEqual(runner.gate_calls, [])

    def test_publish_master_rejects_active_transaction_without_player_write(self):
        with TempRepo() as repo:
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            source_oid = repo.commit(repo.bay, 'incoming feature')
            state_path, _ = merge_bay.state_locations(repo.config)
            state = merge_bay._new_transaction_state(
                repo.config,
                'kimi',
                repo.base_oid,
                source_oid,
                True,
            )
            merge_bay.save_state(state_path, state)
            before_tree = self._deploy_tree_bytes(repo.deploy)
            runner = GateRunner([])

            with self.assertRaisesRegex(merge_bay.ToolError, 'active transaction'):
                merge_bay.publish_master(repo.config, runner=runner)

            self.assertEqual(self._deploy_tree_bytes(repo.deploy), before_tree)
            self.assertEqual(merge_bay.load_state(state_path)['txn_id'], state['txn_id'])
            self.assertEqual(runner.gate_calls, [])

    def test_publish_master_red_verifier_leaves_recoverable_player_state_untouched(self):
        with TempRepo() as repo:
            source = merge_bay.runtime_bytes_at_commit(repo.config, repo.base_oid)
            merge_bay.prepare_deployment(
                repo.config,
                source,
                'publish-gate-red',
                repo.base_oid,
            )
            before_tree = self._deploy_tree_bytes(repo.deploy)
            receipt_path = merge_bay.deploy_receipt_path(repo.config)
            receipt_before = self._optional_bytes(receipt_path)
            runner = GateRunner([9])

            with self.assertRaisesRegex(merge_bay.ToolError, 'master publish verifier'):
                merge_bay.publish_master(repo.config, runner=runner)

            self.assertEqual(self._deploy_tree_bytes(repo.deploy), before_tree)
            self.assertEqual(self._optional_bytes(receipt_path), receipt_before)
            self.assertTrue((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(len(runner.gate_calls), 1)
            self.assertEqual(Path(runner.gate_calls[0][0][3]), repo.root)

    def test_publish_master_rejects_deploy_residue_before_verifier_or_write(self):
        with TempRepo() as repo:
            (repo.deploy / 't999-review.png').write_bytes(b'not a runtime asset')
            before_tree = self._deploy_tree_bytes(repo.deploy)
            runner = GateRunner([])

            with self.assertRaisesRegex(merge_bay.DeployError, 'not pristine'):
                merge_bay.publish_master(repo.config, runner=runner)

            self.assertEqual(self._deploy_tree_bytes(repo.deploy), before_tree)
            self.assertEqual(runner.gate_calls, [])

    def test_publish_flag_is_mutually_exclusive_with_every_other_action(self):
        self.assertTrue(merge_bay.parse_args(['--publish']).publish)
        for argv in (
            ['kimi', '--publish'],
            ['--publish', '--deploy'],
            ['--publish', '--no-deploy'],
            ['--publish', '--resume', 'kimi'],
            ['--publish', '--abort', 'kimi'],
            ['--publish', '--status'],
        ):
            with self.subTest(argv=argv), mock.patch('sys.stderr', new=io.StringIO()):
                with self.assertRaises(SystemExit) as caught:
                    merge_bay.parse_args(argv)
            self.assertEqual(caught.exception.code, 2)

    def test_publish_master_hard_kill_leaves_journal_then_next_publish_recovers(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'direct runtime for hard kill')
            original_write = merge_bay._durable_write
            calls = []

            def kill_after_journal(path, data, exclusive=True):
                calls.append(path)
                if len(calls) == 1:
                    raise KeyboardInterrupt('injected publish hard kill after journal')
                return original_write(path, data, exclusive=exclusive)

            with mock.patch.object(
                merge_bay,
                '_durable_write',
                side_effect=kill_after_journal,
            ):
                with self.assertRaises(KeyboardInterrupt):
                    merge_bay.publish_master(repo.config, runner=GateRunner([0]))
            self.assertTrue((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual((repo.deploy / 'index.html').read_bytes(), b'old-index')
            self.assertEqual((repo.deploy / 'sw.js').read_bytes(), b'old-sw')

            self.assertEqual(
                merge_bay.publish_master(repo.config, runner=GateRunner([0])),
                0,
            )
            expected = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            for name in merge_bay.RUNTIME:
                self.assertEqual((repo.deploy / name).read_bytes(), expected[name])
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'match')

    def test_publish_master_hard_kill_after_receipt_reconciles_on_next_publish(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            source_oid = repo.commit(repo.root, 'direct runtime for cleanup kill')
            original_unlink = Path.unlink

            def kill_before_journal_cleanup(path, *args, **kwargs):
                if path.name == merge_bay.DEPLOY_JOURNAL:
                    self.assertTrue(merge_bay.deploy_receipt_path(repo.config).exists())
                    raise KeyboardInterrupt('injected hard kill before journal cleanup')
                return original_unlink(path, *args, **kwargs)

            with mock.patch.object(
                Path,
                'unlink',
                new=kill_before_journal_cleanup,
            ):
                with self.assertRaises(KeyboardInterrupt):
                    merge_bay.publish_master(repo.config, runner=GateRunner([0]))
            expected = merge_bay.runtime_bytes_at_commit(repo.config, source_oid)
            for name in merge_bay.RUNTIME:
                self.assertEqual((repo.deploy / name).read_bytes(), expected[name])
            self.assertTrue((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'journal-active')

            self.assertEqual(
                merge_bay.publish_master(repo.config, runner=GateRunner([0])),
                0,
            )
            self.assertFalse((repo.deploy / merge_bay.DEPLOY_JOURNAL).exists())
            self.assertEqual(merge_bay.verify_deploy_receipt(repo.config), 'match')

    def test_publish_master_rejects_a_master_advance_during_verification(self):
        with TempRepo() as repo:
            repo.write(
                repo.root,
                'index.html',
                "<script>const GAME_VER='2.0';</script>\n",
            )
            repo.write(repo.root, 'sw.js', "const APP_VER='2.0';\n")
            repo.commit(repo.root, 'publish source')
            before_tree = self._deploy_tree_bytes(repo.deploy)

            def advance_master(gate_index):
                if gate_index == 0:
                    repo.write(repo.root, 'concurrent.txt', 'other writer\n')
                    repo.commit(repo.root, 'concurrent master advance')

            with self.assertRaisesRegex(merge_bay.ToolError, 'master moved during'):
                merge_bay.publish_master(
                    repo.config,
                    runner=GateRunner([0], on_gate=advance_master),
                )
            self.assertEqual(self._deploy_tree_bytes(repo.deploy), before_tree)

    def test_merge_route_receipt_guard_remains_fail_closed_after_publish_added(self):
        with TempRepo() as repo:
            base_bytes = merge_bay.runtime_bytes_at_commit(repo.config, repo.base_oid)
            for name in merge_bay.RUNTIME:
                (repo.deploy / name).write_bytes(base_bytes[name])
            merge_bay.write_deploy_receipt(repo.config, repo.base_oid)
            (repo.deploy / 'index.html').write_bytes(b'late-onedrive-rollback')
            repo.write(repo.bay, 'feature.txt', 'incoming\n')
            repo.commit(repo.bay, 'incoming feature')
            state_path, _ = merge_bay.state_locations(repo.config)

            with self.assertRaisesRegex(merge_bay.DeployError, 'drifted'):
                merge_bay.start_transaction(
                    repo.config,
                    'kimi',
                    False,
                    runner=GateRunner([]),
                )

            self.assertFalse(state_path.exists())


class TestConsoleEncodingT366(unittest.TestCase):
    """T366b: console encoding must not abort the CLI on non-GBK code points."""

    def test_configure_stdio_sets_errors_replace(self):
        buf = io.BytesIO()
        stream = io.TextIOWrapper(buf, encoding='gbk', errors='strict', write_through=True)
        try:
            with mock.patch.object(sys, 'stdout', stream), mock.patch.object(
                sys, 'stderr', stream
            ):
                merge_bay.configure_stdio()
                self.assertEqual(stream.errors, 'replace')
        finally:
            stream.detach()

    def test_gbk_console_print_ufffd_does_not_raise(self):
        """Destructive proof: after configure_stdio, U+FFFD is replaced not raised."""
        buf = io.BytesIO()
        stream = io.TextIOWrapper(buf, encoding='gbk', errors='strict', write_through=True)
        try:
            # Without replace, encoding U+FFFD as GBK raises UnicodeEncodeError.
            with self.assertRaises(UnicodeEncodeError):
                stream.write('\ufffd')
            stream.reconfigure(errors='strict')  # reset after failed write attempt
            with mock.patch.object(sys, 'stdout', stream), mock.patch.object(
                sys, 'stderr', stream
            ):
                merge_bay.configure_stdio()
                # ok()/bad() go through print → stdout; must not abort the transaction.
                merge_bay.ok('verifier tail \ufffd snowman \u2603')
                merge_bay.bad('gate red \ufffd')
            text = buf.getvalue().decode('gbk', errors='replace')
            self.assertIn('[OK]', text)
            self.assertIn('[FAIL]', text)
        finally:
            try:
                stream.detach()
            except Exception:
                pass

    def test_main_invokes_configure_stdio_before_parse(self):
        calls = []
        real_configure = merge_bay.configure_stdio

        def spy():
            calls.append('configure')
            real_configure()

        with mock.patch.object(merge_bay, 'configure_stdio', side_effect=spy):
            with mock.patch.object(
                merge_bay,
                'parse_args',
                side_effect=SystemExit(0),
            ):
                try:
                    merge_bay.main(['--status'])
                except SystemExit:
                    pass
        self.assertEqual(calls, ['configure'])




class RunCmdChildEncodingTests(unittest.TestCase):
    """T553: run_cmd 必須強制子 Python 行程講 UTF-8（工具鏈假紅收口）。

    病灶：兩個 run_cmd 對子行程輸出做嚴格 UTF-8 解碼、解不開改寫 rc=125；
    而子 Python 走 pipe 時 stdio 用系統碼頁（cp936），印中文就假紅——
    活案例是 verify 第 6 閘的「code map RED」（地圖沒漂，是子行程講 cp936）。

    鑑別力設計：測試必須先造敵意環境（PYTHONIOENCODING=gbk、pop PYTHONUTF8）。
    直接跑會繼承本機/CI 的 PYTHONUTF8 而恆綠＝測不到；敵意注入在任何 locale
    的機器上都成立（gbk 中文位元組不可能是合法 UTF-8）。
    """

    def _child(self, base):
        script = base / 't553_child.py'
        script.write_text(
            "import sys\nprint(sys.stdout.encoding)\nprint('安卓探索中文測試')\n",
            encoding='utf-8',
        )
        return script

    def _assert_forces_utf8(self, runner, who):
        with tempfile.TemporaryDirectory(prefix='glimmer-t553-') as td:
            base = Path(td)
            script = self._child(base)
            with mock.patch.dict(os.environ, {'PYTHONIOENCODING': 'gbk'}):
                os.environ.pop('PYTHONUTF8', None)
                result = runner([sys.executable, script], base)
        self.assertEqual(
            result.returncode, 0,
            'T553: %s.run_cmd 在敵意環境下 rc=%r —— 沒帶 env 強制子行程 UTF-8，'
            '這就是「code map RED」假紅的根因。修法是 subprocess.run 帶 '
            'env=os.environ 加 PYTHONUTF8=1 與 PYTHONIOENCODING=utf-8（兩個都要：'
            'PYTHONIOENCODING 對 stdio 優先權最高，少了它敵意父環境會穿透）'
            % (who, result.returncode),
        )
        self.assertIn('安卓探索中文測試', result.stdout,
                      'T553: 中文沒完整到達父行程（%s）' % who)
        first = result.stdout.splitlines()[0].lower()
        self.assertIn('utf', first,
                      'T553: 子行程自報 stdio 編碼為 %r 而非 utf-8（%s）' % (first, who))

    def test_verify_run_cmd_forces_child_utf8(self):
        self._assert_forces_utf8(verify.run_cmd, 'verify')

    def test_merge_bay_run_cmd_forces_child_utf8(self):
        self._assert_forces_utf8(merge_bay.run_cmd, 'merge_bay')

    def test_verify_run_cmd_arch_map_check_no_false_red(self):
        """T553 G3: 活假紅直接復現——乾淨環境下 arch_map --check 不得被 125 改寫。

        只驗編碼路徑：rc 可以是 0（地圖新鮮）或 1（真漂移，那是第 6 閘的事），
        唯獨不得是 125（編碼假紅）。
        """
        root = Path(__file__).resolve().parents[1]
        with mock.patch.dict(os.environ):
            os.environ.pop('PYTHONUTF8', None)
            os.environ.pop('PYTHONIOENCODING', None)
            result = verify.run_cmd(
                [sys.executable, root / 'tools' / 'arch_map.py', '--check'], root)
        self.assertNotEqual(
            result.returncode, 125,
            'T553: arch_map --check 被 125 改寫＝編碼假紅（地圖沒漂，是子行程講系統碼頁）')
        self.assertNotIn('not valid UTF-8', result.stderr)



class SignoffPartiesSyncTests(unittest.TestCase):
    """T557 同步釘：兩份簽核名單（JS/Python）是同一條規則的兩份實作，必須逐位一致。

    同族病譜系（T518→T530→T533→T535→T536→T543→T553）的防治手法：
    跨語言無法共用一份真相源，就讓測試把兩份釘在一起——改一邊不改另一邊＝紅。
    """

    def test_signoff_parties_lists_match(self):
        root = Path(__file__).resolve().parents[1]
        src = (root / 'test_fixde.js').read_text(encoding='utf-8')
        m = re.search(r"SIGNOFF_PARTIES557 = \[([^\]]*)\]", src)
        self.assertIsNotNone(m, 'T557: test_fixde.js 找不到 SIGNOFF_PARTIES557 名單')
        js = tuple(s.strip().strip("'").strip('"') for s in m.group(1).split(',') if s.strip())
        self.assertEqual(
            js, merge_bay.SIGNOFF_PARTIES,
            'T557: 兩份簽核名單脫鉤（JS=%r vs Python=%r）——同族病：改一邊必須同步另一邊'
            % (js, merge_bay.SIGNOFF_PARTIES))


if __name__ == '__main__':
    unittest.main()
