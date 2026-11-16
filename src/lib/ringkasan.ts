import { infoKriteria } from "./explain";
import type { Kriteria } from "@/config/kriteria";
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

/** Dua prioritas teratas, mis. "biaya & jarak". */
export function duaPrioritasTeratas(urutan: Kriteria[]): string {
  return `${infoKriteria(urutan[0]).singkat} & ${infoKriteria(urutan[1]).singkat}`;
}

/** Ringkasan untuk search pill desktop, mis. "Biaya, jarak, +6". */
export function ringkasPrioritas(urutan: Kriteria[]): string {
  const a = infoKriteria(urutan[0]).singkat;
  const b = infoKriteria(urutan[1]).singkat;
  return `${a.charAt(0).toUpperCase()}${a.slice(1)}, ${b}, +${urutan.length - 2}`;
}
