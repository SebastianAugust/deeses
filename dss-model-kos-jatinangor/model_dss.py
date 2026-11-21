from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

# pemetaan cost benefit
KATALOG_KRITERIA: dict[str, str] = {
    "harga": "cost",
    "C1": "cost",
    "jarak_unpad_km": "cost",
    "jarak_itb_km": "cost",
    "C2": "cost",
    "luas_kamar_m2": "benefit",
    "C4": "benefit",
    "termasuk_listrik": "benefit",
    "jendela": "benefit",
    "k_mandi_dalam": "benefit",
    "kloset_duduk": "benefit",
    "kloset_jongkok": "benefit",
    "shower": "benefit",
    "air_panas": "benefit",
    "cctv": "benefit",
    "wifi": "benefit",
    "penjaga": "benefit",
    "ac": "benefit",
    "parkir_mobil": "benefit",
    "parkir_motor_sepeda": "benefit",
    "tv": "benefit",
    "ruang_tamu": "benefit",
    "ruang_jemur": "benefit",
    "pembayaran_per_bulan": "benefit",
    "pembayaran_per_tahun": "benefit",
}

WHITELIST_FASILITAS: set[str] = {
    "termasuk_listrik", "jendela", "k_mandi_dalam", "kloset_duduk",
    "kloset_jongkok", "shower", "air_panas", "cctv", "wifi", "penjaga",
    "ac", "parkir_mobil", "parkir_motor_sepeda", "tv", "ruang_tamu",
    "ruang_jemur", "pembayaran_per_bulan", "pembayaran_per_tahun"
}

def filter_kos(
    df: pd.DataFrame,
    budget: float,
    tipe: str,
    fasilitas_wajib: list[str] | None = None,
    allow_campur: bool = False,
) -> pd.DataFrame:
    if budget is None or budget <= 0:
        raise ValueError("Budget harus lebih dari 0.")
    if not tipe or not isinstance(tipe, str) or tipe.strip() == "":
        raise ValueError("Tipe penghuni wajib diisi (putra / putri / campur).")

    tipe_norm = (
        tipe.strip().lower()
        .replace("laki-laki", "putra")
        .replace("perempuan", "putri")
    )
    if tipe_norm not in {"putra", "putri", "campur"}:
        raise ValueError(f"Tipe penghuni tidak valid: '{tipe}'.")

    # Filter F1: Budget
    filtered = df[df["harga"] <= budget].copy()

    # Filter F2: Tipe penghuni
    kolom_tipe = filtered["tipe_penghuni"].astype(str).str.strip().str.lower()
    if allow_campur and tipe_norm in {"putra", "putri"}:
        filtered = filtered[kolom_tipe.isin([tipe_norm, "campur"])]
    else:
        filtered = filtered[kolom_tipe == tipe_norm]

    # Filter F3: Fasilitas wajib (ini bisa dipake bisa engga, tp di ui blm ada fitur ini)
    if fasilitas_wajib:
        for fitur in fasilitas_wajib:
            fitur_col = fitur.strip().lower().replace(" ", "_")
            if fitur_col not in WHITELIST_FASILITAS:
                raise ValueError(f"Nama fasilitas tidak dikenal: '{fitur}'.")
            filtered = filtered[filtered[fitur_col] == 1]

    return filtered.reset_index(drop=True)

def hitung_bobot_ranksum(urutan_kriteria: list[str]) -> dict[str, float]:
    """Menghitung bobot otomatis sesuai jumlah kriteria (n) yang dipilih user."""
    if not urutan_kriteria:
        raise ValueError("Minimal 1 kriteria harus dipilih.")
    if len(set(urutan_kriteria)) != len(urutan_kriteria):
        raise ValueError("Kriteria tidak boleh ada yang ganda/duplikat.")
    for k in urutan_kriteria:
        if k not in KATALOG_KRITERIA:
            raise ValueError(f"Kriteria '{k}' tidak ada di katalog.")

    n = len(urutan_kriteria)
    return {
        crit: (2 * (n - (idx + 1) + 1)) / (n * (n + 1))
        for idx, crit in enumerate(urutan_kriteria)
    }

def normalisasi_minmax(df: pd.DataFrame, urutan_kriteria: list[str]) -> pd.DataFrame:
    """Mengubah nilai setiap kriteria menjadi skala 0 sampai 1 (1 = paling bagus)."""
    norm_df = pd.DataFrame(index=df.index)
    for col in urutan_kriteria:
        vals = df[col].astype(float)
        min_val, max_val = vals.min(), vals.max()
        denom = max_val - min_val
        if denom == 0:
            norm_df[col] = 1.0
        elif KATALOG_KRITERIA[col] == "cost":
            norm_df[col] = (max_val - vals) / denom
        else:
            norm_df[col] = (vals - min_val) / denom
    return norm_df

