"""
Implementasi SAW + TOPSIS INDEPENDEN untuk audit (ditulis ulang dari rumus,
tidak menyalin model_dss.py). Sengaja pakai Python murni (tanpa numpy/pandas)
supaya strukturnya mudah dipindah 1:1 ke TypeScript (src/lib/dss/).

Konvensi:
- kriteria : list of (kode, jenis) dengan jenis "cost" | "benefit"
- alternatif: list of dict {"id": str, "nilai": {kode: angka}, ...}
- urutan   : list kode kriteria, index 0 = paling penting
"""
from __future__ import annotations

from math import sqrt

KRITERIA_DEFAULT = [
    ("C1", "cost"), ("C2", "cost"), ("C3", "cost"), ("C4", "benefit"),
    ("C5", "benefit"), ("C6", "benefit"), ("C7", "benefit"), ("C8", "benefit"),
]


# ---------------------------------------------------------------- bobot
def bobot_rank_sum(urutan: list[str], kriteria: list[tuple[str, str]]):
    """w_r = 2(n - r + 1) / (n(n + 1)), r = 1 untuk yang terpenting.
    n diambil dari jumlah kriteria di config (dinamis, tidak hardcode 8)."""
    kode = [k for k, _ in kriteria]
    if sorted(urutan) != sorted(kode) or len(set(urutan)) != len(urutan):
        raise ValueError("urutan harus permutasi tepat dari kode kriteria config")
    n = len(urutan)
    return {k: 2 * (n - r + 1) / (n * (n + 1)) for r, k in enumerate(urutan, start=1)}


# ---------------------------------------------------------------- normalisasi
def normalisasi_minmax(alternatif, kriteria, nilai_konstan=1.0):
    """Min-max per kolom, dihitung di atas HIMPUNAN KANDIDAT (setelah filter).
    cost   : (max - x) / (max - min)
    benefit: (x - min) / (max - min)
    max == min  -> semua diberi `nilai_konstan` (model teman: 1.0)."""
    hasil = [dict() for _ in alternatif]
    for kode, jenis in kriteria:
        kolom = [a["nilai"][kode] for a in alternatif]
        lo, hi = min(kolom), max(kolom)
        for i, x in enumerate(kolom):
            if hi == lo:
                hasil[i][kode] = nilai_konstan
            elif jenis == "cost":
                hasil[i][kode] = (hi - x) / (hi - lo)
            else:
                hasil[i][kode] = (x - lo) / (hi - lo)
    return hasil


# ---------------------------------------------------------------- SAW
def saw(norm, bobot):
    return [sum(bobot[k] * r[k] for k in bobot) for r in norm]


# ---------------------------------------------------------------- TOPSIS
def _closeness(v, ideal_pos, ideal_neg, kode):
    d_pos = sqrt(sum((v[k] - ideal_pos[k]) ** 2 for k in kode))
    d_neg = sqrt(sum((v[k] - ideal_neg[k]) ** 2 for k in kode))
    if d_pos + d_neg == 0:
        return 1.0  # semua alternatif identik (atau hanya 1)
    return d_neg / (d_pos + d_neg)


def topsis_minmax(norm, bobot):
    """Varian yang dipakai teman: matriks keputusan = hasil min-max (sudah
    searah 'makin besar makin baik'), lalu dibobot, ideal+ = max, ideal- = min."""
    kode = list(bobot)
    V = [{k: bobot[k] * r[k] for k in kode} for r in norm]
    pos = {k: max(v[k] for v in V) for k in kode}
    neg = {k: min(v[k] for v in V) for k in kode}
    return [_closeness(v, pos, neg, kode) for v in V]


def topsis_vektor(alternatif, kriteria, bobot):
    """TOPSIS standar (Hwang & Yoon 1981): r_ij = x_ij / sqrt(sum_i x_ij^2),
    v = w * r, ideal+ = max (benefit) / min (cost), ideal- kebalikannya."""
    kode = [k for k, _ in kriteria]
    jenis = dict(kriteria)
    pemb = {k: sqrt(sum(a["nilai"][k] ** 2 for a in alternatif)) for k in kode}
    V = [{k: (bobot[k] * a["nilai"][k] / pemb[k]) if pemb[k] else 0.0 for k in kode}
         for a in alternatif]
    pos, neg = {}, {}
    for k in kode:
        col = [v[k] for v in V]
        if jenis[k] == "benefit":
            pos[k], neg[k] = max(col), min(col)
        else:
            pos[k], neg[k] = min(col), max(col)
    return [_closeness(v, pos, neg, kode) for v in V]


