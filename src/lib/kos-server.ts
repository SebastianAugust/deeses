// Hanya untuk Server Component / generateMetadata (jangan diimpor dari client).
import { cache } from "react";
import { getMockKos } from "./mock";
import type { KosDetail } from "./types";

/**
 * Ambil 1 kos di server (untuk generateMetadata & cek keberadaan di page).
 * Dibungkus React `cache` supaya generateMetadata dan halaman memakai hasil
 * yang sama dalam satu request.
 *
 * TODO: ganti dengan query Supabase (tabel kos). Saat ini DATA CONTOH.
 */
export const ambilKos = cache(async (id: string): Promise<KosDetail | null> => {
  return getMockKos(id) ?? null;
});
