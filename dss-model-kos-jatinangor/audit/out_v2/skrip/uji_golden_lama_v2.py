"""Menjalankan golden_test.json (audit v1, 4 kasus hitung-tangan) terhadap model_dss.py SEKARANG.
K1..K3 didaftarkan sementara ke m.KATALOG_KRITERIA di memori saja (file teman tidak diubah)."""
from __future__ import annotations
import sys
sys.dont_write_bytecode = True
import json
from pathlib import Path
import numpy as np, pandas as pd
HERE = Path(__file__).resolve().parent; ROOT = HERE.parents[2]; OUT = HERE.parent
sys.path.insert(0, str(ROOT))
import model_dss as m
g = json.loads((ROOT / "audit" / "golden_test.json").read_text(encoding="utf-8"))
m.KATALOG_KRITERIA.update({"K1": "cost", "K2": "cost", "K3": "benefit"})
buf = []
def p(*a):
    s = " ".join(str(x) for x in a); print(s); buf.append(s)
semua = True
for nama, kasus in g["kasus"].items():
    inp, exp = kasus["input"], kasus["expected"]
    urutan = inp["urutan_kriteria"]; ids = [a["id"] for a in inp["alternatif"]]
    df = pd.DataFrame([{"id": i, "nama": i, "tipe_penghuni": "putra", "harga": a["nilai"]["K1"], **a["nilai"]} for i, a in enumerate(inp["alternatif"], start=1)])
    df["kode"] = ids
    try:
        w = m.hitung_bobot_ranksum(urutan); nd = m.normalisasi_minmax(df, urutan)
        s = m.hitung_saw(nd, w, urutan); t = m.hitung_topsis_minmax(nd, w, urutan)
        c_w = all(abs(w[k] - exp["bobot"][k]) < 1e-9 for k in w)
        c_s = bool(np.allclose(s, [exp["skor_saw"][i] for i in ids], atol=1e-9))
        c_t = bool(np.allclose(t, [exp["skor_topsis_minmax"][i] for i in ids], atol=1e-9))
        out = m.rank_kos(df, 10**9, "putra", urutan)
        id_by = dict(zip(df["id"].astype(str), ids))
        urut_model = [id_by[r["id"]] for r in out["hasil"]]
        c_u = urut_model == exp["urutan_id"]
        raw = [repr(float(x)) for x in s]
        p(f"{nama:15s} bobot={c_w} SAW={c_s} TOPSIS_minmax={c_t} urutan_rank_kos={c_u} (model: {urut_model} | harapan: {exp['urutan_id']}) SAW mentah={raw}")
        semua &= c_w and c_s and c_t and c_u
    except Exception as e:
        p(f"{nama:15s} GALAT {type(e).__name__}: {e}"); semua = False
p("SEMUA COCOK" if semua else "ADA YANG BEDA / GALAT")
(OUT / "uji_golden_lama_v2.txt").write_text("\n".join(buf), encoding="utf-8")
