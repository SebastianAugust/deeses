import { untukBanding } from "./ranking";

/** Rank rata-rata (1-based); nilai seri mendapat rata-rata posisinya. */
function rankRataRata(x: readonly number[]): number[] {
  const idx = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
  const r = new Array<number>(x.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && x[idx[j + 1]] === x[idx[i]]) j++;
    const rata = (i + j) / 2 + 1;
    for (let t = i; t <= j; t++) r[idx[t]] = rata;
    i = j + 1;
  }
  return r;
}

/**
 * Korelasi peringkat Spearman (Pearson atas rank rata-rata, menangani seri).
 * Skor dibulatkan 9 desimal dulu supaya seri deterministik.
 * @returns null kalau n < 3, panjang beda, ada nilai tak berhingga, atau salah satu skor konstan.
 *          Tidak pernah NaN.
 */
export function spearman(x: readonly number[], y: readonly number[]): number | null {
  const n = x.length;
  if (n < 3 || y.length !== n) return null;
  if (![...x, ...y].every(Number.isFinite)) return null;
  const rx = rankRataRata(x.map(untukBanding));
  const ry = rankRataRata(y.map(untukBanding));
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (rx[i] - mx) * (ry[i] - my);
    sxx += (rx[i] - mx) ** 2;
    syy += (ry[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  const rho = sxy / Math.sqrt(sxx * syy);
  if (!Number.isFinite(rho)) return null;
  return Math.max(-1, Math.min(1, rho));
}
