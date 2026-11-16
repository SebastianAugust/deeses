import numpy as np
import pandas as pd
from scipy.stats import spearmanr

KRITERIA_COLS = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]
COST_COLS = ["C1", "C2", "C3"]
BENEFIT_COLS = ["C4", "C5", "C6", "C7", "C8"]


# T08: Filter F1 (Budget), F2 (Tipe Penghuni), dan F3 (Fasilitas Wajib)
def filter_kos(
    df: pd.DataFrame,
    budget: float,
    tipe: str,
    fasilitas_wajib: list[str] = None,
    allow_campur: bool = False
) -> pd.DataFrame:
    filtered = df.copy()

    # F1: Budget maksimal
    if budget is not None and budget > 0:
        filtered = filtered[filtered["harga"] <= budget]

    # F2: Tipe penghuni (putra / putri / campur)
    if tipe:
        tipe_norm = tipe.strip().lower()
        kolom_tipe = filtered["tipe_penghuni"].astype(str).str.strip().str.lower()
        if allow_campur and tipe_norm in ["putra", "putri"]:
            filtered = filtered[kolom_tipe.isin([tipe_norm, "campur"])]
        else:
            filtered = filtered[kolom_tipe == tipe_norm]

    # F3: Filter fasilitas wajib (misal: ["k_mandi_dalam", "ac"])
    if fasilitas_wajib:
        for fitur in fasilitas_wajib:
            fitur_col = fitur.strip().lower().replace(" ", "_")
            if fitur_col in filtered.columns:
                filtered = filtered[filtered[fitur_col] == 1]

    return filtered.reset_index(drop=True)


# T09: Normalisasi Min-Max (C1-C3 Cost, C4-C8 Benefit)
def normalisasi_minmax(df: pd.DataFrame) -> pd.DataFrame:
    norm_df = pd.DataFrame(index=df.index)
    for col in KRITERIA_COLS:
        vals = df[col].astype(float)
        min_val, max_val = vals.min(), vals.max()
        denom = max_val - min_val
        if denom == 0:
            norm_df[col] = 1.0
        elif col in COST_COLS:
            norm_df[col] = (max_val - vals) / denom
        else:
            norm_df[col] = (vals - min_val) / denom
    return norm_df


# T10: Bobot Rank Sum (n=8) & Skor SAW
def hitung_bobot_ranksum(urutan_kriteria: list[str]) -> dict[str, float]:
    if set(urutan_kriteria) != set(KRITERIA_COLS) or len(urutan_kriteria) != 8:
        raise ValueError(f"urutan_kriteria harus berisi tepat 8 kriteria unik: {KRITERIA_COLS}")
    n = len(urutan_kriteria)
    return {crit: (2 * (n - (idx + 1) + 1)) / (n * (n + 1)) for idx, crit in enumerate(urutan_kriteria)}


def hitung_saw(norm_df: pd.DataFrame, bobot: dict[str, float]) -> np.ndarray:
    w_vec = np.array([bobot[c] for c in KRITERIA_COLS], dtype=float)
    return np.dot(norm_df[KRITERIA_COLS].values, w_vec)


# T11: TOPSIS Pembanding & Korelasi Spearman
def hitung_topsis(norm_df: pd.DataFrame, bobot: dict[str, float]) -> np.ndarray:
    if len(norm_df) == 0:
        return np.array([])
    if len(norm_df) == 1:
        return np.array([1.0])

    w_vec = np.array([bobot[c] for c in KRITERIA_COLS], dtype=float)
    V = norm_df[KRITERIA_COLS].values * w_vec

    ideal_pos = V.max(axis=0)
    ideal_neg = V.min(axis=0)

    d_pos = np.sqrt(((V - ideal_pos) ** 2).sum(axis=1))
    d_neg = np.sqrt(((V - ideal_neg) ** 2).sum(axis=1))
    denom = d_pos + d_neg
    return np.where(denom == 0, 1.0, d_neg / denom)


