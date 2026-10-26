#!/usr/bin/env python3
"""Exact-object T717 CI evidence collection. No publishing or acceptance authority.

Run only on an authorized CI runner with the complete repository history and the
browser/dependencies already installed. Output must be a NEW directory. Collection
success is not a performance-improvement verdict or owner/native-GPU approval.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def read_json(path):
    require(path.is_file() and path.stat().st_size > 0, 'missing/empty JSON: ' + str(path))
    return json.loads(path.read_text())


def pins(repo, tree, sha):
    names = git(repo, 'ls-tree', '-r', '--name-only', '-z', sha).decode().split('\0')
    required = {'index.html', 'sw.js', 'test_fixde.js', 'manifest.json', 'tools/verify.py', '.github/workflows/town-main-pages-candidate.yml'}
    require(required.issubset(names), 'required source files absent')
    selected = sorted(required | {n for n in names if n.startswith('docs/tasks/t717-shots/')})
    result = {}
    for name in selected:
        expected = git(repo, 'show', sha + ':' + name)
        actual = (tree / name).read_bytes()
        require(actual == expected, 'Git-object/materialized byte mismatch: ' + name)
        result[name] = {'sha256': digest(actual), 'bytes': len(actual)}
    return result


def geometry_receipt(path):
    data = read_json(path)
    require(data.get('passed') is True, 'geometry did not pass')
    controls = data.get('negativeControls')
    require(isinstance(controls, list) and len(controls) == 5, 'five negative controls required')
    require([c.get('firstRed') for c in controls] == ['G3', 'G3', 'G2', 'G2', 'G2'], 'negative controls failed at wrong guard')
    require(data['result']['G2']['trials'] == 2000 and data['result']['G2']['corners'] == 8000 and data['result']['G3']['trials'] == 2000 and data['result']['G3']['nativeCorners'] == 16000, 'full geometry coverage required')
    return data


def suite_receipt(log, output):
    text = log.read_text(errors='replace')
    matches = re.findall(r'^SEEDPIN (\S+) seed=(\d+) days=(\d+) expect=(-?\d+) actual=(-?\d+)$', text, re.M)
    sentinels = [{'name': name, 'seed': int(seed), 'days': int(days), 'expect': int(expect), 'actual': int(actual)}
                 for name, seed, days, expect, actual in matches]
    receipt = {'passCount': len(re.findall(r'^PASS:', text, re.M)), 'sentinels': sentinels,
               'completionMarker': 'FIX-D/FIX-E 回歸測試全部通過' in text,
               'failLines': re.findall(r'^FAIL:.*$', text, re.M)}
    output.write_text(json.dumps(receipt, indent=2) + '\n')
    require(receipt['passCount'] > 0 and receipt['completionMarker'] and not receipt['failLines'], 'original suite completion/PASS/no-FAIL contract')
    require(len(sentinels) == 6 and {r['name'] for r in sentinels} == {'seed301', 'seed301m', 'seed7', 'seed7m', 'seed22', 'seed22m'}, 'all six original SEEDPIN receipts required exactly once')
    require(all(r['expect'] == r['actual'] for r in sentinels), 'SEEDPIN actual/expected mismatch')
    return receipt


def performance_receipt(path, head_hash):
    data = read_json(path)
    require(data.get('complete') is True and data.get('collectionStatus') == 'collected', 'performance collection incomplete')
    require(data.get('sourceHash') == head_hash, 'performance source identity')
    require(not data.get('errors'), 'performance browser errors')
    rows = data.get('conditions', [])
    ids = ['day-z1', 'night-z1', 'day-z2', 'night-z2', 'day-z0.6', 'night-z0.6']
    require([r['id'] for r in rows] == ids, 'performance condition coverage')
    for row in rows:
        raw = row['raw']
        require(len(raw) == 80, '80 undiscarded raw draws per condition')
        for i, sample in enumerate(raw):
            round_id = i // 2
            expected_off = (i % 2 == 0) if round_id % 2 else (i % 2 == 1)
            require(sample['round'] == round_id and sample['off'] is expected_off and sample['enabled'] is not expected_off, 'AB/BA order or actual valve mismatch')
            require(all(isinstance(sample[k], (int, float)) and math.isfinite(sample[k]) and sample[k] >= 0 for k in ('js', 'total')), 'invalid raw timing')
            require(sample['total'] >= sample['js'], 'readback total shorter than JS')
        for label, off in [('off', True), ('on', False)]:
            for metric in ('js', 'total'):
                values = sorted(s[metric] for s in raw if s['off'] is off)
                require(len(values) == 40 and sum(values) > 0, 'nonempty positive measurements required')
                expected = {'n': 40, 'median': (values[19] + values[20]) / 2,
                            'p95': values[37], 'min': values[0], 'max': values[-1]}
                require(row['summary'][label][metric] == expected, 'summary differs from all raw samples')
    return {'rawSamples': 480, 'conditions': 6, 'performanceVerdict': 'manual-review-required',
            'tileHash': data['tileHash'], 'city': data['city']}


def image_receipt(out, base_hash, head_hash):
    from PIL import Image, ImageChops, ImageDraw
    folder = out / 'eq'
    data = read_json(folder / 'eq.json')
    require(data.get('source') == {'base': base_hash, 'head': head_hash}, 'image source identity')
    rows = data.get('conditions', [])
    expected = [(phase, vt, z, rot) for phase, vt in [('day', 55), ('night', 5), ('dusk', 80)]
                for z in [.6, 1, 2, 3] for rot in range(4)]
    require([(r['phase'], r['vt'], r['z'], r['rot']) for r in rows] == expected, '48 image conditions required')
    require(len(list(folder.glob('*.png'))) == 192, 'exactly 192 original PNGs required')
    decoded, comparisons, sheets = 0, [], []
    sheet = None
    frame_size = None
    for i, row in enumerate(rows):
        images = []
        for label in ['main', 'main-repeat', 'on', 'off']:
            file = folder / (row['id'] + '-' + label + '.png')
            require(file.stat().st_size > 0, 'empty PNG')
            with Image.open(file) as im:
                require(im.format == 'PNG', 'not PNG')
                im.load()
                require(im.width > 0 and im.height > 0, 'empty raster')
                if frame_size is None:
                    frame_size = im.size
                require(im.size == frame_size, 'all 192 full canvas frames must have the same baseline dimensions')
                images.append(im.convert('RGBA'))
            decoded += 1
        main = images[0]
        deltas = {}
        for label, other in [('aa', images[1]), ('on', images[2]), ('off', images[3])]:
            require(other.size == main.size, 'frame size mismatch')
            diff = ImageChops.difference(main, other)
            channels = diff.split()
            mask = channels[0]
            for channel in channels[1:]:
                mask = ImageChops.lighter(mask, channel)
            delta = {'pixels': main.width * main.height - mask.histogram()[0],
                     'maxColor': max(high for low, high in diff.getextrema()),
                     'total': main.width * main.height}
            require(delta == row[label], 'independent PNG difference mismatch: ' + row['id'] + '/' + label)
            deltas[label] = delta
        comparisons.append({'id': row['id'], **deltas})
        if i % 12 == 0:
            sheet = Image.new('RGB', (1280, 12 * 224), '#202020')
            draw = ImageDraw.Draw(sheet)
        difference = ImageChops.difference(main, images[2]).convert('RGB').point(lambda x: min(255, x * 8))
        for col, (label, im) in enumerate([('main', main), ('on', images[2]), ('off', images[3]), ('on-main RGB diff x8', difference)]):
            thumb = im.copy()
            thumb.thumbnail((320, 200))
            y = (i % 12) * 224
            sheet.paste(thumb, (col * 320, y + 24))
            draw.text((col * 320 + 4, y + 3), row['id'] + ' ' + label, fill='white')
        if i % 12 == 11:
            name = 'contact-%02d.png' % (i // 12 + 1)
            sheet.save(out / name)
            sheets.append(name)
    # Preserve independently decoded comparison evidence before evaluating limits.
    (out / 'png-validation.json').write_text(json.dumps({'decoded': decoded, 'frameSize': frame_size, 'comparisons': comparisons, 'contactSheets': sheets}, indent=2) + '\n')
    require(data.get('passed') is True and not data.get('errors'), 'image harness predicates/errors failed')
    require(all(r['aa']['pixels'] == 0 and r['off']['pixels'] == 0 and r['on']['pixels'] <= r['on']['total'] / 10000 for r in comparisons), 'frozen pixel thresholds failed')
    return {'decoded': decoded, 'frameSize': frame_size, 'contactSheets': sheets, 'tileHash': data['tileHash'], 'city': data['city']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', required=True)
    parser.add_argument('--head', required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=False)  # Never mix stale evidence into a run.
    report = {'base': args.base, 'head': args.head, 'stages': [], 'sourcePins': {},
              'executionComplete': False, 'checksPassed': False, 'firstFailure': None,
              'performanceVerdict': 'manual-review-required',
              'acceptance': 'No owner, native-macOS-GPU, Ready, merge, or deployment approval is implied.'}
    def save():
        (out / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
    save()
    repo = Path(__file__).resolve().parents[3]
    trees = []
    temp = None
    def stage(name, action):
        start = time.monotonic()
        row = {'name': name, 'status': 'running'}
        report['stages'].append(row)
        save()
        try:
            row['result'] = action()
            row['status'] = 'passed'
        except Exception as error:
            row['status'] = 'failed'
            row['error'] = str(error)
            if report['firstFailure'] is None:
                report['firstFailure'] = {'stage': name, 'error': str(error)}
        row['seconds'] = round(time.monotonic() - start, 3)
        save()
        return row
    def command(name, argv, cwd, timeout):
        log = out / (name + '.log')
        row = {'argv': [str(a) for a in argv], 'cwd': str(cwd), 'log': log.name, 'exitCode': None, 'timedOut': False}
        report.setdefault('commands', {})[name] = row
        save()
        env = os.environ.copy()
        env['NODE_PATH'] = str(repo / 'node_modules') + (os.pathsep + env['NODE_PATH'] if env.get('NODE_PATH') else '')
        with log.open('wb') as stream:
            process = subprocess.Popen(row['argv'], cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                row['exitCode'] = process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                row['timedOut'] = True
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                row['exitCode'] = process.returncode
        lines = log.read_text(errors='replace').splitlines()
        row['firstDiagnostic'] = next((line for line in lines if re.search(r'(?:^|\s)(?:FAIL|ERROR|Error|AssertionError|Traceback)(?:\b|:)', line)), None)
        save()
        require(row['exitCode'] == 0 and not row['timedOut'], name + ' failed; exact exit ' + str(row['exitCode']) + '; see ' + log.name)
        require(log.stat().st_size > 0, name + ' emitted empty evidence')
        return row
    try:
        def materialize():
            nonlocal temp
            for sha in [args.base, args.head]:
                require(re.fullmatch('[0-9a-f]{40}', sha) is not None, 'full lowercase 40-character commit SHA required')
                require(git(repo, 'rev-parse', '--verify', sha + '^{commit}').decode().strip() == sha, 'commit identity mismatch')
            temp = Path(tempfile.mkdtemp(prefix='t717-ci-'))
            for label, sha in [('base', args.base), ('head', args.head)]:
                tree = temp / label
                git(repo, '-c', 'core.sparseCheckout=false', 'worktree', 'add', '--detach', str(tree), sha)
                trees.append(tree)
                require(git(tree, 'rev-parse', 'HEAD').decode().strip() == sha, 'worktree HEAD mismatch')
                report['sourcePins'][label] = pins(repo, tree, sha)
            require(report['sourcePins']['base']['tools/verify.py'] == report['sourcePins']['head']['tools/verify.py'], 'original verifier was changed')
            require((temp / 'head/docs/tasks/t717-shots/ci717.py').read_bytes() == Path(__file__).read_bytes(), 'runner must itself be the exact candidate Git blob')
            return {'temporaryRoot': str(temp), 'fullDetachedWorktrees': True}
        setup = stage('materialize-exact-objects', materialize)
        if setup['status'] != 'passed':
            return 1
        base, head = temp / 'base', temp / 'head'
        shots = head / 'docs/tasks/t717-shots'
        # Independent bounded stages fit the dedicated 120-minute CI job; original predicates stay unchanged.
        def verify(label, tree):
            result = command('verify-' + label, [sys.executable, 'tools/verify.py'], tree, 1050)
            require('RESULT: ALL GREEN' in (out / ('verify-' + label + '.log')).read_text(errors='replace'), 'original verifier ALL GREEN receipt missing')
            return result
        for label, tree in [('base', base), ('head', head)]:
            stage('verify-' + label, lambda label=label, tree=tree: verify(label, tree))
        # verify.py deliberately prints a summary, so collect the untouched original
        # node suite separately on EACH side to preserve every PASS and all six pins.
        for label, tree in [('base', base), ('head', head)]:
            stage('raw-suite-' + label, lambda label=label, tree=tree: command('raw-suite-' + label, ['node', 'test_fixde.js'], tree, 900))
            stage('suite-receipt-' + label, lambda label=label: suite_receipt(out / ('raw-suite-' + label + '.log'), out / ('suite-' + label + '.json')))
        def suite_pair():
            old, new = read_json(out / 'suite-base.json'), read_json(out / 'suite-head.json')
            require(new['passCount'] >= old['passCount'] > 0, 'candidate PASS count below exact baseline')
            require(sorted(new['sentinels'], key=lambda r: r['name']) == sorted(old['sentinels'], key=lambda r: r['name']), 'six-sentinel baseline/candidate drift')
            require(len(old['sentinels']) == 6 and old['completionMarker'] and new['completionMarker'] and not old['failLines'] and not new['failLines'], 'both raw suites must be complete')
            return {'baselinePASS': old['passCount'], 'candidatePASS': new['passCount'], 'sixSentinelsExact': True}
        stage('suite-pair', suite_pair)
        def geometry():
            command('geometry', ['node', str(shots / 'check-717.cjs')], head, 120)
            result = geometry_receipt(out / 'geometry.log')
            (out / 'geometry.json').write_text(json.dumps(result, indent=2) + '\n')
            return result
        stage('geometry', geometry)
        def native():
            command('native603', ['node', 'docs/tasks/t603-shots/native603.test.js'], head, 120)
            count = len(re.findall(r'^PASS:', (out / 'native603.log').read_text(), re.M))
            require(count > 0, 'native603 emitted no check receipts')
            return {'checks': count}
        stage('native603', native)
        def oldsave():
            command('oldsave603', ['node', 'docs/tasks/t603-shots/oldsave603.js', '--repo=' + str(head), '--json=' + str(out / 'oldsave.json')], head, 180)
            rows = read_json(out / 'oldsave.json')
            require(len(rows) == 3 and all(r['roots'] > 0 and r['rootDataExact'] and not r['footprintErrors'] and not r['changedSaveFields'] and r['roundtripRootsExact'] and not r['flags']['preview596'] for r in rows), 'three exact old-save round trips required')
            return {'fixtures': len(rows)}
        stage('oldsave603', oldsave)
        stage('full-frame-browser', lambda: command('eq', ['node', str(shots / 'eq.cjs'), str(base / 'index.html'), str(head / 'index.html'), str(out / 'eq')], head, 1200))
        stage('decode-and-contact-sheets', lambda: image_receipt(out, report['sourcePins']['base']['index.html']['sha256'], report['sourcePins']['head']['index.html']['sha256']))
        stage('interleaved-performance', lambda: command('perf', ['node', str(shots / 'perfab.cjs'), str(head / 'index.html'), str(out / 'perf.json')], head, 900))
        stage('performance-raw-integrity', lambda: performance_receipt(out / 'perf.json', report['sourcePins']['head']['index.html']['sha256']))
        def final_identity():
            for label, tree, sha in [('base', base, args.base), ('head', head, args.head)]:
                require(pins(repo, tree, sha) == report['sourcePins'][label], 'source changed during collection')
            eq, perf = read_json(out / 'eq/eq.json'), read_json(out / 'perf.json')
            require(eq['tileHash'] == perf['tileHash'] and eq['city'] == perf['city'], 'image/performance city mismatch')
            return {'sourceUnchanged': True, 'sameCity': True}
        stage('final-identity', final_identity)
        report['executionComplete'] = True
    except Exception as error:
        report['fatalError'] = str(error)
        if report['firstFailure'] is None:
            report['firstFailure'] = {'stage': 'runner', 'error': str(error)}
    finally:
        # Only remove fresh disposable worktrees; output evidence is never deleted.
        for tree in reversed(trees):
            try:
                git(repo, 'worktree', 'remove', '--force', str(tree))
            except Exception as error:
                report.setdefault('cleanupErrors', []).append(str(error))
        if temp:
            try:
                temp.rmdir()
            except OSError:
                pass
        report['checksPassed'] = report['executionComplete'] and all(s['status'] == 'passed' for s in report['stages']) and not report.get('cleanupErrors')
        report['artifacts'] = [{'path': str(p.relative_to(out)), 'bytes': p.stat().st_size, 'sha256': digest(p.read_bytes())} for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'results.json']
        save()
    return 0 if report['checksPassed'] else 1


if __name__ == '__main__':
    sys.exit(main())
