"""
Membuat out_v2/golden_dinamis.json dari mesin INDEPENDEN (dss_exact.py, Decimal 60 digit)
lalu membandingkannya dengan model_dss.py (hanya dipanggil, tidak diubah).
Jalankan:  audit\\.venv\\Scripts\\python audit\\out_v2\\skrip\\golden_dinamis_v2.py
Output: out_v2/golden_dinamis.json dan out_v2/golden_vs_model_v2.txt
"""
from __future__ import annotations
import sys
sys.dont_write_bytecode = True
import json, math
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction
from pathlib import Path
import numpy as np, pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]; OUT = HERE.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(HERE))
import model_dss as m   # noqa: E402
import dss_exact as ex  # noqa: E402

APP = {  # kode app (src/config/kriteria.ts) -> (kolom CSV/model, jenis)
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

DF = pd.read_csv(ROOT / "kos_scored.csv")
def baris(df):
    return [{k: (None if (isinstance(v, float) and math.isnan(v)) else v) for k, v in r.items()} for r in df.to_dict("records")]

def f(x):  # Decimal -> float (nilai tanpa pembulatan)
    return None if x is None else float(x)
def d4(x):  # Decimal -> float 4 desimal (setengah ke atas, sama seperti Math.round di TS)
    return None if x is None else float(x.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP))

SET8 = ["harga", "jarak_kampus", "luas", "km_dalam", "ac", "wifi", "cctv", "penjaga"]
SET12 = ["harga", "jarak_kampus", "luas", "km_dalam", "ac", "air_panas", "shower", "wifi", "cctv", "penjaga", "parkir_motor", "ruang_jemur"]

# kolom konstan: cari (tipe,budget) dengan >=5 kandidat dan satu kolom biner konstan
def cari_konstan():
    for t in ("putra", "putri", "campur"):
        for b in range(500_000, 1_200_001, 50_000):
            d = DF[(DF.tipe_penghuni == t) & (DF.harga <= b)]
            if len(d) >= 5:
                for c, kode in [("parkir_motor_sepeda", "parkir_motor"), ("wifi", "wifi"), ("jendela", "jendela"), ("penjaga", "penjaga")]:
                    if d[c].nunique() == 1:
                        return b, t, kode
    return None
kons = cari_konstan()

SKENARIO = [
    ("n01_harga", "n = 1: bobot 1. Skor kriteria = min-max harga; SAW = skor kriteria.", 1_000_000, "putri", False, ["harga"], []),
    ("n02_jarak_luas", "n = 2: bobot 2/3 dan 1/3; skor kriteria hanya 0..1.", 1_500_000, "putra", False, ["jarak_kampus", "luas"], []),
    ("n02_seri_banyak", "n = 2 kriteria biner: banyak kos seri penuh (SAW, TOPSIS, harga) -> pemutus id NUMERIK.", 1_500_000, "campur", False, ["wifi", "parkir_motor"], []),
    ("n03_satu_kandidat", "1 kandidat: skor 1, Spearman null.", 500_000, "putri", False, ["harga", "km_dalam", "wifi"], []),
    ("n03_dua_kandidat", "2 kandidat: Spearman null (n < 3).", 550_000, "putri", False, ["harga", "km_dalam", "wifi"], []),
    ("n03_nol_kandidat", "0 kandidat (budget di bawah harga termurah).", 300_000, "campur", False, ["harga", "km_dalam", "wifi"], []),
    ("n04_default_app", "n = 4: rakitan awal app (harga, jarak_kampus, luas, cctv).", 1_200_000, "putri", False, ["harga", "jarak_kampus", "luas", "cctv"], []),
    ("n04_nilai_kosong", "n = 4 dengan nilai kosong DISUNTIKKAN (lihat override_nilai) -> kandidat dikecualikan, tanpa imputasi.", 1_500_000, "putri", False, ["harga", "jarak_itb", "ac", "km_dalam"], "KOSONG"),
    ("n08_campur_ikut", "n = 8, F2 dengan ikutkan_campur = true (putri + campur).", 1_500_000, "putri", True, SET8, []),
    ("n12_penuh", "n = 12 (maksimum katalog app): bobot 12/78 ... 1/78... = 2(13-r)/156.", 2_000_000, "putra", False, SET12, []),
]
if kons:
    b, t, kode = kons
    SKENARIO.append(("n03_kolom_konstan", f"Kolom '{kode}' konstan di antara kandidat -> semua skor kriteria 1 (max = min).", b, t, False, ["harga", kode, "luas"], []))

