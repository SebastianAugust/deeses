"""
Membuat golden test (kasus kecil yang bisa dihitung tangan) -> golden_test.json,
lalu memverifikasi:
  1. dss_independen.py (implementasi audit)
  2. fungsi-fungsi di model_dss.py milik teman (dipanggil, TIDAK diubah;
     konstanta modulnya ditimpa sementara di memori supaya bisa 3 kriteria)

Nilai harapan SAW/bobot/normalisasi dihitung EKSAK pakai Fraction.
Jalankan:  audit\\.venv\\Scripts\\python audit\\golden_test.py
"""
from __future__ import annotations

import sys as _sys

_sys.dont_write_bytecode = True  # jangan buat __pycache__ di folder teman

import json
import sys
from fractions import Fraction as F
from math import sqrt
from pathlib import Path

AUDIT = Path(__file__).resolve().parent
sys.path.insert(0, str(AUDIT))
import dss_independen as ind  # noqa: E402

KRIT = [("K1", "cost"), ("K2", "cost"), ("K3", "benefit")]
NAMA_KRIT = {"K1": "harga (Rp/bulan)", "K2": "jarak ke kampus (km)", "K3": "skor fasilitas (0-1)"}

KASUS = {
    "utama_3x3": {
        "keterangan": "Kasus utama: 3 kos x 3 kriteria, urutan K1 > K3 > K2.",
        "urutan": ["K1", "K3", "K2"],
        "alternatif": [
            {"id": "A", "harga": 1_000_000, "nilai": {"K1": 1_000_000, "K2": F(1, 2), "K3": F(1, 2)}},
            {"id": "B", "harga": 800_000, "nilai": {"K1": 800_000, "K2": F(3, 2), "K3": F(1, 4)}},
            {"id": "C", "harga": 1_200_000, "nilai": {"K1": 1_200_000, "K2": F(1), "K3": F(1)}},
        ],
    },
    "seri_saw": {
        "keterangan": "Ketiga kos SAW-nya persis 0,5 (seri) -> pemutus seri = TOPSIS. "
                      "Menguji galat floating point (C bisa jadi 0.49999999999999994).",
        "urutan": ["K1", "K3", "K2"],
        "alternatif": [
            {"id": "A", "harga": 1_200_000, "nilai": {"K1": 1_200_000, "K2": F(1, 2), "K3": F(1)}},
            {"id": "B", "harga": 800_000, "nilai": {"K1": 800_000, "K2": F(3, 2), "K3": F(1, 5)}},
            {"id": "C", "harga": 1_000_000, "nilai": {"K1": 1_000_000, "K2": F(1), "K3": F(3, 5)}},
        ],
    },
    "kolom_konstan": {
        "keterangan": "K3 sama untuk semua kos (max = min) -> norm K3 = 1 untuk semua "
                      "(perilaku model teman). SAW semua naik +w(K3), ranking tidak berubah.",
        "urutan": ["K3", "K1", "K2"],
        "alternatif": [
            {"id": "A", "harga": 900_000, "nilai": {"K1": 900_000, "K2": F(1, 2), "K3": F(1, 2)}},
            {"id": "B", "harga": 700_000, "nilai": {"K1": 700_000, "K2": F(1), "K3": F(1, 2)}},
            {"id": "C", "harga": 1_100_000, "nilai": {"K1": 1_100_000, "K2": F(3, 2), "K3": F(1, 2)}},
        ],
    },
    "satu_kandidat": {
        "keterangan": "Hanya 1 kos lolos filter -> semua norm = 1, SAW = 1, TOPSIS = 1, Spearman = null.",
        "urutan": ["K2", "K1", "K3"],
        "alternatif": [
            {"id": "A", "harga": 900_000, "nilai": {"K1": 900_000, "K2": F(7, 10), "K3": F(3, 8)}},
        ],
    },
}


