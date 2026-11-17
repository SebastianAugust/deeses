/**
 * Bobot rank-sum: w_r = 2(n − r + 1) / (n(n + 1)), r = posisi (1 = terpenting),
 * n = jumlah kriteria terpasang. n = 1 → bobot 1. Σw = 1.
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
 * Cek daftar kriteria terurut: minimal 1, semua string, tidak ada duplikat.
 * (Kode dikenal/tersedia dan batas maksimum dicek di validasi API.)
 * @returns pesan error, atau null kalau valid
 */
export function cekUrutan(urutan: readonly unknown[]): string | null {
  if (urutan.length === 0) return "minimal 1 kriteria harus dipasang.";
  const dilihat = new Set<unknown>();
  for (const k of urutan) {
    if (typeof k !== "string" || k === "") return `kode kriteria tidak valid: ${String(k)}.`;
    if (dilihat.has(k)) return `kode kriteria duplikat: ${k}.`;
    dilihat.add(k);
  }
  return null;
}

/**
 * Bobot rank-sum per kode untuk sebuah urutan prioritas (index 0 = terpenting).
 * @throws UrutanTidakValidError kalau urutan kosong atau berisi duplikat
 */
export function bobotRankSum<K extends string>(urutan: readonly K[]): Record<K, number> {
  const salah = cekUrutan(urutan);
  if (salah) throw new UrutanTidakValidError(salah);
  const n = urutan.length;
  const bobot = {} as Record<K, number>;
  urutan.forEach((kode, i) => {
    bobot[kode] = bobotRankSumPosisi(i + 1, n);
  });
  return bobot;
}
