/**
 * Galat lapisan data. Pesan di sini aman ditampilkan: tidak memuat nilai env,
 * key, atau detail koneksi.
 */
export type KodeGalatData = "KONFIGURASI" | "QUERY_GAGAL" | "KOSONG";

export const PETUNJUK_RLS = "cek RLS: tabel public.kos butuh policy select untuk anon";

/** Penanda kode di dalam message, supaya kode tetap terbaca walau error melewati batas `use cache`. */
const PENANDA = /^\[KOS_DATA:(KONFIGURASI|QUERY_GAGAL|KOSONG)\] /;

export class KosDataError extends Error {
  readonly kode: KodeGalatData;
  readonly pesan: string;

  constructor(kode: KodeGalatData, pesan: string) {
    super(`[KOS_DATA:${kode}] ${pesan}`);
    this.name = "KosDataError";
    this.kode = kode;
    this.pesan = pesan;
  }
}

/** Ubah error apa pun menjadi KosDataError (error tak dikenal → QUERY_GAGAL dengan pesan umum). */
export function keKosDataError(e: unknown): KosDataError {
  if (e instanceof KosDataError) return e;
  const msg = e instanceof Error ? e.message : "";
  const m = PENANDA.exec(msg);
  if (m) return new KosDataError(m[1] as KodeGalatData, msg.slice(m[0].length));
  return new KosDataError("QUERY_GAGAL", "Gagal membaca tabel public.kos.");
}

export type BodyGalat = { error: string; kode: KodeGalatData; petunjuk: string };

/** Body + status HTTP untuk galat data (dipakai semua route yang membaca tabel kos). */
export function galatKeBody(e: unknown): { body: BodyGalat; status: number } {
  const g = keKosDataError(e);
  const petunjuk =
    g.kode === "KONFIGURASI"
      ? "Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local (anon/publishable key, bukan service_role), lalu restart server."
      : PETUNJUK_RLS;
  const error =
    g.kode === "KOSONG"
      ? "Tabel public.kos terbaca 0 baris."
      : g.kode === "KONFIGURASI"
        ? `Konfigurasi Supabase tidak valid: ${g.pesan}`
        : `Gagal membaca data kos: ${g.pesan}`;
  return { body: { error, kode: g.kode, petunjuk }, status: 503 };
}
