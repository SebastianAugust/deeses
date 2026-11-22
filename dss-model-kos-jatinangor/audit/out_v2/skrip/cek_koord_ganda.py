import sys; sys.dont_write_bytecode=True
from pathlib import Path
import pandas as pd, numpy as np
ROOT, OUT = Path(sys.argv[1]), Path(sys.argv[2])
v1 = pd.read_csv(ROOT/"dataset"/"dataset_kos_v1.csv", encoding="utf-8-sig").reset_index().rename(columns={"index":"urut"})
buf=[]
def p(*a):
    s=" ".join(str(x) for x in a); print(s); buf.append(s)
v1["pos"]=v1.groupby(["lat","lng"]).cumcount()
g=v1.groupby(["lat","lng"])
n=g.id.transform("count"); d=v1[n>1].copy()
p(f"v1: {len(v1)} baris; baris yang berbagi (lat,lng) persis dgn kos lain: {len(d)} ({len(d)/len(v1):.0%}); jumlah titik: {d.groupby(['lat','lng']).ngroups}; ukuran grup: {d.groupby(['lat','lng']).size().value_counts().to_dict()}")
# apakah pasangan = satu baris punya jarak Unpad, satu lagi punya jarak ITB?
res=[]
for (la,lo),x in d.groupby(["lat","lng"]):
    a=x.iloc[0]; b=x.iloc[1]
    res.append(dict(urut_a=a.urut,urut_b=b.urut,selisih_urut=abs(a.urut-b.urut),
        a_unpad=pd.notna(a.jarak_ke_unpad),a_itb=pd.notna(a.jarak_ke_itb),b_unpad=pd.notna(b.jarak_ke_unpad),b_itb=pd.notna(b.jarak_ke_itb),
        sama_tipe=a.tipe_kos==b.tipe_kos, sama_harga=a.harga==b.harga, sama_flag=(a[[c for c in v1.columns if c in ("ac","wifi","cctv","penjaga")]].values==b[[c for c in v1.columns if c in ("ac","wifi","cctv","penjaga")]].values).all()))
r=pd.DataFrame(res)
p("pasangan: selisih urutan baris di file — median", r.selisih_urut.median(), ", min", r.selisih_urut.min(), ", maks", r.selisih_urut.max())
p("pasangan yang hanya satu sisi punya jarak Unpad & sisi lain hanya ITB:", int(((r.a_unpad&~r.a_itb&r.b_itb&~r.b_unpad)|(r.b_unpad&~r.b_itb&r.a_itb&~r.a_unpad)).sum()),"dari",len(r))
p("pasangan tipe_kos sama:", int(r.sama_tipe.sum()), "| harga sama:", int(r.sama_harga.sum()))
p("posisi baris (urut) anggota pasangan: kuartil pertama [0-89] vs sisanya ->", "a<180:", int((r.urut_a<180).sum()), "b>=180:", int((r.urut_b>=180).sum()))
ex=d.sort_values(["lat","lng"]).head(8)[["urut","id","nama_kos","tipe_kos","harga","jarak_ke_unpad","jarak_ke_itb","lat","lng"]]
p(ex.to_string(index=False))
(OUT/"koordinat_ganda_v2.txt").write_text("\n".join(buf),encoding="utf-8")
