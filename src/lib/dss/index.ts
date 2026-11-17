/**
 * Inti DSS kos Jatinangor — fungsi MURNI (tanpa I/O, tanpa Next.js).
 * Diverifikasi terhadap golden test dari audit model Python
 * (tests/fixtures/golden-dss.json, asal: dss-model-kos-jatinangor/audit/golden_test.json).
 *
 * Alur: filterKos (F1 budget, F2 tipe) → hitungPeringkat:
 *   kecualikan kandidat dengan data kosong di kriteria terpasang → bobot rank-sum
 *   (n = jumlah kriteria terpasang) → normalisasi min-max → SAW + TOPSIS (varian
 *   min-max) → ranking → Spearman.
 */
import { bobotRankSum } from "./bobot";
import { hitungSaw, hitungTopsisMinMax, nilaiBerhingga, normalisasiMinMax } from "./metode";
import { rankDariUrutan, urutkanSaw, urutkanTopsis } from "./ranking";
import { spearman } from "./spearman";
import type { Alternatif, DefKriteria, HasilPeringkat } from "./tipe";

export { bobotRankSum, bobotRankSumPosisi, cekUrutan, UrutanTidakValidError } from "./bobot";
export { cocokTipe, filterKos, type OpsiFilter } from "./filter";
export { hitungSaw, hitungTopsisMinMax, nilaiBerhingga, normalisasiMinMax } from "./metode";
export { bulatkanTampilan, DESIMAL_BANDING, DESIMAL_TAMPILAN, untukBanding } from "./ranking";
export { spearman } from "./spearman";
export type { Alternatif, BobotKriteria, DefKriteria, HasilKos, HasilPeringkat } from "./tipe";

/**
 * Pisahkan kandidat berdata lengkap dari yang kosong di ≥ 1 kriteria terpasang.
 * Tidak ada imputasi: kandidat yang kosong dikecualikan dan dihitung.
 */
export function pisahkanTanpaData<K extends string>(
  kandidat: readonly Alternatif<K>[],
  kriteria: readonly DefKriteria<K>[],
): { lengkap: Alternatif<K>[]; jumlah_tanpa_data: number; tanpa_data_per_kriteria: Record<K, number> } {
  const perKriteria = Object.fromEntries(kriteria.map((k) => [k.kode, 0])) as Record<K, number>;
  const lengkap: Alternatif<K>[] = [];
  let tanpaData = 0;
  for (const a of kandidat) {
    let kosong = false;
    for (const { kode } of kriteria) {
      if (nilaiBerhingga(a.nilai[kode]) === null) {
        perKriteria[kode] += 1;
        kosong = true;
      }
    }
    if (kosong) tanpaData += 1;
    else lengkap.push(a);
  }
  return { lengkap, jumlah_tanpa_data: tanpaData, tanpa_data_per_kriteria: perKriteria };
}

/**
 * Hitung peringkat kandidat (yang SUDAH difilter F1/F2).
 * @param kriteria kriteria terpasang, TERURUT prioritas (index 0 = terpenting); n = panjangnya
 * @throws UrutanTidakValidError kalau kriteria kosong atau ada kode duplikat
 */
export function hitungPeringkat<K extends string>(
  kandidat: readonly Alternatif<K>[],
  kriteria: readonly DefKriteria<K>[],
): HasilPeringkat<K> {
  const bobot = bobotRankSum(kriteria.map((k) => k.kode));
  const kriteria_dipakai = kriteria.map((k) => ({ kode: k.kode, bobot: bobot[k.kode] }));
  const { lengkap, jumlah_tanpa_data, tanpa_data_per_kriteria } = pisahkanTanpaData(kandidat, kriteria);
  const dasar = { bobot, kriteria_dipakai, jumlah_tanpa_data, tanpa_data_per_kriteria };
  if (lengkap.length === 0) return { ...dasar, hasil: [], spearman: null };

  const norm = normalisasiMinMax(lengkap, kriteria);
  const saw = hitungSaw(norm, bobot);
  const topsis = hitungTopsisMinMax(norm, bobot);

  const data = lengkap.map((a, i) => ({ id: a.id, harga: a.harga, saw: saw[i], topsis: topsis[i] }));
  const urutanSaw = urutkanSaw(data);
  const rankSaw = rankDariUrutan(urutanSaw);
  const rankTopsis = rankDariUrutan(urutkanTopsis(data));

  return {
    ...dasar,
    hasil: urutanSaw.map((i) => ({
      id: lengkap[i].id,
      rank: rankSaw[i],
      skor_saw: saw[i],
      skor_topsis: topsis[i],
      rank_topsis: rankTopsis[i],
      skor_kriteria: norm[i],
    })),
    spearman: spearman(saw, topsis),
  };
}
