"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Lama pengamatan dikunci setelah lompat lewat chip, supaya chip tidak berkedip selama gulir halus. */
const KUNCI_MS = 900;

/**
 * Chip kategori aktif mengikuti posisi gulir (IntersectionObserver).
 * Bagian pertama (urut `ids`) yang beririsan dengan pita pengamatan menjadi aktif.
 *
 * @param ids id elemen bagian, urut tampil
 * @param root elemen kontainer gulir (tidak diisi = viewport)
 * @param rootMargin pita pengamatan, mis. "-90px 0px -55% 0px"
 * @param aktif false = jangan mengamati (mis. sheet tertutup)
 * @returns [id aktif, fungsi tandai(id) untuk dipanggil saat chip diklik]
 */
export function useKategoriAktif(
  ids: readonly string[],
  { root, rootMargin, aktif = true }: { root?: HTMLElement | null; rootMargin: string; aktif?: boolean },
): [string | undefined, (id: string) => void] {
  const [aktifId, setAktifId] = useState<string | undefined>(ids[0]);
  const kunciSampai = useRef(0);
  const kunci = ids.join("|");

  useEffect(() => {
    if (!aktif || typeof IntersectionObserver === "undefined") return;
    const daftar = kunci.split("|");
    const terlihat = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) terlihat.set(e.target.id, e.isIntersecting);
        if (Date.now() < kunciSampai.current) return;
        const pertama = daftar.find((id) => terlihat.get(id));
        if (pertama) setAktifId(pertama);
      },
      { root: root ?? null, rootMargin, threshold: 0 },
    );
    for (const id of daftar) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [kunci, root, rootMargin, aktif]);

  const tandai = useCallback((id: string) => {
    kunciSampai.current = Date.now() + KUNCI_MS;
    setAktifId(id);
  }, []);

  return [aktifId, tandai];
}
