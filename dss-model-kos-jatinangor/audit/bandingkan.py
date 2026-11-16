"""
Bandingkan rank_kos() milik teman vs implementasi independen (dss_independen.py)
di banyak skenario, plus uji kasus tepi. Tidak mengubah file teman.
Jalankan:  audit\\.venv\\Scripts\\python audit\\bandingkan.py  (output juga ke audit/out/bandingkan.txt)
"""
from __future__ import annotations

import sys as _sys

_sys.dont_write_bytecode = True  # jangan buat __pycache__ di folder teman

import io
import random
import sys
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np
import pandas as pd

AUDIT = Path(__file__).resolve().parent
ROOT = AUDIT.parent
sys.path.insert(0, str(AUDIT))
sys.path.insert(0, str(ROOT))
import dss_independen as ind  # noqa: E402
import model_dss as m  # noqa: E402

DF = pd.read_csv(ROOT / "kos_scored.csv")
BARIS = DF.to_dict("records")
KODE = [f"C{i}" for i in range(1, 9)]


def urutan_uji():
    rnd = random.Random(42)
    acak = []
    for _ in range(3):
        u = KODE[:]
        rnd.shuffle(u)
        acak.append(u)
    return {
        "default C1..C8": KODE[:],
        "terbalik C8..C1": KODE[::-1],
        "contoh teman": ["C5", "C1", "C2", "C6", "C4", "C3", "C7", "C8"],
        **{f"acak#{i + 1} {''.join(c[1] for c in u)}": u for i, u in enumerate(acak)},
    }


def bandingkan_skenario():
    print("=" * 78)
    print("A. rank_kos (teman) vs dss_independen - 6 budget x 3 tipe x 6 urutan")
    print("=" * 78)
    budgets = [800_000, 1_000_000, 1_200_000, 1_500_000, 2_000_000, 3_500_000]
    n_sken = 0
    maks = {"saw": 0.0, "topsis": 0.0, "kriteria": 0.0, "spearman": 0.0}
    beda_urutan = 0
    beda_top3, beda_bukan_seri = [], []
    seri_buatan = 0
    seri_contoh = []
    for b in budgets:
        for t in ["putra", "putri", "campur"]:
            for nama_u, u in urutan_uji().items():
                n_sken += 1
                rt = m.rank_kos(DF, budget=b, tipe=t, urutan_kriteria=u)
                ri = ind.peringkat(BARIS, b, t, u)
                assert rt["total_kandidat"] == len(ri["hasil"]), (b, t)
                if not ri["hasil"]:
                    continue
                ti = {h["id"]: h for h in rt["hasil"]}
                for h in ri["hasil"]:
                    x = ti[h["id"]]
                    maks["saw"] = max(maks["saw"], abs(x["skor_saw"] - h["skor_saw"]))
                    maks["topsis"] = max(maks["topsis"], abs(x["skor_topsis"] - h["skor_topsis"]))
                    for k in KODE:
                        maks["kriteria"] = max(maks["kriteria"], abs(x["skor_kriteria"][k] - h["skor_kriteria"][k]))
                if rt["spearman"] and ri["spearman_minmax"] is not None:
                    maks["spearman"] = max(maks["spearman"], abs(rt["spearman"]["rho"] - ri["spearman_minmax"]))
                # urutan id
                ut, ui = [h["id"] for h in rt["hasil"]], [h["id"] for h in ri["hasil"]]
                if ut != ui:
                    beda_urutan += 1
                    if ut[:3] != ui[:3]:
                        beda_top3.append((b, t, nama_u, ut[:3], ui[:3]))
                    # apakah semua posisi yang beda punya SAW (bulat 4 desimal) yang sama?
                    st = {h["id"]: h["skor_saw"] for h in rt["hasil"]}
                    for p_, (a_, b_) in enumerate(zip(ut, ui)):
                        if a_ != b_ and st[a_] != st[b_]:
                            beda_bukan_seri.append((b, t, nama_u, p_ + 1))
                            break
                # seri buatan: rank teman sama padahal SAW mentah beda
                ranks = {}
                for h in rt["hasil"]:
                    ranks.setdefault(h["rank"], []).append(h["id"])
                saw_mentah = {h["id"]: h["skor_saw"] for h in ri["hasil"]}
                for r, ids in ranks.items():
                    if len(ids) > 1:
                        vals = [saw_mentah[i] for i in ids]
                        if max(vals) - min(vals) > 1e-9:
                            seri_buatan += 1
                            if len(seri_contoh) < 3:
                                seri_contoh.append((b, t, nama_u, r, [(i, f"{saw_mentah[i]:.7f}") for i in ids]))
    print(f"jumlah skenario: {n_sken}")
    print(f"selisih maksimum |teman - independen|: SAW={maks['saw']:.2e}  TOPSIS={maks['topsis']:.2e}  "
          f"skor_kriteria={maks['kriteria']:.2e}  spearman rho={maks['spearman']:.2e}")
    print("  (teman membulatkan skor ke 4 desimal, jadi selisih <= 5e-5 = cocok)")
    print(f"skenario dengan urutan id berbeda: {beda_urutan} (top-3 berbeda: {len(beda_top3)}; "
          f"beda yang BUKAN karena SAW-bulat-sama: {len(beda_bukan_seri)})")
    for c in beda_top3[:3]:
        print("   top-3 beda:", c)
    for c in beda_bukan_seri[:3]:
        print("   beda bukan seri:", c)
    print(f"grup 'seri' di rank teman yang sebenarnya TIDAK seri (akibat round 4 desimal sebelum rank): {seri_buatan}")
    for c in seri_contoh:
        print("   contoh:", c)


