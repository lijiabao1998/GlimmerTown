import json
import numpy as np

np.random.seed(42)

raw = [
    "微光鎮","星光城","雲海鎮","風鳴市","翠谷村","藍灣城","金陽市","銀月鎮",
    "紅葉城","青石鎮","紫晶市","白沙灣","綠洲城","燈塔鎮","港灣市","晨曦村",
    "暮色鎮","晴川市","雨谷城","霜葉鎮","雷鳴市","虹光城","霧隱鎮","流螢市",
    "落霞鎮","碧波城","炎陽鎮","寒霜市","暖春村","秋實鎮","冬青市","琥珀鎮",
    "琉璃城","翡翠市","瑪瑙鎮","珍珠灣","鑽石城","黃金城","白銀鎮","鐵丘市",
    "銅鑼鎮","水晶城","寶石灘","楓葉城","柳溪鎮","竹林市","松林鎮","柏木城",
    "橡樹村","桃花源","杏花村","梨園鎮","梅嶺市","蘭花城","菊島鎮","蓮池市",
    "荷塘村","鶴鳴市","鷺島鎮","鴿子城","燕巢村","蝶谷鎮","螢火鎮","蟲鳴村"
]

END = "\n"
samples = [s + END for s in raw]
chars = sorted(set("".join(samples)))
ctoi = {c: i for i, c in enumerate(chars)}
itos = {i: c for c, i in ctoi.items()}
V = len(chars)
H = 48
LR = 0.08
CLIP = 5.0
EPOCHS = 2500

Wxh = np.random.randn(H, V).astype(np.float32) * np.sqrt(1.0 / V)
Whh = np.random.randn(H, H).astype(np.float32) * np.sqrt(1.0 / H)
Why = np.random.randn(V, H).astype(np.float32) * np.sqrt(1.0 / H)
bh = np.zeros(H, dtype=np.float32)
by = np.zeros(V, dtype=np.float32)

def softmax(x):
    e = np.exp(x - np.max(x))
    return e / np.sum(e)

def sample(seed, length=12, temp=0.7):
    h = np.zeros(H, dtype=np.float32)
    out = seed
    for ch in seed:
        x = np.zeros(V, dtype=np.float32); x[ctoi[ch]] = 1.0
        h = np.tanh(Wxh @ x + Whh @ h + bh)
    for _ in range(length):
        y = Why @ h + by
        p = softmax(y / temp)
        idx = np.random.choice(V, p=p)
        ch = itos[idx]
        if ch == END:
            break
        out += ch
        x = np.zeros(V, dtype=np.float32); x[idx] = 1.0
        h = np.tanh(Wxh @ x + Whh @ h + bh)
    return out

def train(s):
    global Wxh, Whh, Why, bh, by
    h = np.zeros(H, dtype=np.float32)
    xs, hs, ps = {}, {}, {}
    hs[-1] = h
    loss = 0.0
    for t, ch in enumerate(s):
        x = np.zeros(V, dtype=np.float32); x[ctoi[ch]] = 1.0
        h = np.tanh(Wxh @ x + Whh @ h + bh)
        hs[t] = h; xs[t] = x
        y = Why @ h + by
        p = softmax(y)
        ps[t] = p
        tgt = ctoi[s[t+1]] if t + 1 < len(s) else ctoi[END]
        loss += -np.log(p[tgt] + 1e-8)
    dWxh = np.zeros_like(Wxh); dWhh = np.zeros_like(Whh); dWhy = np.zeros_like(Why)
    dbh = np.zeros_like(bh); dby = np.zeros_like(by)
    dhnext = np.zeros(H, dtype=np.float32)
    for t in reversed(range(len(s))):
        tgt = ctoi[s[t+1]] if t + 1 < len(s) else ctoi[END]
        dy = ps[t].copy(); dy[tgt] -= 1.0
        dWhy += np.outer(dy, hs[t]); dby += dy
        dh = Why.T @ dy + dhnext
        dhraw = dh * (1 - hs[t] * hs[t])
        dbh += dhraw
        dWxh += np.outer(dhraw, xs[t])
        dWhh += np.outer(dhraw, hs[t-1])
        dhnext = Whh.T @ dhraw
    for d in (dWxh, dWhh, dWhy, dbh, dby):
        np.clip(d, -CLIP, CLIP, out=d)
    Wxh -= LR * dWxh; Whh -= LR * dWhh; Why -= LR * dWhy
    bh -= LR * dbh; by -= LR * dby
    return loss

best_loss = float('inf')
best_state = None
for ep in range(EPOCHS):
    np.random.shuffle(samples)
    total = 0.0
    for s in samples:
        total += train(s)
    avg = total / len(samples)
    if avg < best_loss:
        best_loss = avg
        best_state = (Wxh.copy(), Whh.copy(), Why.copy(), bh.copy(), by.copy())
    if (ep + 1) % 250 == 0:
        print(f"epoch {ep+1}/{EPOCHS}, loss={avg:.4f}, best={best_loss:.4f}")
        for _ in range(5):
            print(" ", sample(""))

# restore best
Wxh, Whh, Why, bh, by = best_state
print(f"\nFinal best loss={best_loss:.4f}")
for _ in range(10):
    print(" ", sample(""))

# quantize and save
def quantize(arr, bits=8):
    mn, mx = arr.min(), arr.max()
    if mx - mn < 1e-8:
        return {"shape": list(arr.shape), "min": float(mn), "max": float(mx), "data": [0] * arr.size}
    scale = (mx - mn) / ((1 << bits) - 1)
    q = np.round((arr - mn) / scale).astype(np.uint8)
    return {"shape": list(arr.shape), "min": float(mn), "max": float(mx), "data": q.tolist()}

weights = {"vocab": chars, "hidden": H, "Wxh": quantize(Wxh), "Whh": quantize(Whh),
           "Why": quantize(Why), "bh": quantize(bh), "by": quantize(by)}
with open("C:/Users/Leon1/OneDrive/Desktop/安卓探索/glimmer-town/textgen_weights.json", "w", encoding="utf-8") as f:
    json.dump(weights, f, ensure_ascii=False, separators=(",", ":"))

size = len(json.dumps(weights, ensure_ascii=False, separators=(",", ":"))) / 1024
print(f"Saved weights ({size:.1f} KB)")
