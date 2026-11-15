import type { Kriteria } from "./types";

/**
 * Bobot rank-sum: w_r = 2(n − r + 1) / (n(n + 1)), r = peringkat (1 = terpenting).
 * Untuk n = 8: 22,2% · 19,4% · 16,7% · 13,9% · 11,1% · 8,3% · 5,6% · 2,8%.
 *
 * @param urutan kode kriteria dari yang paling penting ke paling tidak penting
 * @returns bobot (0–1) per kriteria; totalnya 1
 */
export function rankSumWeights(urutan: Kriteria[]): Record<Kriteria, number> {
  const n = urutan.length;
  const bobot = {} as Record<Kriteria, number>;
  urutan.forEach((kode, i) => {
    const r = i + 1;
    bobot[kode] = (2 * (n - r + 1)) / (n * (n + 1));
  });
  return bobot;
}

/** 0.2222 → "22,2%" (koma desimal gaya Indonesia). */
export function formatPersen(bobot: number, desimal = 1): string {
  return `${(bobot * 100).toFixed(desimal).replace(".", ",")}%`;
}
