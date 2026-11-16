"""
Audit kualitas data: xlsx (semua sheet) + kos_scored.csv + reproduksi prepare_data.
Jalankan:  audit\\.venv\\Scripts\\python audit\\audit_data.py   (output juga ke audit/out/data.txt)
"""
from __future__ import annotations

import sys as _sys

_sys.dont_write_bytecode = True  # jangan buat __pycache__ di folder teman

import io
import sys
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

AUDIT = Path(__file__).resolve().parent
ROOT = AUDIT.parent
sys.path.insert(0, str(ROOT))
import prepare_data as pdx  # noqa: E402

XLSX = ROOT / "dataset_kos_mamikos.xlsx"
CSV = ROOT / "kos_scored.csv"
KODE = [f"C{i}" for i in range(1, 9)]


def judul(t):
    print("\n" + "=" * 78 + f"\n{t}\n" + "=" * 78)


def main():
    judul("1. Sheet di xlsx")
    xf = pd.ExcelFile(XLSX)
    for s in xf.sheet_names:
        d = pd.read_excel(xf, sheet_name=s)
        print(f"sheet '{s}': {d.shape[0]} baris x {d.shape[1]} kolom")
    raw = pd.read_excel(XLSX, sheet_name="Data Kos")
    print("kolom:", list(raw.columns))

    judul("2. Reproduksi prepare_data.py -> audit/out/kos_scored_rebuild.csv")
    (AUDIT / "out").mkdir(exist_ok=True)
    with redirect_stdout(io.StringIO()):
        pdx.build_kos_scored(str(XLSX), str(AUDIT / "out" / "kos_scored_rebuild.csv"))
    a, b = pd.read_csv(CSV), pd.read_csv(AUDIT / "out" / "kos_scored_rebuild.csv")
    print(f"kos_scored.csv {a.shape} vs rebuild {b.shape}; identik = {a.equals(b)}")
    df = a

    judul("3. Duplikat & null")
    print(f"duplikat id: {raw['id'].duplicated().sum()}, duplikat baris penuh: {raw.duplicated().sum()}, "
          f"duplikat nama_kos: {raw['nama_kos'].duplicated().sum()}")
    dn = raw[raw["nama_kos"].duplicated(keep=False)].sort_values("nama_kos")
    print(dn[["id", "nama_kos", "tipe_kos", "harga", "ukuran_kamar"]].to_string(index=False))
    nul = raw.isna().sum()
    print("null per kolom (xlsx):", nul[nul > 0].to_dict())
    both = raw["jarak_ke_unpad"].isna() & raw["jarak_ke_itb"].isna()
    print(f"jarak Unpad & ITB dua-duanya kosong -> C2 diimputasi median: {both.sum()} baris "
          f"({both.mean():.1%}); median = {raw[['jarak_ke_unpad', 'jarak_ke_itb']].min(axis=1).median()} km")
    print(f"hanya ada jarak Unpad: {(raw.jarak_ke_unpad.notna() & raw.jarak_ke_itb.isna()).sum()}, "
          f"hanya ITB: {(raw.jarak_ke_unpad.isna() & raw.jarak_ke_itb.notna()).sum()}, "
          f"keduanya ada: {(raw.jarak_ke_unpad.notna() & raw.jarak_ke_itb.notna()).sum()}")
    dua = raw.dropna(subset=["jarak_ke_unpad", "jarak_ke_itb"])
    print(f"   dari yang keduanya ada, C2 diambil dari ITB (lebih dekat): {(dua.jarak_ke_itb < dua.jarak_ke_unpad).sum()}")
    print("null per kolom (csv):", {k: int(v) for k, v in df.isna().sum().items() if v > 0})
    print(f"alamat unik: {df['alamat'].unique().tolist()}")

    judul("4. Tipe penghuni")
    print("xlsx tipe_kos:", raw["tipe_kos"].value_counts().to_dict())
    print("csv tipe_penghuni:", df["tipe_penghuni"].value_counts().to_dict())

    judul("5. Harga")
    print(df["harga"].describe().round(0).to_dict())
    q1, q3 = df.harga.quantile([0.25, 0.75])
    out = df[(df.harga > q3 + 1.5 * (q3 - q1)) | (df.harga < q1 - 1.5 * (q3 - q1))]
    print(f"outlier IQR (>{q3 + 1.5 * (q3 - q1):,.0f}):")
    print(out[["id", "nama", "tipe_penghuni", "harga"]].to_string(index=False))
    pecahan = raw[(raw.harga % 1 != 0)]
    print(f"harga berdesimal (pola x/12 -> kemungkinan harga TAHUNAN dibagi 12): {len(pecahan)} baris, contoh:")
    print((pecahan.harga * 12).round(0).head(6).to_dict())
    print(f"harga bukan kelipatan 1000 (incl. desimal): {(raw.harga % 1000 != 0).sum()} baris")
    rk = raw[raw.nama_kos.str.contains("Rumah Kontrakan|Rancaekek|Cileunyi", case=False)]
    print("bukan kos / di luar Jatinangor? :")
    print(rk[["id", "nama_kos", "tipe_kos", "harga", "ukuran_kamar"]].to_string(index=False))

    judul("6. Jarak (C2) dan C3 = 0.15 + 0.35*C2")
    print("C2:", df.C2.describe().round(3).to_dict())
    print(f"Pearson(C2,C3) = {np.corrcoef(df.C2, df.C3)[0, 1]:.7f}; Spearman = {spearmanr(df.C2, df.C3).statistic:.7f}")
    n2 = (df.C2.max() - df.C2) / (df.C2.max() - df.C2.min())
    n3 = (df.C3.max() - df.C3) / (df.C3.max() - df.C3.min())
    print(f"max |minmax(C2) - minmax(C3)| di seluruh data = {(n2 - n3).abs().max():.5f}  "
          "(transformasi afin hilang total oleh min-max; sisa = pembulatan 3 desimal)")
    print(f"C2 == 1.1 (nilai imputasi): {(df.C2 == 1.1).sum()} baris (59 imputasi + sisanya asli 1,1)")

    judul("7. Luas kamar (C4) - parser")
    luas = raw["ukuran_kamar"].apply(pdx.parse_luas_kamar)
    print(f"gagal parse -> imputasi median {luas.median()} m2: {luas.isna().sum()} baris:",
          raw.loc[luas.isna(), "ukuran_kamar"].tolist())

    def bagian(s):
        p = str(s).strip().lower().replace(" ", "").split("x")
        try:
            return float(p[0]), float(p[1])
        except Exception:
            return None
    kena = [(raw.nama_kos[i], raw.ukuran_kamar[i], luas[i]) for i in range(len(raw))
            if bagian(raw.ukuran_kamar[i]) and max(bagian(raw.ukuran_kamar[i])) > 20]
    print(f"kena heuristik p/l > 20: {len(kena)} baris -> {kena}")
    print("C4:", df.C4.describe().round(2).to_dict())
    print("5 terbesar:", df.nlargest(5, "C4")[["nama", "C4", "harga"]].values.tolist())
    print("5 terkecil:", df.nsmallest(5, "C4")[["nama", "C4", "harga"]].values.tolist())

    judul("8. C5-C8 (proporsi fasilitas)")
    for c in ["C5", "C6", "C7", "C8"]:
        print(c, "nilai unik:", df[c].value_counts().sort_index().to_dict())
    print("rata-rata fitur:", df[["termasuk_listrik", "pembayaran_per_bulan", "pembayaran_per_tahun",
                                  "cctv", "penjaga"]].mean().round(3).to_dict())
    print(f"kloset duduk & jongkok dua-duanya 1: {((df.kloset_duduk == 1) & (df.kloset_jongkok == 1)).sum()}, "
          f"dua-duanya 0: {((df.kloset_duduk == 0) & (df.kloset_jongkok == 0)).sum()}")
    print("korelasi Pearson antar kriteria:\n", df[KODE].corr().round(2).to_string())

    judul("9. Kecukupan data untuk UI (jumlah kandidat setelah F1+F2)")
    budgets = [500_000, 800_000, 1_000_000, 1_200_000, 1_500_000, 2_000_000, 3_000_000]
    rows = []
    for bud in budgets:
        r = {"budget": f"{bud:,}".replace(",", ".")}
        for t in ["putra", "putri", "campur"]:
            r[t] = int(((df.harga <= bud) & (df.tipe_penghuni == t)).sum())
        r["putra+campur"] = int(((df.harga <= bud) & df.tipe_penghuni.isin(["putra", "campur"])).sum())
        r["putri+campur"] = int(((df.harga <= bud) & df.tipe_penghuni.isin(["putri", "campur"])).sum())
        rows.append(r)
    print(pd.DataFrame(rows).to_string(index=False))
    print("kombinasi 0 hasil: budget < harga termurah per tipe ->",
          df.groupby("tipe_penghuni").harga.min().round(0).to_dict())

    teks_out = None
    return teks_out


if __name__ == "__main__":
    buf = io.StringIO()
    with redirect_stdout(buf):
        main()
    teks = buf.getvalue()
    print(teks)
    (AUDIT / "out" / "data.txt").write_text(teks, encoding="utf-8")