def hitung_saw(norm_df: pd.DataFrame, bobot: dict[str, float], urutan_kriteria: list[str]) -> np.ndarray:
    w_vec = np.array([bobot[c] for c in urutan_kriteria], dtype=float)
    return np.dot(norm_df[urutan_kriteria].values, w_vec)

def hitung_topsis_minmax(norm_df: pd.DataFrame, bobot: dict[str, float], urutan_kriteria: list[str]) -> np.ndarray:
    if len(norm_df) == 0:
        return np.array([])
    if len(norm_df) == 1:
        return np.array([1.0])

    w_vec = np.array([bobot[c] for c in urutan_kriteria], dtype=float)
    V = norm_df[urutan_kriteria].values * w_vec

    ideal_pos = V.max(axis=0)
    ideal_neg = V.min(axis=0)

    d_pos = np.sqrt(((V - ideal_pos) ** 2).sum(axis=1))
    d_neg = np.sqrt(((V - ideal_neg) ** 2).sum(axis=1))
    denom = d_pos + d_neg
    return np.where(denom == 0, 1.0, d_neg / denom)

def rank_kos(
    df_kos: pd.DataFrame,
    budget: float,
    tipe: str,
    urutan_kriteria: list[str],
    fasilitas_wajib: list[str] | None = None,
    allow_campur: bool = False,
) -> dict:
    bobot = hitung_bobot_ranksum(urutan_kriteria)
    kandidat = filter_kos(
        df_kos,
        budget=budget,
        tipe=tipe,
        fasilitas_wajib=fasilitas_wajib,
        allow_campur=allow_campur,
    )

    # Buang kandidat yang datanya kosong di kriteria yang dipilih user
    jumlah_awal = len(kandidat)
    kandidat = kandidat.dropna(subset=urutan_kriteria).reset_index(drop=True)
    jumlah_tanpa_data = jumlah_awal - len(kandidat)

    if kandidat.empty:
        return {
            "total_kandidat": 0,
            "jumlah_tanpa_data": jumlah_tanpa_data,
            "bobot": bobot,
            "spearman": None,
            "hasil": [],
        }

    norm_df = normalisasi_minmax(kandidat, urutan_kriteria)
    saw_raw = hitung_saw(norm_df, bobot, urutan_kriteria)
    topsis_raw = hitung_topsis_minmax(norm_df, bobot, urutan_kriteria)

    # Korelasi Spearman (aman dari NaN jika kandidat < 3)
    if len(kandidat) >= 3 and np.std(saw_raw) > 0 and np.std(topsis_raw) > 0:
        rho, p_val = spearmanr(saw_raw, topsis_raw)
        spearman_info = None if np.isnan(rho) else {"rho": round(float(rho), 4), "p_value": round(float(p_val), 4)}
    else:
        spearman_info = None

    # Urutkan ranking unik dari skor asli (sebelum dibulatkan)
    hasil_df = kandidat.copy()
    hasil_df["_saw_raw"] = saw_raw
    hasil_df["_topsis_raw"] = topsis_raw
    hasil_df = hasil_df.sort_values(
        by=["_saw_raw", "_topsis_raw", "harga", "id"],
        ascending=[False, False, True, True],
    )
    hasil_df["rank"] = np.arange(1, len(hasil_df) + 1)

    output_list = []
    for idx, row in hasil_df.iterrows():
        output_list.append({
            "rank": int(row["rank"]),
            "id": str(row["id"]),
            "nama": row["nama"],
            "tipe_penghuni": row["tipe_penghuni"],
            "harga": float(row["harga"]),
            "skor_saw": round(float(row["_saw_raw"]), 4),
            "skor_topsis": round(float(row["_topsis_raw"]), 4),
            "skor_kriteria": {c: round(float(norm_df.loc[idx, c]), 4) for c in urutan_kriteria},
        })

    return {
        "total_kandidat": len(output_list),
        "jumlah_tanpa_data": jumlah_tanpa_data,
        "bobot": {k: round(v, 4) for k, v in bobot.items()},
        "spearman": spearman_info,
        "hasil": output_list,
    }

# Contoh pengujian langsung
if __name__ == "__main__":
    csv_path = Path(__file__).parent / "kos_scored.csv"
    df = pd.read_csv(csv_path)

    hasil_uji = rank_kos(
        df,
        budget=1200000,
        tipe="putri",
        urutan_kriteria=["harga", "jarak_unpad_km", "k_mandi_dalam", "wifi", "cctv"],
        allow_campur=False,
    )
    print(f"Total kandidat: {hasil_uji['total_kandidat']} | Spearman: {hasil_uji['spearman']}")
    for item in hasil_uji["hasil"][:5]:
        print(f"#{item['rank']} | {item['nama']} | Rp {item['harga']:,.0f} | SAW: {item['skor_saw']} | TOPSIS: {item['skor_topsis']}")