def eksak(kasus):
    """Hitung bobot/normalisasi/SAW eksak (Fraction), TOPSIS pakai float."""
    alt, urut = kasus["alternatif"], kasus["urutan"]
    n = len(urut)
    w = {k: F(2 * (n - r + 1), n * (n + 1)) for r, k in enumerate(urut, start=1)}
    norm = [dict() for _ in alt]
    for k, j in KRIT:
        col = [F(a["nilai"][k]) for a in alt]
        lo, hi = min(col), max(col)
        for i, x in enumerate(col):
            norm[i][k] = F(1) if hi == lo else ((hi - x) / (hi - lo) if j == "cost" else (x - lo) / (hi - lo))
    saw = [sum(w[k] * r[k] for k, _ in KRIT) for r in norm]
    # TOPSIS min-max (float)
    V = [{k: float(w[k] * r[k]) for k, _ in KRIT} for r in norm]
    pos = {k: max(v[k] for v in V) for k, _ in KRIT}
    neg = {k: min(v[k] for v in V) for k, _ in KRIT}

    def cc(v, p, q):
        dp = sqrt(sum((v[k] - p[k]) ** 2 for k, _ in KRIT))
        dn = sqrt(sum((v[k] - q[k]) ** 2 for k, _ in KRIT))
        return 1.0 if dp + dn == 0 else dn / (dp + dn)

    t_mm = [cc(v, pos, neg) for v in V]
    # TOPSIS vektor (standar)
    pemb = {k: sqrt(sum(float(a["nilai"][k]) ** 2 for a in alt)) for k, _ in KRIT}
    V2 = [{k: float(w[k]) * float(a["nilai"][k]) / pemb[k] for k, _ in KRIT} for a in alt]
    pos2, neg2 = {}, {}
    for k, j in KRIT:
        col = [v[k] for v in V2]
        pos2[k], neg2[k] = (max(col), min(col)) if j == "benefit" else (min(col), max(col))
    t_vk = [cc(v, pos2, neg2) for v in V2]
    # urutan: SAW (eksak) desc -> TOPSIS min-max desc -> harga asc -> id asc
    idx = sorted(range(len(alt)), key=lambda i: (-saw[i], -round(t_mm[i], 9), alt[i]["harga"], alt[i]["id"]))
    rank = {alt[i]["id"]: p for p, i in enumerate(idx, start=1)}
    return w, norm, saw, t_mm, t_vk, rank


def ke_json(nama, kasus):
    w, norm, saw, t_mm, t_vk, rank = eksak(kasus)
    alt = kasus["alternatif"]
    return {
        "keterangan": kasus["keterangan"],
        "input": {
            "kriteria": [{"kode": k, "jenis": j, "nama": NAMA_KRIT[k]} for k, j in KRIT],
            "urutan_kriteria": kasus["urutan"],
            "alternatif": [{"id": a["id"], "nilai": {k: float(v) for k, v in a["nilai"].items()}} for a in alt],
        },
        "expected": {
            "bobot": {k: float(v) for k, v in w.items()},
            "bobot_pecahan": {k: str(v) for k, v in w.items()},
            "normalisasi": {a["id"]: {k: float(norm[i][k]) for k, _ in KRIT} for i, a in enumerate(alt)},
            "normalisasi_pecahan": {a["id"]: {k: str(norm[i][k]) for k, _ in KRIT} for i, a in enumerate(alt)},
            "skor_saw": {a["id"]: float(saw[i]) for i, a in enumerate(alt)},
            "skor_saw_pecahan": {a["id"]: str(saw[i]) for i, a in enumerate(alt)},
            "skor_topsis_minmax": {a["id"]: t_mm[i] for i, a in enumerate(alt)},
            "skor_topsis_vektor": {a["id"]: t_vk[i] for i, a in enumerate(alt)},
            "rank": rank,
            "urutan_id": sorted(rank, key=rank.get),
        },
    }


