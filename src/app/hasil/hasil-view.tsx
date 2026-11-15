"use client";

import { HasilDesktop } from "@/components/hasil/hasil-desktop";
import { HasilMobile } from "@/components/hasil/hasil-mobile";
import { useIsDesktop } from "@/lib/use-media";

/**
 * /hasil: di layar ≥ lg tampil 3 kolom (sidebar + daftar + panel detail),
 * di bawahnya alur mobile bertahap. Hanya satu versi yang dirender supaya
 * tidak ada dua state/DnD yang berjalan bersamaan.
 */
export function HasilView() {
  return useIsDesktop() ? <HasilDesktop /> : <HasilMobile />;
}
