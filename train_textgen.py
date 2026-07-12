import json
import numpy as np

# ============================================================
# Tiny char-RNN trainer for Glimmerville text generation
# Outputs weights as a compact JSON/JS snippet to embed in index.html
# ============================================================

SEED = 42
np.random.seed(SEED)

# ---- training corpus with type prefixes ----
raw_samples = {
    "CITY": [
        "微光小鎮","星落城","雲海鎮","風鳴市","翠谷村","藍灣城","金陽市","銀月鎮",
        "紅葉城","青石鎮","紫晶市","白沙灣","黑森林","綠洲城","燈塔鎮","港灣市",
        "晨曦村","暮色鎮","晴川市","雨谷城","霜葉鎮","雷鳴市","虹光城","霧隱鎮",
        "流螢市","落霞鎮","碧波城","炎陽鎮","寒霜市","暖春村","秋實鎮","冬青市",
        "琥珀鎮","琉璃城","翡翠市","瑪瑙鎮","珍珠灣","鑽石城","黃金城","白銀鎮",
        "鐵丘市","銅鑼鎮","錫安城","鋁都鎮","鈦金市","石墨鎮","水晶城","寶石灘",
        "楓葉城","柳溪鎮","竹林市","松林鎮","柏木城","橡樹村","榕城市","椰林鎮",
        "桃花源","杏花村","梨園鎮","梅嶺市","蘭花城","菊島鎮","蓮池市","荷塘村",
        "鶴鳴市","鷺島鎮","鴿城","燕巢村","蝶谷鎮","蜂堰市","螢火鎮","蟲鳴村"
    ],
    "BLD": [
        "幸福公寓","黃金商場","鋼鐵工廠","綠意公園","光明電廠","藍天塔樓","白雲大廈",
        "紅磚小屋","青石別墅","紫晶豪宅","銀河購物中心","星辰辦公樓","月光劇院","朝陽市場",
        "晚霞餐廳","晨曦咖啡館","暮光書店","彩虹超市","雲端旅館","風車磨坊","燈塔郵局",
        "港灣倉庫","楓葉學校","柳溪醫院","竹林車站","松林旅社","水晶劇場","寶石銀行",
        "琥珀酒館","翡翠茶樓","瑪瑙工坊","琉璃溫泉","珍珠飯店","鑽石賭場","黃金交易所",
        "白銀當鋪","鐵砧鐵匠鋪","銅鑼鐘樓","紡織工房","釀酒廠","麵包坊","糖果屋","玩具店"
    ],
    "THO": [
        "公園真美","工廠好吵","稅收好高","生活便利","交通便利","空氣新鮮","夜景迷人",
        "房價太貴","工作機會多","孩子上學方便","醫療設施完善","購物很方便","娛樂太少",
        "綠地很多","噪音嚴重","電力穩定","網路很快","鄰居友善","街道乾淨","治安良好",
        "失業率讓人擔心","商業區很熱鬧","工業區影響健康","公園讓人放鬆","學校師資優秀",
        "醫院救了我的命","超市應有盡有","餐廳美食很多","房價還算合理","通勤時間太長",
        "夜生活豐富","白天太吵","晚上安靜","夏天涼爽","冬天溫暖","四季如春","風景如畫"
    ],
    "NEW": [
        "人口突破新紀錄","商業區即將擴建","新公園落成啟用","電廠升級完成","稅收創新高",
        "失業率持續下降","住宅需求激增","工業產值成長","觀光客絡繹不絕","市長宣布新政",
        "大型商場開幕","地鐵線路規劃中","新學校動土典禮","醫院擴建工程啟動","綠化覆蓋率提升",
        "交通事故減少","犯罪率創新低","文化節圓滿落幕","馬拉松比賽盛大舉行","煙火晚會吸引萬人",
        "新創公司進駐","外資投資增加","房價指數公布","租金水準穩定","電價調整公告",
        "環保政策上路","垃圾分類成效顯著","公共自行車系統擴充","免費WiFi覆蓋全市","智慧城市計畫啟動"
    ]
}

# wrap with end token
END = "\n"
samples = [f"[{k}]{s}{END}" for k, v in raw_samples.items() for s in v]
np.random.shuffle(samples)

# build vocab
chars = sorted(set("".join(samples)))
char_to_idx = {c: i for i, c in enumerate(chars)}
idx_to_char = {i: c for c, i in char_to_idx.items()}
vocab_size = len(chars)
print(f"vocab_size={vocab_size}, samples={len(samples)}")

# one-hot helper
def one_hot(idx):
    v = np.zeros(vocab_size, dtype=np.float32)
    v[idx] = 1.0
    return v

# model hyperparams
HIDDEN = 32
LEARNING_RATE = 0.08
CLIP_NORM = 5.0
EPOCHS = 250
PRINT_EVERY = 50

# init weights (Xavier-ish)
def init_matrix(rows, cols):
    return np.random.randn(rows, cols).astype(np.float32) * np.sqrt(1.0 / cols)