# ---------------------------------------------------------------- ranking
EPS_DIGIT = 9  # seri = sama sampai 9 desimal (meredam galat floating point)


def ranking(alternatif, skor_saw, skor_topsis, kunci_harga="harga"):
    """Urutan usulan audit (deterministik, TANPA pembulatan 4 desimal sebelum
    ranking): SAW desc -> TOPSIS desc -> harga asc -> id asc. Rank unik 1..n.
    Skor dibandingkan setelah round(.., 9) supaya 0.49999999999999994 == 0.5."""
    idx = sorted(
        range(len(alternatif)),
        key=lambda i: (-round(skor_saw[i], EPS_DIGIT), -round(skor_topsis[i], EPS_DIGIT),
                       alternatif[i].get(kunci_harga, 0), str(alternatif[i]["id"])),
    )
    rank = [0] * len(alternatif)
    for pos, i in enumerate(idx, start=1):
        rank[i] = pos
    return idx, rank


def rank_kompetisi(skor):
    """Rank '1,2,2,4' (setara pandas rank(method='min', ascending=False))."""
    return [1 + sum(1 for y in skor if y > x) for x in skor]


# ---------------------------------------------------------------- spearman
def _rank_rata2(x):
    urut = sorted(range(len(x)), key=lambda i: x[i])
    r = [0.0] * len(x)
    i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and x[urut[j + 1]] == x[urut[i]]:
            j += 1
        rata = (i + j) / 2 + 1
        for t in range(i, j + 1):
            r[urut[t]] = rata
        i = j + 1
    return r


def spearman(x, y):
    """Pearson atas rank rata-rata (menangani seri). None kalau n<3 atau
    salah satu konstan (korelasi tidak terdefinisi / tidak bermakna)."""
    n = len(x)
    if n < 3:
        return None
    rx, ry = _rank_rata2(x), _rank_rata2(y)
    mx, my = sum(rx) / n, sum(ry) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sxx = sum((a - mx) ** 2 for a in rx)
    syy = sum((b - my) ** 2 for b in ry)
    if sxx == 0 or syy == 0:
        return None
    return sxy / sqrt(sxx * syy)


# ---------------------------------------------------------------- filter
def filter_kandidat(baris, budget, tipe, campur_ikut=False):
    """F1: harga <= budget. F2: tipe sama persis (atau + campur kalau diizinkan)."""
    out = []
    for b in baris:
        if budget is not None and budget > 0 and b["harga"] > budget:
            continue
        t = str(b["tipe_penghuni"]).strip().lower()
        if tipe:
            ok = {tipe} | ({"campur"} if campur_ikut and tipe in ("putra", "putri") else set())
            if t not in ok:
                continue
        out.append(b)
    return out


def peringkat(baris, budget, tipe, urutan, kriteria=KRITERIA_DEFAULT, campur_ikut=False):
    """Pipeline lengkap versi audit. `baris`: list dict dengan kunci id, harga,
    tipe_penghuni, dan kode kriteria."""
    kand = filter_kandidat(baris, budget, tipe, campur_ikut)
    bobot = bobot_rank_sum(urutan, kriteria)
    if not kand:
        return {"bobot": bobot, "hasil": [], "spearman_minmax": None, "spearman_vektor": None}
    alt = [{"id": str(b["id"]), "harga": b["harga"],
            "nilai": {k: float(b[k]) for k, _ in kriteria}} for b in kand]
    norm = normalisasi_minmax(alt, kriteria)
    s = saw(norm, bobot)
    t_mm = topsis_minmax(norm, bobot)
    t_vk = topsis_vektor(alt, kriteria, bobot)
    idx, rank = ranking(alt, s, t_mm)
    hasil = [{"id": alt[i]["id"], "rank": rank[i], "skor_saw": s[i],
              "skor_topsis": t_mm[i], "skor_topsis_vektor": t_vk[i],
              "skor_kriteria": norm[i]} for i in idx]
    return {"bobot": bobot, "hasil": hasil,
            "spearman_minmax": spearman(s, t_mm),
            "spearman_vektor": spearman(s, t_vk)}
