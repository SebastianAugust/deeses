"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { parseFilter, type FilterState } from "./query";

/**
 * Filter + urutan prioritas dari query params URL (dengan default).
 * Komponen pemakai harus berada di dalam <Suspense>.
 */
export function useFilter(): FilterState {
  const kunci = useSearchParams().toString();
  return useMemo(() => parseFilter(new URLSearchParams(kunci)), [kunci]);
}

/**
 * Tambah entri riwayat baru tanpa navigasi route (history.pushState).
 * Next menyinkronkan useSearchParams, halaman tidak dirender ulang/di-unmount,
 * dan tombol Back browser kembali ke entri sebelumnya.
 */
export function dorongUrl(href: string) {
  window.history.pushState(null, "", href);
}

/**
 * Tulis state ke URL tanpa navigasi (dipakai saat slider/drag berubah).
 * Next menyinkronkan history.replaceState dengan useSearchParams.
 */
export function gantiUrl(href: string) {
  try {
    window.history.replaceState(null, "", href);
  } catch {
    // Safari membatasi frekuensi replaceState; URL akan tersusul di perubahan berikutnya.
  }
}
