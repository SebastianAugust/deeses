"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { simpanKriteria, useKriteriaTersimpan } from "./kriteria-tersimpan";
import { parseFilter, parseKriteria, type FilterState } from "./query";

/**
 * Filter + kriteria terpasang (urut prioritas): budget & tipe dari query params
 * URL, kriteria dari rakitan sesi (sessionStorage) — atau dari `?kriteria=` bila
 * link lama/dibagikan memilikinya. Komponen pemakai harus berada di dalam <Suspense>.
 */
export function useFilter(): FilterState {
  const kunci = useSearchParams().toString();
  const tersimpan = useKriteriaTersimpan();
  const filter = useMemo(() => parseFilter(new URLSearchParams(kunci), tersimpan), [kunci, tersimpan]);

  // Link yang membawa ?kriteria= jadi rakitan sesi, supaya halaman berikutnya
  // (URL tanpa kriteria) memakai rakitan yang sama. Hanya dijalankan saat URL
  // berubah, bukan saat rakitan berubah, agar tidak menimpa edit terbaru.
  useEffect(() => {
    const mentah = new URLSearchParams(kunci).get("kriteria");
    if (mentah !== null) simpanKriteria(parseKriteria(mentah));
  }, [kunci]);

  return filter;
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
