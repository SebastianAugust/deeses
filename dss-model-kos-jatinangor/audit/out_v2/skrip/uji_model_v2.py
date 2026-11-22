"""
Uji model_dss.py (versi sekarang, TIDAK diubah) + bandingkan dengan dss_exact.py.
Jalankan:  audit\\.venv\\Scripts\\python audit\\out_v2\\skrip\\uji_model_v2.py
Output: out_v2/uji_model_v2.txt
"""
from __future__ import annotations
import sys
sys.dont_write_bytecode = True
import inspect, json, random, itertools, math
from pathlib import Path
import numpy as np, pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]            # dss-model-kos-jatinangor
OUT = HERE.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(HERE))
import model_dss as m            # noqa: E402  (file teman, hanya dibaca/diimpor)
import dss_exact as ex           # noqa: E402

DF = pd.read_csv(ROOT / "kos_scored.csv")
buf: list[str] = []
def p(*a):
    s = " ".join(str(x) for x in a); print(s); buf.append(s)
def h(t): p("\n" + "=" * 78 + f"\n{t}\n" + "=" * 78)

# kode app -> (kolom model/CSV, jenis). Sumber: src/config/kriteria.ts + KATALOG_KRITERIA model.
APP = {
    "harga": ("harga", "cost"), "listrik": ("termasuk_listrik", "benefit"),
    "bayar_bulanan": ("pembayaran_per_bulan", "benefit"), "bayar_tahunan": ("pembayaran_per_tahun", "benefit"),
    "jarak_kampus": ("C2", "cost"), "jarak_unpad": ("jarak_unpad_km", "cost"), "jarak_itb": ("jarak_itb_km", "cost"),
    "luas": ("luas_kamar_m2", "benefit"), "km_dalam": ("k_mandi_dalam", "benefit"), "ac": ("ac", "benefit"),
    "jendela": ("jendela", "benefit"), "tv": ("tv", "benefit"), "shower": ("shower", "benefit"),
    "air_panas": ("air_panas", "benefit"), "kloset_duduk": ("kloset_duduk", "benefit"),
    "cctv": ("cctv", "benefit"), "penjaga": ("penjaga", "benefit"), "parkir_motor": ("parkir_motor_sepeda", "benefit"),
    "parkir_mobil": ("parkir_mobil", "benefit"), "wifi": ("wifi", "benefit"),
    "ruang_tamu": ("ruang_tamu", "benefit"), "ruang_jemur": ("ruang_jemur", "benefit"),
}
KODE = list(APP)

def kriteria_dari(kodes):
    return [{"kode": k, "jenis": APP[k][1], "kolom": APP[k][0]} for k in kodes]

def baris_dict(df):
    out = []
    for r in df.to_dict("records"):
        out.append({k: (None if (isinstance(v, float) and math.isnan(v)) else v) for k, v in r.items()})
    return out

BARIS = baris_dict(DF)

# ------------------------------------------------------------------ A. inspeksi statis
h("A. Inspeksi statis model_dss.py")
p("fungsi publik:", [n for n, o in inspect.getmembers(m, inspect.isfunction) if o.__module__ == "model_dss"])
p("signature rank_kos:", inspect.signature(m.rank_kos))
p("signature filter_kos:", inspect.signature(m.filter_kos))
p("'fasilitas_prioritas' ada di model_dss.py?:", "fasilitas_prioritas" in Path(ROOT / "model_dss.py").read_text(encoding="utf-8"))
p("KATALOG_KRITERIA:", len(m.KATALOG_KRITERIA), "entri; cost:", [k for k, v in m.KATALOG_KRITERIA.items() if v == "cost"])
p("alias ganda di katalog (satu data, dua nama):", [("harga", "C1"), ("jarak_unpad_km/jarak_itb_km", "C2=min"), ("luas_kamar_m2", "C4")])
p("kolom katalog yang SEMUA NaN di kos_scored.csv:", [c for c in m.KATALOG_KRITERIA if DF[c].isna().all()] or "tidak ada")
p("kolom C3,C5,C6,C7,C8 ada di katalog model?:", [c for c in ["C3", "C5", "C6", "C7", "C8"] if c in m.KATALOG_KRITERIA] or "tidak (benar)")

