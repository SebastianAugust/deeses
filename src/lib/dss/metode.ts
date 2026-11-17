import type { Alternatif, DefKriteria } from "./tipe";

/** Nilai kriteria sebagai angka berhingga, atau null kalau kosong/NaN/tak berhingga. */
export function nilaiBerhingga(x: number | null | undefined): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/**
 * Normalisasi min-max per kriteria, dihitung atas KANDIDAT hasil filter yang
 * datanya lengkap (kandidat dengan data kosong sudah dikecualikan sebelumnya):
 *   cost    : (max − x) / (max − min)
 *   benefit : (x − min) / (max − min)
 *   max = min → 1,0 untuk semua (kriteria tidak membedakan).
 * Hasil selalu searah "1 = terbaik". Skor bersifat relatif terhadap kandidat.
 * @throws Error kalau masih ada nilai kosong (tidak pernah diimputasi diam-diam)
 */
export function normalisasiMinMax<K extends string>(
  alternatif: readonly Alternatif<K>[],
  kriteria: readonly DefKriteria<K>[],
): Record<K, number>[] {
  const hasil = alternatif.map(() => ({}) as Record<K, number>);
  for (const { kode, jenis } of kriteria) {
    let min = Infinity;
    let max = -Infinity;
    const xs = alternatif.map((a) => {
      const x = nilaiBerhingga(a.nilai[kode]);
      if (x === null) {
        throw new Error(`nilai ${kode} untuk kos ${a.id} bukan angka berhingga: ${a.nilai[kode]}`);
      }
      if (x < min) min = x;
      if (x > max) max = x;
      return x;
    });
    const rentang = max - min;
    alternatif.forEach((_, i) => {
      const x = xs[i];
      hasil[i][kode] =
        rentang === 0 ? 1 : jenis === "cost" ? (max - x) / rentang : (x - min) / rentang;
    });
  }
  return hasil;
}

/** SAW: Σ w_j · r_ij. */
export function hitungSaw<K extends string>(
  norm: readonly Record<K, number>[],
  bobot: Record<K, number>,
): number[] {
  const kode = Object.keys(bobot) as K[];
  return norm.map((r) => kode.reduce((s, k) => s + bobot[k] * r[k], 0));
}

/**
 * TOPSIS dengan normalisasi MIN-MAX — BUKAN TOPSIS standar (Hwang & Yoon yang
 * memakai normalisasi vektor x/√Σx²). Matriksnya sama dengan SAW, sehingga
 * perbedaan SAW vs TOPSIS murni dari cara agregasi (lihat AUDIT.md bagian 2c).
 *
 *   v_ij = w_j · r_ij (r sudah searah "1 = terbaik", jadi semua kriteria diperlakukan benefit)
 *   ideal+ = max_i v_ij, ideal− = min_i v_ij
 *     → untuk kriteria yang bervariasi: ideal+ = w_j, ideal− = 0
 *   C_i = d−/(d+ + d−)
 * 0 kandidat → [], 1 kandidat → [1], d+ + d− = 0 (semua identik) → 1.
 */
export function hitungTopsisMinMax<K extends string>(
  norm: readonly Record<K, number>[],
  bobot: Record<K, number>,
): number[] {
  if (norm.length === 0) return [];
  if (norm.length === 1) return [1];
  const kode = Object.keys(bobot) as K[];
  const V = norm.map((r) => kode.map((k) => bobot[k] * r[k]));
  const idealPos = kode.map((_, j) => Math.max(...V.map((v) => v[j])));
  const idealNeg = kode.map((_, j) => Math.min(...V.map((v) => v[j])));
  return V.map((v) => {
    const dPos = Math.sqrt(v.reduce((s, x, j) => s + (x - idealPos[j]) ** 2, 0));
    const dNeg = Math.sqrt(v.reduce((s, x, j) => s + (x - idealNeg[j]) ** 2, 0));
    const total = dPos + dNeg;
    return total === 0 ? 1 : dNeg / total;
  });
}