def kasus_tepi():
    print("\n" + "=" * 78)
    print("B. Kasus tepi")
    print("=" * 78)
    u = KODE[:]
    # 0 kandidat
    r0 = m.rank_kos(DF, budget=300_000, tipe="putra", urutan_kriteria=u)
    print(f"0 kandidat (budget 300rb): total={r0['total_kandidat']} spearman={r0['spearman']} hasil={r0['hasil']}")
    # 1 kandidat: putri <= 500rb (cuma 1 kos), 2 kandidat: putri <= 550rb
    r1 = m.rank_kos(DF, budget=500_000, tipe="putri", urutan_kriteria=u)
    h = r1["hasil"][0] if r1["hasil"] else None
    print(f"1 kandidat (putri <= 500rb): total={r1['total_kandidat']} SAW={h and h['skor_saw']} "
          f"TOPSIS={h and h['skor_topsis']} skor_kriteria={h and h['skor_kriteria']} spearman={r1['spearman']}")
    r2 = m.rank_kos(DF, budget=550_000, tipe="putri", urutan_kriteria=u)
    print(f"2 kandidat (putri <= 550rb): total={r2['total_kandidat']} spearman={r2['spearman']} "
          f"skor={[(x['rank'], x['skor_saw'], x['skor_topsis'], x['skor_kriteria']) for x in r2['hasil']]}")
    from scipy.stats import spearmanr
    print(f"   scipy.spearmanr 2 titik [0.2,0.3]vs[0.1,0.4] -> {spearmanr([0.2, 0.3], [0.1, 0.4])}")
    # urutan tidak valid
    for salah in (KODE[:7], KODE[:7] + ["C1"], KODE + ["C9"], ["c1"] + KODE[1:]):
        try:
            m.rank_kos(DF, 1_000_000, "putri", salah)
            print(f"urutan {salah}: DITERIMA")
        except ValueError as e:
            print(f"urutan {salah}: ditolak -> {str(e)[:50]}…")
    # budget None / 0 / negatif
    for b in (None, 0, -5):
        r = m.rank_kos(DF, budget=b, tipe="putri", urutan_kriteria=u)
        print(f"budget={b!r}: F1 dilewati diam-diam, total={r['total_kandidat']} (semua putri = {(DF.tipe_penghuni == 'putri').sum()})")
    # tipe aneh
    for t in ("Putri ", "perempuan", "", None):
        r = m.rank_kos(DF, budget=1_000_000, tipe=t, urutan_kriteria=u)
        print(f"tipe={t!r}: total={r['total_kandidat']}")
    # F3 nama kolom
    base = m.rank_kos(DF, 1_500_000, "putri", u)["total_kandidat"]
    for wajib in (["ac"], ["AC "], ["kloset duduk"], ["kamar mandi dalam"], ["k mandi dalam"], ["wifii"], ["harga"]):
        r = m.rank_kos(DF, 1_500_000, "putri", u, fasilitas_wajib=wajib)
        print(f"fasilitas_wajib={wajib}: total={r['total_kandidat']} (tanpa F3: {base})")
    # allow_campur via rank_kos
    import inspect
    print("rank_kos punya parameter allow_campur?", "allow_campur" in inspect.signature(m.rank_kos).parameters)
    f_ex = m.filter_kos(DF, 1_000_000, "putri")
    f_cp = m.filter_kos(DF, 1_000_000, "putri", allow_campur=True)
    f_cc = m.filter_kos(DF, 1_000_000, "campur", allow_campur=True)
    print(f"filter_kos putri<=1jt: exact={len(f_ex)} allow_campur={len(f_cp)}; campur+allow_campur={len(f_cc)}")


