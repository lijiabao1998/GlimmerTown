import json, pathlib, os, subprocess
root = pathlib.Path('.')
html = (root / 'index.html').read_text()
qa = root / 'docs/tasks/t677-shots/qa'
markers = [s for s in ('T677 BEGIN', 'p06-panel', 'NativeHarborLayout', 'window.P06') if s in html]
valve = 'T677' in json.loads((root / 'docs/APPROVED_ART.json').read_text())['valves']
present = bool(markers or valve or (root / 'docs/tasks/t677-shots').exists())
if present:
    assert markers and valve, 'Partial T677 promotion: product or valve absent'
    for f in ('run.cjs', 'package.json', 'package-lock.json'):
        assert (qa / f).is_file(), 'Required T677 acceptance file absent: ' + f
# T720: like t717-evidence, this acceptance compares the native BASE with the candidate, so it applies only to the initial promotion.
base = os.environ.get('BASE', '')
assert base and subprocess.run(['git', 'rev-parse', '--verify', '--quiet', base + '^{commit}'], capture_output=True).returncode == 0, 'Scope base is not a commit: ' + repr(base)
base_html = subprocess.check_output(['git', 'show', base + ':index.html'], text=True)
base_valves = json.loads(subprocess.check_output(['git', 'show', base + ':docs/APPROVED_ART.json'], text=True)).get('valves', {})
base_product = 'T677 BEGIN' in base_html and base_valves.get('T677') == '__noT677'
applicable = present and not base_product
note = 'Full harbor acceptance required' if applicable else ('Baseline already contains T677; initial-promotion harbor acceptance not applicable (T720)' if base_product else 'Native baseline bootstrap only; no T677 product or evidence files exist; NOT a harbor pass')
result = {'applicable': applicable, 'base': base, 'baselineContainsT677': base_product, 'markers': markers, 'valve': valve, 'note': note}
(root / 'evidence/port-t677/promotion-detection.json').write_text(json.dumps(result, indent=2))
with open(os.environ['GITHUB_OUTPUT'], 'a') as f: f.write('applicable=' + str(applicable).lower() + '\n')
print(json.dumps(result))
