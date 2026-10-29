import json, pathlib, os
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
result = {'applicable': present, 'markers': markers, 'valve': valve, 'note': 'Full harbor acceptance required' if present else 'Native baseline bootstrap only; no T677 product or evidence files exist; NOT a harbor pass'}
(root / 'evidence/port-t677/promotion-detection.json').write_text(json.dumps(result, indent=2))
with open(os.environ['GITHUB_OUTPUT'], 'a') as f: f.write('applicable=' + str(present).lower() + '\n')
print(json.dumps(result))
