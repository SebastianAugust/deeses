/**
 * Sebaran harga per rentang (bin) untuk grafik di BudgetHistogramSlider.
 *
 * Definisi bin (dipakai bersama oleh API dan komponen):
 *   bin i berisi kos dengan harga di (min + i·step, min + (i+1)·step],
 *   i = 0 … n−1, n = (max − min) / step. Harga ≤ min masuk bin 0,
 *   harga > max tidak dihitung (tidak bisa dipilih di slider).
 * Dengan begitu, untuk budget kelipatan step, jumlah kos ber-harga ≤ budget
 * = jumlah isi bin yang batas atasnya ≤ budget (lihat `jumlahDiBawah`).
 */

export const SEBARAN_MIN = 500_000;
export const SEBARAN_MAX = 3_000_000;
export const SEBARAN_STEP = 100_000;

export type SebaranHarga = {
  min: number;
  max: number;
  step: number;
  bins: number[];
};

export function hitungSebaran(
  harga: number[],
  min = SEBARAN_MIN,
  max = SEBARAN_MAX,
  step = SEBARAN_STEP,
): SebaranHarga {
  const n = Math.round((max - min) / step);
  const bins = new Array<number>(n).fill(0);
  for (const h of harga) {
    if (h > max) continue;
    const i = h <= min ? 0 : Math.ceil((h - min) / step) - 1;
    bins[Math.min(n - 1, i)] += 1;
  }
  return { min, max, step, bins };
}

/** Banyaknya bin yang seluruh rentangnya ≤ value (bin yang diberi warna accent). */
export function binDiBawah(value: number, min: number, step: number): number {
  return Math.max(0, Math.floor((value - min) / step));
}

/** Jumlah kos dengan harga ≤ value menurut bins. */
export function jumlahDiBawah(bins: number[], value: number, min: number, step: number): number {
  const k = binDiBawah(value, min, step);
  let total = 0;
  for (let i = 0; i < Math.min(k, bins.length); i++) total += bins[i];
  return total;
}
