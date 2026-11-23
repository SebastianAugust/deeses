import type { KodeKriteria } from "@/config/kriteria";

export type TipePenghuni = "putra" | "putri" | "campur";

export const TIPE_PENGHUNI: readonly TipePenghuni[] = ["putra", "putri", "campur"];

/**
 * Status mutu data (kolom baru di public.kos). Kolom tidak ada / nilai tak dikenal = null
 * (tidak diketahui), bukan error.
 * - koordinat_status: seberapa bisa dipercaya titik lat/lng. "perkiraan" bisa meleset 1–2 km.
 * - luas_status: apakah ukuran kamar tercantum di listing (C4 kosong bila "tidak_tercantum").
 * - basis_harga: "tahun_dibagi_12" = harga bulanan dihitung dari tarif tahunan ÷ 12.
 */
export const KOORDINAT_STATUS = ["terverifikasi", "geokode", "perkiraan"] as const;
export type KoordinatStatus = (typeof KOORDINAT_STATUS)[number];

export const LUAS_STATUS = ["tercantum", "tidak_tercantum"] as const;
export type LuasStatus = (typeof LUAS_STATUS)[number];

export const BASIS_HARGA = ["bulan", "tahun_dibagi_12"] as const;
export type BasisHarga = (typeof BASIS_HARGA)[number];

/** Body POST /api/rank. `kriteria` = kode piece terpasang, urut prioritas (1..MAKS_KRITERIA). */
export type RankRequest = {
  budget: number;
  tipe: TipePenghuni;
  kriteria: KodeKriteria[];
};

export type RankResult = {
  id: string;
  nama: string;
  rank: number;
  harga: number;
  /** = kolom C2 (km); null kalau kosong di data. */
  jarak_km: number | null;
  /** true = jarak hasil imputasi (heuristik sementara, lihat src/lib/repo/mapper.ts). */
  jarak_imputasi?: boolean;
  tipe: TipePenghuni;
  foto_url: string | null;
  /** URL listing asli; null kalau belum ada di data. */
  url: string | null;
  skor_saw: number;
  skor_topsis: number;
  /** Peringkat TOPSIS (unik) di hasil yang sama; dihitung server (src/lib/dss). */
  rank_topsis?: number;
  /** Skor ternormalisasi 0..1 untuk tiap kriteria TERPASANG (kunci = kode). */
  skor_kriteria: Partial<Record<KodeKriteria, number>>;
  /**
   * Penjelas data (tambahan opsional, kontrak lama tetap berlaku): status titik lokasi,
   * basis harga, dan koordinat untuk tautan pin Google Maps. Null/tidak ada = tidak diketahui.
   */
  koordinat_status?: KoordinatStatus | null;
  basis_harga?: BasisHarga | null;
  lat?: number | null;
  lng?: number | null;
};

/** Respons POST /api/rank. */
export type RankResponse = {
  /** Urut rank SAW (unik 1..n); kosong → []. */
  hasil: RankResult[];
  /** Kriteria terpasang urut prioritas + bobot rank-sum (Σ = 1). */
  kriteria_dipakai: { kode: KodeKriteria; bobot: number }[];
  /** Kos yang lolos filter tetapi disembunyikan karena datanya kosong di ≥ 1 kriteria terpasang. */
  jumlah_tanpa_data: number;
  /** Per kriteria terpasang: jumlah kos (lolos filter) yang datanya kosong. */
  tanpa_data_per_kriteria: Partial<Record<KodeKriteria, number>>;
  /** Spearman SAW vs TOPSIS; null kalau < 3 kos atau skor konstan. */
  spearman: number | null;
};

/** Item ringkas GET /api/kos (carousel). Nilai yang tidak ada di data = null. */
export type KosRingkasCarousel = {
  id: string;
  nama: string;
  harga: number | null;
  tipe: TipePenghuni | null;
  jarak_km: number | null;
  jarak_imputasi: boolean;
  foto_url: string | null;
  url: string | null;
};

export type KamarMandi = "dalam" | "luar";

export type TempatSekitar = { nama: string; jarak_m: number };

/**
 * Info lengkap kos untuk halaman detail. Semua opsional/nullable: data hasil
 * scraping bisa tidak lengkap, dan UI harus tetap rapi kalau kosong.
 */
export type KosInfo = {
  alamat?: string | null;
  /** Teks tampilan, mis. "12 m²" (dari C4). */
  luas_kamar?: string | null;
  /** = C4 (m²). */
  luas_m2?: number | null;
  /** "tidak_tercantum" = ukuran kamar tidak ada di listing (luas_m2 null). */
  luas_status?: LuasStatus | null;
  kamar_mandi?: KamarMandi | null;
  listrik_termasuk?: boolean | null;
  /** Rupiah. */
  deposit?: number | null;
  fasilitas_kamar?: string[] | null;
  fasilitas_bersama?: string[] | null;
  aturan?: string[] | null;
  sekitar?: TempatSekitar[] | null;
  foto_urls?: string[] | null;
  kontak_nama?: string | null;
  /** Nomor WhatsApp format internasional tanpa "+", mis. "62812…". */
  kontak_wa?: string | null;
  kontak_telp?: string | null;
  sumber_url?: string | null;
  /** ISO 8601. */
  diperbarui_at?: string | null;
  /** Place ID Google (kolom gmaps_place_id; belum ada di tabel → null). Dipakai tautan Maps. */
  gmaps_place_id?: string | null;
};

export type KosDetail = RankResult & KosInfo;

/** Ringkasan kos untuk pintasan "Berikutnya". */
export type KosRingkas = Pick<RankResult, "id" | "nama" | "rank" | "skor_saw" | "foto_url">;

/** Respons GET /api/kos/[id]?budget&tipe&kriteria. */
export type KosDetailResponse = {
  kos: KosDetail;
  /**
   * Jumlah kos yang jadi pembanding normalisasi min-max untuk skor di atas (kandidat
   * hasil filter, + kos ini sendiri bila tidak lolos filter). Skor selalu RELATIF
   * terhadap kos-kos ini; kalau ≤ 2, bar skor per kriteria tidak bermakna.
   */
  pembanding: number;
  /** Posisi kos di hasil untuk filter yang dikirim; null kalau kos tidak lolos filter. */
  peringkat: {
    rank: number;
    total: number;
    rank_topsis: number;
    berikutnya: KosRingkas | null;
  } | null;
};

function dalamDaftar<T extends string>(daftar: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (daftar as readonly string[]).includes(v);
}

export const isKoordinatStatus = (v: unknown): v is KoordinatStatus => dalamDaftar(KOORDINAT_STATUS, v);
export const isLuasStatus = (v: unknown): v is LuasStatus => dalamDaftar(LUAS_STATUS, v);
export const isBasisHarga = (v: unknown): v is BasisHarga => dalamDaftar(BASIS_HARGA, v);

export function isTipePenghuni(v: unknown): v is TipePenghuni {
  return typeof v === "string" && (TIPE_PENGHUNI as readonly string[]).includes(v);
}
