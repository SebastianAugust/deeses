"""
Langkah 5 + 6 audit v2: kesiapan data per kriteria, korelasi antar kriteria, sensitivitas urutan prioritas.
Murni membaca kos_scored.csv. Output: out_v2/kesiapan_kriteria_v2.txt, korelasi_v2.txt, sensitivitas_v2.txt
"""
from __future__ import annotations
import sys
sys.dont_write_bytecode = True
import itertools, json, time
from pathlib import Path
import numpy as np, pandas as pd
from scipy.stats import rankdata

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]; OUT = HERE.parent
DF = pd.read_csv(ROOT / "kos_scored.csv")

APP = {  # kode app -> (kolom, jenis, tipe)
    "harga": ("harga", "cost", "angka"), "listrik": ("termasuk_listrik", "benefit", "biner"),
    "bayar_bulanan": ("pembayaran_per_bulan", "benefit", "biner"), "bayar_tahunan": ("pembayaran_per_tahun", "benefit", "biner"),
    "luas": ("luas_kamar_m2", "benefit", "angka"), "km_dalam": ("k_mandi_dalam", "benefit", "biner"),
    "ac": ("ac", "benefit", "biner"), "jendela": ("jendela", "benefit", "biner"), "tv": ("tv", "benefit", "biner"),
    "shower": ("shower", "benefit", "biner"), "air_panas": ("air_panas", "benefit", "biner"),
    "kloset_duduk": ("kloset_duduk", "benefit", "biner"), "cctv": ("cctv", "benefit", "biner"),
    "penjaga": ("penjaga", "benefit", "biner"), "parkir_motor": ("parkir_motor_sepeda", "benefit", "biner"),
    "parkir_mobil": ("parkir_mobil", "benefit", "biner"), "wifi": ("wifi", "benefit", "biner"),
    "ruang_tamu": ("ruang_tamu", "benefit", "biner"), "ruang_jemur": ("ruang_jemur", "benefit", "biner"),
    "jarak_unpad": ("jarak_unpad_km", "cost", "angka"), "jarak_itb": ("jarak_itb_km", "cost", "angka"),
    "jarak_kampus": ("C2", "cost", "angka"),
}
TIDAK_ADA = ["deposit", "minimarket", "pasar"]

def tulis(nama, buf):
    (OUT / nama).write_text("\n".join(buf), encoding="utf-8")

# =============================================================== kesiapan
b1: list[str] = []
def p1(*a):
    s = " ".join(str(x) for x in a); print(s); b1.append(s)
p1("kode\tkolom\tjenis\tterisi%\tunik\tmin\tmedian\tmax\tn_nilai1\t%nilai1\tkonstan\tkeluar_dari_distribusi")
for kode, (kol, jenis, tipe) in APP.items():
    s = DF[kol]
    terisi = s.notna().mean() * 100
    n1 = int((s == 1).sum()) if tipe == "biner" else ""
    p1f = f"{(s == 1).mean() * 100:.1f}" if tipe == "biner" else ""
    modus = s.value_counts(normalize=True).iloc[0] * 100
    p1(f"{kode}\t{kol}\t{jenis}\t{terisi:.1f}\t{s.nunique()}\t{s.min():g}\t{s.median():g}\t{s.max():g}\t{n1}\t{p1f}\t{'YA' if s.nunique() <= 1 else 'tidak'}\tmodus={modus:.1f}%")
for k in TIDAK_ADA:
    p1(f"{k}\t(tidak ada kolom)\t-\t0.0\t0\t-\t-\t-\t\t\tN/A\t")
tulis("kesiapan_kriteria_v2.txt", b1)

# =============================================================== korelasi
b2: list[str] = []
def p2(*a):
    s = " ".join(str(x) for x in a); print(s); b2.append(s)
kol = [v[0] for v in APP.values()]
kodeOf = {v[0]: k for k, v in APP.items()}
X = DF[kol]
pe = X.corr(method="pearson"); sp = X.corr(method="spearman")
pairs = []
for a, b in itertools.combinations(kol, 2):
    pairs.append((kodeOf[a], kodeOf[b], pe.loc[a, b], sp.loc[a, b]))
pairs.sort(key=lambda t: -max(abs(t[2]), abs(t[3])))
p2("Korelasi antar kolom kriteria (seluruh 357 kos). Pasangan |Pearson| atau |Spearman| >= 0.5:")
p2("kriteria_a\tkriteria_b\tPearson\tSpearman\ttanda")
for a, b, r, s in pairs:
    m = max(abs(r), abs(s))
    if m >= 0.5:
        p2(f"{a}\t{b}\t{r:.3f}\t{s:.3f}\t{'TINGGI >0.9 (hitung ganda)' if m > 0.9 else ('sedang >0.7' if m > 0.7 else 'sedang >0.5')}")
p2(f"\nJumlah pasangan: {len(pairs)}; |r|>0.9: {sum(max(abs(r), abs(s)) > 0.9 for _, _, r, s in pairs)}; |r|>0.7: {sum(max(abs(r), abs(s)) > 0.7 for _, _, r, s in pairs)}")
p2("Identik secara matematis (bukan korelasi): C1==harga:", bool(np.allclose(DF.C1, DF.harga)), "| C4==luas_kamar_m2:", bool(np.allclose(DF.C4, DF.luas_kamar_m2)),
   "| C2==min(unpad,itb):", bool(np.allclose(DF.C2, DF[["jarak_unpad_km", "jarak_itb_km"]].min(axis=1))))
