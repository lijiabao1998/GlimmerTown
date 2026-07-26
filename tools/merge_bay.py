# -*- coding: utf-8 -*-
"""T358 transactional merge gate for Glimmer Town construction bays.

Normal use (from the canonical master worktree only):

    python tools/merge_bay.py kimi --deploy
    python tools/merge_bay.py --resume kimi
    python tools/merge_bay.py --abort kimi
    python tools/merge_bay.py --status

The incoming commit is merged and verified in a locked integration worktree.
Master is changed only by a final ``git merge --ff-only`` to the exact verified
merge commit.  A conflict, crashed test, stale base, or malformed Git query
therefore cannot leave master in a half-merged state.

All operator output is ASCII to remain legible in Windows consoles.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, Mapping, NamedTuple, Optional, Sequence, Tuple


ROOT = Path(r'C:\dev\glimmer-town')
DEPLOY = Path(r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\glimmer-town')
BAYS = {
    'kimi': Path(r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\bay-kimi'),
    'codex': Path(r'C:\Users\Leon1\OneDrive\Desktop\安卓探索\bay-codex'),
}
INTEGRATION = Path(r'C:\dev\glimmer-town-integration')
RUNTIME = ('index.html', 'sw.js')
MIN_PASS = 1898
STATE_SCHEMA = 1
DEPLOY_SCHEMA = 2
STATE_NAME = 'active.json'
DEPLOY_JOURNAL = '.glimmer-deploy-journal.json'
DEPLOY_MARKER = '_這是部署目錄請勿在此施工.txt'
STATE_PHASES = {
    'PREFLIGHTED',
    'INTEGRATION_READY',
    'MERGING',
    'CONFLICT',
    'MERGED',
    'VERIFYING',
    'INTEGRATION_RED',
    'VERIFIED',
    'PROMOTING',
    'PROMOTION_WORKTREE_FAILED',
    'PROMOTED',
    'DEPLOYING',
    'DEPLOY_FAILED',
    'DEPLOY_CLEANUP_PENDING',
    'DEPLOYED',
    'SYNC_FAILED',
    'CLEANUP_PENDING',
    'SUPERSEDED',
}
OID_RE = re.compile(r'^[0-9a-f]{40,64}$')
TOKEN_RE = re.compile(r'^[A-Za-z0-9_-]+$')
SHA256_RE = re.compile(r'^[0-9a-f]{64}$')


@dataclass(frozen=True)
class MergeConfig:
    root: Path
    deploy: Path
    bays: Mapping[str, Path]
    integration_path: Path
    runtime_files: Tuple[str, ...] = RUNTIME
    min_pass: int = MIN_PASS
    deploy_marker: str = DEPLOY_MARKER


DEFAULT_CONFIG = MergeConfig(ROOT, DEPLOY, BAYS, INTEGRATION)


class CommandResult(NamedTuple):
    returncode: int
    stdout: str
    stderr: str


class ToolError(RuntimeError):
    """A fail-closed operator error."""


class ConflictPending(ToolError):
    def __init__(self, files: Sequence[str]):
        super().__init__('integration conflict requires resolution')
        self.files = tuple(files)


class DeployError(ToolError):
    pass


class DeployCleanupPending(DeployError):
    """Runtime is committed/rolled back, but durable evidence cleanup is pending."""

    def __init__(self, message: str, runtime_state: str = 'unknown'):
        super().__init__(message)
        self.runtime_state = runtime_state


Runner = Callable[[Sequence[object], Path, int], CommandResult]


def ok(message: str) -> None:
    print('  [OK]   ' + message)


def bad(message: str) -> None:
    print('  [FAIL] ' + message)


def info(message: str) -> None:
    print('  .      ' + message)


def skip(message: str) -> None:
    print('  [SKIP] ' + message)


def step(message: str) -> None:
    print('\n== ' + message)


def _decode(value: object) -> str:
    if value is None:
        return ''
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='replace')
    return str(value)


def run_cmd(args: Sequence[object], cwd: Path, timeout: int = 300) -> CommandResult:
    """Run without a shell; launch failures and timeouts are explicit red results."""
    try:
        result = subprocess.run(
            [str(arg) for arg in args],
            cwd=str(cwd),
            capture_output=True,
            timeout=timeout,
        )
        try:
            stdout = result.stdout.decode('utf-8')
            stderr = result.stderr.decode('utf-8')
        except UnicodeDecodeError as exc:
            return CommandResult(
                125,
                result.stdout.decode('utf-8', errors='replace'),
                result.stderr.decode('utf-8', errors='replace')
                + '\nchild output is not valid UTF-8: '
                + str(exc),
            )
        return CommandResult(
            result.returncode,
            stdout,
            stderr,
        )
    except subprocess.TimeoutExpired as exc:
        return CommandResult(
            124,
            _decode(exc.stdout),
            _decode(exc.stderr) + '\nprocess timed out',
        )
    except OSError as exc:
        return CommandResult(127, '', 'process launch failed: ' + str(exc))


def _path_key(path: Path) -> str:
    return os.path.normcase(str(Path(path).resolve()))


def _same_path(left: Path, right: Path) -> bool:
    return _path_key(left) == _path_key(right)


def _command_detail(result: CommandResult) -> str:
    text = (result.stderr or result.stdout).strip().replace('\x00', '\\0')
    return text[-500:] if text else '(no diagnostic output)'


def git_result(
    cwd: Path,
    *args: object,
    runner: Runner = run_cmd,
    timeout: int = 300,
) -> CommandResult:
    return runner(['git', *args], Path(cwd), timeout)


def git_text(
    cwd: Path,
    *args: object,
    runner: Runner = run_cmd,
    timeout: int = 300,
) -> str:
    result = git_result(cwd, *args, runner=runner, timeout=timeout)
    if result.returncode != 0:
        raise ToolError(
            'git %s failed (exit=%d): %s'
            % (' '.join(str(arg) for arg in args), result.returncode, _command_detail(result))
        )
    return result.stdout.rstrip('\r\n\x00')


def git_checked(
    cwd: Path,
    *args: object,
    runner: Runner = run_cmd,
    timeout: int = 300,
) -> CommandResult:
    result = git_result(cwd, *args, runner=runner, timeout=timeout)
    if result.returncode != 0:
        raise ToolError(
            'git %s failed (exit=%d): %s'
            % (' '.join(str(arg) for arg in args), result.returncode, _command_detail(result))
        )
    return result


def git_oid(cwd: Path, ref: str, runner: Runner = run_cmd) -> str:
    oid = git_text(cwd, 'rev-parse', '--verify', ref + '^{commit}', runner=runner).strip()
    if not oid or any(ch not in '0123456789abcdefABCDEF' for ch in oid):
        raise ToolError('invalid OID returned for %s: %r' % (ref, oid))
    return oid.lower()


def git_common_dir(cwd: Path, runner: Runner = run_cmd) -> Path:
    raw = git_text(
        cwd,
        'rev-parse',
        '--path-format=absolute',
        '--git-common-dir',
        runner=runner,
    ).strip()
    path = Path(raw)
    if not path.is_absolute():
        path = Path(cwd) / path
    return path.resolve()


def git_path(cwd: Path, name: str, runner: Runner = run_cmd) -> Path:
    raw = git_text(
        cwd,
        'rev-parse',
        '--path-format=absolute',
        '--git-path',
        name,
        runner=runner,
    ).strip()
    path = Path(raw)
    if not path.is_absolute():
        path = Path(cwd) / path
    return path.resolve()


def current_branch(cwd: Path, runner: Runner = run_cmd) -> str:
    return git_text(cwd, 'symbolic-ref', '--quiet', '--short', 'HEAD', runner=runner).strip()


def worktree_status(cwd: Path, runner: Runner = run_cmd) -> str:
    """Return porcelain status; a failed query raises instead of looking clean."""
    return git_text(
        cwd,
        'status',
        '--porcelain=v1',
        '-z',
        '--untracked-files=all',
        runner=runner,
    )


def ensure_clean(cwd: Path, label: str, runner: Runner = run_cmd) -> None:
    status = worktree_status(cwd, runner=runner)
    if status:
        rendered = status.replace('\x00', '\n').strip()
        raise ToolError('%s worktree is dirty:\n%s' % (label, rendered[:1000]))


def ensure_no_git_operation(cwd: Path, label: str, runner: Runner = run_cmd) -> None:
    operation_paths = (
        'MERGE_HEAD',
        'CHERRY_PICK_HEAD',
        'REVERT_HEAD',
        'rebase-merge',
        'rebase-apply',
    )
    active = [
        name for name in operation_paths if git_path(cwd, name, runner=runner).exists()
    ]
    if active:
        raise ToolError('%s has an active Git operation: %s' % (label, ', '.join(active)))


def ensure_top_level(cwd: Path, expected: Path, runner: Runner = run_cmd) -> None:
    actual = Path(
        git_text(
            cwd,
            'rev-parse',
            '--path-format=absolute',
            '--show-toplevel',
            runner=runner,
        ).strip()
    )
    if not _same_path(actual, expected):
        raise ToolError('worktree identity mismatch: expected %s, got %s' % (expected, actual))


def validate_master(
    config: MergeConfig,
    runner: Runner = run_cmd,
    require_clean: bool = True,
) -> str:
    root = Path(config.root)
    if not root.is_dir():
        raise ToolError('canonical master directory missing: ' + str(root))
    ensure_top_level(root, root, runner=runner)
    branch = current_branch(root, runner=runner)
    if branch != 'master':
        raise ToolError('canonical worktree is on %s, expected master' % branch)
    head = git_oid(root, 'HEAD', runner=runner)
    master_ref = git_oid(root, 'refs/heads/master', runner=runner)
    if head != master_ref:
        raise ToolError('master worktree HEAD does not match refs/heads/master')
    if require_clean:
        ensure_clean(root, 'master', runner=runner)
        ensure_no_git_operation(root, 'master', runner=runner)
    return head


def validate_bay_identity(
    config: MergeConfig,
    name: str,
    runner: Runner = run_cmd,
    require_clean: bool = True,
) -> str:
    if name not in config.bays:
        raise ToolError('unknown bay: %s' % name)
    bay = Path(config.bays[name])
    if not bay.is_dir():
        raise ToolError('bay directory missing: ' + str(bay))
    ensure_top_level(bay, bay, runner=runner)
    if not _same_path(
        git_common_dir(bay, runner=runner),
        git_common_dir(config.root, runner=runner),
    ):
        raise ToolError('%s does not share the canonical Git common directory' % name)
    expected_branch = 'bay/' + name
    branch = current_branch(bay, runner=runner)
    if branch != expected_branch:
        raise ToolError('%s worktree is on %s, expected %s' % (name, branch, expected_branch))
    head = git_oid(bay, 'HEAD', runner=runner)
    branch_oid = git_oid(config.root, 'refs/heads/' + expected_branch, runner=runner)
    if head != branch_oid:
        raise ToolError('%s worktree HEAD does not match its branch ref' % name)
    if require_clean:
        ensure_clean(bay, name, runner=runner)
        ensure_no_git_operation(bay, name, runner=runner)
    return head


def is_ancestor(cwd: Path, older: str, newer: str, runner: Runner = run_cmd) -> bool:
    result = git_result(
        cwd,
        'merge-base',
        '--is-ancestor',
        older,
        newer,
        runner=runner,
    )
    if result.returncode == 0:
        return True
    if result.returncode == 1:
        return False
    raise ToolError(
        'git merge-base --is-ancestor failed (exit=%d): %s'
        % (result.returncode, _command_detail(result))
    )


def rev_count(cwd: Path, range_spec: str, runner: Runner = run_cmd) -> int:
    raw = git_text(cwd, 'rev-list', '--count', range_spec, runner=runner).strip()
    try:
        value = int(raw)
    except ValueError as exc:
        raise ToolError('invalid rev-list count %r for %s' % (raw, range_spec)) from exc
    if value < 0:
        raise ToolError('negative rev-list count for ' + range_spec)
    return value


def state_locations(config: MergeConfig, runner: Runner = run_cmd) -> Tuple[Path, Path]:
    directory = git_common_dir(config.root, runner=runner) / 'glimmer-merge'
    return directory / STATE_NAME, directory / 'lock'


def _atomic_write_json(path: Path, value: Mapping[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(value, sort_keys=True, indent=2) + '\n').encode('utf-8')
    fd, temp_name = tempfile.mkstemp(prefix='.' + path.name + '.', suffix='.tmp', dir=path.parent)
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def _atomic_create_json(path: Path, value: Mapping[str, object]) -> None:
    """Atomically create a complete journal without replacing existing evidence."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(value, sort_keys=True, indent=2) + '\n').encode('utf-8')
    fd, temp_name = tempfile.mkstemp(prefix='.' + path.name + '.', suffix='.tmp', dir=path.parent)
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(temp_path, path)
        except FileExistsError as exc:
            raise DeployError('deployment journal appeared concurrently; evidence preserved') from exc
        except OSError as exc:
            raise DeployError('unable to atomically create deployment journal: %s' % exc) from exc
    finally:
        if temp_path.exists():
            temp_path.unlink()