def main():
    golden = {
        "versi": 1,
        "catatan": [
            "Dibuat oleh audit/golden_test.py. Pakai sebagai test saat porting ke TypeScript.",
            "Bobot rank-sum: w_r = 2(n-r+1)/(n(n+1)), r=1 paling penting.",
            "Min-max dihitung atas kandidat yang lolos filter; cost=(max-x)/(max-min), "
            "benefit=(x-min)/(max-min); max==min -> 1.",
            "SAW = sum w_j * r_ij. TOPSIS min-max = varian model teman (di atas matriks min-max). "
            "TOPSIS vektor = TOPSIS standar Hwang & Yoon (r = x / sqrt(sum x^2)) di atas nilai mentah.",
            "Ranking: SAW desc -> TOPSIS min-max desc -> harga asc -> id asc; bandingkan skor "
            "dengan toleransi 1e-9 (round 9 desimal). Toleransi cek angka: 1e-9.",
        ],
        "kasus": {nama: ke_json(nama, k) for nama, k in KASUS.items()},
    }
    out = AUDIT / "golden_test.json"
    out.write_text(json.dumps(golden, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"tulis {out}")

    # ---------- verifikasi implementasi independen
    ok_all = True
    for nama, g in golden["kasus"].items():
        inp, exp = g["input"], g["expected"]
        krit = [(k["kode"], k["jenis"]) for k in inp["kriteria"]]
        alt = [{"id": a["id"], "harga": a["nilai"]["K1"], "nilai": a["nilai"]} for a in inp["alternatif"]]
        w = ind.bobot_rank_sum(inp["urutan_kriteria"], krit)
        norm = ind.normalisasi_minmax(alt, krit)
        s = ind.saw(norm, w)
        tm = ind.topsis_minmax(norm, w)
        tv = ind.topsis_vektor(alt, krit, w)
        idx, rank = ind.ranking(alt, s, tm)
        cek = [
            all(abs(w[k] - exp["bobot"][k]) < 1e-9 for k in w),
            all(abs(s[i] - exp["skor_saw"][a["id"]]) < 1e-9 for i, a in enumerate(alt)),
            all(abs(tm[i] - exp["skor_topsis_minmax"][a["id"]]) < 1e-9 for i, a in enumerate(alt)),
            all(abs(tv[i] - exp["skor_topsis_vektor"][a["id"]]) < 1e-9 for i, a in enumerate(alt)),
            [alt[i]["id"] for i in idx] == exp["urutan_id"],
        ]
        ok_all &= all(cek)
        print(f"[independen] {nama:14s} bobot/saw/topsis_mm/topsis_vk/urutan = {cek}")
        print(f"   SAW={ {a['id']: round(s[i], 6) for i, a in enumerate(alt)} } "
              f"TOPSISmm={ {a['id']: round(tm[i], 6) for i, a in enumerate(alt)} } "
              f"TOPSISvk={ {a['id']: round(tv[i], 6) for i, a in enumerate(alt)} } urutan={exp['urutan_id']}")
        if nama == "seri_saw":
            print(f"   SAW mentah float (bukti galat floating point): {[repr(x) for x in s]}")

    # ---------- verifikasi fungsi milik teman (tanpa mengubah file)
    import numpy as np
    import pandas as pd
    sys.path.insert(0, str(AUDIT.parent))
    import model_dss as m
    m.KRITERIA_COLS = ["K1", "K2", "K3"]
    m.COST_COLS = ["K1", "K2"]
    m.BENEFIT_COLS = ["K3"]
    for nama, g in golden["kasus"].items():
        inp, exp = g["input"], g["expected"]
        df = pd.DataFrame([{**a["nilai"]} for a in inp["alternatif"]])
        w = exp["bobot"]  # hitung_bobot_ranksum teman menolak n != 8, jadi bobot diambil dari golden
        try:
            m.hitung_bobot_ranksum(inp["urutan_kriteria"])
            pesan_bobot = "diterima"
        except ValueError as e:
            pesan_bobot = f"DITOLAK ({e})"
        nd = m.normalisasi_minmax(df)
        s = m.hitung_saw(nd, w)
        t = m.hitung_topsis(nd, w)
        ids = [a["id"] for a in inp["alternatif"]]
        cs = bool(np.allclose(s, [exp["skor_saw"][i] for i in ids], atol=1e-9))
        ct = bool(np.allclose(t, [exp["skor_topsis_minmax"][i] for i in ids], atol=1e-9))
        print(f"[teman]      {nama:14s} SAW cocok={cs} TOPSIS(min-max) cocok={ct}; "
              f"hitung_bobot_ranksum(n=3) {pesan_bobot[:60]}")
        ok_all &= cs and ct
    print("SEMUA COCOK" if ok_all else "ADA YANG BEDA")


if __name__ == "__main__":
    main()