# ------------------------------------------------------------------ B. validasi input
h("B. Validasi input & kasus tepi")
def coba(label, fn):
    try:
        r = fn(); p(f"{label}: OK ->", r)
    except Exception as e:
        p(f"{label}: {type(e).__name__}: {e}")
KR = ["harga", "C2", "luas_kamar_m2"]
coba("budget=None", lambda: len(m.filter_kos(DF, None, "putri")))
coba("budget=0", lambda: len(m.filter_kos(DF, 0, "putri")))
coba("budget=-5", lambda: len(m.filter_kos(DF, -5, "putri")))
coba("tipe=''", lambda: len(m.filter_kos(DF, 1_000_000, "")))
coba("tipe=None", lambda: len(m.filter_kos(DF, 1_000_000, None)))
coba("tipe='perempuan'", lambda: len(m.filter_kos(DF, 1_000_000, "perempuan")))
coba("tipe='laki-laki'", lambda: len(m.filter_kos(DF, 1_000_000, "laki-laki")))
coba("tipe='Putri ' (spasi/kapital)", lambda: len(m.filter_kos(DF, 1_000_000, "Putri ")))
coba("tipe='xyz'", lambda: len(m.filter_kos(DF, 1_000_000, "xyz")))
coba("F3 ['kamar mandi dalam']", lambda: len(m.filter_kos(DF, 1_000_000, "putri", ["kamar mandi dalam"])))
coba("F3 ['wifii']", lambda: len(m.filter_kos(DF, 1_000_000, "putri", ["wifii"])))
coba("F3 ['harga']", lambda: len(m.filter_kos(DF, 1_000_000, "putri", ["harga"])))
coba("F3 ['k_mandi_dalam','ac']", lambda: len(m.filter_kos(DF, 1_000_000, "putri", ["k_mandi_dalam", "ac"])))
coba("F3 ['AC']  (kapital)", lambda: len(m.filter_kos(DF, 1_000_000, "putri", ["AC"])))
n_ex = len(m.filter_kos(DF, 1_000_000, "putri", allow_campur=False)); n_inc = len(m.filter_kos(DF, 1_000_000, "putri", allow_campur=True))
p(f"allow_campur putri<=1jt: False={n_ex}, True={n_inc}")
r_ex = m.rank_kos(DF, 1_000_000, "putri", ["harga", "C2"], allow_campur=False)["total_kandidat"]
r_inc = m.rank_kos(DF, 1_000_000, "putri", ["harga", "C2"], allow_campur=True)["total_kandidat"]
p(f"allow_campur diteruskan lewat rank_kos: False={r_ex}, True={r_inc} -> {'YA' if r_inc > r_ex else 'TIDAK'}")
coba("urutan [] ", lambda: m.hitung_bobot_ranksum([]))
coba("urutan duplikat", lambda: m.hitung_bobot_ranksum(["harga", "harga"]))
coba("kriteria 'C3'", lambda: m.hitung_bobot_ranksum(["C3"]))
coba("kriteria 'alamat'", lambda: m.hitung_bobot_ranksum(["alamat"]))
coba("kriteria 'harga','C1' (alias ganda, satu data dihitung dua kali)", lambda: m.hitung_bobot_ranksum(["harga", "C1"]))
coba("kriteria 'C2','jarak_unpad_km','jarak_itb_km' (min + dua komponennya)", lambda: m.hitung_bobot_ranksum(["C2", "jarak_unpad_km", "jarak_itb_km"]))
coba("kriteria huruf kecil 'c1'", lambda: m.hitung_bobot_ranksum(["c1"]))