# Fungsi utama untuk dipanggil Backend (POST /rank)
def rank_kos(
    df_kos: pd.DataFrame,
    budget: float,
    tipe: str,
    urutan_kriteria: list[str],
    fasilitas_wajib: list[str] = None,
    fasilitas_prioritas: list[str] = None,
) -> dict:
    """
    - fasilitas_wajib: list fasilitas yang HARUS ada (hard filter), contoh: ["k_mandi_dalam"]
    - fasilitas_prioritas: list fasilitas yang diutamakan user untuk menghitung skor C5,
      contoh: ["ac", "k_mandi_dalam", "wifi"]
    """
    kandidat = filter_kos(
        df_kos,
        budget=budget,
        tipe=tipe,
        fasilitas_wajib=fasilitas_wajib
    )
    bobot = hitung_bobot_ranksum(urutan_kriteria)

    if kandidat.empty:
        return {"total_kandidat": 0, "bobot": bobot, "spearman": None, "hasil": []}

    # Sesuaikan skor C5 secara dinamis jika user memilih fasilitas prioritas tertentu
    if fasilitas_prioritas:
        valid_cols = [
            f.strip().lower().replace(" ", "_")
            for f in fasilitas_prioritas
            if f.strip().lower().replace(" ", "_") in kandidat.columns
        ]
        if valid_cols:
            kandidat["C5"] = np.round(kandidat[valid_cols].mean(axis=1), 4)

    norm_df = normalisasi_minmax(kandidat)
    skor_saw = hitung_saw(norm_df, bobot)
    skor_topsis = hitung_topsis(norm_df, bobot)

    if len(kandidat) >= 2 and np.std(skor_saw) > 0 and np.std(skor_topsis) > 0:
        rho, p_val = spearmanr(skor_saw, skor_topsis)
        spearman_info = {"rho": round(float(rho), 4), "p_value": round(float(p_val), 4)}
    else:
        spearman_info = {"rho": 1.0, "p_value": 0.0}

    hasil_df = kandidat.copy()
    hasil_df["skor_saw"] = np.round(skor_saw, 4)
    hasil_df["skor_topsis"] = np.round(skor_topsis, 4)
    hasil_df["rank"] = hasil_df["skor_saw"].rank(ascending=False, method="min").astype(int)
    hasil_df = hasil_df.sort_values(by=["rank", "skor_topsis"], ascending=[True, False])

    output_list = []
    for idx, row in hasil_df.iterrows():
        output_list.append({
            "rank": int(row["rank"]),
            "id": str(row["id"]),
            "nama": row["nama"],
            "tipe_penghuni": row["tipe_penghuni"],
            "harga": float(row["harga"]),
            "skor_saw": float(row["skor_saw"]),
            "skor_topsis": float(row["skor_topsis"]),
            "skor_kriteria": {c: round(float(norm_df.loc[idx, c]), 4) for c in KRITERIA_COLS},
        })

    return {
        "total_kandidat": len(output_list),
        "bobot": {k: round(v, 4) for k, v in bobot.items()},
        "spearman": spearman_info,
        "hasil": output_list,
    }


# ==============================================================================
# CONTOH UJI PERBEDAAN PREFERENSI FASILITAS USER
# ==============================================================================
if __name__ == "__main__":
    df = pd.read_csv("kos_scored.csv")
    urutan_uji = ["C5", "C1", "C2", "C6", "C4", "C3", "C7", "C8"]

    # User A: Wajib WC dalam & AC, prioritas AC + WC dalam
    res_a = rank_kos(
        df,
        budget=1500000,
        tipe="putri",
        urutan_kriteria=urutan_uji,
        fasilitas_wajib=["k_mandi_dalam", "ac"],
        fasilitas_prioritas=["k_mandi_dalam", "ac"]
    )
    print(f"=== USER A (Wajib AC + WC Dalam) | Kandidat: {res_a['total_kandidat']} ===")
    for item in res_a["hasil"][:3]:
        print(f"#{item['rank']} | {item['nama']} | Rp {item['harga']:,.0f} | SAW: {item['skor_saw']}")

    # User B: Wajib WC dalam, prioritas WiFi + Air Panas + WC dalam
    res_b = rank_kos(
        df,
        budget=1500000,
        tipe="putri",
        urutan_kriteria=urutan_uji,
        fasilitas_wajib=["k_mandi_dalam"],
        fasilitas_prioritas=["k_mandi_dalam", "wifi", "air_panas"]
    )
    print(f"\n=== USER B (Wajib WC Dalam, Prioritas WiFi + Air Panas) | Kandidat: {res_b['total_kandidat']} ===")
    for item in res_b["hasil"][:3]:
        print(f"#{item['rank']} | {item['nama']} | Rp {item['harga']:,.0f} | SAW: {item['skor_saw']}")