/**
 * Skor DSS dinormalisasi min-max terhadap kos yang lolos filter, jadi selalu RELATIF.
 * Dengan 1–2 kos, skor jadi 0/1 saja (n = 1: semua 1,0), sehingga bar per kriteria
 * menyesatkan. Batasnya sama dengan Spearman (butuh ≥ 3 kos).
 */
export const MIN_PEMBANDING = 3;

export function pembandingTerlaluSedikit(jumlah: number): boolean {
  return jumlah > 0 && jumlah < MIN_PEMBANDING;
}
