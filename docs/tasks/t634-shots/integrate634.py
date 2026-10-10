"""Rebuild only the published T634 candidate block; retain all baseline code paths."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
p=ROOT/'index.html';s=p.read_text()
START='/* ===== T634 WHOLE BATCH BEGIN ===== */'
END='/* ===== T634 WHOLE BATCH END ===== */'
parts=[(ROOT/'docs/tasks/t634-shots'/name).read_text() for name in ['core634.js','civic634.js','industry634.js','rci634.js']]
block=START+'\n'+'\n'.join(parts)+'\nconst ART634={...CIVIC634,...INDUSTRY634,...RCI634};\n'+END+'\n'
assert s.count(START)==s.count(END)==1, 'Start from the published T634 integration commit; this helper only rebuilds its art block.'
a=s.index(START);b=s.index(END,a)+len(END);s=s[:a]+block.rstrip()+s[b:]
p.write_text(s)
print('T634 block rebuilt:',len(block.splitlines()),'lines')