golden = {
    "sumber": "audit/out_v2/skrip/golden_dinamis_v2.py (mesin independen dss_exact.py, Decimal 60 digit); data: dss-model-kos-jatinangor/kos_scored.csv (357 baris) saat audit v2",
    "toleransi_tanpa_pembulatan": 1e-9,
    "toleransi_4_desimal": 1e-4,
    "aturan": {
        "F1": "harga <= budget",
        "F2": "tipe sama persis; bila ikutkan_campur dan tipe putra/putri maka kos campur ikut",
        "nilai_kosong": "kandidat yang kosong di >= 1 kriteria terpasang dikecualikan (tanpa imputasi); tanpa_data_per_kriteria menghitung per kriteria, jumlah_tanpa_data menghitung kos satu kali",
        "bobot": "rank-sum w_r = 2(n-r+1)/(n(n+1)), n = jumlah kriteria terpasang; n=1 -> 1",
        "normalisasi": "min-max atas kandidat berdata lengkap; cost (max-x)/(max-min); benefit (x-min)/(max-min); max=min -> 1",
        "saw": "sum_j w_j r_ij",
        "topsis": "TOPSIS atas matriks min-max (varian proyek, BUKAN normalisasi vektor): v=w*r; ideal+ = max kolom, ideal- = min kolom; C=d-/(d+ + d-); 1 kandidat -> 1; d+ + d- = 0 -> 1",
        "rank": "SAW turun -> TOPSIS turun -> harga naik -> id naik NUMERIK; skor dibandingkan setelah dibulatkan 9 desimal; rank unik 1..n",
        "rank_topsis": "TOPSIS turun -> SAW turun -> harga naik -> id naik NUMERIK (9 desimal)",
        "spearman": "Pearson atas rank rata-rata dari skor SAW dan TOPSIS yang dibulatkan 9 desimal; null bila n < 3 atau salah satu skor konstan",
        "pembulatan_tampilan": "4 desimal, setengah ke atas; hanya untuk tampilan",
    },
    "catatan": [
        "id kos adalah ANGKA (integer). Pemutus seri terakhir membandingkan id sebagai angka, bukan string (contoh: 649566 < 10145377 secara numerik, tetapi '10145377' < '649566' secara leksikografis).",
        "Nilai 'tanpa pembulatan' berasal dari aritmetika eksak lalu diubah ke float; implementasi float biasa akan berbeda ~1e-16.",
    ],
    "skenario": {},
}

