/**
 * Peringkat kos untuk sebuah permintaan (server-side). Dipakai bersama oleh
 * POST /api/rank dan GET /api/kos/[id], supaya rank & "kenapa direkomendasikan"
 * di halaman detail selalu sama dengan halaman hasil.
 *
 * TODO: ganti dengan query database (Supabase Postgres) + perhitungan SAW asli
 * (dan TOPSIS pembanding) dari tim Model/Backend. Saat ini memakai DATA CONTOH
 * dari src/lib/mock.ts: `urutan_kriteria` belum memengaruhi skor, dan `tipe`
 * dicocokkan persis (aturan untuk "campur" menunggu keputusan tim).
 */
import { MOCK_KOS } from "./mock";
import type { KosDetail, RankRequest, RankResult } from "./types";

/** Kos yang lolos filter, urut skor SAW, dengan rank 1…n untuk filter ini. */
export function urutkanKos({ budget, tipe }: RankRequest): KosDetail[] {
  return MOCK_KOS.filter((k) => k.harga <= budget && k.tipe === tipe)
    .sort((a, b) => b.skor_saw - a.skor_saw)
    .map((k, i) => ({ ...k, rank: i + 1 }));
}

/** Ambil hanya kolom kontrak /api/rank (tanpa info detail yang berat). */
export function keRankResult(k: KosDetail): RankResult {
  return {
    id: k.id,
    nama: k.nama,
    rank: k.rank,
    harga: k.harga,
    jarak_km: k.jarak_km,
    tipe: k.tipe,
    foto_url: k.foto_url,
    url: k.url,
    skor_saw: k.skor_saw,
    skor_topsis: k.skor_topsis,
    skor_kriteria: k.skor_kriteria,
  };
}