Wxh = init_matrix(HIDDEN, vocab_size)  # input -> hidden
Whh = init_matrix(HIDDEN, HIDDEN)      # hidden -> hidden
Why = init_matrix(vocab_size, HIDDEN)  # hidden -> output
bh = np.zeros(HIDDEN, dtype=np.float32)
by = np.zeros(vocab_size, dtype=np.float32)

# softmax
def softmax(x):
    e = np.exp(x - np.max(x))
    return e / np.sum(e)

# sample from model
def sample(seed_prefix, length=20, temperature=0.8):
    h = np.zeros(HIDDEN, dtype=np.float32)
    # feed prefix
    for ch in seed_prefix:
        x = one_hot(char_to_idx[ch])
        h = np.tanh(Wxh @ x + Whh @ h + bh)
    out = seed_prefix
    for _ in range(length):
        y = Why @ h + by
        p = softmax(y / temperature)
        idx = np.random.choice(vocab_size, p=p)
        ch = idx_to_char[idx]
        if ch == END:
            break
        out += ch
        x = one_hot(idx)
        h = np.tanh(Wxh @ x + Whh @ h + bh)
    return out

# train
def train_step(sample_str):
    global Wxh, Whh, Why, bh, by
    xs, hs, ys, ps = {}, {}, {}, {}
    h = np.zeros(HIDDEN, dtype=np.float32)
    hs[-1] = h
    loss = 0.0
    # forward
    for t, ch in enumerate(sample_str):
        xs[t] = one_hot(char_to_idx[ch])
        h = np.tanh(Wxh @ xs[t] + Whh @ h + bh)
        hs[t] = h
        y = Why @ h + by
        ys[t] = y
        p = softmax(y)
        ps[t] = p
        target_idx = char_to_idx[sample_str[t+1]] if t+1 < len(sample_str) else char_to_idx[END]
        loss += -np.log(p[target_idx] + 1e-8)
    # backward
    dWxh = np.zeros_like(Wxh)
    dWhh = np.zeros_like(Whh)
    dWhy = np.zeros_like(Why)
    dbh = np.zeros_like(bh)
    dby = np.zeros_like(by)
    dhnext = np.zeros(HIDDEN, dtype=np.float32)
    for t in reversed(range(len(sample_str))):
        target_idx = char_to_idx[sample_str[t+1]] if t+1 < len(sample_str) else char_to_idx[END]
        dy = ps[t].copy()
        dy[target_idx] -= 1.0
        dWhy += np.outer(dy, hs[t])
        dby += dy
        dh = Why.T @ dy + dhnext
        dhraw = dh * (1 - hs[t] * hs[t])
        dbh += dhraw
        dWxh += np.outer(dhraw, xs[t])
        dWhh += np.outer(dhraw, hs[t-1])
        dhnext = Whh.T @ dhraw
    # gradient clip
    for d in [dWxh, dWhh, dWhy, dbh, dby]:
        np.clip(d, -CLIP_NORM, CLIP_NORM, out=d)
    # update
    Wxh -= LEARNING_RATE * dWxh
    Whh -= LEARNING_RATE * dWhh
    Why -= LEARNING_RATE * dWhy
    bh -= LEARNING_RATE * dbh
    by -= LEARNING_RATE * dby
    return loss

print("Training...")
for epoch in range(EPOCHS):
    np.random.shuffle(samples)
    total_loss = 0.0
    for s in samples:
        total_loss += train_step(s)
    if (epoch + 1) % PRINT_EVERY == 0 or epoch == 0:
        avg = total_loss / len(samples)
        print(f"epoch {epoch+1}/{EPOCHS}, loss={avg:.3f}")
        for prefix in ["[CITY]", "[BLD]", "[THO]", "[NEW]"]:
            print("  ", sample(prefix, 15))

# ---- export weights ----
def quantize(arr, bits=8):
    # simple min-max quantization to reduce size
    mn, mx = arr.min(), arr.max()
    if mx - mn < 1e-8:
        return {"shape": arr.shape, "min": float(mn), "max": float(mx), "data": [0] * arr.size}
    scale = (mx - mn) / ((1 << bits) - 1)
    quantized = np.round((arr - mn) / scale).astype(np.uint8)
    return {"shape": list(arr.shape), "min": float(mn), "max": float(mx), "data": quantized.tolist()}

weights = {
    "vocab": chars,
    "hidden": HIDDEN,
    "Wxh": quantize(Wxh),
    "Whh": quantize(Whh),
    "Why": quantize(Why),
    "bh": quantize(bh),
    "by": quantize(by),
}

out_path = "C:/Users/Leon1/OneDrive/Desktop/安卓探索/glimmer-town/textgen_weights.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(weights, f, ensure_ascii=False, separators=(",", ":"))

size_kb = len(json.dumps(weights, ensure_ascii=False, separators=(",", ":"))) / 1024
print(f"\nSaved {out_path} ({size_kb:.1f} KB)")
print("\nSample outputs:")
for prefix in ["[CITY]", "[BLD]", "[THO]", "[NEW]"]:
    print(prefix, "->", sample(prefix, 18))
