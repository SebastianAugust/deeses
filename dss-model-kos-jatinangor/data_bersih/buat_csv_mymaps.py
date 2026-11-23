"""Membuat CSV untuk diimpor ke Google My Maps (geocoding nama kos).
Membaca ../kos_scored.csv (tidak mengubahnya). Menulis dua file di folder ini:
  kos_untuk_mymaps_uji20.csv  (20 baris uji)
  kos_untuk_mymaps_semua.csv  (semua baris, kecuali 2 kos di luar Jatinangor)
Kolom: id, nama_asli, pencarian.  'pencarian' = nama tanpa 'Tipe X' / '(2)' + 'Jatinangor Sumedang'.
"""
import re
from pathlib import Path
import pandas as pd

BASE = Path(__file__).resolve().parent
df = pd.read_csv(BASE.parent / "kos_scored.csv")

def bersih(nama: str) -> str:
    n = re.sub(r"\s+", " ", str(nama)).strip()
    n = re.sub(r"\s*\(\d+\)\s*$", "", n)
    tanpa_tipe = re.sub(r"\btipe\s+[A-Za-z0-9]+\b", "", n, flags=re.I)
    tanpa_tipe = re.sub(r"\s+", " ", tanpa_tipe).strip()
    # jangan buang bila yang tersisa hanya kata umum
    if re.sub(r"(?i)\b(kost|kos)\b", "", tanpa_tipe).strip() != "":
        n = tanpa_tipe
    if "jatinangor" not in n.lower():
        n = f"{n} Jatinangor Sumedang"
    return n

LUAR = ("haffair", "fengsui")  # 2 kos di luar Jatinangor (Rancaekek, Cileunyi): dikeluarkan
mask_luar = df["nama"].str.lower().str.contains("|".join(LUAR))
print("dikeluarkan (luar Jatinangor):", df.loc[mask_luar, "nama"].tolist())
d = df.loc[~mask_luar, ["id", "nama", "lat", "lng"]].copy()
d["pencarian"] = d["nama"].map(bersih)
out = d.rename(columns={"nama": "nama_asli"})[["id", "nama_asli", "pencarian"]]
out.to_csv(BASE / "kos_untuk_mymaps_semua.csv", index=False, encoding="utf-8")

# 20 baris uji: 6 dari pasangan koordinat ganda, 3 kasus khusus, sisanya acak (seed tetap)
dup = d[d.duplicated(["lat", "lng"], keep=False)].sort_values(["lat", "lng"])
pilih = list(dup.head(6).index)
for kunci in ("pondok kaca ii", "hoop tipe b", "derumahkoe"):
    pilih += list(d[d["nama"].str.lower().str.contains(kunci)].index[:2])
pilih = list(dict.fromkeys(pilih))
sisa = d.drop(index=pilih).sample(n=max(0, 20 - len(pilih)), random_state=7)
uji = out.loc[pilih + list(sisa.index)].head(20)
uji.to_csv(BASE / "kos_untuk_mymaps_uji20.csv", index=False, encoding="utf-8")
print("semua:", len(out), "| unik pencarian:", out["pencarian"].nunique(), "| uji:", len(uji))
print(uji.to_string(index=False))
