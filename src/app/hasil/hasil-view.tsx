"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HasilDesktop } from "@/components/hasil/hasil-desktop";
import { HasilMobile } from "@/components/hasil/hasil-mobile";
import { adaPenandaOk, buildHref } from "@/lib/query";
import { useFilter } from "@/lib/use-filter";
import { useDesktopRedirect, useIsDesktop } from "@/lib/use-media";

/**
 * /hasil: di layar ≥ lg tampil 3 kolom (sidebar + daftar + panel detail),
 * di bawahnya alur mobile bertahap. Hanya satu versi yang dirender supaya
 * tidak ada dua state/DnD yang berjalan bersamaan.
 *
 * Aturan alur:
 * - Tanpa kriteria terpasang → kembali ke /prioritas (semua layar).
 * - Desktop tanpa penanda `ok=1` (dari tombol "Lihat peringkat") → /prioritas
 *   dengan params yang sama.
 */
export function HasilView() {
  const desktop = useIsDesktop();
  const filter = useFilter();
  const router = useRouter();
  const ok = adaPenandaOk(useSearchParams());
  const tanpaKriteria = filter.kriteria.length === 0;
  const hrefPrioritas = buildHref("/prioritas", filter);
  const dialihkan = useDesktopRedirect(hrefPrioritas, !ok && !tanpaKriteria);

  useEffect(() => {
    if (tanpaKriteria) router.replace(hrefPrioritas);
  }, [tanpaKriteria, hrefPrioritas, router]);

  if (tanpaKriteria) return null;
  if (!desktop) return <HasilMobile />;
  return dialihkan ? null : <HasilDesktop />;
}
