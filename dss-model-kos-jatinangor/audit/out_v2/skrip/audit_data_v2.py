"""Audit data v2 (baca-saja). Memakai kos_scored.csv + dataset_kos_v1.csv sekarang,
dan (pembanding) xlsx + kos_scored.csv lama dari git 83e92b2."""
from __future__ import annotations
import sys
sys.dont_write_bytecode = True
import math, re, json
from pathlib import Path
import numpy as np, pandas as pd

ROOT = Path(sys.argv[1])          # folder berisi kos_scored.csv, dataset/
OLD = Path(sys.argv[2])           # folder berisi old.xlsx, old_scored.csv
OUT = Path(sys.argv[3])
OUT.mkdir(exist_ok=True)

df = pd.read_csv(ROOT / "kos_scored.csv")
v1 = pd.read_csv(ROOT / "dataset" / "dataset_kos_v1.csv", encoding="utf-8-sig")
old = pd.read_csv(OLD / "old_scored.csv")
xl = pd.read_excel(OLD / "old.xlsx", sheet_name="Data Kos")

buf = []
def p(*a):
    s = " ".join(str(x) for x in a)
    print(s); buf.append(s)
def h(t):
    p("\n" + "=" * 78 + f"\n{t}\n" + "=" * 78)

FLAG = ["termasuk_listrik","jendela","k_mandi_dalam","kloset_duduk","kloset_jongkok","shower","air_panas",
        "cctv","wifi","penjaga","ac","parkir_mobil","parkir_motor_sepeda","tv","ruang_tamu","ruang_jemur",
        "pembayaran_per_bulan","pembayaran_per_tahun"]

h("1. Bentuk file")
p(f"kos_scored.csv: {df.shape[0]} baris x {df.shape[1]} kolom")
p("kolom:", list(df.columns))
p(f"dataset_kos_v1.csv: {v1.shape[0]} baris x {v1.shape[1]} kolom; kolom:", list(v1.columns))
p(f"kos_scored lama (git 83e92b2): {old.shape}; xlsx lama: {xl.shape}")
p("kolom hilang dibanding CSV lama:", sorted(set(old.columns) - set(df.columns)))
p("kolom baru dibanding CSV lama:", sorted(set(df.columns) - set(old.columns)))
p("dtype CSV baru:", {c: str(t) for c, t in df.dtypes.items()})
nul = df.isna().sum()
p("null per kolom:", {k: int(v) for k, v in nul.items() if v > 0})
p("kolom 100% kosong:", [c for c in df.columns if df[c].isna().all()])

h("2. Baris: apa yang dibuang dibanding v1 / lama")
p("id v1 unik:", v1.id.nunique(), "| duplikat id v1:", int(v1.id.duplicated().sum()))
dropped = v1[~v1.id.isin(df.id)]
p(f"id ada di v1 tapi tidak di kos_scored: {len(dropped)}")
p(dropped[["id","nama_kos","tipe_kos","harga"]].to_string(index=False))
p("id di kos_scored tapi tidak di v1:", sorted(set(df.id) - set(v1.id)))
p("id di CSV lama tapi tidak di baru:", len(set(old.id) - set(df.id)), "| id baru tapi tidak di lama:", len(set(df.id) - set(old.id)))
p("nama mengandung 'kontrakan' di kos_scored:", int(df.nama.str.contains("kontrakan", case=False).sum()))
dn = df[df.nama.duplicated(keep=False)].sort_values("nama")
p(f"nama duplikat di kos_scored: {df.nama.duplicated().sum()} baris duplikat ({dn.nama.nunique()} nama)")
p(dn[["id","nama","tipe_penghuni","harga","luas_kamar_m2"]].to_string(index=False))
for kata in ["rancaekek","cileunyi","bandung","sumedang","jatinangor"]:
    p(f"  nama mengandung '{kata}': {int(df.nama.str.lower().str.contains(kata).sum())}")
p("  nama Rancaekek/Cileunyi:")
p(df[df.nama.str.lower().str.contains("rancaekek|cileunyi")][["id","nama","jarak_unpad_km","jarak_itb_km"]].to_string(index=False))

