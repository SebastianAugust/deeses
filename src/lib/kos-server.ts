// Hanya untuk Server Component / generateMetadata (jangan diimpor dari client).
import "server-only";
import { cache } from "react";
import { kosRepository, type Kos } from "./repo";

/**
 * Ambil 1 kos di server (untuk generateMetadata & cek keberadaan di page).
 * Dibungkus React `cache` supaya generateMetadata dan halaman memakai hasil
 * yang sama dalam satu request. Galat data (RLS/konfigurasi) dilempar ke
 * error boundary — tidak ditutupi sebagai "tidak ditemukan".
 */
export const ambilKos = cache(async (id: string): Promise<Kos | null> => {
  if (!/^\d{1,19}$/.test(id)) return null;
  return kosRepository().getKos(id);
});
