"use client";

import { useSearchParams } from "next/navigation";
import { HasilDesktop } from "@/components/hasil/hasil-desktop";
import { HasilMobile } from "@/components/hasil/hasil-mobile";
import { adaPenandaOk, hrefHome } from "@/lib/query";
import { useFilter } from "@/lib/use-filter";
import { useDesktopRedirect, useIsDesktop } from "@/lib/use-media";

/**
 * /hasil: di layar ≥ lg tampil 3 kolom (sidebar + daftar + panel detail),
 * di bawahnya alur mobile bertahap. Hanya satu versi yang dirender supaya
 * tidak ada dua state/DnD yang berjalan bersamaan.
 *
 * Aturan alur desktop: tanpa penanda `ok=1` (dari tombol "Lihat rekomendasi"),
 * /hasil dialihkan ke /?langkah=prioritas dengan params yang sama.
 */
export function HasilView() {
  const desktop = useIsDesktop();
  const filter = useFilter();
  const ok = adaPenandaOk(useSearchParams());
  const dialihkan = useDesktopRedirect(hrefHome(filter, "prioritas"), !ok);

  if (!desktop) return <HasilMobile />;
  return dialihkan ? null : <HasilDesktop />;
}
