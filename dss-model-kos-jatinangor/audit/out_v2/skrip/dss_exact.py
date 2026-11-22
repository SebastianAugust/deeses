"""
Mesin DSS INDEPENDEN v2 untuk audit (ditulis dari rumus, TIDAK menyalin model_dss.py
maupun src/lib/dss). Semua hitungan memakai `decimal` presisi 60 digit, jadi hasilnya
tidak bergantung pada urutan penjumlahan floating point (numpy np.dot vs loop JS).
Nilai "tanpa pembulatan" di golden = float(Decimal) hasil hitungan eksak ini.

Konvensi:
  kriteria  : list of dict {kode, jenis('cost'|'benefit'), kolom}   (urut prioritas, index 0 terpenting)
  baris     : list of dict {id:int, harga:str|float, <kolom>: angka|None}
"""
from __future__ import annotations

import sys
sys.dont_write_bytecode = True

from decimal import Decimal, getcontext, ROUND_HALF_UP

getcontext().prec = 60
SEMBILAN = Decimal("1e-9")


def D(x) -> Decimal:
    return Decimal(str(x))


def r9(x: Decimal) -> Decimal:
    """Pembulatan 9 desimal (setengah ke atas) untuk membandingkan skor / mendeteksi seri."""
    return x.quantize(SEMBILAN, rounding=ROUND_HALF_UP)


def bobot_rank_sum(n: int) -> list[Decimal]:
    """w_r = 2(n-r+1) / (n(n+1)), r = 1..n. n=1 -> [1]."""
    if n < 1:
        raise ValueError("minimal 1 kriteria")
    return [Decimal(2 * (n - r + 1)) / Decimal(n * (n + 1)) for r in range(1, n + 1)]


def normalisasi(nilai: list[list[Decimal]], jenis: list[str]) -> list[list[Decimal]]:
    """nilai[i][j]; per kolom j min-max atas himpunan kandidat yang diberikan.
    cost (max-x)/(max-min); benefit (x-min)/(max-min); max==min -> 1."""
    m, n = len(nilai), len(jenis)
    out = [[Decimal(0)] * n for _ in range(m)]
    for j in range(n):
        kol = [nilai[i][j] for i in range(m)]
        lo, hi = min(kol), max(kol)
        for i in range(m):
            if hi == lo:
                out[i][j] = Decimal(1)
            elif jenis[j] == "cost":
                out[i][j] = (hi - kol[i]) / (hi - lo)
            else:
                out[i][j] = (kol[i] - lo) / (hi - lo)
    return out


def saw(norm, w):
    return [sum((w[j] * row[j] for j in range(len(w))), Decimal(0)) for row in norm]


def topsis_minmax(norm, w):
    """TOPSIS di atas matriks min-max (varian proyek): v = w*r, ideal+ = max, ideal- = min per kolom.
    1 kandidat -> [1]; d+ + d- == 0 -> 1."""
    m = len(norm)
    if m == 0:
        return []
    if m == 1:
        return [Decimal(1)]
    n = len(w)
    V = [[w[j] * row[j] for j in range(n)] for row in norm]
    pos = [max(V[i][j] for i in range(m)) for j in range(n)]
    neg = [min(V[i][j] for i in range(m)) for j in range(n)]
    out = []
    for v in V:
        dp = sum(((v[j] - pos[j]) ** 2 for j in range(n)), Decimal(0)).sqrt()
        dn = sum(((v[j] - neg[j]) ** 2 for j in range(n)), Decimal(0)).sqrt()
        out.append(Decimal(1) if dp + dn == 0 else dn / (dp + dn))
    return out


def urutan_rank(saw_s, top_s, harga, ids, utama="saw"):
    """Indeks terurut. utama='saw': SAW desc -> TOPSIS desc -> harga asc -> id asc.
    utama='topsis': TOPSIS desc -> SAW desc -> harga asc -> id asc. Skor dibandingkan di 9 desimal.
    id dibandingkan sebagai ANGKA (id kolom integer di Supabase)."""
    def kunci(i):
        a, b = r9(saw_s[i]), r9(top_s[i])
        return (-a, -b, harga[i], ids[i]) if utama == "saw" else (-b, -a, harga[i], ids[i])
    return sorted(range(len(ids)), key=kunci)


def rank_unik(urut):
    rank = [0] * len(urut)
    for pos, i in enumerate(urut, start=1):
        rank[i] = pos
    return rank


def _rank_rata2(x):
    urut = sorted(range(len(x)), key=lambda i: x[i])
    r = [Decimal(0)] * len(x)
    i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and x[urut[j + 1]] == x[urut[i]]:
            j += 1
        rata = Decimal(i + j) / 2 + 1
        for t in range(i, j + 1):
            r[urut[t]] = rata
        i = j + 1
    return r


def spearman(x, y):
    """Pearson atas rank rata-rata dari skor yang dibulatkan 9 desimal. None bila n<3 atau salah satu konstan."""
    n = len(x)
    if n < 3:
        return None
    rx, ry = _rank_rata2([r9(v) for v in x]), _rank_rata2([r9(v) for v in y])
    mx, my = sum(rx) / n, sum(ry) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sxx = sum((a - mx) ** 2 for a in rx)
    syy = sum((b - my) ** 2 for b in ry)
    if sxx == 0 or syy == 0:
        return None
    return sxy / (sxx * syy).sqrt()


def filter_f1_f2(baris, budget, tipe, ikutkan_campur=False):
    """F1 harga <= budget; F2 tipe sama persis (+campur bila diizinkan untuk putra/putri)."""
    ok = {tipe} | ({"campur"} if ikutkan_campur and tipe in ("putra", "putri") else set())
    return [b for b in baris if D(b["harga"]) <= D(budget) and str(b["tipe_penghuni"]).strip().lower() in ok]


def hitung(baris, budget, tipe, kriteria, ikutkan_campur=False):
    """Pipeline lengkap. Mengembalikan dict berisi semuanya sebagai Decimal/None (belum dibulatkan)."""
    lolos = filter_f1_f2(baris, budget, tipe, ikutkan_campur)
    kosong = [b for b in lolos if any(b.get(k["kolom"]) is None for k in kriteria)]
    ids_kosong = {b["id"] for b in kosong}
    lengkap = [b for b in lolos if b["id"] not in ids_kosong]
    n = len(kriteria)
    w = bobot_rank_sum(n)
    jenis = [k["jenis"] for k in kriteria]
    nilai = [[D(b[k["kolom"]]) for k in kriteria] for b in lengkap]
    norm = normalisasi(nilai, jenis) if lengkap else []
    s = saw(norm, w) if lengkap else []
    t = topsis_minmax(norm, w) if lengkap else []
    ids = [b["id"] for b in lengkap]
    harga = [D(b["harga"]) for b in lengkap]
    u_saw = urutan_rank(s, t, harga, ids, "saw") if lengkap else []
    u_top = urutan_rank(s, t, harga, ids, "topsis") if lengkap else []
    return dict(lolos=lolos, lengkap=lengkap, kosong=kosong, bobot=w, norm=norm, saw=s, topsis=t,
                urut_saw=u_saw, rank_saw=rank_unik(u_saw), rank_topsis=rank_unik(u_top),
                spearman=spearman(s, t) if lengkap else None)
