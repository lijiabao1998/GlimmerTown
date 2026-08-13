# -*- coding: utf-8 -*-
"""T358 fail-closed verification gate for every construction worktree.

Usage:
    python tools/verify.py
    python tools/verify.py --root <worktree>

A green result requires all of the following:
  1. index inline script, test_fixde.js and sw.js syntax are valid
  2. CRLF == 0 in the three contract files
  3. index GAME_VER == sw APP_VER
  4. the suite exits zero, prints no FAIL line, reaches the completion marker,
     and prints at least MIN_PASS PASS lines
  5. pinned-seed assertions remain present

The verifier never creates a temporary file inside the repository.
Output stays ASCII so Windows consoles do not corrupt diagnostics.
"""
import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import NamedTuple

HERE = Path(__file__).resolve().parent.parent
MIN_PASS = 1902
MIN_SEED_PINS = 2
DONE_MARKER = 'FIX-D/FIX-E 回歸測試全部通過'
TEXT_CHECK = ('index.html', 'sw.js', 'test_fixde.js')
# T371：CRLF 掃描範圍。前三個是執行期契約檔；其餘是 .gitattributes 宣告為 `text eol=lf`
# 而過去完全沒人在守的區域。backups/ 與 attic/ 在 .gitattributes 標 -text（位元契約），
# 必須排除，否則會誤殺 T269 釘定的備份。
CRLF_GLOBS = (
    'docs/*.md',
    'docs/tasks/*.md',
    'tools/*.py',
    'tools/*.js',
    'tools/*.json',
    'README.md',
    'manifest.json',
    '.gitattributes',
)


def crlf_scan_targets(root):
    """T371: every file the LF contract covers, deduped and in stable order."""
    seen = []
    for name in TEXT_CHECK:
        path = root / name
        if path.is_file():
            seen.append(path)
    for pattern in CRLF_GLOBS:
        for path in sorted(root.glob(pattern)):
            if path.is_file() and path not in seen:
                seen.append(path)
    return seen
ASSERT_CONTRACT = """function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}"""
DONE_CONTRACT = """  console.log('\\nFIX-D/FIX-E 回歸測試全部通過');
  process.exit(0);
}).catch(err => {
  console.error('FAIL: PWA 回歸測試非預期例外', err && err.stack ? err.stack : err);
  process.exit(1);
});"""


class CommandResult(NamedTuple):
    returncode: int
    stdout: str
    stderr: str


class SuiteAssessment(NamedTuple):
    green: bool
    passes: int
    failures: tuple
    reasons: tuple


def ok(message):
    print('  [OK]   ' + message)


def bad(message):
    print('  [FAIL] ' + message)