ringkas = []
for sid, ket, budget, tipe, ikut, kodes, override in SKENARIO:
    kriteria = [{"kode": k, "jenis": APP[k][1], "kolom": APP[k][0]} for k in kodes]
    data = baris(DF)
    df_m = DF.copy()
    ov_out = []
    if override == "KOSONG":
        lolos = ex.filter_f1_f2(data, budget, tipe, ikut)
        ids = sorted(b["id"] for b in lolos)[:5]
        spec = [(ids[0], "jarak_itb_km"), (ids[1], "jarak_itb_km"), (ids[2], "jarak_itb_km"), (ids[3], "jarak_itb_km"),
                (ids[4], "ac"), (ids[1], "ac")]  # ids[1] kosong di dua kriteria
        for i, kolom in spec:
            for b in data:
                if b["id"] == i:
                    b[kolom] = None
            df_m.loc[df_m.id == i, kolom] = np.nan
            ov_out.append({"id": i, "kolom": kolom, "nilai": None})
    res = ex.hitung(data, budget, tipe, kriteria, ikut)
    lolos_ids = [b["id"] for b in res["lolos"]]
    kosong_info = [{"id": b["id"], "kode_kosong": [k["kode"] for k in kriteria if b.get(k["kolom"]) is None]} for b in res["kosong"]]
    per_krit = {k["kode"]: sum(1 for b in res["kosong"] if b.get(k["kolom"]) is None) for k in kriteria}
    w = res["bobot"]; n = len(kriteria)
    bobot = {k["kode"]: f(w[i]) for i, k in enumerate(kriteria)}
    pecahan = {k["kode"]: str(Fraction(2 * (n - (i + 1) + 1), n * (n + 1))) for i, k in enumerate(kriteria)}
    hasil = []
    for pos in res["urut_saw"]:
        b = res["lengkap"][pos]
        hasil.append({
            "id": b["id"], "rank": res["rank_saw"][pos], "rank_topsis": res["rank_topsis"][pos],
            "skor_saw": f(res["saw"][pos]), "skor_saw_4dp": d4(res["saw"][pos]),
            "skor_topsis": f(res["topsis"][pos]), "skor_topsis_4dp": d4(res["topsis"][pos]),
            "skor_kriteria": {k["kode"]: f(res["norm"][pos][j]) for j, k in enumerate(kriteria)},
            "skor_kriteria_4dp": {k["kode"]: d4(res["norm"][pos][j]) for j, k in enumerate(kriteria)},
        })
    sp = res["spearman"]
    # uji pemutus id numerik vs string
    idx_str = sorted(range(len(res["lengkap"])), key=lambda i: (-ex.r9(res["saw"][i]), -ex.r9(res["topsis"][i]),
                     ex.D(res["lengkap"][i]["harga"]), str(res["lengkap"][i]["id"])))
    id_numerik_menentukan = bool(res["lengkap"]) and idx_str != res["urut_saw"]
    golden["skenario"][sid] = {
        "keterangan": ket,
        "masukan": {"budget": budget, "tipe": tipe, "ikutkan_campur": ikut},
        "kriteria": kriteria,
        "bobot": bobot, "bobot_pecahan": pecahan,
        "override_nilai": ov_out,
        "kandidat_lolos_filter": lolos_ids,
        "dikecualikan_nilai_kosong": kosong_info,
        "jumlah_tanpa_data": len(kosong_info),
        "tanpa_data_per_kriteria": per_krit,
        "baris_kandidat": [{"id": b["id"], "tipe": b["tipe_penghuni"], "harga": b["harga"],
                            "nilai": {k["kode"]: b.get(k["kolom"]) for k in kriteria}} for b in res["lolos"]],
        "hasil": hasil,
        "spearman": f(sp), "spearman_4dp": d4(sp),
        "pemutus_id_numerik_menentukan_urutan": id_numerik_menentukan,
    }

    # ----------------- bandingkan dengan model_dss.py
    kolom = [k["kolom"] for k in kriteria]
    out = m.rank_kos(df_m, budget, tipe, kolom, allow_campur=ikut)
    ids_m = [int(r["id"]) for r in out["hasil"]]
    ids_g = [h["id"] for h in hasil]
    selisih = 0.0
    g_by = {h["id"]: h for h in hasil}
    for r in out["hasil"]:
        g = g_by.get(int(r["id"]))
        if g:
            selisih = max(selisih, abs(r["skor_saw"] - g["skor_saw_4dp"]), abs(r["skor_topsis"] - g["skor_topsis_4dp"]),
                          *[abs(r["skor_kriteria"][APP[k][0]] - g["skor_kriteria_4dp"][k]) for k in kodes])
    sp_m = out["spearman"]["rho"] if out["spearman"] else None
    sp_e = d4(sp)
    sp_ok = (sp_m is None and sp_e is None) or (sp_m is not None and sp_e is not None and abs(sp_m - sp_e) <= 1e-4)
    ringkas.append((sid, len(lolos_ids), len(hasil), out["total_kandidat"], out["jumlah_tanpa_data"], len(kosong_info),
                    ids_m == ids_g, selisih, sp_m, sp_e, sp_ok, id_numerik_menentukan))
    golden["skenario"][sid]["model_dss_py"] = {
        "jumlah_kandidat_sama": out["total_kandidat"] == len(hasil), "jumlah_tanpa_data_sama": out["jumlah_tanpa_data"] == len(kosong_info),
        "urutan_id_sama": ids_m == ids_g, "maks_selisih_skor_4dp": round(selisih, 6), "spearman_model": sp_m, "spearman_cocok": sp_ok,
    }

(OUT / "golden_dinamis.json").write_text(json.dumps(golden, indent=1, ensure_ascii=False), encoding="utf-8")
buf = ["skenario | lolos | hasil | model.total | model.tanpa_data | golden.tanpa_data | urutan_id_sama | maks_selisih_4dp | spearman(model) | spearman(golden) | cocok | id_numerik_menentukan"]
for r in ringkas:
    buf.append(" | ".join(str(x) for x in r))
buf.append(f"\nskenario kolom_konstan dibuat: {bool(kons)} {kons}")
(OUT / "golden_vs_model_v2.txt").write_text("\n".join(buf), encoding="utf-8")
print("\n".join(buf))
print("ukuran golden_dinamis.json:", (OUT / "golden_dinamis.json").stat().st_size, "byte")