# ------------------------------------------------------------------ C. bobot dinamis
h("C. Bobot rank-sum dinamis (n = jumlah terpasang)")
viable = ["harga", "jarak_kampus", "luas", "km_dalam", "ac", "air_panas", "shower", "wifi", "cctv", "penjaga", "parkir_motor", "ruang_jemur"]
ok_bobot = True
for n in (1, 2, 3, 4, 8, 12):
    kol = [APP[k][0] for k in viable[:n]]
    b = m.hitung_bobot_ranksum(kol)
    exact = ex.bobot_rank_sum(n)
    s = sum(b.values())
    beda = max(abs(b[kol[i]] - float(exact[i])) for i in range(n))
    ok = abs(s - 1) < 1e-12 and beda < 1e-12 and (n != 1 or b[kol[0]] == 1.0)
    ok_bobot &= ok
    out = m.rank_kos(DF, 1_500_000, "putri", kol)
    s_out = sum(out["bobot"].values())
    p(f"n={n:>2}: jumlah bobot={s:.15f}; maks selisih vs eksak={beda:.1e}; bobot di output rank_kos (dibulatkan 4 desimal) jumlah={s_out:.4f}; {'OK' if ok else 'GAGAL'}")
p("n=12 bobot:", [round(v, 6) for v in m.hitung_bobot_ranksum([APP[k][0] for k in viable]).values()])
p("SEMUA n lulus:", ok_bobot)

# ------------------------------------------------------------------ D. perbandingan dengan mesin eksak
h("D. Model vs mesin independen (Decimal 60 digit): grid skenario")
BUDGETS = [800_000, 1_000_000, 1_200_000, 1_500_000, 2_000_000, 3_500_000]
TIPES = ["putra", "putri", "campur"]
rng = random.Random(42)
UKURAN = [1, 2, 3, 4, 6, 8, 10, 12]

def model_internal(df, budget, tipe, kolom, campur):
    """Panggil fungsi model langkah demi langkah (sama dengan isi rank_kos) untuk nilai mentah."""
    bobot = m.hitung_bobot_ranksum(kolom)
    kand = m.filter_kos(df, budget, tipe, allow_campur=campur).dropna(subset=kolom).reset_index(drop=True)
    if kand.empty:
        return kand, None, None, bobot
    norm = m.normalisasi_minmax(kand, kolom)
    return kand, m.hitung_saw(norm, bobot, kolom), m.hitung_topsis_minmax(norm, bobot, kolom), bobot

stat = dict(skenario=0, cocok_jumlah=0, maks_saw=0.0, maks_top=0.0, maks_norm=0.0, urutan_beda=0, rank_beda=0,
            spearman_maks=0.0, spearman_n=0, json_ok=0, rank_unik_ok=0, urutan_beda_id_str=0, tie_penuh=0, kosong_spearman_null=0)