def save_state(path: Path, state: Dict[str, object], phase: Optional[str] = None) -> None:
    if phase is not None:
        state['phase'] = phase
    state['updated_at'] = int(time.time())
    _atomic_write_json(path, state)


def load_state(path: Path) -> Optional[Dict[str, object]]:
    if not path.exists():
        return None
    try:
        state = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ToolError('transaction state is unreadable: %s' % exc) from exc
    if not isinstance(state, dict) or state.get('schema') != STATE_SCHEMA:
        raise ToolError('transaction state has an unsupported schema')
    required = (
        'txn_id',
        'phase',
        'bay_name',
        'source_ref',
        'base_master_oid',
        'source_oid',
        'integration_branch',
        'integration_path',
        'deploy_requested',
    )
    missing = [key for key in required if key not in state]
    if missing:
        raise ToolError('transaction state is missing: ' + ', '.join(missing))
    return state


def validate_state(
    config: MergeConfig,
    state: Mapping[str, object],
    runner: Runner = run_cmd,
) -> None:
    """Reject corrupted state before it can name a ref, worktree, or delete target."""
    txn_id = state.get('txn_id')
    bay_name = state.get('bay_name')
    phase = state.get('phase')
    if not isinstance(txn_id, str) or not TOKEN_RE.fullmatch(txn_id):
        raise ToolError('transaction state has an invalid txn_id')
    if not isinstance(bay_name, str) or bay_name not in config.bays:
        raise ToolError('transaction state has an invalid bay_name')
    if not isinstance(phase, str) or phase not in STATE_PHASES:
        raise ToolError('transaction state has an invalid phase')
    if state.get('source_ref') != 'refs/heads/bay/' + bay_name:
        raise ToolError('transaction source_ref does not match bay_name')
    if state.get('integration_branch') != '_merge/' + txn_id:
        raise ToolError('transaction integration branch is not derived from txn_id')
    integration_path = state.get('integration_path')
    if not isinstance(integration_path, str) or not _same_path(
        Path(integration_path),
        config.integration_path,
    ):
        raise ToolError('transaction integration path is outside the fixed slot')
    if type(state.get('deploy_requested')) is not bool:
        raise ToolError('transaction deploy_requested is not a boolean')
    if type(state.get('deployed', False)) is not bool:
        raise ToolError('transaction deployed flag is not a boolean')

    oid_fields = ('base_master_oid', 'source_oid')
    optional_oid_fields = ('integration_oid', 'verified_oid', 'promoted_oid')
    for field in oid_fields:
        value = state.get(field)
        if not isinstance(value, str) or not OID_RE.fullmatch(value):
            raise ToolError('transaction %s is not a full Git OID' % field)
        if git_oid(config.root, value, runner=runner) != value:
            raise ToolError('transaction %s does not resolve to its recorded commit' % field)
    for field in optional_oid_fields:
        value = state.get(field)
        if value is None:
            continue
        if not isinstance(value, str) or not OID_RE.fullmatch(value):
            raise ToolError('transaction %s is not a full Git OID' % field)
        if git_oid(config.root, value, runner=runner) != value:
            raise ToolError('transaction %s does not resolve to its recorded commit' % field)

    merged = state.get('integration_oid')
    verified = state.get('verified_oid')
    promoted = state.get('promoted_oid')
    if verified is not None and verified != merged:
        raise ToolError('verified_oid does not equal integration_oid')
    if promoted is not None and promoted != merged:
        raise ToolError('promoted_oid does not equal integration_oid')
    if merged is not None:
        parents = _merge_parents(config.root, merged, runner=runner)
        expected = (state['base_master_oid'], state['source_oid'])
        if parents != expected:
            raise ToolError('persisted integration commit parents do not match base/source')


