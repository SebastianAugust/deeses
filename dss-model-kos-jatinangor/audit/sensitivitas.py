"""
Analisis sensitivitas: (1) beberapa urutan prioritas bernama -> top-3 SAW/TOPSIS,
(2) SEMUA 8! = 40.320 urutan -> kestabilan top-1/top-3 dan sebaran Spearman
SAW vs TOPSIS (varian min-max teman dan varian vektor standar).
Implementasi sendiri (numpy, vektorisasi), dicek silang ke dss_independen.
Jalankan:  audit\\.venv\\Scripts\\python audit\\sensitivitas.py  (output juga ke audit/out/sensitivitas.txt)
"""
from __future__ import annotations

import sys as _sys

_sys.dont_write_bytecode = True  # jangan buat __pycache__ di folder teman

import io
import itertools
import sys
from collections import Counter
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import rankdata

AUDIT = Path(__file__).resolve().parent
ROOT = AUDIT.parent
sys.path.insert(0, str(AUDIT))
import dss_independen as ind  # noqa: E402

DF = pd.read_csv(ROOT / "kos_scored.csv")
KODE = [f"C{i}" for i in range(1, 9)]
COST = np.array([k in ("C1", "C2", "C3") for k in KODE])
SKENARIO = [(1_000_000, "putri"), (1_000_000, "putra"), (1_500_000, "putri"), (1_500_000, "campur")]
URUTAN_BERNAMA = {
    "default (C1..C8)": KODE,
    "hemat: C1,C2,C3,...": ["C1", "C2", "C3", "C5", "C4", "C6", "C7", "C8"],
    "dekat kampus: C2,C3,C1,...": ["C2", "C3", "C1", "C6", "C5", "C4", "C8", "C7"],
    "fasilitas: C5,C4,C6,...": ["C5", "C4", "C6", "C8", "C7", "C1", "C2", "C3"],
    "aman: C6,C1,C5,...": ["C6", "C1", "C5", "C2", "C4", "C8", "C3", "C7"],
    "terbalik (C8..C1)": KODE[::-1],
}


def matriks(kand):
    X = kand[KODE].to_numpy(float)
    lo, hi = X.min(0), X.max(0)
    d = hi - lo
    R = np.where(d == 0, 1.0, np.where(COST, (hi - X), (X - lo)) / np.where(d == 0, 1, d))
    pemb = np.sqrt((X ** 2).sum(0))
    Rv = np.where(pemb == 0, 0.0, X / np.where(pemb == 0, 1, pemb))
    return R, Rv


def bobot_semua():
    n = 8
    w_rank = np.array([2 * (n - r + 1) / (n * (n + 1)) for r in range(1, 9)])
    perms = np.array(list(itertools.permutations(range(8))), dtype=np.int8)  # perms[p, r] = kriteria di posisi r
    W = np.zeros((len(perms), 8))
    np.put_along_axis(W, perms.astype(np.int64), np.broadcast_to(w_rank, perms.shape), axis=1)
    return perms, W


def topsis_batch(R, W, cost_mask=None):
    """R: (n_alt, 8), W: (P, 8) -> (P, n_alt). Kalau cost_mask diberi = varian vektor."""
    V = W[:, None, :] * R[None, :, :]
    if cost_mask is None:
        pos, neg = V.max(1, keepdims=True), V.min(1, keepdims=True)
    else:
        mx, mn = V.max(1, keepdims=True), V.min(1, keepdims=True)
        pos = np.where(cost_mask, mn, mx)
        neg = np.where(cost_mask, mx, mn)
    dp = np.sqrt(((V - pos) ** 2).sum(2))
    dn = np.sqrt(((V - neg) ** 2).sum(2))
    den = dp + dn
    return np.where(den == 0, 1.0, dn / np.where(den == 0, 1, den))


def spearman_baris(A, B):
    ra, rb = rankdata(A, axis=1), rankdata(B, axis=1)
    ra -= ra.mean(1, keepdims=True)
    rb -= rb.mean(1, keepdims=True)
    return (ra * rb).sum(1) / np.sqrt((ra ** 2).sum(1) * (rb ** 2).sum(1))


def top_k(S, k, harga):
    # SAW desc, harga asc sebagai pemutus seri sederhana
    out = []
    for s in S:
        idx = np.lexsort((harga, -np.round(s, 9)))[:k]
        out.append(tuple(idx))
    return out