beda_urut, beda_spear = [], []
for budget, tipe in itertools.product(BUDGETS, TIPES):
    for ukuran in UKURAN:
        kodes = rng.sample(KODE, ukuran)
        kolom = [APP[k][0] for k in kodes]
        campur = tipe != "campur" and rng.random() < 0.5
        kand, s_m, t_m, bobot_m = model_internal(DF, budget, tipe, kolom, campur)
        res = ex.hitung(BARIS, budget, tipe, kriteria_dari(kodes), campur)
        stat["skenario"] += 1
        if len(kand) != len(res["lengkap"]):
            continue
        stat["cocok_jumlah"] += 1
        if len(kand) == 0:
            continue
        # urutan input sama? (filter_kos mempertahankan urutan baris CSV)
        assert [int(i) for i in kand["id"]] == [b["id"] for b in res["lengkap"]]
        stat["maks_saw"] = max(stat["maks_saw"], max(abs(float(res["saw"][i]) - s_m[i]) for i in range(len(kand))))
        stat["maks_top"] = max(stat["maks_top"], max(abs(float(res["topsis"][i]) - t_m[i]) for i in range(len(kand))))
        out = m.rank_kos(DF, budget, tipe, kolom, allow_campur=campur)
        ids_model = [int(r["id"]) for r in out["hasil"]]
        ranks = [r["rank"] for r in out["hasil"]]
        stat["rank_unik_ok"] += int(ranks == list(range(1, len(ranks) + 1)))
        ids_exact = [res["lengkap"][i]["id"] for i in res["urut_saw"]]
        if ids_model != ids_exact:
            stat["urutan_beda"] += 1
            # cari posisi pertama yang beda + selisih skor mentah di sana
            pos = next(i for i, (a, b) in enumerate(zip(ids_model, ids_exact)) if a != b)
            saw_by_id = {int(i): float(s_m[k]) for k, i in enumerate(kand["id"])}
            selisih = abs(saw_by_id[ids_model[pos]] - saw_by_id[ids_exact[pos]])
            stat.setdefault("beda_akibat_noise_float", 0)
            stat["beda_akibat_noise_float"] += int(selisih < 1e-9)
            beda_urut.append((budget, tipe, kodes, campur, f"posisi {pos + 1}", ids_model[pos], ids_exact[pos], f"|selisih SAW mentah|={selisih:.2e}"))
        # skor bulat 4 desimal vs eksak
        by_id = {int(r["id"]): r for r in out["hasil"]}
        for i, b in enumerate(res["lengkap"]):
            stat["maks_norm"] = max(stat["maks_norm"], abs(by_id[b["id"]]["skor_saw"] - float(res["saw"][i])))
        # id sebagai string (cara TS membandingkan) -> apakah urutan penuh-seri berubah?
        idx_str = sorted(range(len(res["lengkap"])), key=lambda i: (-ex.r9(res["saw"][i]), -ex.r9(res["topsis"][i]),
                         ex.D(res["lengkap"][i]["harga"]), str(res["lengkap"][i]["id"])))
        if idx_str != res["urut_saw"]:
            stat["urutan_beda_id_str"] += 1
        # tie penuh = dua kandidat SAW, TOPSIS, harga sama persis di 9 desimal
        kunci = {}
        for i, b in enumerate(res["lengkap"]):
            kunci.setdefault((ex.r9(res["saw"][i]), ex.r9(res["topsis"][i]), ex.D(b["harga"])), 0)
            kunci[(ex.r9(res["saw"][i]), ex.r9(res["topsis"][i]), ex.D(b["harga"]))] += 1
        if any(v > 1 for v in kunci.values()):
            stat["tie_penuh"] += 1
        # spearman
        sp_m = out["spearman"]["rho"] if out["spearman"] else None
        sp_e = None if res["spearman"] is None else float(res["spearman"])
        if (sp_m is None) != (sp_e is None):
            beda_spear.append((budget, tipe, kodes, sp_m, sp_e, len(kand)))
        elif sp_m is not None:
            d = abs(sp_m - sp_e); stat["spearman_n"] += 1
            stat["spearman_maks"] = max(stat["spearman_maks"], d)
            if d > 1e-3:
                beda_spear.append((budget, tipe, kodes, sp_m, sp_e, len(kand)))
        try:
            json.dumps(out, allow_nan=False); stat["json_ok"] += 1
        except ValueError:
            pass
p("hasil agregat:", json.dumps({k: (round(v, 12) if isinstance(v, float) else v) for k, v in stat.items()}))
p(f"-> skenario: {stat['skenario']}; jumlah kandidat sama: {stat['cocok_jumlah']}; JSON valid (allow_nan=False): {stat['json_ok']}; rank unik 1..n: {stat['rank_unik_ok']}")
p(f"-> maks |SAW model - SAW eksak| (mentah float) = {stat['maks_saw']:.2e}; TOPSIS = {stat['maks_top']:.2e}; skor 4 desimal vs eksak = {stat['maks_norm']:.2e}")
p(f"-> urutan id BEDA antara model (sort float mentah) dan mesin eksak (round 9 desimal): {stat['urutan_beda']} skenario")
for b in beda_urut[:6]:
    p("   contoh:", b)
p(f"-> skenario dgn seri penuh (SAW, TOPSIS, harga sama): {stat['tie_penuh']}; di antaranya urutan berubah bila id dibanding sbg STRING (TS) vs ANGKA (Python/eksak): {stat['urutan_beda_id_str']}")
p(f"-> Spearman: maks selisih = {stat['spearman_maks']:.2e} (n={stat['spearman_n']}); skenario Spearman beda lebih dari 1e-3 / null tak cocok: {len(beda_spear)}")
for b in beda_spear[:6]:
    p("   contoh:", b)

