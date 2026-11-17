"use client";

import { RakitDesktop } from "@/components/kriteria/rakit-desktop";
import { RakitMobile } from "@/components/kriteria/rakit-mobile";
import { useFilter } from "@/lib/use-filter";
import { useIsDesktop } from "@/lib/use-media";
import { useRakitan } from "@/lib/use-rakitan";

/**
 * /prioritas = langkah 2 "rakit kriteria". State rakitan dipegang DI SINI
 * (satu sumber, ditulis ke URL), lalu dirender sebagai lego desktop (≥ lg,
 * mockup 09) atau daftar + lemari mobile (mockup 10). Berpindah ukuran layar
 * tidak menghilangkan rakitan.
 */
export function PrioritasView() {
  const filter = useFilter();
  const rakitan = useRakitan(filter);
  const desktop = useIsDesktop();
  const sekarang = { ...filter, kriteria: rakitan.kriteria };
  return desktop ? (
    <RakitDesktop filter={sekarang} rakitan={rakitan} />
  ) : (
    <RakitMobile filter={sekarang} rakitan={rakitan} />
  );
}
