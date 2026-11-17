import type { JenisKriteria } from "@/config/kriteria";

/**
 * Definisi kriteria minimal yang dibutuhkan perhitungan (generik di kode).
 * Daftar `DefKriteria[]` yang diberikan ke `hitungPeringkat` SUDAH TERURUT:
 * index 0 = prioritas tertinggi.
 */
export type DefKriteria<K extends string> = { readonly kode: K; readonly jenis: JenisKriteria };

/**
 * Satu alternatif (kos) yang sudah lolos filter, dengan nilai mentah per kriteria.
 * Nilai null/undefined/NaN/±Infinity = data kosong → kos dikecualikan (tidak diimputasi).
 */
export type Alternatif<K extends string> = {
  id: string;
  /** Rupiah; dipakai sebagai pemutus seri ke-3 (lebih murah menang). */
  harga: number;
  nilai: Partial<Record<K, number | null>>;
};

/** Hasil per kos. Skor TIDAK dibulatkan; bulatkan hanya untuk tampilan (`bulatkanTampilan`). */
export type HasilKos<K extends string> = {
  id: string;
  /** Peringkat SAW, unik 1..n. */
  rank: number;
  skor_saw: number;
  skor_topsis: number;
  /** Peringkat TOPSIS, unik 1..n. */
  rank_topsis: number;
  /** Nilai ternormalisasi 0..1 per kriteria terpasang, selalu searah "1 = terbaik". */
  skor_kriteria: Record<K, number>;
};

export type BobotKriteria<K extends string> = { kode: K; bobot: number };

export type HasilPeringkat<K extends string> = {
  /** Bobot rank-sum per kode (Σ = 1). */
  bobot: Record<K, number>;
  /** Kriteria terpasang urut prioritas beserta bobotnya. */
  kriteria_dipakai: BobotKriteria<K>[];
  /** Urut rank SAW naik. Hanya kandidat yang datanya lengkap di semua kriteria terpasang. */
  hasil: HasilKos<K>[];
  /** Spearman SAW vs TOPSIS; null kalau n < 3 atau salah satu skor konstan. Tidak pernah NaN. */
  spearman: number | null;
  /** Jumlah kandidat (unik) yang dikecualikan karena data kosong di ≥ 1 kriteria terpasang. */
  jumlah_tanpa_data: number;
  /** Per kriteria terpasang: berapa kandidat yang datanya kosong di kriteria itu. */
  tanpa_data_per_kriteria: Record<K, number>;
};
