import { IKUTKAN_CAMPUR_DEFAULT } from "@/config/kriteria";
import type { TipePenghuni } from "@/lib/types";

export type OpsiFilter = {
  /** F1: harga <= budget (Rupiah). */
  budget: number;
  /** F2: tipe penghuni yang dicari. */
  tipe: TipePenghuni;
  /**
   * true = pencari putra/putri ikut melihat kos campur. Default dari config
   * (`IKUTKAN_CAMPUR_DEFAULT`, keputusan grup belum final).
   */
  ikutkanCampur?: boolean;
};

/** F2 saja: apakah kos bertipe `tipeKos` cocok untuk pencarian `tipe`? */
export function cocokTipe(
  tipeKos: TipePenghuni,
  tipe: TipePenghuni,
  ikutkanCampur: boolean = IKUTKAN_CAMPUR_DEFAULT,
): boolean {
  return tipeKos === tipe || (ikutkanCampur && tipe !== "campur" && tipeKos === "campur");
}

/** F1 (budget) + F2 (tipe). Urutan masukan dipertahankan. */
export function filterKos<T extends { harga: number; tipe: TipePenghuni }>(
  daftar: readonly T[],
  { budget, tipe, ikutkanCampur = IKUTKAN_CAMPUR_DEFAULT }: OpsiFilter,
): T[] {
  return daftar.filter((k) => k.harga <= budget && cocokTipe(k.tipe, tipe, ikutkanCampur));
}
