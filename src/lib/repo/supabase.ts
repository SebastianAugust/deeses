import "server-only";
import { cacheLife } from "next/cache";
import { hargaUntukSebaran, hitungSebaran, type SebaranHarga } from "@/lib/sebaran";
import { supabaseServer } from "@/lib/supabase/server";
import type { TipePenghuni } from "@/lib/types";
import { KosDataError, keKosDataError } from "./galat";
import { diagnostikData, petakanBaris, type BarisKos, type Kos } from "./mapper";
import type { KosRepository } from "./tipe";

const TABEL = "kos";
/** Ukuran halaman query. Batas default PostgREST Supabase = 1000 baris per request. */
const UKURAN_HALAMAN = 1000;
/** Pengaman supaya loop paginasi tidak pernah tak berujung. */
const MAKS_HALAMAN = 100;

/** Baca SELURUH baris tabel public.kos dengan paginasi range(), urut id. */
async function bacaSemuaBaris(): Promise<BarisKos[]> {
  const sb = supabaseServer();
  const semua: BarisKos[] = [];
  for (let halaman = 0; halaman < MAKS_HALAMAN; halaman++) {
    const dari = halaman * UKURAN_HALAMAN;
    const { data, error } = await sb
      .from(TABEL)
      .select("*")
      .order("id", { ascending: true })
      .range(dari, dari + UKURAN_HALAMAN - 1);
    if (error) {
      // Log server saja; pesan PostgREST tidak memuat key/env.
      console.error(`[kos] query public.kos gagal (kode ${error.code ?? "?"}): ${error.message}`);
      throw new KosDataError("QUERY_GAGAL", `query ditolak/gagal (kode ${error.code ?? "tidak diketahui"}).`);
    }
    const baris = (data ?? []) as BarisKos[];
    semua.push(...baris);
    if (baris.length < UKURAN_HALAMAN) return semua;
  }
  throw new KosDataError("QUERY_GAGAL", "paginasi melebihi batas pengaman.");
}

/**
 * Seluruh kos, di-cache di memori server dengan `use cache` + cacheLife
 * (cara yang direkomendasikan Next 16 dengan Cache Components):
 * setelah 5 menit, request berikutnya memicu muat ulang di latar; entri kedaluwarsa
 * setelah 15 menit tanpa request. Galat dilempar (tidak di-cache), termasuk 0 baris.
 * Catatan: di serverless (Vercel) cache memori bisa tidak bertahan antar-instance.
 */
async function muatSemuaKos(): Promise<Kos[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 900 });
  const baris = await bacaSemuaBaris();
  if (baris.length === 0) {
    throw new KosDataError("KOSONG", "query berhasil tetapi tidak ada baris yang boleh dibaca.");
  }
  const kos = baris.map(petakanBaris);
  console.info("[kos] dimuat dari Supabase:", JSON.stringify(diagnostikData(kos)));
  return kos;
}

export class SupabaseKosRepository implements KosRepository {
  async listKos(): Promise<Kos[]> {
    try {
      return await muatSemuaKos();
    } catch (e) {
      throw keKosDataError(e);
    }
  }

  async getKos(id: string): Promise<Kos | null> {
    const semua = await this.listKos();
    return semua.find((k) => k.id === id) ?? null;
  }


  async sebaranHarga(tipe?: TipePenghuni): Promise<SebaranHarga> {
    return hitungSebaran(hargaUntukSebaran(await this.listKos(), tipe));
  }
}