p2("Proporsi C2 yang berasal dari ITB (jarak_itb <= jarak_unpad):", f"{(DF.jarak_itb_km <= DF.jarak_unpad_km).mean():.1%}")
# korelasi antar tipe kamar mandi
p2("kloset duduk vs jongkok (Pearson):", round(DF.kloset_duduk.corr(DF.kloset_jongkok), 3))
tulis("korelasi_v2.txt", b2)

# =============================================================== sensitivitas
b3: list[str] = []
def p3(*a):
    s = " ".join(str(x) for x in a); print(s); b3.append(s)

SET4 = ["harga", "jarak_kampus", "luas", "cctv"]
SET8 = ["harga", "jarak_kampus", "luas", "km_dalam", "ac", "wifi", "cctv", "penjaga"]
SKEN = [(1_000_000, "putri"), (1_000_000, "putra"), (1_500_000, "putri"), (1_500_000, "campur")]

def r9(a): return np.round(a, 9)

def rank_ord(saw, top, harga, ids):
    return np.lexsort((ids, harga, -r9(top), -r9(saw)))   # kunci terakhir = utama

def jalankan(kodes, bud, tipe):
    d = DF[(DF.harga <= bud) & (DF.tipe_penghuni == tipe)].reset_index(drop=True)
    kol = [APP[k][0] for k in kodes]; jen = [APP[k][1] for k in kodes]
    M = d[kol].to_numpy(float)
    lo, hi = M.min(0), M.max(0); rng = hi - lo
    N = np.ones_like(M)
    for j in range(len(kol)):
        if rng[j] > 0:
            N[:, j] = (hi[j] - M[:, j]) / rng[j] if jen[j] == "cost" else (M[:, j] - lo[j]) / rng[j]
    n = len(kodes); m = len(d)
    ids = d["id"].to_numpy(); harga = d["harga"].to_numpy(float); nama = d["nama"].to_numpy()
    top1_saw, top1_top, rhos, top3 = [], [], [], set()
    same = 0; total = 0
    perm_iter = itertools.permutations(range(n))
    for perm in perm_iter:
        w = np.empty(n);
        for r, j in enumerate(perm, start=1):
            w[j] = 2 * (n - r + 1) / (n * (n + 1))
        V = N * w
        saw = V.sum(1)
        dp = np.sqrt(((V - V.max(0)) ** 2).sum(1)); dn = np.sqrt(((V - V.min(0)) ** 2).sum(1))
        den = dp + dn
        top = np.where(den == 0, 1.0, dn / np.where(den == 0, 1, den))
        o = rank_ord(saw, top, harga, ids)
        o_t = np.lexsort((ids, harga, -r9(saw), -r9(top)))
        a, b = o[0], o_t[0]
        top1_saw.append(a); top1_top.append(b); same += int(a == b); total += 1
        top3.add(frozenset(o[:3].tolist()))
        rs, rt = rankdata(r9(saw)), rankdata(r9(top))
        if rs.std() > 0 and rt.std() > 0:
            rhos.append(float(np.corrcoef(rs, rt)[0, 1]))
    from collections import Counter
    c = Counter(top1_saw); (best, cnt), = c.most_common(1)
    rhos = np.array(rhos)
    return dict(kandidat=m, perm=total, beda_no1=len(c), no1_paling_sering=str(nama[best]), no1_pct=100 * cnt / total,
                top3_beda=len(top3), no1_sama_saw_topsis_pct=100 * same / total,
                rho_min=float(rhos.min()), rho_p5=float(np.percentile(rhos, 5)), rho_median=float(np.median(rhos)))

p3("Sensitivitas urutan prioritas. Mesin: numpy vektor, skor dibulatkan 9 desimal sebelum ranking, pemutus seri TOPSIS -> harga -> id.")
hasil = []
for nama_set, kodes in [("SET4 (default app: harga, jarak_kampus, luas, cctv) 4! = 24", SET4), ("SET8 (harga, jarak_kampus, luas, km_dalam, ac, wifi, cctv, penjaga) 8! = 40.320", SET8)]:
    p3(f"\n### {nama_set}")
    p3("skenario\tkandidat\turutan\t#1_berbeda\t#1_paling_sering(%)\ttop3_berbeda\t#1_SAW==#1_TOPSIS(%)\trho_min\trho_p5\trho_median")
    for bud, tipe in SKEN:
        t0 = time.time(); r = jalankan(kodes, bud, tipe)
        p3(f"<= {bud/1e6:g} jt {tipe}\t{r['kandidat']}\t{r['perm']}\t{r['beda_no1']}\t{r['no1_paling_sering']} ({r['no1_pct']:.1f}%)\t{r['top3_beda']}\t{r['no1_sama_saw_topsis_pct']:.1f}\t{r['rho_min']:.3f}\t{r['rho_p5']:.3f}\t{r['rho_median']:.3f}")
        hasil.append((nama_set[:4], bud, tipe, r))
tulis("sensitivitas_v2.txt", b3)
(OUT / "sensitivitas_v2.json").write_text(json.dumps([[a, b, c, d] for a, b, c, d in hasil], indent=1, ensure_ascii=False), encoding="utf-8")