h("3. Koordinat lat/lng")
la, lo = pd.to_numeric(df.lat, errors="coerce"), pd.to_numeric(df.lng, errors="coerce")
p(f"lat/lng terisi: {int(la.notna().sum())}/{len(df)}; numerik valid: {int((la.notna()&lo.notna()).sum())}")
p(f"lat range [{la.min():.6f},{la.max():.6f}] lng range [{lo.min():.6f},{lo.max():.6f}]")
BOX = (-6.97, -6.89, 107.74, 107.81)   # kotak longgar Jatinangor + sekitar (asumsi audit)
inbox = (la.between(BOX[0], BOX[1])) & (lo.between(BOX[2], BOX[3]))
p(f"di dalam kotak {BOX}: {int(inbox.sum())}; di luar: {int((~inbox).sum())}")
p(df.loc[~inbox, ["id","nama","lat","lng"]].to_string(index=False))
p(f"lat==0 atau lng==0: {int(((la==0)|(lo==0)).sum())}")
pair = df[["lat","lng"]].astype(str).agg(",".join, axis=1)
vc = pair.value_counts()
p(f"pasangan (lat,lng) persis sama: {int((vc>1).sum())} pasangan, {int(vc[vc>1].sum())} baris terlibat; maks {int(vc.max())} kos di satu titik")
r4 = pd.Series(list(zip(la.round(4), lo.round(4))))
vc4 = r4.value_counts()
p(f"setelah dibulatkan 4 desimal (~11 m): {int((vc4>1).sum())} titik dipakai >1 kos, {int(vc4[vc4>1].sum())} baris; maks {int(vc4.max())}")
vc3 = pd.Series(list(zip(la.round(3), lo.round(3)))).value_counts()
p(f"dibulatkan 3 desimal (~110 m): maks {int(vc3.max())} kos di satu sel; sel dgn >=5 kos: {int((vc3>=5).sum())}")
dec = df.lat.astype(str).str.split(".").str[1].str.len()
p("jumlah desimal lat (distribusi):", dec.value_counts().sort_index().to_dict())
p("lat/lng bertipe di CSV: dtype lat =", str(df.lat.dtype), "| lng =", str(df.lng.dtype), "(Supabase: teks; CSV: float64 -> tipe beda tapi aman jika di-cast ke text)")
p("string lat berformat tidak biasa (bukan -6.xxxx):", int((~df.lat.astype(str).str.match(r"^-6\.\d+$")).sum()))
p("lat/lng v1 vs kos_scored (id sama) identik:", bool(
    (v1.set_index("id").loc[df.id, "lat"].astype(float).values == la.values).all()))

h("4. Jarak ke kampus")
UN, IT = (-6.926132, 107.774689), (-6.928088, 107.769118)
def hav(lat, lng, c):
    R = 6371.0088
    a1, a2 = np.radians(lat), math.radians(c[0])
    dphi = a2 - a1
    dl = np.radians(c[1] - lng)
    x = np.sin(dphi/2)**2 + np.cos(a1)*math.cos(a2)*np.sin(dl/2)**2
    return 2*R*np.arcsin(np.sqrt(x))
df["hav_unpad"] = hav(la, lo, UN)
df["hav_itb"] = hav(la, lo, IT)
for c in ["jarak_unpad_km","jarak_itb_km","C2"]:
    s = df[c]
    p(f"{c}: terisi {int(s.notna().sum())}/{len(df)}, null {int(s.isna().sum())}, min {s.min():.3f}, median {s.median():.3f}, max {s.max():.3f}, unik {s.nunique()}")
p("C2 == min(unpad, itb) di semua baris:", bool(np.allclose(df.C2, df[["jarak_unpad_km","jarak_itb_km"]].min(axis=1), equal_nan=True)))
p(f"jarak Unpad dan ITB sama persis di baris yang sama: {int((df.jarak_unpad_km==df.jarak_itb_km).sum())}")
p(f"jarak = 0.0 : unpad {int((df.jarak_unpad_km==0).sum())}, itb {int((df.jarak_itb_km==0).sum())}")
p(f"jarak > 5 km: unpad {int((df.jarak_unpad_km>5).sum())}, itb {int((df.jarak_itb_km>5).sum())}; C2 > 3 km: {int((df.C2>3).sum())}")
for c, hc in [("jarak_unpad_km","hav_unpad"),("jarak_itb_km","hav_itb")]:
    r = df[c] / df[hc].replace(0, np.nan)
    p(f"{c} vs garis lurus (haversine ke titik acuan): rute<garis lurus*0.98 pada {int((df[c] < df[hc]*0.98).sum())} baris (mustahil untuk rute jalan); "
      f"rasio rute/garis-lurus median {r.median():.2f}, p90 {r.quantile(.9):.2f}, maks {r.max():.1f}")
