import numpy as np
import pandas as pd

FITUR_COLS = [
    "termasuk_listrik", "jendela", "k_mandi_dalam", "kloset_duduk",
    "kloset_jongkok", "shower", "air_panas", "cctv", "wifi", "penjaga",
    "ac", "parkir_mobil", "parkir_motor_sepeda", "tv", "ruang_tamu",
    "ruang_jemur", "pembayaran_per_bulan", "pembayaran_per_tahun"
]


def parse_luas_kamar(ukuran_str: str) -> float:
    s = str(ukuran_str).strip().lower().replace(" ", "")
    parts = s.split("x")
    if len(parts) != 2:
        return np.nan
    try:
        p, l = float(parts[0]), float(parts[1])
        if p <= 0 or l <= 0:
            return np.nan
        if p > 20:
            p = p / 10.0 if p < 100 else p / 100.0
        if l > 20:
            l = l / 10.0 if l < 100 else l / 100.0
        return round(p * l, 2)
    except ValueError:
        return np.nan


def build_kos_scored(input_xlsx: str = "dataset_kos_mamikos.xlsx", output_csv: str = "kos_scored.csv"):
    df = pd.read_excel(input_xlsx, sheet_name="Data Kos")

    df = df.drop_duplicates(subset=["id"]).copy()
    df = df.rename(columns={"kloset duduk": "kloset_duduk"})

    df["id"] = df["id"].astype(str)
    df["nama"] = df["nama_kos"].astype(str).str.strip()
    df["tipe_penghuni"] = (
        df["tipe_kos"]
        .astype(str)
        .str.strip()
        .str.lower()
        .replace({"laki-laki": "putra", "perempuan": "putri"})
    )

    # C1: Biaya sewa (Cost)
    df["harga"] = df["harga"].astype(float)
    df["C1"] = df["harga"]

    # C2: Jarak ke kampus terdekat Unpad/ITB (Cost)
    jarak_kampus = df[["jarak_ke_unpad", "jarak_ke_itb"]].min(axis=1)
    df["C2"] = np.round(jarak_kampus.fillna(jarak_kampus.median()), 3)

    # C3: Jarak ke layanan (Cost)
    df["C3"] = np.round(0.15 + 0.35 * df["C2"], 3)

    # C4: Luas kamar m2 (Benefit)
    luas = df["ukuran_kamar"].apply(parse_luas_kamar)
    df["C4"] = luas.fillna(luas.median())

    # C5 - C8: Skor proporsi default 0-1 (Benefit)
    c5_cols = ["k_mandi_dalam", "kloset_duduk", "shower", "air_panas", "ac", "wifi", "jendela", "tv"]
    c6_cols = ["cctv", "penjaga"]
    c7_cols = ["termasuk_listrik", "pembayaran_per_bulan", "pembayaran_per_tahun"]
    c8_cols = ["parkir_motor_sepeda", "parkir_mobil", "ruang_tamu", "ruang_jemur"]

    df["C5"] = np.round(df[c5_cols].mean(axis=1), 4)
    df["C6"] = np.round(df[c6_cols].mean(axis=1), 4)
    df["C7"] = np.round(df[c7_cols].mean(axis=1), 4)
    df["C8"] = np.round(df[c8_cols].mean(axis=1), 4)

    df["alamat"] = "Jatinangor, Sumedang"
    df["lat"] = ""
    df["lng"] = ""
    df["url"] = ""

    kontrak_cols = [
        "id", "nama", "alamat", "lat", "lng", "tipe_penghuni", "harga",
        "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "url"
    ] + FITUR_COLS

    kos_scored = df[kontrak_cols]
    kos_scored.to_csv(output_csv, index=False)
    print(f"Berhasil membuat '{output_csv}' ({len(kos_scored)} baris) beserta kolom fasilitas.")


if __name__ == "__main__":
    build_kos_scored()