def run_cmd(args, cwd, timeout=300, input_bytes=None):
    """Run a child process and turn launch/timeout failures into nonzero results."""
    try:
        result = subprocess.run(
            [str(a) for a in args],
            cwd=str(cwd),
            capture_output=True,
            timeout=timeout,
            input=input_bytes,
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
        stdout = (exc.stdout or b'').decode('utf-8', errors='replace')
        stderr = (exc.stderr or b'').decode('utf-8', errors='replace')
        return CommandResult(124, stdout, stderr + '\nprocess timed out')
    except OSError as exc:
        return CommandResult(127, '', 'process launch failed: ' + str(exc))


def assess_suite(returncode, stdout, stderr, min_pass=MIN_PASS):
    """Pure fail-closed suite verdict, shared with the tool regression tests."""
    stdout_lines = stdout.splitlines()
    stderr_lines = stderr.splitlines()
    lines = stdout_lines + stderr_lines
    passes = sum(1 for line in lines if line.startswith('PASS:'))
    failures = tuple(line for line in lines if line.startswith('FAIL:'))
    last_stdout = next((line for line in reversed(stdout_lines) if line.strip()), '')
    reasons = []
    if returncode != 0:
        reasons.append('process exit code %d' % returncode)
    if failures:
        reasons.append('%d FAIL line(s)' % len(failures))
    if passes < min_pass:
        reasons.append('PASS=%d below baseline %d' % (passes, min_pass))
    if last_stdout != DONE_MARKER:
        reasons.append('completion marker is not the final stdout line')
    return SuiteAssessment(not reasons, passes, failures, tuple(reasons))


def read_utf8(path):
    return Path(path).read_bytes().decode('utf-8')


def harness_contract_reasons(test_text):
    """Protect the assertion/reporting spine from accidental no-op edits."""
    reasons = []
    if test_text.count(ASSERT_CONTRACT) != 1:
        reasons.append('assert implementation differs from the fail-fast contract')
    if len(re.findall(r'\bfunction\s+assert\s*\(', test_text)) != 1:
        reasons.append('assert declaration count differs from one')
    if re.search(r'\b(?:const|let|var)\s+assert\b', test_text):
        reasons.append('assert has a shadow declaration')
    if len(re.findall(r"console\.log\(['\"]PASS:", test_text)) != 1:
        reasons.append('PASS output has an unexpected producer')
    if re.search(r'\bassert\s*=(?!=)', test_text):
        reasons.append('assert is reassigned after declaration')
    if test_text.count(DONE_CONTRACT) != 1:
        reasons.append('suite completion/exit contract differs')
    if test_text.count("process.exit(0)") != 1:
        reasons.append('suite has an unexpected success exit')
    return tuple(reasons)


def syntax_checks(root):
    try:
        index_text = read_utf8(root / 'index.html')
    except (OSError, UnicodeError) as exc:
        return (
            (
                'index inline syntax',
                CommandResult(1, '', 'UTF-8 read failed: ' + str(exc)),
            ),
        )
    blocks = re.findall(r'<script>([\s\S]*?)</script>', index_text)
    if len(blocks) != 1:
        inline_result = CommandResult(
            1,
            '',
            'expected exactly one inline script; got %d' % len(blocks),
        )
    else:
        inline_result = run_cmd(
            ['node', '--check', '-'],
            root,
            timeout=60,
            input_bytes=blocks[0].encode('utf-8'),
        )
    checks = (
        ('test_fixde.js syntax', ['node', '--check', root / 'test_fixde.js']),
        ('sw.js syntax', ['node', '--check', root / 'sw.js']),
    )
    results = []
    for label, command in checks:
        result = run_cmd(command, root)
        results.append((label, result))
    results.append(('index inline syntax', inline_result))
    return results


def parse_args(argv):
    parser = argparse.ArgumentParser(description='Fail-closed Glimmer Town verification gate')
    parser.add_argument(
        '--root',
        default=str(HERE),
        help='worktree to verify (defaults to the worktree containing this script)',
    )
    parser.add_argument(
        '--min-pass',
        type=int,
        default=MIN_PASS,
        help='may raise, but never lower, the tracked PASS baseline',
    )
    args = parser.parse_args(argv)
    if args.min_pass < MIN_PASS:
        parser.error('--min-pass cannot be lower than tracked baseline %d' % MIN_PASS)
    return args


def main(argv=None):
    args = parse_args(argv)
    root = Path(args.root).resolve()
    failures = 0
    print('verify @ ' + str(root))

    required = tuple(root / name for name in TEXT_CHECK)
    missing = [path.name for path in required if not path.is_file()]
    if missing:
        bad('required file(s) missing: ' + ', '.join(missing))
        return 1

    # 1. Syntax: no repository-local temporary file is created.
    for label, result in syntax_checks(root):
        if result.returncode == 0:
            ok(label)
        else:
            detail = (result.stderr or result.stdout).splitlines()
            bad('%s: exit=%d%s' % (
                label,
                result.returncode,
                (' :: ' + detail[0][:180]) if detail else '',
            ))
            failures += 1

    # Read the contract files once syntax checks have reported their own errors.
    try:
        index_text = read_utf8(root / 'index.html')
        sw_text = read_utf8(root / 'sw.js')
        test_text = read_utf8(root / 'test_fixde.js')
    except (OSError, UnicodeError) as exc:
        bad('UTF-8 read failed: ' + str(exc))
        return 1

    # 2. CRLF contract.
    #
    # T371: the check used to cover only the three runtime contract files, so
    # working-tree CRLF drift in docs/ and tools/ was completely invisible --
    # .gitattributes normalises on read, which means `git status` stays clean
    # while the bytes on disk are CRLF.  Three files (docs/README.md,
    # docs/ROADMAP.md, docs/THEOTOWN-PARITY.md) had drifted that way unnoticed.
    # Iron rule 20 says verify CRLF==0 after any git restore/switch; the check
    # has to cover everything .gitattributes declares as `text eol=lf`, not a
    # hand-picked trio.
    crlf = []
    for path in crlf_scan_targets(root):
        count = path.read_bytes().count(b'\r\n')
        if count:
            crlf.append('%s:%d' % (path.relative_to(root).as_posix(), count))
    if crlf:
        bad('CRLF present: ' + ', '.join(crlf[:8])
            + ('' if len(crlf) <= 8 else ' (+%d more)' % (len(crlf) - 8)))
        failures += 1
    else:
        ok('CRLF=0')

    # 3. Version single source.
    game_matches = re.findall(r"const GAME_VER='([\d.]+)'", index_text)
    app_matches = re.findall(r"const APP_VER='([\d.]+)'", sw_text)
    game_ver = game_matches[0] if len(game_matches) == 1 else None
    app_ver = app_matches[0] if len(app_matches) == 1 else None
    if game_ver and app_ver and game_ver == app_ver:
        ok('version in sync: ' + game_ver)
    else:
        bad(
            'version contract failed: GAME_VER=%s (%d match) APP_VER=%s (%d match)'
            % (game_ver, len(game_matches), app_ver, len(app_matches))
        )
        failures += 1

    # 4. Full suite. A child crash can never become green merely because it
    # failed before printing a FAIL-prefixed assertion.
    suite_result = run_cmd(['node', 'test_fixde.js'], root, timeout=900)
    assessment = assess_suite(
        suite_result.returncode,
        suite_result.stdout,
        suite_result.stderr,
        args.min_pass,
    )
    if assessment.green:
        ok('suite green: PASS=%d exit=0' % assessment.passes)
    else:
        bad('suite RED: PASS=%d :: %s' % (
            assessment.passes,
            '; '.join(assessment.reasons),
        ))
        for line in assessment.failures[:3]:
            print('         ' + line[:180])
        failures += 1

    # 5. Pinned-seed sentinel. This complements, but does not replace, the
    # actual runtime pins exercised by the full suite.
    contract_reasons = harness_contract_reasons(test_text)
    if contract_reasons:
        bad('test harness contract RED: ' + '; '.join(contract_reasons))
        failures += 1
    else:
        ok('test harness fail-fast contract')
    # T444a (widen before narrowing): this gate is the *canonical* verifier that
    # merge_bay.py runs against every bay, so a card that replaces the sentinel
    # cannot land in one step -- the old sentinel would reject the very bay that
    # fixes it. Accept both signals here; T444b converts the pins and drops the
    # legacy path.
    #
    # Why the legacy path has to go: it greps the test source for the literal
    # `assert(window.GV.stats().pop === <n>)`, which points the wrong way.
    # Rewriting `=== 3781` into an equal-valued constant keeps every pin working
    # but scores zero, while deleting both asserts and pasting the same text into
    # a comment scores two.
    seen_pins = {}
    for m in re.finditer(
        r'^SEEDPIN (\S+) seed=(\d+) days=(\d+) expect=(-?\d+) actual=(-?\d+)$',
        suite_result.stdout,
        re.M,
    ):
        seen_pins[m.group(1)] = (int(m.group(4)), int(m.group(5)))
    mismatched = [n for n, (e, a) in seen_pins.items() if e != a]
    legacy_pins = len(
        re.findall(
            r'assert\(window\.GV\.stats\(\)\.pop === \d+',
            test_text,
        )
    )
    if mismatched:
        bad('seed pins RED: %s reported actual != expect' % ', '.join(sorted(mismatched)))
        failures += 1
    elif len(seen_pins) >= MIN_SEED_PINS:
        ok('seed pins ran and matched: %d (%s)'
           % (len(seen_pins), ', '.join('%s=%d' % (n, v[1]) for n, v in sorted(seen_pins.items()))))
    elif legacy_pins >= MIN_SEED_PINS:
        ok('seed pins present (legacy source scan, T444b will retire this): %d' % legacy_pins)
    else:
        bad('seed pins: SEEDPIN lines=%d, legacy source scan=%d, both below baseline %d'
            % (len(seen_pins), legacy_pins, MIN_SEED_PINS))
        failures += 1

    # 6. Code map. T437 shipped tools/arch_map.py but wired it to nothing, so the
    # root cause it was written for -- line numbers going stale while the suite
    # stays green -- survived untouched. T438 puts it in the gate.
    map_result = run_cmd([sys.executable, os.path.join('tools', 'arch_map.py'), '--check'],
                         root, timeout=120)
    if map_result.returncode == 0:
        ok('code map fresh: docs/ARCH.md §1 anchors and line numbers match index.html')
    else:
        bad('code map RED: docs/ARCH.md §1 drifted from index.html '
            '(run `python tools/arch_map.py --fix`)')
        for line in (map_result.stdout or '').splitlines()[:6]:
            print('         ' + line[:180])
        failures += 1

    print('\nRESULT: ' + ('ALL GREEN' if failures == 0 else '%d CHECK(S) FAILED' % failures))
    return 0 if failures == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
