/**
 * SATU-SATUNYA sumber kriteria DSS (frontend, validasi API, dan src/lib/dss).
 *
 * Menambah/menghapus kriteria cukup di array `DATA_KRITERIA` di bawah:
 * tipe `Kriteria`, jumlah kriteria (n), bobot rank-sum, urutan default, dan
 * validasi `urutan_kriteria` semuanya diturunkan dari sini.
 * Nilai mentah C1..Cn dibaca dari kolom tabel public.kos dengan nama yang sama
 * (src/lib/repo/mapper.ts), jadi kolom di database juga harus ikut disesuaikan.
 */

export type JenisKriteria = "cost" | "benefit";

/** Nama ikon lucide-react yang didukung `KriteriaIcon` (src/components/kriteria-icon.tsx). */
export type IkonKriteria =
  | "Wallet"
  | "MapPin"
  | "ShoppingBag"
  | "Maximize"
  | "Star"
  | "ShieldCheck"
  | "UserCog"
  | "Leaf";

type KriteriaConfig = {
  kode: string;
  nama: string;
  /** Nama pendek huruf kecil untuk ringkasan, mis. "biaya". */
  singkat: string;
  jenis: JenisKriteria;
  /** Satuan nilai mentah sebelum normalisasi. */
  satuan: string;
  hint: string;
  ikon: IkonKriteria;
  /** Posisi di urutan prioritas default (1 = paling penting). Boleh ada celah. */
  prioritasDefault: number;
  /** true = datanya belum final/asli; jangan diklaim sebagai data di laporan. */
  sementara?: boolean;
};

const DATA_KRITERIA = [
  { kode: "C1", nama: "Biaya sewa", singkat: "biaya", jenis: "cost", satuan: "Rp/bulan", hint: "Makin murah makin baik", ikon: "Wallet", prioritasDefault: 1 },
  { kode: "C2", nama: "Jarak ke kampus", singkat: "jarak", jenis: "cost", satuan: "km", hint: "Makin dekat makin baik", ikon: "MapPin", prioritasDefault: 2 },
  // C3: proksi sintetis 0,15+0,35*C2, menunggu data asli atau dihapus
  // (lihat dss-model-kos-jatinangor/audit/AUDIT.md temuan T01).
  { kode: "C3", nama: "Akses layanan", singkat: "akses", jenis: "cost", satuan: "km", hint: "Makin dekat makin baik", ikon: "ShoppingBag", prioritasDefault: 5, sementara: true },
  { kode: "C4", nama: "Luas kamar", singkat: "luas", jenis: "benefit", satuan: "m²", hint: "Makin luas makin baik", ikon: "Maximize", prioritasDefault: 6 },
  { kode: "C5", nama: "Fasilitas", singkat: "fasilitas", jenis: "benefit", satuan: "skor 0–1", hint: "Makin lengkap makin baik", ikon: "Star", prioritasDefault: 4 },
  { kode: "C6", nama: "Keamanan", singkat: "keamanan", jenis: "benefit", satuan: "skor 0–1", hint: "Makin tinggi makin baik", ikon: "ShieldCheck", prioritasDefault: 3 },
  { kode: "C7", nama: "Pengelolaan", singkat: "pengelolaan", jenis: "benefit", satuan: "skor 0–1", hint: "Makin tertata makin baik", ikon: "UserCog", prioritasDefault: 7 },
  { kode: "C8", nama: "Lingkungan", singkat: "lingkungan", jenis: "benefit", satuan: "skor 0–1", hint: "Makin nyaman makin baik", ikon: "Leaf", prioritasDefault: 8 },
] as const satisfies readonly KriteriaConfig[];

/** Kode kriteria, diturunkan dari config (mis. "C1" | … | "C8"). */
export type Kriteria = (typeof DATA_KRITERIA)[number]["kode"];

export type KriteriaInfo = Omit<KriteriaConfig, "kode"> & { kode: Kriteria };

export const KRITERIA: readonly KriteriaInfo[] = DATA_KRITERIA;

export const KODE_KRITERIA: readonly Kriteria[] = KRITERIA.map((k) => k.kode);

/** n = jumlah kriteria. Selalu baca dari sini, jangan hardcode. */
export const JUMLAH_KRITERIA = KRITERIA.length;

/** Urutan prioritas default (diurutkan menurut `prioritasDefault`). */
export const URUTAN_DEFAULT: readonly Kriteria[] = [...KRITERIA]
  .sort((a, b) => a.prioritasDefault - b.prioritasDefault)
  .map((k) => k.kode);

/**
 * F2: apakah pencari "putra"/"putri" ikut melihat kos "campur"?
 * Keputusan grup BELUM final (AUDIT.md T06) — default false = tipe harus sama persis.
 */
export const IKUTKAN_CAMPUR_DEFAULT = false;

export function isKriteria(v: unknown): v is Kriteria {
  return typeof v === "string" && (KODE_KRITERIA as readonly string[]).includes(v);
}

/** "C1–C8" (atau "C1, C2, C4" kalau kodenya tidak berurutan) untuk pesan error/UI. */
export function rentangKodeKriteria(): string {
  const kode = KODE_KRITERIA;
  if (kode.length === 0) return "";
  if (kode.length === 1) return kode[0];
  const angka = kode.map((k) => Number(k.slice(1)));
  const berurutan =
    kode.every((k) => /^C\d+$/.test(k)) && angka.every((a, i) => i === 0 || a === angka[i - 1] + 1);
  return berurutan ? `${kode[0]}–${kode[kode.length - 1]}` : kode.join(", ");
}
