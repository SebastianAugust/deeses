import sys; sys.dont_write_bytecode=True
import math, re
from pathlib import Path
import numpy as np, pandas as pd
ROOT, OLD, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
df = pd.read_csv(ROOT/"kos_scored.csv"); v1 = pd.read_csv(ROOT/"dataset"/"dataset_kos_v1.csv", encoding="utf-8-sig")
xl = pd.read_excel(OLD/"old.xlsx", sheet_name="Data Kos")
buf=[]
def p(*a):
    s=" ".join(str(x) for x in a); print(s); buf.append(s)
UN, IT = (-6.926132, 107.774689), (-6.928088, 107.769118)
def hav(lat,lng,c):
    R=6371.0088; a1=np.radians(lat); a2=math.radians(c[0]); dphi=a2-a1; dl=np.radians(c[1]-lng)
    x=np.sin(dphi/2)**2+np.cos(a1)*math.cos(a2)*np.sin(dl/2)**2; return 2*R*np.arcsin(np.sqrt(x))
df["hu"]=hav(df.lat,df.lng,UN); df["hi"]=hav(df.lat,df.lng,IT)
m = df.merge(v1[["id","jarak_ke_unpad","jarak_ke_itb"]], on="id")
p("== Korelasi tiga sumber jarak (Pearson / Spearman) ==")
for k,(o,l,hh) in {"Unpad":("jarak_unpad_km","jarak_ke_unpad","hu"),"ITB":("jarak_itb_km","jarak_ke_itb","hi")}.items():
    mm=m.dropna(subset=[o,l])
    p(f"{k}: n={len(mm)}  OSRM~listing {mm[o].corr(mm[l]):.3f}/{mm[o].corr(mm[l],method='spearman'):.3f} | garis-lurus~listing {mm[hh].corr(mm[l]):.3f}/{mm[hh].corr(mm[l],method='spearman'):.3f} | garis-lurus~OSRM {mm[hh].corr(mm[o]):.3f}/{mm[hh].corr(mm[o],method='spearman'):.3f}")
p("\n== Jarak Unpad (OSRM) per bin garis-lurus ==")
df["bin"]=pd.cut(df.hu,[0,0.5,1,1.5,2,3])
p(df.groupby("bin",observed=True).agg(n=("id","count"),osrm_med=("jarak_unpad_km","median"),osrm_min=("jarak_unpad_km","min"),osrm_max=("jarak_unpad_km","max")).round(2).to_string())
p("\nkos dgn garis-lurus Unpad <0.5 km tetapi rute Unpad > 3 km:", int(((df.hu<0.5)&(df.jarak_unpad_km>3)).sum()))
p(df[(df.hu<0.5)].sort_values("jarak_unpad_km",ascending=False)[["id","nama","hu","jarak_unpad_km","jarak_itb_km"]].head(5).round(3).to_string(index=False))
p("\n== Kos 'Cileunyi' & 'Rancaekek' ==")
p(df[df.nama.str.contains("Cileunyi|Rancaekek")][["id","nama","lat","lng","hu","hi","jarak_unpad_km","jarak_itb_km"]].round(3).to_string(index=False))
p("\n== Koordinat sama persis dipakai nama berbeda-basis? ==")
df["basis"]=df.nama.str.replace(r"\s*(Tipe|Type)\s*\S+.*$","",regex=True).str.replace(r"\s+Jatinangor.*$|\s+Bandung$","",regex=True).str.strip().str.lower()
g=df.groupby(["lat","lng"]).agg(n=("id","count"),basis=("basis","nunique"),nama=("nama",lambda s:" | ".join(s)))
gg=g[g.n>1]
p(f"titik koordinat identik dipakai >1 kos: {len(gg)} titik; dari itu basis nama BERBEDA (kemungkinan koordinat tebakan/geokode area): {int((gg.basis>1).sum())}")
p(gg[gg.basis>1].head(8).to_string())
p("\n== Luas: 59 baris yang jadi 12 padahal teks xlsx lama bukan 12 ==")
def luas(s):
    mm=re.match(r"^\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*$",str(s)); return float(mm.group(1).replace(",","."))*float(mm.group(2).replace(",",".")) if mm else np.nan
xo=xl[["id","nama_kos","ukuran_kamar"]].merge(df[["id","luas_kamar_m2"]],on="id"); xo["dari_teks"]=xo.ukuran_kamar.map(luas)
b=xo[(xo.luas_kamar_m2==12)&((xo.dari_teks-12).abs()>0.01)]
p(f"n={len(b)}; contoh teks lama -> luas baru:"); p(b.head(8)[["id","ukuran_kamar","dari_teks","luas_kamar_m2"]].to_string(index=False))
p("distribusi dari_teks pada 59 baris itu (ringkas):", b.dari_teks.round(1).value_counts().head(8).to_dict())
d2=xo[(xo.luas_kamar_m2!=12)&((xo.dari_teks-xo.luas_kamar_m2).abs()>0.01)]
p(f"baris lain selisih luas baru vs teks lama (bukan 12): {len(d2)}"); p(d2.head(6)[["id","ukuran_kamar","dari_teks","luas_kamar_m2"]].to_string(index=False))
p("jumlah teks lama tepat '3x4' atau 12 m2:", int(((xo.dari_teks-12).abs()<0.01).sum()))
(OUT/"jarak_koordinat_luas_v2.txt").write_text("\n".join(buf),encoding="utf-8")
