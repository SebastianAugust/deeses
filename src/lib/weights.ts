import type { KodeKriteria } from "@/config/kriteria";
import { bobotRankSumPosisi } from "./dss/bobot";

/**
 * Bobot rank-sum untuk UI: w_r = 2(n − r + 1) / (n(n + 1)), r = posisi (1 = terpenting),
 * n = jumlah kriteria terpasang. Rumusnya sama dengan src/lib/dss.
 * Contoh n = 4: 40% · 30% · 20% · 10%. n = 1 → 100%.
 *
 * @param urutan kode kriteria dari yang paling penting ke paling tidak penting
 * @returns bobot (0–1) per kriteria; totalnya 1 (objek kosong kalau urutan kosong)
 */
export function rankSumWeights(urutan: readonly KodeKriteria[]): Partial<Record<KodeKriteria, number>> {
  const n = urutan.length;
  const bobot: Partial<Record<KodeKriteria, number>> = {};
  urutan.forEach((kode, i) => {
    bobot[kode] = bobotRankSumPosisi(i + 1, n);
  });
  return bobot;
}

/** Bobot per posisi untuk n kriteria (index 0 = terpenting). */
export function bobotPerPosisi(n: number): number[] {
  return Array.from({ length: n }, (_, i) => bobotRankSumPosisi(i + 1, n));
}

/** 0.2222 → "22,2%" (koma desimal gaya Indonesia). */
export function formatPersen(bobot: number, desimal = 1): string {
  return `${(bobot * 100).toFixed(desimal).replace(".", ",")}%`;
}