# ------------------------------------------------------------------ E. seri floating point (bukti T04 sisa)
h("E. Seri floating point: apakah sort pada skor mentah stabil lintas bahasa?")
hit = 0; contoh = []
for budget, tipe in itertools.product(BUDGETS, TIPES):
    for ukuran in (2, 4, 8):
        kodes = rng.sample(KODE, ukuran); kolom = [APP[k][0] for k in kodes]
        kand, s_m, t_m, _ = model_internal(DF, budget, tipe, kolom, False)
        if kand.empty:
            continue
        s_sorted = np.sort(s_m)
        dif = np.diff(s_sorted)
        near = int(((dif > 0) & (dif < 1e-9)).sum())
        if near:
            hit += 1
            if len(contoh) < 3:
                contoh.append((budget, tipe, kodes, near, float(dif[(dif > 0) & (dif < 1e-9)].min())))
p(f"skenario dengan pasangan SAW 'hampir sama tapi tidak identik' (0 < selisih < 1e-9) pada skor mentah float: {hit}")
for c in contoh:
    p("   contoh:", c)

# ------------------------------------------------------------------ F. Spearman null / tepi
h("F. Kasus tepi Spearman, 0/1/2 kandidat, kolom konstan")
def n_kand(tipe, budget):
    return len(m.filter_kos(DF, budget, tipe))
for tipe, bud in [("campur", 300_000), ("putri", 500_000), ("putri", 550_000), ("putra", 500_000)]:
    out = m.rank_kos(DF, bud, tipe, ["harga", "C2", "luas_kamar_m2"])
    p(f"{tipe} <= {bud:,}: kandidat={out['total_kandidat']} spearman={out['spearman']} "
      f"skor_saw={[r['skor_saw'] for r in out['hasil']]} json_ok={bool(json.dumps(out, allow_nan=False))}")
konst = DF[(DF.tipe_penghuni == "putra")].head(5).copy(); konst["id"] = [901, 902, 903, 904, 905]
for c in ["wifi", "harga", "luas_kamar_m2", "C2"]:
    konst[c] = konst[c].iloc[0]
out = m.rank_kos(konst, 10_000_000, "putra", ["wifi", "harga"])
p(f"5 kos identik: spearman={out['spearman']} skor_saw={[r['skor_saw'] for r in out['hasil']]} rank={[r['rank'] for r in out['hasil']]} (urut id naik bila semua seri)")
# nilai kosong di kriteria terpasang
nk = DF.copy(); nk.loc[nk.index[:10], "jarak_itb_km"] = np.nan
out = m.rank_kos(nk, 3_500_000, "putri", ["harga", "jarak_itb_km"])
p(f"10 baris jarak_itb_km dikosongkan: jumlah_tanpa_data={out['jumlah_tanpa_data']} (per-kriteria tidak dilaporkan; kunci output = {sorted(out)})")

# ------------------------------------------------------------------ G. subset kriteria arbitrer
h("G. Subset kriteria arbitrer lewat rank_kos (n = 1, 2, 4, 12)")
for n in (1, 2, 4, 12):
    kodes = viable[:n]; kolom = [APP[k][0] for k in kodes]
    out = m.rank_kos(DF, 2_000_000, "putra", kolom)
    top = out["hasil"][0]
    p(f"n={n:>2}: kandidat={out['total_kandidat']} tanpa_data={out['jumlah_tanpa_data']} sum(bobot)={sum(out['bobot'].values()):.4f} "
      f"spearman={out['spearman']} #1={top['nama']} SAW={top['skor_saw']} TOPSIS={top['skor_topsis']} kunci_skor_kriteria={len(top['skor_kriteria'])}")
(OUT / "uji_model_v2.txt").write_text("\n".join(buf), encoding="utf-8")
