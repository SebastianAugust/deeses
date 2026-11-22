"use client";

import { useSyncExternalStore } from "react";
import type { KodeKriteria } from "@/config/kriteria";

/**
 * Rakitan kriteria (urut prioritas) disimpan di sessionStorage: bertahan selama
 * tab terbuka (refresh, pindah halaman, tombol Back) dan hilang saat browser
 * ditutup, jadi buka baru = mulai dari default. URL halaman tidak perlu memuat
 * daftar kriteria yang panjang.
 *
 * Nilai disimpan sebagai string "kode1,kode2" ("" = rakitan kosong, null = belum
 * pernah diset). Bila sessionStorage tidak tersedia (mode privat ketat), nilai
 * ditahan di memori modul selama SPA berjalan.
 */
const KUNCI = "carikos:kriteria";
const PERISTIWA = "carikos:kriteria-berubah";

let memori: string | null = null;

export function bacaKriteriaTersimpan(): string | null {
  if (typeof window !== "undefined") {
    try {
      const v = window.sessionStorage.getItem(KUNCI);
      if (v !== null) return v;
    } catch {
      // storage diblokir → pakai memori
    }
  }
  return memori;
}

export function simpanKriteria(kriteria: readonly KodeKriteria[]): void {
  const nilai = kriteria.join(",");
  if (bacaKriteriaTersimpan() === nilai) return;
  memori = nilai;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KUNCI, nilai);
  } catch {
    // tidak apa-apa: tetap ada di memori
  }
  window.dispatchEvent(new Event(PERISTIWA));
}

/** Hanya untuk tes. */
export function resetKriteriaTersimpan(): void {
  memori = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KUNCI);
  } catch {
    // abaikan
  }
}

function langgan(onChange: () => void) {
  window.addEventListener(PERISTIWA, onChange);
  return () => window.removeEventListener(PERISTIWA, onChange);
}

/** Rakitan tersimpan (string) atau null; reaktif terhadap simpanKriteria. Saat render server = null. */
export function useKriteriaTersimpan(): string | null {
  return useSyncExternalStore(langgan, bacaKriteriaTersimpan, () => null);
}