def c5_dinamis():
    print("\n" + "=" * 78)
    print("C. fasilitas_prioritas menimpa C5")
    print("=" * 78)
    u = ["C5", "C1", "C2", "C6", "C4", "C3", "C7", "C8"]
    # User A dari main teman
    ra = m.rank_kos(DF, 1_500_000, "putri", u, fasilitas_wajib=["k_mandi_dalam", "ac"],
                    fasilitas_prioritas=["k_mandi_dalam", "ac"])
    c5 = {h["skor_kriteria"]["C5"] for h in ra["hasil"]}
    print(f"User A (wajib = prioritas = AC + WC dalam): n={ra['total_kandidat']}, nilai norm C5 unik = {c5}")
    print("  -> C5 (prioritas #1, bobot 22,2%) jadi konstan; semua SAW naik +0,2222, tidak membedakan apa pun.")
    saw_min = min(h["skor_saw"] for h in ra["hasil"])
    print(f"  SAW terendah di hasil User A = {saw_min} (>= 0,2222 hanya dari C5)")
    # independen: hitung ulang User A tanpa C5 override (C5 asli) untuk lihat beda
    rb = m.rank_kos(DF, 1_500_000, "putri", u, fasilitas_wajib=["k_mandi_dalam", "ac"])
    top_a = [h["nama"] for h in ra["hasil"][:3]]
    top_b = [h["nama"] for h in rb["hasil"][:3]]
    print(f"  top-3 dengan C5 dinamis: {top_a}")
    print(f"  top-3 dengan C5 asli    : {top_b}")
    # kolom bukan fasilitas diterima
    rx = m.rank_kos(DF, 1_500_000, "putri", u, fasilitas_prioritas=["harga"])
    print(f"fasilitas_prioritas=['harga'] diterima? C5 kandidat pertama jadi {rx['hasil'][0]['skor_kriteria']['C5']}"
          f" dan rank-1 = {rx['hasil'][0]['nama']} Rp{rx['hasil'][0]['harga']:,.0f}")
    rc = m.rank_kos(DF, 1_500_000, "putri", u, fasilitas_prioritas=["cctv", "penjaga"])
    print(f"fasilitas_prioritas=['cctv','penjaga'] (kolom C6) diterima -> C5 == C6 untuk tiap kos: "
          f"{all(h['skor_kriteria']['C5'] == h['skor_kriteria']['C6'] for h in rc['hasil'])} (dihitung ganda)")
    # verifikasi independen C5 override User B
    rb2 = m.rank_kos(DF, 1_500_000, "putri", u, fasilitas_wajib=["k_mandi_dalam"],
                     fasilitas_prioritas=["k_mandi_dalam", "wifi", "air_panas"])
    sub = [b for b in BARIS if b["harga"] <= 1_500_000 and b["tipe_penghuni"] == "putri" and b["k_mandi_dalam"] == 1]
    for b in sub:
        b = b  # salin nilai C5 baru ke salinan dict
    sub2 = [{**b, "C5": round((b["k_mandi_dalam"] + b["wifi"] + b["air_panas"]) / 3, 4)} for b in sub]
    ri = ind.peringkat(sub2, 1_500_000, "putri", u)
    ti = {h["id"]: h for h in rb2["hasil"]}
    d = max(abs(ti[h["id"]]["skor_saw"] - h["skor_saw"]) for h in ri["hasil"])
    print(f"User B diverifikasi independen: n={len(ri['hasil'])}, selisih SAW maks = {d:.2e}")


def main():
    buf = io.StringIO()
    with redirect_stdout(buf):
        bandingkan_skenario()
        kasus_tepi()
        c5_dinamis()
    teks = buf.getvalue()
    print(teks)
    (AUDIT / "out").mkdir(exist_ok=True)
    (AUDIT / "out" / "bandingkan.txt").write_text(teks, encoding="utf-8")


if __name__ == "__main__":
    main()
