export type Kriteria = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8";

export type JenisKriteria = "cost" | "benefit";

/** Nama ikon lucide-react yang dipakai tiap kriteria. */
export type IkonKriteria =
  | "Wallet"
  | "MapPin"
  | "ShoppingBag"
  | "Maximize"
  | "Star"
  | "ShieldCheck"
  | "UserCog"
  | "Leaf";

export type KriteriaInfo = {
  kode: Kriteria;
  nama: string;
  /** Nama pendek huruf kecil untuk ringkasan, mis. "biaya". */
  singkat: string;
  jenis: JenisKriteria;
  hint: string;
  ikon: IkonKriteria;
};

export const KRITERIA: readonly KriteriaInfo[] = [
  { kode: "C1", nama: "Biaya sewa", singkat: "biaya", jenis: "cost", hint: "Makin murah makin baik", ikon: "Wallet" },
  { kode: "C2", nama: "Jarak ke kampus", singkat: "jarak", jenis: "cost", hint: "Makin dekat makin baik", ikon: "MapPin" },
  { kode: "C3", nama: "Akses layanan", singkat: "akses", jenis: "cost", hint: "Makin dekat makin baik", ikon: "ShoppingBag" },
  { kode: "C4", nama: "Luas kamar", singkat: "luas", jenis: "benefit", hint: "Makin luas makin baik", ikon: "Maximize" },
  { kode: "C5", nama: "Fasilitas", singkat: "fasilitas", jenis: "benefit", hint: "Makin lengkap makin baik", ikon: "Star" },
  { kode: "C6", nama: "Keamanan", singkat: "keamanan", jenis: "benefit", hint: "Makin tinggi makin baik", ikon: "ShieldCheck" },
  { kode: "C7", nama: "Pengelolaan", singkat: "pengelolaan", jenis: "benefit", hint: "Makin tertata makin baik", ikon: "UserCog" },
  { kode: "C8", nama: "Lingkungan", singkat: "lingkungan", jenis: "benefit", hint: "Makin nyaman makin baik", ikon: "Leaf" },
];

export const KODE_KRITERIA: readonly Kriteria[] = KRITERIA.map((k) => k.kode);

export type TipePenghuni = "putra" | "putri" | "campur";

export const TIPE_PENGHUNI: readonly TipePenghuni[] = ["putra", "putri", "campur"];

export type RankRequest = {
  budget: number;
  tipe: TipePenghuni;
  urutan_kriteria: Kriteria[];
};

export type RankResult = {
  id: string;
  nama: string;
  rank: number;
  harga: number;
  jarak_km: number;
  tipe: TipePenghuni;
  foto_url: string | null;
  url: string;
  skor_saw: number;
  skor_topsis: number;
  skor_kriteria: Record<Kriteria, number>;
};

export type KamarMandi = "dalam" | "luar";

export type TempatSekitar = { nama: string; jarak_m: number };

/**
 * Info lengkap kos untuk halaman detail. Semua opsional/nullable: data hasil
 * scraping bisa tidak lengkap, dan UI harus tetap rapi kalau kosong.
 */
export type KosInfo = {
  alamat?: string | null;
  /** Teks bebas dari listing, mis. "3 × 4 m". */
  luas_kamar?: string | null;
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
};

export type KosDetail = RankResult & KosInfo;

/** Ringkasan kos untuk pintasan "Berikutnya". */
export type KosRingkas = Pick<RankResult, "id" | "nama" | "rank" | "skor_saw" | "foto_url">;

/** Respons GET /api/kos/[id]?budget&tipe&urutan. */
export type KosDetailResponse = {
  kos: KosDetail;
  /** Posisi kos di hasil untuk filter yang dikirim; null kalau kos tidak lolos filter. */
  peringkat: {
    rank: number;
    total: number;
    rank_topsis: number;
    berikutnya: KosRingkas | null;
  } | null;
};

export function isKriteria(v: unknown): v is Kriteria {
  return typeof v === "string" && (KODE_KRITERIA as readonly string[]).includes(v);
}

export function isTipePenghuni(v: unknown): v is TipePenghuni {
  return typeof v === "string" && (TIPE_PENGHUNI as readonly string[]).includes(v);
}