def main():
    perms, W = bobot_semua()
    nama = DF["nama"].to_numpy()
    for bud, tipe in SKENARIO:
        kand = DF[(DF.harga <= bud) & (DF.tipe_penghuni == tipe)].reset_index(drop=True)
        n = len(kand)
        print("\n" + "=" * 78)
        print(f"Skenario budget <= Rp {bud:,} | tipe {tipe} | n kandidat = {n}".replace(",", "."))
        print("=" * 78)
        R, Rv = matriks(kand)
        harga = kand.harga.to_numpy()
        nm = kand.nama.to_numpy()
        # --- urutan bernama
        for label, u in URUTAN_BERNAMA.items():
            w = np.array([ind.bobot_rank_sum(u, ind.KRITERIA_DEFAULT)[k] for k in KODE])
            s = R @ w
            tm = topsis_batch(R, w[None])[0]
            tv = topsis_batch(Rv, w[None], COST)[0]
            # cek silang ke implementasi pure-python
            ri = ind.peringkat(kand.to_dict("records"), bud, tipe, u)
            assert abs(max(h["skor_saw"] for h in ri["hasil"]) - s.max()) < 1e-12
            t3s = [nm[i] for i in top_k(s[None], 3, harga)[0]]
            t3m = [nm[i] for i in top_k(tm[None], 3, harga)[0]]
            t3v = [nm[i] for i in top_k(tv[None], 3, harga)[0]]
            rho_m = spearman_baris(s[None], tm[None])[0]
            rho_v = spearman_baris(s[None], tv[None])[0]
            print(f"\n[{label}]  rho(SAW,TOPSISmm)={rho_m:.3f}  rho(SAW,TOPSISvektor)={rho_v:.3f}")
            print(f"   top-3 SAW        : {t3s}")
            print(f"   top-3 TOPSIS mm  : {t3m}  (overlap {len(set(t3s) & set(t3m))}/3)")
            print(f"   top-3 TOPSIS vek : {t3v}  (overlap {len(set(t3s) & set(t3v))}/3)")
        # --- semua permutasi
        S = W @ R.T  # (P, n)
        TM = topsis_batch(R, W)
        TV = topsis_batch(Rv, W, COST)
        t1 = Counter(t[0] for t in top_k(S, 1, harga))
        t3 = Counter(frozenset(t) for t in top_k(S, 3, harga))
        t1m = top_k(TM, 1, harga)
        sama_top1_m = np.mean([a[0] == b[0] for a, b in zip(top_k(S, 1, harga), t1m)])
        rho_m = spearman_baris(S, TM)
        rho_v = spearman_baris(S, TV)
        print(f"\n[SEMUA {len(W):,} urutan]".replace(",", "."))
        print(f"   kos berbeda yang pernah jadi #1 SAW: {len(t1)}; paling sering: "
              + "; ".join(f"{nama_k} {c / len(W):.1%}" for nama_k, c in
                          [(nm[i], c) for i, c in t1.most_common(4)]))
        print(f"   himpunan top-3 SAW berbeda: {len(t3)}; paling sering muncul {t3.most_common(1)[0][1] / len(W):.1%}")
        kos_t3 = Counter(i for t in top_k(S, 3, harga) for i in t)
        print("   kos paling sering masuk top-3 SAW: "
              + "; ".join(f"{nm[i]} {c / len(W):.0%}" for i, c in kos_t3.most_common(5)))
        print(f"   #1 SAW == #1 TOPSIS(min-max): {sama_top1_m:.1%} dari semua urutan")
        q = lambda a: f"min {a.min():.3f} | p5 {np.percentile(a, 5):.3f} | median {np.median(a):.3f} | max {a.max():.3f}"  # noqa: E731
        print(f"   Spearman SAW vs TOPSIS min-max : {q(rho_m)}")
        print(f"   Spearman SAW vs TOPSIS vektor  : {q(rho_v)}")
        # pengaruh posisi C1 (harga) ke #1
        pos_c1 = np.argmax(perms == 0, axis=1)
        for p in (0, 7):
            mask = pos_c1 == p
            c = Counter(t[0] for t, mk in zip(top_k(S, 1, harga), mask) if mk)
            i, cnt = c.most_common(1)[0]
            print(f"   saat C1 di posisi {p + 1}: #1 paling sering = {nm[i]} (Rp {harga[i]:,.0f}) {cnt / mask.sum():.0%}")


if __name__ == "__main__":
    buf = io.StringIO()
    with redirect_stdout(buf):
        main()
    teks = buf.getvalue()
    print(teks)
    (AUDIT / "out").mkdir(exist_ok=True)
    (AUDIT / "out" / "sensitivitas.txt").write_text(teks, encoding="utf-8")