p(f"haversine ke Unpad: median {df.hav_unpad.median():.2f} km, maks {df.hav_unpad.max():.2f}; ke ITB: median {df.hav_itb.median():.2f}, maks {df.hav_itb.max():.2f}")
p(f"jarak antara 2 titik acuan (Unpad-ITB) garis lurus: {hav(np.array([UN[0]]), np.array([UN[1]]), IT)[0]:.3f} km")
p(f"kos yang lebih dekat ke ITB dari Unpad (rute): {int((df.jarak_itb_km<df.jarak_unpad_km).sum())}; ke Unpad: {int((df.jarak_unpad_km<df.jarak_itb_km).sum())}")
# bandingkan dengan jarak listing lama (xlsx) pada id yang sama
m = df.merge(v1[["id","jarak_ke_unpad","jarak_ke_itb"]], on="id")
for a, b in [("jarak_unpad_km","jarak_ke_unpad"),("jarak_itb_km","jarak_ke_itb")]:
    mm = m.dropna(subset=[a, b])
    p(f"{a} (OSRM) vs {b} (listing v1): n={len(mm)}, Pearson={mm[a].corr(mm[b]):.3f}, Spearman={mm[a].corr(mm[b], method='spearman'):.3f}, "
      f"rute/listing median={ (mm[a]/mm[b].replace(0,np.nan)).median():.2f}, baris selisih>1 km: {int(((mm[a]-mm[b]).abs()>1).sum())}")
p(f"jarak listing v1 terisi: unpad {int(v1.jarak_ke_unpad.notna().sum())}, itb {int(v1.jarak_ke_itb.notna().sum())}, keduanya kosong {int((v1.jarak_ke_unpad.isna()&v1.jarak_ke_itb.isna()).sum())}")
ex = m.dropna(subset=["jarak_unpad_km","jarak_ke_unpad"]).assign(sel=lambda d:(d.jarak_unpad_km-d.jarak_ke_unpad).abs()).sort_values("sel", ascending=False).head(6)
p("contoh selisih terbesar Unpad (OSRM vs listing):")
p(ex[["id","nama","hav_unpad","jarak_unpad_km","jarak_ke_unpad"]].to_string(index=False))
p("kolom flag imputasi jarak ada?:", [c for c in df.columns if "imput" in c.lower()] or "TIDAK ADA")
p("kolom jarak_metode / titik gerbang ada di CSV?:", [c for c in df.columns if "metode" in c.lower() or "gerbang" in c.lower()] or "TIDAK ADA (hanya di komentar/konstanta prepare_data.py:8-9)")

h("5. Alamat, url, foto, kontak")
p(f"alamat terisi: {int(df.alamat.notna().sum())}/{len(df)}; nilai unik non-null: {df.alamat.dropna().unique().tolist()}")
p(f"url_gambar1 terisi: {int(df.url_gambar1.notna().sum())}/{len(df)}")
p("kolom url listing ada?:", [c for c in df.columns if c.lower() in ("url","sumber_url","url_listing")] or "TIDAK ADA")
p("kolom foto_url ada?:", [c for c in df.columns if "foto" in c.lower()] or "TIDAK ADA")
p("kolom kontak/wa/telp ada?:", [c for c in df.columns if c.lower().startswith(("kontak","wa","telp"))] or "TIDAK ADA")
p("kolom deposit ada?:", [c for c in df.columns if "deposit" in c.lower()] or "TIDAK ADA")
p("kolom minimarket/pasar/laundry ada?:", [c for c in df.columns if any(k in c.lower() for k in ("minimarket","pasar","laundry","warung"))] or "TIDAK ADA")
p("CSV lama: alamat unik:", old.alamat.dropna().unique().tolist(), "| lat terisi:", int(old.lat.notna().sum()))

h("6. Harga")
hg = df.harga
p(f"harga: min {hg.min():,.0f} median {hg.median():,.0f} max {hg.max():,.0f}; unik {hg.nunique()}")
frac = df[(hg % 1).round(6) != 0]
p(f"harga berdesimal (bukan rupiah bulat): {len(frac)} baris")
x12 = df[(((hg*12) - (hg*12).round()).abs() < 0.2) & ((hg % 1).round(6) != 0)]
p(f"  dari itu yang x12 hampir bulat (pola tahunan/12): {len(x12)} baris")
p("  contoh:", x12[["id","harga"]].head(5).values.tolist())
p(f"harga bukan kelipatan 1000: {int(((hg % 1000).round(6) != 0).sum())}")
p("kolom harga_bulanan/harga_tahunan/basis_harga ada?:", [c for c in df.columns if c in ("harga_bulanan","harga_tahunan","basis_harga")] or "TIDAK ADA")
p("harga v1 mentah tipe campur: string berkoma:", int(v1.harga.astype(str).str.contains(",").sum()), "| desimal x.xx:", int(v1.harga.astype(str).str.contains(r"\.\d\d$").sum()))
q1, q3 = hg.quantile([.25,.75]); thr = q3 + 1.5*(q3-q1)
p(f"outlier harga IQR (> {thr:,.0f}):", df.loc[hg>thr, ["id","nama","harga"]].values.tolist())

