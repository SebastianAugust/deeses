import json
import time
import urllib.request
import numpy as np
import pandas as pd
from pathlib import Path

UNPAD_LAT, UNPAD_LNG = -6.926132, 107.774689
ITB_LAT, ITB_LNG = -6.928088, 107.769118

FITUR_COLS = [
    "termasuk_listrik", "jendela", "k_mandi_dalam", "kloset_duduk",
    "kloset_jongkok", "shower", "air_panas", "cctv", "wifi", "penjaga",
    "ac", "parkir_mobil", "parkir_motor_sepeda", "tv", "ruang_tamu",
    "ruang_jemur", "pembayaran_per_bulan", "pembayaran_per_tahun"
]

def jarak_rute_osrm(lat1: float, lng1: float, lat2: float, lng2: float, mode: str = "driving") -> float:
    url = f"http://router.project-osrm.org/route/v1/{mode}/{lng1},{lat1};{lng2},{lat2}?overview=false"
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
            if res.get("code") == "Ok" and res.get("routes"):
                return round(res["routes"][0]["distance"] / 1000.0, 3)
        except Exception:
            time.sleep(1)
    return np.nan

def build_kos_scored():
    base_dir = Path(__file__).parent
    csv_in = base_dir / "dataset_kos_v1.csv"
    if not csv_in.exists():
        csv_in = base_dir.parent / "dataset" / "dataset_kos_v1.csv"

    df = pd.read_csv(csv_in)

    # 1. Hapus duplikat ID & keluarkan 3 Rumah Kontrakan
    df = df.drop_duplicates(subset=["id"]).copy()
    df = df[~df["nama_kos"].str.contains("kontrakan", case=False, na=False)].copy()

    # 2. Rapikan nama kolom sesuai Supabase
    df = df.rename(columns={
        "nama_kos": "nama",
        "kloset duduk": "kloset_duduk",
    })
    df["id"] = df["id"].astype(int)
    df["nama"] = df["nama"].astype(str).str.strip()
    df["alamat"] = None
    df["lat"] = df["lat"].astype(str)
    df["lng"] = df["lng"].astype(str)

    # 3. Tipe penghuni (putra / putri / campur)
    df["tipe_penghuni"] = (
        df["tipe_kos"].astype(str).str.strip().str.lower()
        .replace({"laki-laki": "putra", "perempuan": "putri"})
    )

    # 4. Harga bulanan langsung
    df["harga"] = np.round(df["harga"].astype(str).str.replace(",", "").astype(float), 2)

    # 5. Hitung jarak rute jalan asli OSRM ke Unpad & ITB
    print(f"Menghitung jarak rute jalan OSRM untuk {len(df)} kos...")
    jarak_unpad, jarak_itb = [], []
    for idx, (_, row) in enumerate(df.iterrows(), start=1):
        d_u = jarak_rute_osrm(float(row["lat"]), float(row["lng"]), UNPAD_LAT, UNPAD_LNG)
        time.sleep(0.15)
        d_i = jarak_rute_osrm(float(row["lat"]), float(row["lng"]), ITB_LAT, ITB_LNG)
        time.sleep(0.15)
        jarak_unpad.append(d_u)
        jarak_itb.append(d_i)
        if idx % 50 == 0 or idx == len(df):
            print(f"Progres: {idx}/{len(df)} kos selesai...")

    df["jarak_unpad_km"] = jarak_unpad
    df["jarak_itb_km"] = jarak_itb

    # 6. Kolom C1-C8 & Luas Kamar (sesuai struktur tabel Supabase)
    df["C1"] = df["harga"]
    df["C2"] = np.minimum(df["jarak_unpad_km"], df["jarak_itb_km"])
    df["C3"] = None
    df["C4"] = df["luas_kamar_m2"].astype(float)
    df["C5"] = None
    df["C6"] = None
    df["C7"] = None
    df["C8"] = None

    df["luas_kamar_m2"] = df["luas_kamar_m2"].astype(float)
    df["url_gambar1"] = None

    kolom_supabase = [
        "id", "nama", "alamat", "lat", "lng", "tipe_penghuni", "harga",
        "jarak_unpad_km", "jarak_itb_km",
        "luas_kamar_m2",
        "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8",
        "url_gambar1"
    ] + FITUR_COLS

    out_path = base_dir / "kos_scored.csv"
    df[kolom_supabase].to_csv(out_path, index=False)
    print(f"BERHASIL! '{out_path.name}' ({len(df)} baris) siap di-import ke Supabase.")

if __name__ == "__main__":
    build_kos_scored()