/**
 * Inti DSS kos Jatinangor — fungsi MURNI (tanpa I/O, tanpa Next.js).
 * Diverifikasi terhadap golden test dari audit model Python
 * (tests/fixtures/golden-dss.json, asal: dss-model-kos-jatinangor/audit/golden_test.json).
 *
 * Alur: filterKos (F1 budget, F2 tipe) → hitungPeringkat:
 *   bobot rank-sum → normalisasi min-max → SAW + TOPSIS (varian min-max) → ranking → Spearman.
 */
import { bobotRankSum } from "./bobot";
import { hitungSaw, hitungTopsisMinMax, normalisasiMinMax } from "./metode";
import { rankDariUrutan, urutkanSaw, urutkanTopsis } from "./ranking";
import { spearman } from "./spearman";
import type { Alternatif, DefKriteria, HasilPeringkat } from "./tipe";

export { bobotRankSum, bobotRankSumPosisi, cekUrutan, UrutanTidakValidError } from "./bobot";
export { cocokTipe, filterKos, type OpsiFilter } from "./filter";
export { hitungSaw, hitungTopsisMinMax, normalisasiMinMax } from "./metode";
export { bulatkanTampilan, DESIMAL_BANDING, DESIMAL_TAMPILAN, untukBanding } from "./ranking";
export { spearman } from "./spearman";
export type { Alternatif, DefKriteria, HasilKos, HasilPeringkat } from "./tipe";

/**
 * Hitung peringkat kandidat (yang SUDAH difilter).
 * @param kriteria definisi kriteria (kode + jenis), biasanya `KRITERIA` dari config
 * @param urutan urutan prioritas, index 0 = paling penting; harus permutasi tepat dari kode kriteria
 * @throws UrutanTidakValidError kalau urutan tidak valid
 */
export function hitungPeringkat<K extends string>(
  kandidat: readonly Alternatif<K>[],
  kriteria: readonly DefKriteria<K>[],
  urutan: readonly K[],
): HasilPeringkat<K> {
  const bobot = bobotRankSum(
    urutan,
    kriteria.map((k) => k.kode),
  );
  if (kandidat.length === 0) return { bobot, hasil: [], spearman: null };

  const norm = normalisasiMinMax(kandidat, kriteria);
  const saw = hitungSaw(norm, bobot);
  const topsis = hitungTopsisMinMax(norm, bobot);

  const data = kandidat.map((a, i) => ({ id: a.id, harga: a.harga, saw: saw[i], topsis: topsis[i] }));
  const urutanSaw = urutkanSaw(data);
  const rankSaw = rankDariUrutan(urutanSaw);
  const rankTopsis = rankDariUrutan(urutkanTopsis(data));

  return {
    bobot,
    hasil: urutanSaw.map((i) => ({
      id: kandidat[i].id,
      rank: rankSaw[i],
      skor_saw: saw[i],
      skor_topsis: topsis[i],
      rank_topsis: rankTopsis[i],
      skor_kriteria: norm[i],
    })),
    spearman: spearman(saw, topsis),
  };
}
