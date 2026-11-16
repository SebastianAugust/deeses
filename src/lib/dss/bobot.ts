/**
 * Bobot rank-sum: w_r = 2(n − r + 1) / (n(n + 1)), r = posisi (1 = terpenting),
 * n = jumlah kriteria di urutan. Σw = 1.
 */
export function bobotRankSumPosisi(r: number, n: number): number {
  return (2 * (n - r + 1)) / (n * (n + 1));
}

export class UrutanTidakValidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrutanTidakValidError";
  }
}

/**
 * Cek urutan berisi tepat semua `kodeValid`, masing-masing sekali.
 * @returns pesan error, atau null kalau valid
 */
export function cekUrutan(urutan: readonly unknown[], kodeValid: readonly string[]): string | null {
  if (urutan.length !== kodeValid.length) {
    return `urutan harus berisi ${kodeValid.length} kriteria, diterima ${urutan.length}.`;
  }
  const dilihat = new Set<unknown>();
  for (const k of urutan) {
    if (typeof k !== "string" || !kodeValid.includes(k)) return `kode kriteria tidak dikenal: ${String(k)}.`;
    if (dilihat.has(k)) return `kode kriteria duplikat: ${k}.`;
    dilihat.add(k);
  }
  return null;
}

/**
 * Bobot rank-sum per kode untuk sebuah urutan prioritas.
 * @throws UrutanTidakValidError kalau urutan bukan permutasi tepat dari `kodeValid`
 */
export function bobotRankSum<K extends string>(
  urutan: readonly K[],
  kodeValid: readonly K[],
): Record<K, number> {
  const salah = cekUrutan(urutan, kodeValid);
  if (salah) throw new UrutanTidakValidError(salah);
  const n = urutan.length;
  const bobot = {} as Record<K, number>;
  urutan.forEach((kode, i) => {
    bobot[kode] = bobotRankSumPosisi(i + 1, n);
  });
  return bobot;
}