h("7. Luas kamar")
lk = df.luas_kamar_m2
p(f"luas: terisi {int(lk.notna().sum())}, unik {lk.nunique()}, min {lk.min()}, median {lk.median()}, max {lk.max()}")
p(f"luas == 12.0: {int((lk==12).sum())} baris ({(lk==12).mean():.1%}); distribusi nilai teratas:", lk.value_counts().head(8).to_dict())
p("kolom luas_imputasi / ukuran_kamar ada?:", [c for c in df.columns if c in ("luas_imputasi","ukuran_kamar")] or "TIDAK ADA")
# pembanding: teks ukuran di xlsx lama
xo = xl[["id","nama_kos","ukuran_kamar"]].merge(df[["id","luas_kamar_m2"]], on="id")
xo["ukuran_kamar"] = xo["ukuran_kamar"].astype(str)
p(f"xlsx lama: ukuran_kamar null {int(xl.ukuran_kamar.isna().sum())} dari {len(xl)}; nilai '12' atau '3x4' dst contoh:", xl.ukuran_kamar.head(5).tolist())
def luas_lama(s):
    mm = re.match(r"^\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*$", s)
    return float(mm.group(1).replace(",", ".")) * float(mm.group(2).replace(",", ".")) if mm else np.nan
xo["luas_dari_teks"] = xo.ukuran_kamar.map(luas_lama)
p(f"  teks ukuran_kamar lama bisa di-parse p x l: {int(xo.luas_dari_teks.notna().sum())}/{len(xo)}")
dif = xo.dropna(subset=["luas_dari_teks"])
p(f"  luas_kamar_m2 baru == p x l teks lama: {int((dif.luas_kamar_m2.sub(dif.luas_dari_teks).abs()<0.01).sum())}/{len(dif)}")
p(f"  luas baru == 12 padahal teks lama tidak 12: {int(((dif.luas_kamar_m2==12)&((dif.luas_dari_teks-12).abs()>0.01)).sum())}")
nonparse = xo[xo.luas_dari_teks.isna()]
p(f"  teks lama tidak ter-parse: {len(nonparse)} baris; luas baru pada baris itu: {nonparse.luas_kamar_m2.value_counts().head(5).to_dict()}")
p(f"  v1: luas_kamar_m2 == 12: {int((v1.luas_kamar_m2==12).sum())}/{len(v1)} ({(v1.luas_kamar_m2==12).mean():.1%}); max {v1.luas_kamar_m2.max()}")

h("8. C1..C8 (komposit) di kos_scored.csv baru")
for c in ["C1","C2","C3","C4","C5","C6","C7","C8"]:
    s = df[c]
    p(f"{c}: terisi {int(s.notna().sum())}/{len(df)}, unik {s.nunique()}")
p("C1 == harga:", bool(np.allclose(df.C1, df.harga)), "| C4 == luas_kamar_m2:", bool(np.allclose(df.C4, df.luas_kamar_m2)))
p("C3 bernilai (sintetis 0.15+0.35*C2)?: ", "tidak, semua kosong" if df.C3.isna().all() else "ADA")
p("CSV lama C3 vs 0.15+0.35*C2: maks selisih", float((old.C3 - (0.15 + 0.35*old.C2)).abs().max()))

h("9. Flag 0/1")
fl = df[FLAG]
p("nilai unik semua flag:", sorted(set(fl.values.ravel().tolist())), "| NaN:", int(fl.isna().sum().sum()))
tab = pd.DataFrame({"terisi": fl.notna().sum(), "n1": (fl==1).sum(), "pct1": ((fl==1).mean()*100).round(1), "n0": (fl==0).sum()})
p(tab.to_string())
tot = fl.sum(axis=1)
p(f"baris tanpa satu pun flag=1 (kemungkinan 'tidak tercantum'): {int((tot==0).sum())}; baris dengan <=2 flag: {int((tot<=2).sum())}; median flag=1 per baris: {tot.median()}")
p(f"kloset duduk=1 & jongkok=1: {int(((fl.kloset_duduk==1)&(fl.kloset_jongkok==1)).sum())}; keduanya 0: {int(((fl.kloset_duduk==0)&(fl.kloset_jongkok==0)).sum())}")
p(f"k_mandi_dalam=0 tapi shower=1 atau air_panas=1 (kemungkinan 0=tidak tercantum): {int(((fl.k_mandi_dalam==0)&((fl.shower==1)|(fl.air_panas==1))).sum())}")
p("dokumentasi semantik flag di repo (README/docstring 'tidak tercantum'):", "lihat langkah grep di laporan")

h("10. Tipe penghuni & id")
p("tipe_penghuni:", df.tipe_penghuni.value_counts().to_dict())
p("id: unik", df.id.nunique(), "min", df.id.min(), "max", df.id.max(), "dtype", str(df.id.dtype), "(Supabase integer: id maks di int4? 2147483647)")
(OUT / "data_v2.txt").write_text("\n".join(buf), encoding="utf-8")
