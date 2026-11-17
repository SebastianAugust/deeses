import { infoKriteria, type KodeKriteria } from "@/config/kriteria";
import type { TipePenghuni } from "./types";

const LABEL_TIPE: Record<TipePenghuni, string> = {
  putra: "Putra",
  putri: "Putri",
  campur: "Campur",
};

/** "putri" → "Putri" */
export function labelTipe(tipe: TipePenghuni): string {
  return LABEL_TIPE[tipe];
}

/** Prioritas teratas untuk ringkasan, mis. "harga & luas kamar", "harga", atau "belum ada kriteria". */
export function prioritasTeratas(kriteria: readonly KodeKriteria[]): string {
  if (kriteria.length === 0) return "belum ada kriteria";
  if (kriteria.length === 1) return infoKriteria(kriteria[0]).singkat;
  return `${infoKriteria(kriteria[0]).singkat} & ${infoKriteria(kriteria[1]).singkat}`;
}
