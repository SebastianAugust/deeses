import type { JenisKriteria } from "@/config/kriteria";

/** Definisi kriteria minimal yang dibutuhkan perhitungan (generik di kode). */
export type DefKriteria<K extends string> = { readonly kode: K; readonly jenis: JenisKriteria };

/** Satu alternatif (kos) yang sudah lolos filter, dengan nilai mentah per kriteria. */
export type Alternatif<K extends string> = {
  id: string;
  /** Rupiah; dipakai sebagai pemutus seri ke-3 (lebih murah menang). */
  harga: number;
  nilai: Record<K, number>;
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
  /** Nilai ternormalisasi 0..1, selalu searah "1 = terbaik" (cost sudah dibalik). */
  skor_kriteria: Record<K, number>;
};

export type HasilPeringkat<K extends string> = {
  bobot: Record<K, number>;
  /** Urut rank SAW naik. */
  hasil: HasilKos<K>[];
  /** Spearman SAW vs TOPSIS; null kalau n < 3 atau salah satu skor konstan. Tidak pernah NaN. */
  spearman: number | null;
};