class TransactionLock:
    """A process-lifetime advisory lock; the OS releases it after a crash."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.handle = None

    def __enter__(self) -> 'TransactionLock':
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.handle = open(self.path, 'a+b')
        self.handle.seek(0, os.SEEK_END)
        if self.handle.tell() == 0:
            self.handle.write(b'0')
            self.handle.flush()
            os.fsync(self.handle.fileno())
        self.handle.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt

                msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except (OSError, IOError) as exc:
            self.handle.close()
            self.handle = None
            raise ToolError('another merge_bay process holds the transaction lock') from exc
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        if self.handle is None:
            return
        try:
            self.handle.seek(0)
            if os.name == 'nt':
                import msvcrt

                msvcrt.locking(self.handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(self.handle.fileno(), fcntl.LOCK_UN)
        finally:
            self.handle.close()
            self.handle = None


def run_trusted_verifier(
    config: MergeConfig,
    target: Path,
    runner: Runner = run_cmd,
) -> CommandResult:
    """Always execute the verifier from canonical master, never incoming code."""
    verifier = Path(config.root) / 'tools' / 'verify.py'
    if not verifier.is_file():
        raise ToolError('trusted verifier missing: ' + str(verifier))
    result = runner(
        [
            sys.executable,
            verifier,
            '--root',
            Path(target),
            '--min-pass',
            str(config.min_pass),
        ],
        Path(config.root),
        1500,
    )
    if result.returncode != 0:
        tail = (result.stdout + '\n' + result.stderr).strip().splitlines()[-18:]
        for line in tail:
            info(line[:220])
    return result


def _branch_exists(config: MergeConfig, branch: str, runner: Runner = run_cmd) -> bool:
    result = git_result(
        config.root,
        'show-ref',
        '--verify',
        '--quiet',
        'refs/heads/' + branch,
        runner=runner,
    )
    if result.returncode == 0:
        return True
    if result.returncode == 1:
        return False
    raise ToolError('unable to query integration branch: ' + _command_detail(result))


def worktree_records(
    config: MergeConfig,
    runner: Runner = run_cmd,
) -> Tuple[Dict[str, str], ...]:
    raw = git_text(
        config.root,
        'worktree',
        'list',
        '--porcelain',
        '-z',
        runner=runner,
    )
    records = []
    for block in raw.split('\x00\x00'):
        fields = {}
        for item in block.strip('\x00\r\n').split('\x00'):
            if not item:
                continue
            key, separator, value = item.partition(' ')
            fields[key] = value if separator else ''
        if fields.get('worktree'):
            records.append(fields)
    return tuple(records)


def integration_registration(
    config: MergeConfig,
    runner: Runner = run_cmd,
) -> Optional[Dict[str, str]]:
    for record in worktree_records(config, runner=runner):
        if _same_path(Path(record['worktree']), config.integration_path):
            return record
    return None


def ensure_integration_slot_free(
    config: MergeConfig,
    runner: Runner = run_cmd,
) -> None:
    path_exists = Path(config.integration_path).exists()
    registration = integration_registration(config, runner=runner)
    orphan_branches = git_text(
        config.root,
        'for-each-ref',
        '--format=%(refname)',
        'refs/heads/_merge/',
        runner=runner,
    ).splitlines()
    if path_exists or registration is not None or orphan_branches:
        detail = []
        if path_exists:
            detail.append('filesystem path exists')
        if registration is not None:
            detail.append(
                'Git registration branch=%s'
                % registration.get('branch', '(detached/unknown)')
            )
        if orphan_branches:
            detail.append('orphan integration branch exists')
        raise ToolError(
            'integration slot is occupied without an active transaction (%s); '
            'inspect it manually before starting'
            % ', '.join(detail)
        )


def validate_integration(
    config: MergeConfig,
    state: Mapping[str, object],
    runner: Runner = run_cmd,
) -> str:
    path = Path(str(state['integration_path']))
    branch = str(state['integration_branch'])
    if not _same_path(path, config.integration_path):
        raise ToolError('state integration path does not match configuration')
    if not path.is_dir():
        raise ToolError('integration worktree is missing: ' + str(path))
    ensure_top_level(path, path, runner=runner)
    if not _same_path(
        git_common_dir(path, runner=runner),
        git_common_dir(config.root, runner=runner),
    ):
        raise ToolError('integration worktree belongs to a different repository')
    actual_branch = current_branch(path, runner=runner)
    if actual_branch != branch:
        raise ToolError(
            'integration worktree is on %s, expected %s' % (actual_branch, branch)
        )
    return git_oid(path, 'HEAD', runner=runner)


def create_integration(
    config: MergeConfig,
    state: Dict[str, object],
    state_path: Path,
    runner: Runner = run_cmd,
) -> None:
    path = Path(str(state['integration_path']))
    branch = str(state['integration_branch'])
    if path.exists():
        raise ToolError('integration path is already occupied: ' + str(path))
    if _branch_exists(config, branch, runner=runner):
        raise ToolError('integration branch already exists: ' + branch)
    git_checked(
        config.root,
        'worktree',
        'add',
        '--lock',
        '--reason',
        'T358-' + str(state['txn_id']),
        '-b',
        branch,
        path,
        str(state['base_master_oid']),
        runner=runner,
    )
    head = validate_integration(config, state, runner=runner)
    if head != state['base_master_oid']:
        raise ToolError('new integration worktree did not start at the frozen master base')
    ensure_clean(path, 'integration', runner=runner)
    save_state(state_path, state, 'INTEGRATION_READY')


def recreate_missing_integration(
    config: MergeConfig,
    state: Dict[str, object],
    state_path: Path,
    runner: Runner = run_cmd,
) -> None:
    """Reconcile worktree-add crashes that left only a branch/registration."""
    path = Path(str(state['integration_path']))
    branch = str(state['integration_branch'])
    expected_ref = 'refs/heads/' + branch
    base = str(state['base_master_oid'])
    if path.exists():
        return
    registration = integration_registration(config, runner=runner)
    if registration is not None:
        if (
            registration.get('branch') != expected_ref
            or registration.get('HEAD', '').lower() != base
        ):
            raise ToolError('partial integration registration does not match transaction')
        unlock = git_result(config.root, 'worktree', 'unlock', path, runner=runner)
        if unlock.returncode != 0:
            detail = _command_detail(unlock).lower()
            if not (unlock.returncode == 128 and 'not locked' in detail):
                raise ToolError('unable to unlock partial integration: ' + _command_detail(unlock))
        git_checked(
            config.root,
            'worktree',
            'remove',
            '--force',
            '--force',
            path,
            runner=runner,
        )
    if _branch_exists(config, branch, runner=runner):
        if git_oid(config.root, 'refs/heads/' + branch, runner=runner) != base:
            raise ToolError('partial integration branch moved away from frozen base')
        git_checked(config.root, 'branch', '-D', branch, runner=runner)
    create_integration(config, state, state_path, runner=runner)


def _merge_head(path: Path, runner: Runner = run_cmd) -> Optional[str]:
    result = git_result(
        path,
        'rev-parse',
        '--verify',
        '--quiet',
        'MERGE_HEAD^{commit}',
        runner=runner,
    )
    if result.returncode == 0:
        return result.stdout.strip().lower()
    if result.returncode == 1:
        return None
    raise ToolError('unable to inspect MERGE_HEAD: ' + _command_detail(result))


def _unresolved_files(path: Path, runner: Runner = run_cmd) -> Tuple[str, ...]:
    output = git_text(path, 'diff', '--name-only', '--diff-filter=U', runner=runner)
    return tuple(line for line in output.splitlines() if line.strip())


def _merge_parents(path: Path, oid: str, runner: Runner = run_cmd) -> Tuple[str, ...]:
    raw = git_text(path, 'show', '-s', '--format=%P', oid, runner=runner).strip()
    return tuple(part.lower() for part in raw.split() if part)


def ensure_integration_merge(
    config: MergeConfig,
    state: Dict[str, object],
    state_path: Path,
    runner: Runner = run_cmd,
) -> str:
    path = Path(str(state['integration_path']))
    base = str(state['base_master_oid'])
    source = str(state['source_oid'])
    head = validate_integration(config, state, runner=runner)
    merge_head = _merge_head(path, runner=runner)

    if merge_head is not None:
        if head != base or merge_head != source:
            raise ToolError('integration MERGE_HEAD/HEAD does not match frozen transaction OIDs')
        unresolved = _unresolved_files(path, runner=runner)
        if unresolved:
            save_state(state_path, state, 'CONFLICT')
            raise ConflictPending(unresolved)
        git_checked(
            path,
            'commit',
            '-m',
            "Merge branch '%s' (T358 integration)" % state['source_ref'],
            runner=runner,
        )
    elif head == base:
        save_state(state_path, state, 'MERGING')
        result = git_result(
            path,
            'merge',
            '--no-ff',
            '--no-commit',
            '-m',
            "Merge branch '%s' (T358 integration)" % state['source_ref'],
            source,
            runner=runner,
        )
        if result.returncode != 0:
            merge_head = _merge_head(path, runner=runner)
            unresolved = _unresolved_files(path, runner=runner)
            if merge_head == source and unresolved:
                save_state(state_path, state, 'CONFLICT')
                raise ConflictPending(unresolved)
            raise ToolError(
                'integration merge failed without a resumable conflict: '
                + _command_detail(result)
            )
        if _merge_head(path, runner=runner) != source:
            raise ToolError('merge completed without the expected MERGE_HEAD')
        git_checked(
            path,
            'commit',
            '-m',
            "Merge branch '%s' (T358 integration)" % state['source_ref'],
            runner=runner,
        )
    else:
        parents = _merge_parents(path, head, runner=runner)
        if parents != (base, source):
            raise ToolError('integration HEAD is not the frozen two-parent merge commit')

    merged = git_oid(path, 'HEAD', runner=runner)
    parents = _merge_parents(path, merged, runner=runner)
    if parents != (base, source):
        raise ToolError(
            'integration merge parents changed: expected %s %s, got %s'
            % (base, source, ' '.join(parents))
        )
    ensure_clean(path, 'integration', runner=runner)
    state['integration_oid'] = merged
    save_state(state_path, state, 'MERGED')
    return merged


def verify_integration(
    config: MergeConfig,
    state: Dict[str, object],
    state_path: Path,
    runner: Runner = run_cmd,
) -> bool:
    path = Path(str(state['integration_path']))
    merged = str(state['integration_oid'])
    if validate_integration(config, state, runner=runner) != merged:
        raise ToolError('integration HEAD moved before verification')
    ensure_clean(path, 'integration', runner=runner)
    save_state(state_path, state, 'VERIFYING')
    result = run_trusted_verifier(config, path, runner=runner)
    if result.returncode != 0:
        save_state(state_path, state, 'INTEGRATION_RED')
        return False
    if validate_integration(config, state, runner=runner) != merged:
        raise ToolError('integration HEAD moved during verification')
    ensure_clean(path, 'integration', runner=runner)
    state['verified_oid'] = merged
    save_state(state_path, state, 'VERIFIED')
    return True


def promote_verified(
    config: MergeConfig,
    state: Dict[str, object],
    state_path: Path,
    runner: Runner = run_cmd,
) -> str:
    base = str(state['base_master_oid'])
    source = str(state['source_oid'])
    merged = str(state.get('integration_oid', ''))
    verified = str(state.get('verified_oid', ''))
    if not merged or verified != merged:
        raise ToolError('promotion target is not the exact verified integration OID')

    current = validate_master(config, runner=runner, require_clean=True)
    if current == merged:
        state['promoted_oid'] = merged
        save_state(state_path, state, 'PROMOTED')
        return merged
    if current != base:
        if is_ancestor(config.root, merged, current, runner=runner):
            raise ToolError('master advanced beyond the verified merge; old deployment is blocked')
        if is_ancestor(config.root, base, current, runner=runner):
            raise ToolError('master advanced from the frozen base; transaction is stale')
        raise ToolError('master history changed away from the frozen base')

    source_now = git_oid(config.root, str(state['source_ref']), runner=runner)
    if source_now != source:
        raise ToolError('source bay ref advanced after handoff; promotion is blocked')
    if validate_integration(config, state, runner=runner) != merged:
        raise ToolError('integration HEAD moved after verification')
    ensure_clean(Path(str(state['integration_path'])), 'integration', runner=runner)

    save_state(state_path, state, 'PROMOTING')
    result = git_result(
        config.root,
        'merge',
        '--ff-only',
        merged,
        runner=runner,
    )
    if result.returncode != 0:
        try:
            master_ref = git_oid(
                config.root,
                'refs/heads/master',
                runner=runner,
            )
        except ToolError:
            master_ref = '(unreadable)'
        if master_ref == merged:
            save_state(state_path, state, 'PROMOTION_WORKTREE_FAILED')
            raise ToolError(
                'master ref reached the verified OID, but checkout/index update failed; '
                'repair the master worktree, then use --resume'
            )
        raise ToolError(
            'master --ff-only to frozen OID failed (exit=%d): %s'
            % (result.returncode, _command_detail(result))
        )
    promoted = validate_master(config, runner=runner, require_clean=True)
    if promoted != merged:
        raise ToolError('master did not fast-forward to the exact verified commit')
    state['promoted_oid'] = promoted
    save_state(state_path, state, 'PROMOTED')
    return promoted


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> Optional[str]:
    try:
        return _sha256_bytes(path.read_bytes())
    except FileNotFoundError:
        return None


def validate_deploy_target(config: MergeConfig) -> None:
    deploy = Path(config.deploy)
    if tuple(config.runtime_files) != RUNTIME:
        raise DeployError('runtime whitelist must be exactly index.html + sw.js')
    if not deploy.is_dir():
        raise DeployError('deployment directory missing: ' + str(deploy))
    protected = [Path(config.root), Path(config.integration_path), *map(Path, config.bays.values())]
    if any(_same_path(deploy, path) for path in protected):
        raise DeployError('deployment target aliases a source/worktree path')
    marker = deploy / config.deploy_marker
    if not marker.is_file() or marker.is_symlink():
        raise DeployError('deployment marker missing or unsafe: ' + str(marker))
    for name in RUNTIME:
        target = deploy / name
        if not target.is_file() or target.is_symlink():
            raise DeployError('runtime target missing or unsafe: ' + str(target))


def runtime_bytes_at_commit(
    config: MergeConfig,
    oid: str,
    runner: Runner = run_cmd,
) -> Dict[str, bytes]:
    """Read deploy inputs from immutable Git blobs, never the live worktree."""
    if not OID_RE.fullmatch(oid):
        raise DeployError('deployment source is not a full Git OID')
    blobs = {}
    for name in RUNTIME:
        result = git_result(
            config.root,
            'show',
            '%s:%s' % (oid, name),
            runner=runner,
        )
        if result.returncode != 0:
            raise DeployError(
                'unable to read %s from verified commit %s: %s'
                % (name, oid, _command_detail(result))
            )
        blobs[name] = result.stdout.encode('utf-8')
    return blobs


def _artifact_names(txn_id: str, runtime_name: str) -> Tuple[str, str]:
    if not TOKEN_RE.fullmatch(txn_id):
        raise DeployError('invalid deployment transaction id')
    if runtime_name not in RUNTIME:
        raise DeployError('invalid deployment runtime name')
    stem = '.glimmer-deploy-' + txn_id + '-' + runtime_name
    return stem + '.bak', stem + '.new'


def _durable_write(path: Path, data: bytes, exclusive: bool = True) -> None:
    flags = os.O_WRONLY | os.O_CREAT | (os.O_EXCL if exclusive else os.O_TRUNC)
    fd = os.open(path, flags, 0o600)
    try:
        with os.fdopen(fd, 'wb', closefd=False) as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
    finally:
        os.close(fd)


def _safe_deploy_entry(deploy: Path, name: str) -> Path:
    if not name or Path(name).name != name:
        raise DeployError('unsafe deploy journal entry: %r' % name)
    path = deploy / name
    if path.parent.resolve() != deploy.resolve():
        raise DeployError('deploy journal entry escapes target directory')
    return path


def _load_deploy_journal(
    config: MergeConfig,
    expected_txn: Optional[str] = None,
    expected_source_oid: Optional[str] = None,
) -> Optional[Dict[str, object]]:
    validate_deploy_target(config)
    path = Path(config.deploy) / DEPLOY_JOURNAL
    if not path.exists():
        return None
    try:
        journal = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DeployError('deployment journal is unreadable: %s' % exc) from exc
    if not isinstance(journal, dict) or journal.get('schema') != DEPLOY_SCHEMA:
        raise DeployError('deployment journal has an unsupported schema')
    txn_id = journal.get('txn_id')
    source_oid = journal.get('source_oid')
    created_at = journal.get('created_at')
    if not isinstance(txn_id, str) or not TOKEN_RE.fullmatch(txn_id):
        raise DeployError('deployment journal txn_id is invalid')
    if not isinstance(source_oid, str) or not OID_RE.fullmatch(source_oid):
        raise DeployError('deployment journal source_oid is invalid')
    if type(created_at) is not int or created_at < 0:
        raise DeployError('deployment journal created_at is invalid')
    if expected_txn is not None and txn_id != expected_txn:
        raise DeployError('deployment journal belongs to a different transaction')
    if expected_source_oid is not None and source_oid != expected_source_oid:
        raise DeployError('deployment journal belongs to a different source OID')
    entries = journal.get('files')
    if not isinstance(entries, list):
        raise DeployError('deployment journal file list is invalid')
    names = tuple(entry.get('name') for entry in entries if isinstance(entry, dict))
    if names != tuple(config.runtime_files):
        raise DeployError('deployment journal runtime whitelist mismatch')
    artifact_keys = []
    for entry in entries:
        for key in ('name', 'backup', 'stage', 'old_sha256', 'new_sha256'):
            if not isinstance(entry.get(key), str):
                raise DeployError('deployment journal entry is missing ' + key)
        expected_backup, expected_stage = _artifact_names(txn_id, entry['name'])
        if entry['backup'] != expected_backup or entry['stage'] != expected_stage:
            raise DeployError('deployment journal artifact name is not transaction-derived')
        if not SHA256_RE.fullmatch(entry['old_sha256']) or not SHA256_RE.fullmatch(
            entry['new_sha256']
        ):
            raise DeployError('deployment journal contains an invalid SHA-256')
        _safe_deploy_entry(Path(config.deploy), entry['name'])
        backup = _safe_deploy_entry(Path(config.deploy), entry['backup'])
        stage = _safe_deploy_entry(Path(config.deploy), entry['stage'])
        for artifact in (backup, stage):
            if artifact.exists() and artifact.is_symlink():
                raise DeployError('deployment artifact is a symlink: ' + artifact.name)
            artifact_keys.append(_path_key(artifact))
    forbidden = {
        _path_key(Path(config.deploy) / name) for name in (*RUNTIME, DEPLOY_JOURNAL)
    }
    if len(set(artifact_keys)) != len(artifact_keys) or forbidden.intersection(artifact_keys):
        raise DeployError('deployment journal artifact paths alias each other/runtime')
    return journal


def _cleanup_deploy_artifacts(config: MergeConfig, journal: Mapping[str, object]) -> None:
    deploy = Path(config.deploy)
    journal_path = deploy / DEPLOY_JOURNAL
    errors = []
    for entry in journal['files']:
        for key in ('backup', 'stage'):
            path = _safe_deploy_entry(deploy, entry[key])
            if path.exists():
                try:
                    path.unlink()
                except OSError as exc:
                    errors.append('%s: %s' % (path.name, exc))
    if errors:
        raise DeployCleanupPending(
            'runtime is terminal but deployment artifact cleanup is pending: '
            + '; '.join(errors)
        )
    if journal_path.exists():
        try:
            journal_path.unlink()
        except OSError as exc:
            raise DeployCleanupPending(
                'runtime is terminal but deployment journal cleanup is pending: %s'
                % exc
            ) from exc


def _rollback_stage(deploy: Path, name: str, data: bytes) -> Path:
    fd, raw_path = tempfile.mkstemp(
        dir=deploy,
        prefix='.glimmer-rollback-' + name + '.',
        suffix='.rollback',
    )
    path = Path(raw_path)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        return path
    except BaseException:
        if path.exists():
            path.unlink()
        raise


def recover_deployment(
    config: MergeConfig,
    replace_fn: Callable[[object, object], object] = os.replace,
    force_rollback: bool = False,
    expected_txn: Optional[str] = None,
    expected_source_oid: Optional[str] = None,
) -> str:
    """Recover an interrupted two-file publish from durable backups/journal."""
    journal = _load_deploy_journal(
        config,
        expected_txn=expected_txn,
        expected_source_oid=expected_source_oid,
    )
    if journal is None:
        return 'none'
    deploy = Path(config.deploy)
    entries = journal['files']
    current_hashes = {
        entry['name']: _sha256_file(deploy / entry['name']) for entry in entries
    }
    foreign = [
        entry['name']
        for entry in entries
        if current_hashes[entry['name']]
        not in (entry['old_sha256'], entry['new_sha256'])
    ]
    if foreign:
        raise DeployError(
            'deployment journal is stale/foreign for %s; no runtime file was changed'
            % ', '.join(foreign)
        )
    all_new = all(
        current_hashes[entry['name']] == entry['new_sha256'] for entry in entries
    )
    all_old = all(
        current_hashes[entry['name']] == entry['old_sha256'] for entry in entries
    )
    if all_new and not force_rollback:
        try:
            _cleanup_deploy_artifacts(config, journal)
        except DeployCleanupPending as exc:
            raise DeployCleanupPending(str(exc), 'committed') from exc
        return 'committed'
    if all_old:
        try:
            _cleanup_deploy_artifacts(config, journal)
        except DeployCleanupPending as exc:
            raise DeployCleanupPending(str(exc), 'rolled_back') from exc
        return 'rolled_back'

    old_payloads = []
    for entry in entries:
        backup = _safe_deploy_entry(deploy, entry['backup'])
        try:
            old_data = backup.read_bytes()
        except OSError as exc:
            raise DeployError('deployment backup missing/unreadable: %s' % backup) from exc
        if _sha256_bytes(old_data) != entry['old_sha256']:
            raise DeployError('deployment backup hash mismatch: ' + backup.name)
        old_payloads.append((entry, old_data))

    # Prepare every rollback file before changing either target.  A corrupt
    # second backup therefore cannot leave the first target rolled back alone.
    rollback_paths = []
    try:
        for entry, old_data in old_payloads:
            rollback = _rollback_stage(deploy, entry['name'], old_data)
            rollback_paths.append((entry, rollback))
        for entry, rollback in rollback_paths:
            replace_fn(rollback, deploy / entry['name'])
        wrong = [
            entry['name']
            for entry in entries
            if _sha256_file(deploy / entry['name']) != entry['old_sha256']
        ]
        if wrong:
            raise DeployError('rollback byte verification failed: ' + ', '.join(wrong))
        try:
            _cleanup_deploy_artifacts(config, journal)
        except DeployCleanupPending as exc:
            raise DeployCleanupPending(str(exc), 'rolled_back') from exc
        return 'rolled_back'
    finally:
        for _, path in rollback_paths:
            if path.exists():
                try:
                    path.unlink()
                except OSError:
                    pass


def prepare_deployment(
    config: MergeConfig,
    source: object,
    txn_id: str,
    source_oid: str,
) -> Dict[str, object]:
    validate_deploy_target(config)
    deploy = Path(config.deploy)
    if (deploy / DEPLOY_JOURNAL).exists():
        raise DeployError('unrecovered deployment journal already exists')
    if not TOKEN_RE.fullmatch(txn_id):
        raise DeployError('invalid deployment transaction id')
    if not OID_RE.fullmatch(source_oid):
        raise DeployError('invalid deployment source OID')
    if isinstance(source, Mapping):
        if set(source) != set(RUNTIME):
            raise DeployError('deployment source byte map does not match runtime whitelist')
        source_bytes = {}
        for name in RUNTIME:
            value = source[name]
            if not isinstance(value, bytes):
                raise DeployError('deployment source byte map contains non-bytes data')
            source_bytes[name] = value
    else:
        source_root = Path(source)
        source_bytes = {}
        for name in RUNTIME:
            try:
                source_bytes[name] = (source_root / name).read_bytes()
            except OSError as exc:
                raise DeployError('unable to read source runtime %s: %s' % (name, exc)) from exc
    entries = []
    created = []
    try:
        for name in config.runtime_files:
            if Path(name).name != name:
                raise DeployError('unsafe runtime whitelist entry: ' + name)
            target = deploy / name
            try:
                old_data = target.read_bytes()
            except OSError as exc:
                raise DeployError('unable to read runtime target %s: %s' % (name, exc)) from exc
            new_data = source_bytes[name]
            backup_name, stage_name = _artifact_names(txn_id, name)
            backup = deploy / backup_name
            stage_path = deploy / stage_name
            _durable_write(backup, old_data, exclusive=True)
            created.append(backup)
            _durable_write(stage_path, new_data, exclusive=True)
            created.append(stage_path)
            entries.append(
                {
                    'name': name,
                    'backup': backup.name,
                    'stage': stage_path.name,
                    'old_sha256': _sha256_bytes(old_data),
                    'new_sha256': _sha256_bytes(new_data),
                }
            )
        journal = {
            'schema': DEPLOY_SCHEMA,
            'txn_id': txn_id,
            'source_oid': source_oid,
            'created_at': int(time.time()),
            'files': entries,
        }
        _atomic_create_json(deploy / DEPLOY_JOURNAL, journal)
        return journal
    except BaseException:
        if not (deploy / DEPLOY_JOURNAL).exists():
            for path in created:
                if path.exists():
                    path.unlink()
        raise


def deploy_runtime_atomic(
    config: MergeConfig,
    source: object,
    txn_id: str,
    source_oid: str,
    replace_fn: Callable[[object, object], object] = os.replace,
) -> None:
    """Publish index then SW, with durable hard-kill recovery and caught-error rollback."""
    prior = recover_deployment(
        config,
        replace_fn=replace_fn,
        expected_txn=txn_id,
        expected_source_oid=source_oid,
    )
    if prior != 'none':
        info('recovered previous deployment journal: ' + prior)
    journal = prepare_deployment(config, source, txn_id, source_oid)
    deploy = Path(config.deploy)
    try:
        for entry in journal['files']:
            replace_fn(deploy / entry['stage'], deploy / entry['name'])
        wrong = [
            entry['name']
            for entry in journal['files']
            if _sha256_file(deploy / entry['name']) != entry['new_sha256']
        ]
        if wrong:
            raise DeployError('published bytes do not match source: ' + ', '.join(wrong))
    except BaseException as original:
        try:
            recovery = recover_deployment(
                config,
                replace_fn=replace_fn,
                force_rollback=True,
                expected_txn=txn_id,
                expected_source_oid=source_oid,
            )
        except BaseException as rollback:
            raise DeployError(
                'publish failed (%s); rollback ALSO failed (%s)'
                % (original, rollback)
            ) from rollback
        raise DeployError(
            'publish failed and runtime was restored (%s): %s' % (recovery, original)
        ) from original
    # Publishing and hash verification are complete.  Cleanup is deliberately
    # outside the rollback block: if Windows locks a .bak, runtime is NEW and
    # the journal must remain as truthful cleanup evidence.
    try:
        _cleanup_deploy_artifacts(config, journal)
    except DeployCleanupPending as exc:
        raise DeployCleanupPending(str(exc), 'committed') from exc


def deploy_receipt_path(config: MergeConfig, runner: Runner = run_cmd) -> Path:
    return git_common_dir(config.root, runner=runner) / 'glimmer-merge' / 'deploy-receipt.json'


def write_deploy_receipt(
    config: MergeConfig,
    source_oid: str,
    runner: Runner = run_cmd,
) -> None:
    validate_deploy_target(config)
    if git_oid(config.root, source_oid, runner=runner) != source_oid:
        raise DeployError('cannot record receipt for an unresolved source OID')
    hashes = {name: _sha256_file(Path(config.deploy) / name) for name in RUNTIME}
    if any(not isinstance(value, str) for value in hashes.values()):
        raise DeployError('cannot record deployment receipt: runtime hash missing')
    receipt = {
        'schema': 1,
        'source_oid': source_oid,
        'runtime_sha256': hashes,
        'written_at': int(time.time()),
    }
    _atomic_write_json(deploy_receipt_path(config, runner=runner), receipt)


def verify_deploy_receipt(config: MergeConfig, runner: Runner = run_cmd) -> str:
    """Detect a late OneDrive rollback after the publish journal was removed."""
    path = deploy_receipt_path(config, runner=runner)
    if not path.exists():
        return 'missing'
    if (Path(config.deploy) / DEPLOY_JOURNAL).exists():
        return 'journal-active'
    validate_deploy_target(config)
    try:
        receipt = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DeployError('deployment receipt is unreadable: %s' % exc) from exc
    if not isinstance(receipt, dict) or receipt.get('schema') != 1:
        raise DeployError('deployment receipt schema is invalid')
    if not isinstance(receipt.get('source_oid'), str) or not OID_RE.fullmatch(
        receipt['source_oid']
    ):
        raise DeployError('deployment receipt source_oid is invalid')
    hashes = receipt.get('runtime_sha256')
    if not isinstance(hashes, dict) or tuple(hashes.keys()) != RUNTIME:
        raise DeployError('deployment receipt runtime whitelist is invalid')
    for value in hashes.values():
        if not isinstance(value, str) or not SHA256_RE.fullmatch(value):
            raise DeployError('deployment receipt SHA-256 is invalid')
    mismatches = [
        name
        for name in RUNTIME
        if _sha256_file(Path(config.deploy) / name) != hashes[name]
    ]
    if mismatches:
        raise DeployError(
            'deployed runtime drifted after journal cleanup: %s; refusing automation'
            % ', '.join(mismatches)
        )
    return 'match'


def sync_one_bay(
    config: MergeConfig,
    name: str,
    runner: Runner = run_cmd,
) -> Tuple[str, str]:
    """Only a clean, purely-behind bay may move, and only by --ff-only."""
    try:
        validate_bay_identity(config, name, runner=runner, require_clean=False)
        ensure_no_git_operation(config.bays[name], name, runner=runner)
        status = worktree_status(config.bays[name], runner=runner)
        if status:
            return 'SKIPPED_DIRTY', 'dirty worktree'
        branch = 'bay/' + name
        ahead = rev_count(config.root, 'master..' + branch, runner=runner)
        behind = rev_count(config.root, branch + '..master', runner=runner)
        if ahead == 0 and behind == 0:
            return 'ALREADY', 'already current'
        if ahead > 0 and behind == 0:
            return 'SKIPPED_AHEAD', 'ahead=%d behind=0' % ahead
        if ahead > 0 and behind > 0:
            return 'SKIPPED_DIVERGED', 'ahead=%d behind=%d' % (ahead, behind)
        git_checked(
            config.bays[name],
            'merge',
            '--ff-only',
            '-q',
            'master',
            runner=runner,
        )
        head = validate_bay_identity(config, name, runner=runner, require_clean=True)
        master = git_oid(config.root, 'master', runner=runner)
        if head != master:
            raise ToolError('bay did not land on master after --ff-only')
        return 'SYNCED', 'fast-forwarded %d commit(s)' % behind
    except ToolError as exc:
        return 'FAILED', str(exc)


def sync_all_bays(
    config: MergeConfig,
    runner: Runner = run_cmd,
) -> Dict[str, Tuple[str, str]]:
    results = {}
    for name in sorted(config.bays):
        result = sync_one_bay(config, name, runner=runner)
        results[name] = result
        label, detail = result
        if label in ('SYNCED', 'ALREADY'):
            ok('%s: %s (%s)' % (name, label, detail))
        elif label.startswith('SKIPPED'):
            skip('%s: %s (%s)' % (name, label, detail))
        else:
            bad('%s: %s (%s)' % (name, label, detail))
    return results


def cleanup_integration(
    config: MergeConfig,
    state: Dict[str, object],
    state_path: Path,
    runner: Runner = run_cmd,
    force: bool = False,
) -> None:
    validate_state(config, state, runner=runner)
    path = Path(str(state['integration_path']))
    branch = str(state['integration_branch'])
    expected_ref = 'refs/heads/' + branch
    registration = integration_registration(config, runner=runner)

    def unlock_if_needed() -> None:
        result = git_result(config.root, 'worktree', 'unlock', path, runner=runner)
        if result.returncode == 0:
            return
        detail = _command_detail(result).lower()
        if result.returncode == 128 and 'not locked' in detail:
            return
        raise ToolError('unable to unlock integration worktree: ' + _command_detail(result))

    if path.exists():
        if registration is None or registration.get('branch') != expected_ref:
            raise ToolError('integration path exists without the transaction Git registration')
        try:
            head = validate_integration(config, state, runner=runner)
        except ToolError:
            if not force:
                raise
            head = registration.get('HEAD', '').lower()
        allowed_heads = {str(state['base_master_oid'])}
        if state.get('integration_oid'):
            allowed_heads.add(str(state['integration_oid']))
        if head not in allowed_heads:
            raise ToolError('integration cleanup HEAD is outside the frozen transaction')
        unlock_if_needed()
        args = ['worktree', 'remove']
        if force:
            args.extend(('--force', '--force'))
        args.append(path)
        git_checked(config.root, *args, runner=runner)
    elif registration is not None:
        if registration.get('branch') != expected_ref:
            raise ToolError('missing integration path is registered to another branch')
        registered_head = registration.get('HEAD', '').lower()
        allowed_heads = {str(state['base_master_oid'])}
        if state.get('integration_oid'):
            allowed_heads.add(str(state['integration_oid']))
        if registered_head not in allowed_heads:
            raise ToolError('missing integration registration has an unexpected HEAD')
        unlock_if_needed()
        git_checked(
            config.root,
            'worktree',
            'remove',
            '--force',
            '--force',
            path,
            runner=runner,
        )
    if _branch_exists(config, branch, runner=runner):
        branch_oid = git_oid(config.root, 'refs/heads/' + branch, runner=runner)
        allowed_heads = {str(state['base_master_oid'])}
        if state.get('integration_oid'):
            allowed_heads.add(str(state['integration_oid']))
        if branch_oid not in allowed_heads:
            raise ToolError('integration branch moved outside the frozen transaction')
        delete_flag = '-D' if force else '-d'
        git_checked(config.root, 'branch', delete_flag, branch, runner=runner)
    if state_path.exists():
        state_path.unlink()


def _new_transaction_state(
    config: MergeConfig,
    name: str,
    base: str,
    source: str,
    deploy_requested: bool,
) -> Dict[str, object]:
    txn_id = time.strftime('%Y%m%d%H%M%S') + '-' + str(os.getpid()) + '-' + uuid.uuid4().hex[:8]
    return {
        'schema': STATE_SCHEMA,
        'txn_id': txn_id,
        'phase': 'PREFLIGHTED',
        'bay_name': name,
        'source_ref': 'refs/heads/bay/' + name,
        'base_master_oid': base,
        'source_oid': source,
        'integration_branch': '_merge/' + txn_id,
        'integration_path': str(Path(config.integration_path).resolve()),
        'deploy_requested': bool(deploy_requested),
        'deployed': False,
        'created_at': int(time.time()),
        'host': socket.gethostname(),
        'pid': os.getpid(),
    }


def _show_conflict(state: Mapping[str, object], conflict: ConflictPending) -> None:
    bad('merge conflict is isolated from master')
    info('integration worktree: ' + str(state['integration_path']))
    info('conflicted files:')
    for name in conflict.files:
        info('  ' + name)
    print(
        '\n  Resolve only inside the integration worktree, then git add the files.\n'
        '  Do not create a replacement merge. Continue with:\n'
        '    python tools/merge_bay.py --resume %s\n'
        '  Or explicitly discard the transaction with:\n'
        '    python tools/merge_bay.py --abort %s'
        % (state['bay_name'], state['bay_name'])
    )


def _finish_after_promotion(
    config: MergeConfig,
    state: Dict[str, object],
    state_path: Path,
    runner: Runner = run_cmd,
) -> int:
    merged = str(state['integration_oid'])
    current = validate_master(config, runner=runner, require_clean=True)
    if current != merged:
        if is_ancestor(config.root, merged, current, runner=runner):
            raise ToolError('master advanced beyond transaction; deployment of old OID is blocked')
        raise ToolError('master no longer equals promoted transaction OID')

    immutable_runtime = runtime_bytes_at_commit(config, merged, runner=runner)
    if state.get('deploy_requested') and not state.get('deployed'):
        step('deploy runtime with durable journal')
        save_state(state_path, state, 'DEPLOYING')
        try:
            deploy_runtime_atomic(
                config,
                immutable_runtime,
                str(state['txn_id']),
                merged,
            )
        except DeployCleanupPending as exc:
            if exc.runtime_state == 'committed':
                state['deployed'] = True
                write_deploy_receipt(config, merged, runner=runner)
                save_state(state_path, state, 'DEPLOY_CLEANUP_PENDING')
            else:
                save_state(state_path, state, 'DEPLOY_FAILED')
            raise
        except DeployError:
            save_state(state_path, state, 'DEPLOY_FAILED')
            raise
        write_deploy_receipt(config, merged, runner=runner)
        state['deployed'] = True
        save_state(state_path, state, 'DEPLOYED')
        ok('index.html + sw.js published byte-identically; sw.js committed last')
    elif state.get('deploy_requested'):
        if (Path(config.deploy) / DEPLOY_JOURNAL).exists():
            recovered = recover_deployment(
                config,
                expected_txn=str(state['txn_id']),
                expected_source_oid=merged,
            )
            if recovered != 'committed':
                raise DeployError(
                    'deployed state recovered as %s instead of committed' % recovered
                )
        mismatches = [
            name
            for name in RUNTIME
            if _sha256_file(Path(config.deploy) / name)
            != _sha256_bytes(immutable_runtime[name])
        ]
        if mismatches:
            raise DeployError(
                'state says deployed, but runtime differs from verified OID: '
                + ', '.join(mismatches)
            )
        receipt_status = verify_deploy_receipt(config, runner=runner)
        if receipt_status == 'missing':
            write_deploy_receipt(config, merged, runner=runner)
    elif not state.get('deploy_requested'):
        info('deployment skipped (transaction was created without --deploy)')

    step('sync clean, purely-behind bays using --ff-only')
    results = sync_all_bays(config, runner=runner)
    state['sync_results'] = {
        name: {'status': value[0], 'detail': value[1]} for name, value in results.items()
    }
    failures = [name for name, value in results.items() if value[0] == 'FAILED']
    if failures:
        save_state(state_path, state, 'SYNC_FAILED')
        bad(
            'merge/deploy completed, but bay sync failed: %s; use --resume %s'
            % (', '.join(failures), state['bay_name'])
        )
        return 3
    save_state(state_path, state, 'CLEANUP_PENDING')
    cleanup_integration(config, state, state_path, runner=runner, force=False)

    step('DONE')
    ok('master HEAD = ' + merged)
    return 0


def start_transaction(
    config: MergeConfig,
    name: str,
    deploy_requested: bool,
    runner: Runner = run_cmd,
) -> int:
    state_path, _ = state_locations(config, runner=runner)
    if load_state(state_path) is not None:
        raise ToolError('an active transaction exists; use --resume or --abort')
    if (Path(config.deploy) / DEPLOY_JOURNAL).exists():
        recovery = recover_deployment(config)
        info('startup deployment recovery: ' + recovery)
    verify_deploy_receipt(config, runner=runner)
    if deploy_requested:
        validate_deploy_target(config)
    ensure_integration_slot_free(config, runner=runner)

    step('1. freeze canonical master and bay identities')
    base = validate_master(config, runner=runner, require_clean=True)
    source = validate_bay_identity(config, name, runner=runner, require_clean=True)
    if is_ancestor(config.root, source, base, runner=runner):
        raise ToolError('nothing to merge: bay handoff is already contained by master')
    ahead = rev_count(config.root, 'master..bay/' + name, runner=runner)
    if ahead < 1:
        raise ToolError('bay has no commit ahead of master')
    ok('master=%s bay=%s ahead=%d' % (base[:12], source[:12], ahead))
    log = git_text(
        config.root,
        'log',
        '--oneline',
        'master..bay/' + name,
        runner=runner,
    )
    for line in log.splitlines()[:12]:
        info(line)

    step('2. verify frozen bay with canonical verifier')
    source_gate = run_trusted_verifier(config, config.bays[name], runner=runner)
    if source_gate.returncode != 0:
        raise ToolError('bay verification failed; master is unchanged')
    if validate_master(config, runner=runner, require_clean=True) != base:
        raise ToolError('master moved during bay verification')
    if validate_bay_identity(config, name, runner=runner, require_clean=True) != source:
        raise ToolError('bay moved during verification')
    ensure_integration_slot_free(config, runner=runner)
    ok('bay gate green at frozen OID')

    state = _new_transaction_state(config, name, base, source, deploy_requested)
    validate_state(config, state, runner=runner)
    save_state(state_path, state)
    step('3. merge exact bay OID in isolated integration worktree')
    create_integration(config, state, state_path, runner=runner)
    try:
        merged = ensure_integration_merge(config, state, state_path, runner=runner)
    except ConflictPending as conflict:
        _show_conflict(state, conflict)
        return 2
    ok('integration merge commit = ' + merged)

    step('4. verify integration before master changes')
    if not verify_integration(config, state, state_path, runner=runner):
        raise ToolError(
            'integration gate failed; master is unchanged; use --resume to retry or --abort'
        )
    ok('integration gate green at exact merge OID')

    step('5. fast-forward master to verified OID')
    promote_verified(config, state, state_path, runner=runner)
    ok('master fast-forwarded; no merge was performed in master worktree')
    return _finish_after_promotion(config, state, state_path, runner=runner)


def resume_transaction(
    config: MergeConfig,
    name: str,
    runner: Runner = run_cmd,
) -> int:
    state_path, _ = state_locations(config, runner=runner)
    state = load_state(state_path)
    if state is None:
        raise ToolError('no active transaction to resume')
    validate_state(config, state, runner=runner)
    if state['bay_name'] != name:
        raise ToolError(
            'active transaction belongs to %s, not %s' % (state['bay_name'], name)
        )

    step('resume: reconcile persisted state with Git reality')
    base = str(state['base_master_oid'])
    merged = str(state.get('integration_oid', ''))
    master = validate_master(config, runner=runner, require_clean=True)
    if master not in (base, merged):
        if merged and is_ancestor(config.root, merged, master, runner=runner):
            if (Path(config.deploy) / DEPLOY_JOURNAL).exists():
                recover_deployment(
                    config,
                    force_rollback=not bool(state.get('deployed')),
                    expected_txn=str(state['txn_id']),
                    expected_source_oid=merged,
                )
            state['phase'] = 'SUPERSEDED'
            save_state(state_path, state)
            cleanup_integration(config, state, state_path, runner=runner, force=False)
            bad(
                'master already advanced beyond this verified merge; old deployment was '
                'not published and transaction resources were finalized'
            )
            return 4
        if is_ancestor(config.root, base, master, runner=runner):
            raise ToolError('master advanced from the frozen base; transaction is stale')
        raise ToolError('master history no longer matches the transaction')

    # Promotion may have succeeded and cleanup may have partly removed the
    # integration worktree/branch before state deletion.  Post-promotion work
    # is intentionally independent of those already-disposable resources.
    if master == merged and state.get('verified_oid') == merged:
        state['promoted_oid'] = merged
        save_state(state_path, state, 'PROMOTED')
        ok('recognized already-completed master fast-forward')
        return _finish_after_promotion(config, state, state_path, runner=runner)

    if not merged:
        if not Path(str(state['integration_path'])).exists():
            recreate_missing_integration(config, state, state_path, runner=runner)
        try:
            merged = ensure_integration_merge(config, state, state_path, runner=runner)
        except ConflictPending as conflict:
            _show_conflict(state, conflict)
            return 2
        ok('integration merge commit = ' + merged)
    else:
        if validate_integration(config, state, runner=runner) != merged:
            raise ToolError('integration worktree no longer matches persisted merge OID')
        ensure_clean(Path(str(state['integration_path'])), 'integration', runner=runner)

    if state.get('verified_oid') != merged:
        step('re-run integration gate')
        if not verify_integration(config, state, state_path, runner=runner):
            raise ToolError('integration gate remains red; master is unchanged')
        ok('integration gate green at exact merge OID')

    if master == base:
        step('fast-forward master to verified OID')
        promote_verified(config, state, state_path, runner=runner)
        ok('master fast-forwarded to verified integration commit')
    return _finish_after_promotion(config, state, state_path, runner=runner)


def abort_transaction(
    config: MergeConfig,
    name: str,
    runner: Runner = run_cmd,
) -> int:
    state_path, _ = state_locations(config, runner=runner)
    state = load_state(state_path)
    if state is None:
        raise ToolError('no active transaction to abort')
    validate_state(config, state, runner=runner)
    if state['bay_name'] != name:
        raise ToolError(
            'active transaction belongs to %s, not %s' % (state['bay_name'], name)
        )
    master = validate_master(config, runner=runner, require_clean=True)
    merged = str(state.get('integration_oid', ''))
    if merged and (master == merged or is_ancestor(config.root, merged, master, runner=runner)):
        raise ToolError('transaction reached master; use --resume for post-merge cleanup')
    cleanup_integration(config, state, state_path, runner=runner, force=True)
    ok('integration transaction discarded; no transaction commit was removed from master')
    return 0


def status_only(config: MergeConfig, runner: Runner = run_cmd) -> int:
    step('bay status')
    master = validate_master(config, runner=runner, require_clean=False)
    info('master=' + master[:12])
    failed = False
    for name in sorted(config.bays):
        try:
            validate_bay_identity(config, name, runner=runner, require_clean=False)
            status = worktree_status(config.bays[name], runner=runner)
            ahead = rev_count(config.root, 'master..bay/' + name, runner=runner)
            behind = rev_count(config.root, 'bay/' + name + '..master', runner=runner)
            print(
                '  %-6s ahead=%d behind=%d worktree=%s'
                % (name, ahead, behind, 'DIRTY' if status else 'clean')
            )
        except ToolError as exc:
            bad('%s: %s' % (name, exc))
            failed = True
    state_path, _ = state_locations(config, runner=runner)
    state = load_state(state_path)
    if state:
        validate_state(config, state, runner=runner)
        info(
            'active txn=%s bay=%s phase=%s'
            % (state['txn_id'], state['bay_name'], state['phase'])
        )
    receipt = verify_deploy_receipt(config, runner=runner)
    info('deploy receipt=' + receipt)
    return 1 if failed else 0


def validate_cli_location(config: MergeConfig, runner: Runner = run_cmd) -> None:
    script_root = Path(__file__).resolve().parent.parent
    if not _same_path(script_root, config.root):
        raise ToolError(
            'merge_bay.py must be executed from the canonical master copy: %s'
            % (Path(config.root) / 'tools' / 'merge_bay.py')
        )
    if not _same_path(Path.cwd(), config.root):
        raise ToolError('change directory to canonical master before running merge_bay.py')
    validate_master(config, runner=runner, require_clean=False)


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Transactional Glimmer Town bay merger')
    parser.add_argument('name', nargs='?', choices=sorted(BAYS))
    parser.add_argument('--deploy', action='store_true', help='publish runtime after promotion')
    parser.add_argument('--resume', metavar='BAY', choices=sorted(BAYS))
    parser.add_argument('--abort', metavar='BAY', choices=sorted(BAYS))
    parser.add_argument('--status', action='store_true')
    args = parser.parse_args(argv)
    actions = int(args.name is not None) + int(args.resume is not None) + int(args.abort is not None) + int(args.status)
    if actions != 1:
        parser.error('choose exactly one of BAY, --resume BAY, --abort BAY, or --status')
    if args.deploy and args.name is None:
        parser.error('--deploy is frozen when a new BAY transaction is created')
    return args


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    try:
        validate_cli_location(DEFAULT_CONFIG)
        state_path, lock_path = state_locations(DEFAULT_CONFIG)
        with TransactionLock(lock_path):
            if args.status:
                return status_only(DEFAULT_CONFIG)
            if args.resume:
                return resume_transaction(DEFAULT_CONFIG, args.resume)
            if args.abort:
                return abort_transaction(DEFAULT_CONFIG, args.abort)
            return start_transaction(DEFAULT_CONFIG, args.name, args.deploy)
    except ConflictPending as conflict:
        bad(str(conflict))
        return 2
    except (ToolError, OSError, UnicodeError, ValueError) as exc:
        bad(str(exc))
        return 1


if __name__ == '__main__':
    sys.exit(main())
