import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { KosDataError } from "@/lib/repo/galat";
import { jenisKunci, normalisasiUrl } from "./kunci";

/**
 * Klien Supabase sisi server, HANYA BACA, dengan anon/publishable key.
 * Tidak pernah memakai service_role / secret key: kunci jenis itu ditolak di sini.
 *
 * Env dibaca lewat `process.env[nama]` (akses dinamis) dengan sengaja: Next.js
 * menanam nilai `process.env.NEXT_PUBLIC_*` yang ditulis literal ke dalam bundle
 * saat build. Dengan akses dinamis, nilainya hanya dibaca saat request di server
 * dan tidak pernah tersalin ke output build.
 *
 * Pesan error di file ini TIDAK pernah memuat nilai env.
 */
const ENV_URL = "NEXT_PUBLIC_SUPABASE_URL";
const ENV_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

function bacaEnv(nama: string): string {
  const nilai = process.env[nama]?.trim();
  if (!nilai) {
    throw new KosDataError("KONFIGURASI", `Env ${nama} belum diisi (lihat .env.local).`);
  }
  return nilai;
}

let klien: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  if (klien) return klien;
  const url = normalisasiUrl(bacaEnv(ENV_URL));
  const key = bacaEnv(ENV_KEY);
  const jenis = jenisKunci(key);
  if (jenis === "rahasia") {
    throw new KosDataError(
      "KONFIGURASI",
      `${ENV_KEY} berisi secret/service_role key. Ganti dengan anon atau publishable key (Supabase → Project Settings → API Keys).`,
    );
  }
  if (jenis === "tidak-dikenal") {
    throw new KosDataError("KONFIGURASI", `${ENV_KEY} bukan anon/publishable key yang dikenali.`);
  }
  klien = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return klien;
}
