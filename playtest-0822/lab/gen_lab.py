import io, sys
exp_path, out_path = sys.argv[1], sys.argv[2]
exp = io.open(exp_path, encoding='utf-8').read()
src = io.open(r'C:\dev\glimmer-town\test_fixde.js', encoding='utf-8').read()
anchor = "// ---- 測試輔助 ----"
assert src.count(anchor) == 1, 'anchor'
wrapped = ("/*LAB*/\ntry{\n" + exp +
           "\nrequire('fs').writeSync(2,'LAB-DONE');\nprocess.exit(0);" +
           "\n}catch(__e){require('fs').writeSync(2,'LAB-ERR '+__e.message);process.exit(2);}\n" +
           anchor)
out = src.replace(anchor, wrapped)
io.open(out_path, 'w', encoding='utf-8', newline='').write(out)
print('lab built ->', out_path)
