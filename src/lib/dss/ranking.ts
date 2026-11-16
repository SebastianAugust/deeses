/** Jumlah desimal untuk MEMBANDINGKAN skor (meredam galat floating point, mis. 0,49999999999999994 = 0,5). */
export const DESIMAL_BANDING = 9;

/** Jumlah desimal untuk TAMPILAN saja. */
export const DESIMAL_TAMPILAN = 4;

function bulatkan(x: number, desimal: number): number {
  const f = 10 ** desimal;
  return Math.round(x * f) / f;
}

/** Skor yang dipakai untuk membandingkan / mendeteksi seri. */
export function untukBanding(x: number): number {
  return bulatkan(x, DESIMAL_BANDING);
}

/** Pembulatan 4 desimal — hanya untuk ditampilkan, jangan dipakai untuk ranking. */
export function bulatkanTampilan(x: number): number {
  return bulatkan(x, DESIMAL_TAMPILAN);
}

/** Bandingkan string per code unit (sama seperti perbandingan str di Python), bukan locale. */
function bandingId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type DataUrut = { id: string; harga: number; saw: number; topsis: number };

/**
 * Indeks terurut untuk peringkat SAW:
 * SAW turun → TOPSIS turun → harga naik → id naik (skor dibandingkan setelah dibulatkan 9 desimal).
 */
export function urutkanSaw(data: readonly DataUrut[]): number[] {
  return data
    .map((_, i) => i)
    .sort((i, j) => {
      const a = data[i];
      const b = data[j];
      return (
        untukBanding(b.saw) - untukBanding(a.saw) ||
        untukBanding(b.topsis) - untukBanding(a.topsis) ||
        a.harga - b.harga ||
        bandingId(a.id, b.id)
      );
    });
}

/**
 * Indeks terurut untuk peringkat TOPSIS:
 * TOPSIS turun → SAW turun → harga naik → id naik.
 */
export function urutkanTopsis(data: readonly DataUrut[]): number[] {
  return data
    .map((_, i) => i)
    .sort((i, j) => {
      const a = data[i];
      const b = data[j];
      return (
        untukBanding(b.topsis) - untukBanding(a.topsis) ||
        untukBanding(b.saw) - untukBanding(a.saw) ||
        a.harga - b.harga ||
        bandingId(a.id, b.id)
      );
    });
}

/** Indeks terurut → rank unik 1..n per indeks asal. */
export function rankDariUrutan(urutan: readonly number[]): number[] {
  const rank = new Array<number>(urutan.length);
  urutan.forEach((idx, pos) => {
    rank[idx] = pos + 1;
  });
  return rank;
}
