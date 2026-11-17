/**
 * SATU-SATUNYA sumber katalog kriteria ("piece" lego) untuk frontend, validasi
 * API, mapper data, dan src/lib/dss.
 *
 * Pengguna memasang 1..MAKS_KRITERIA piece dan mengurutkannya; bobot rank-sum
 * dihitung dari urutan itu (n = jumlah piece terpasang, tidak ada angka tetap).
 *
 * Setiap piece menunjuk ke KOLOM MENTAH tabel public.kos (lihat
 * src/lib/repo/mapper.ts dan tests/fixtures/baris-kos.json; bentuk kolom sama
 * dengan dss-model-kos-jatinangor/kos_scored.csv). `tersedia: true` hanya bila
 * kolomnya ada dan nilainya tidak konstan di data (diverifikasi atas 360 baris
 * kos_scored.csv). Piece yang belum ada datanya tetap dicatat (tersedia: false
 * + alasan) supaya mudah diaktifkan saat kolomnya ditambahkan, tetapi TIDAK
 * pernah tampil di UI dan ditolak oleh API.
 *
 * Sengaja TIDAK dijadikan piece:
 * - C3 "akses layanan": proksi sintetis 0,15 + 0,35·C2 (salinan jarak, AUDIT.md T01).
 * - C5–C8: skor komposit rata-rata beberapa kolom fasilitas; isinya tidak sesuai
 *   label (AUDIT.md T15). Kolom fasilitas mentahnya dipakai langsung di bawah.
 * - C1: sama persis dengan kolom mentah `harga`, jadi dipakai `harga`.
 */

export type JenisKriteria = "cost" | "benefit";

export type KategoriKriteria = "biaya" | "lokasi" | "kamar" | "keamanan" | "bersama" | "aturan";

/** Batas jumlah piece terpasang. Di atas 8, bobot terbawah sudah sangat kecil (lihat UI). */
export const MAKS_KRITERIA = 12;

/** n di atas angka ini memunculkan peringatan bobot terbawah hampir tidak berpengaruh. */
export const BATAS_PERINGATAN_KRITERIA = 8;

export const KATEGORI_KRITERIA: readonly { kode: KategoriKriteria; nama: string }[] = [
  { kode: "biaya", nama: "Biaya" },
  { kode: "lokasi", nama: "Lokasi" },
  { kode: "kamar", nama: "Kamar" },
  { kode: "keamanan", nama: "Keamanan" },
  { kode: "bersama", nama: "Fasilitas bersama" },
  { kode: "aturan", nama: "Aturan" },
];

/**
 * Cara membaca nilai mentah dari satu baris tabel kos.
 * - "angka": kolom numerik apa adanya.
 * - "biner": kolom 0/1 → 0 atau 1 (nilai lain → null, tidak ditebak).
 */
export type SumberKriteria = { kolom: string; tipe: "angka" | "biner" };

type PieceConfig = {
  /** Kode stabil snake_case (dipakai di URL, API, dan skor_kriteria). */
  kode: string;
  nama: string;
  /** Nama pendek huruf kecil untuk kalimat ringkasan, mis. "harga". */
  singkat: string;
  kategori: KategoriKriteria;
  jenis: JenisKriteria;
  /** null = belum ada kolom di data. */
  sumber: SumberKriteria | null;
  satuan: string;
  deskripsi: string;
  tersedia: boolean;
  /** Wajib diisi bila `tersedia` false. */
  alasanTidakTersedia?: string;
};

const BELUM_ADA = (apa: string) => `Belum ada kolom ${apa} di tabel public.kos.`;

const DATA_KATALOG = [
  // ------------------------------- biaya -------------------------------
  {
    kode: "harga", nama: "Harga sewa", singkat: "harga", kategori: "biaya", jenis: "cost",
    sumber: { kolom: "harga", tipe: "angka" }, satuan: "Rp/bulan",
    deskripsi: "Biaya sewa per bulan.", tersedia: true,
  },
  {
    kode: "deposit", nama: "Deposit", singkat: "deposit", kategori: "biaya", jenis: "cost",
    sumber: null, satuan: "Rp", deskripsi: "Uang jaminan di awal sewa.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("deposit (tidak ada di dataset_kos_mamikos.xlsx)"),
  },
  {
    kode: "listrik", nama: "Listrik sudah termasuk", singkat: "listrik", kategori: "biaya", jenis: "benefit",
    sumber: { kolom: "termasuk_listrik", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Tanpa token atau tagihan listrik terpisah.", tersedia: true,
  },
  // ------------------------------- lokasi ------------------------------
  {
    // C2 = min(jarak Unpad, jarak ITB) dari prepare_data.py. Satu-satunya kolom
    // jarak di tabel. Catatan data: sebagian nilai adalah imputasi median 1,1 km
    // di sumber (AUDIT.md T03) dan belum punya kolom penanda.
    kode: "jarak_kampus", nama: "Jarak ke kampus terdekat", singkat: "jarak ke kampus", kategori: "lokasi", jenis: "cost",
    sumber: { kolom: "C2", tipe: "angka" }, satuan: "km",
    deskripsi: "Jarak ke Unpad atau ITB Jatinangor, mana yang lebih dekat.", tersedia: true,
  },
  {
    kode: "jarak_unpad", nama: "Jarak ke Unpad", singkat: "jarak ke Unpad", kategori: "lokasi", jenis: "cost",
    sumber: null, satuan: "km", deskripsi: "Jarak ke gerbang kampus Unpad.",
    tersedia: false,
    alasanTidakTersedia: `${BELUM_ADA("jarak_unpad_km")} Data mentah jarak_ke_unpad hanya ada di xlsx dan kosong di 180 dari 360 baris.`,
  },
  {
    kode: "jarak_itb", nama: "Jarak ke ITB", singkat: "jarak ke ITB", kategori: "lokasi", jenis: "cost",
    sumber: null, satuan: "km", deskripsi: "Jarak ke gerbang ITB Jatinangor.",
    tersedia: false,
    alasanTidakTersedia: `${BELUM_ADA("jarak_itb_km")} Data mentah jarak_ke_itb hanya ada di xlsx dan kosong di 186 dari 360 baris.`,
  },
  {
    kode: "minimarket", nama: "Jarak ke minimarket", singkat: "jarak ke minimarket", kategori: "lokasi", jenis: "cost",
    sumber: null, satuan: "km", deskripsi: "Minimarket terdekat dari kos.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("jarak ke minimarket"),
  },
  {
    kode: "pasar", nama: "Jarak ke pasar", singkat: "jarak ke pasar", kategori: "lokasi", jenis: "cost",
    sumber: null, satuan: "km", deskripsi: "Pasar atau supermarket terdekat.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("jarak ke pasar"),
  },
  // ------------------------------- kamar -------------------------------
  {
    // C4 = p × l dari ukuran_kamar (prepare_data.py). Bukan komposit; kolom
    // ukuran_kamar sendiri tidak ada di tabel, jadi C4 satu-satunya kolom luas.
    kode: "luas", nama: "Luas kamar", singkat: "luas kamar", kategori: "kamar", jenis: "benefit",
    sumber: { kolom: "C4", tipe: "angka" }, satuan: "m²",
    deskripsi: "Ukuran kamar dalam meter persegi.", tersedia: true,
  },
  {
    kode: "km_dalam", nama: "Kamar mandi dalam", singkat: "kamar mandi dalam", kategori: "kamar", jenis: "benefit",
    sumber: { kolom: "k_mandi_dalam", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Kamar mandi ada di dalam kamar.", tersedia: true,
  },
  {
    kode: "ac", nama: "AC", singkat: "AC", kategori: "kamar", jenis: "benefit",
    sumber: { kolom: "ac", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Kamar dilengkapi pendingin ruangan.", tersedia: true,
  },
  {
    kode: "air_panas", nama: "Air panas", singkat: "air panas", kategori: "kamar", jenis: "benefit",
    sumber: { kolom: "air_panas", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Tersedia air panas untuk mandi.", tersedia: true,
  },
  {
    kode: "jendela", nama: "Jendela", singkat: "jendela", kategori: "kamar", jenis: "benefit",
    sumber: { kolom: "jendela", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Kamar punya jendela.", tersedia: true,
  },
  {
    kode: "furnitur", nama: "Furnitur lengkap", singkat: "furnitur", kategori: "kamar", jenis: "benefit",
    sumber: null, satuan: "ya/tidak", deskripsi: "Kasur, lemari, dan meja tersedia.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("kasur/lemari/meja (furnitur)"),
  },
  // ------------------------------ keamanan -----------------------------
  {
    kode: "cctv", nama: "CCTV", singkat: "CCTV", kategori: "keamanan", jenis: "benefit",
    sumber: { kolom: "cctv", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Ada kamera pengawas di area kos.", tersedia: true,
  },
  {
    kode: "penjaga", nama: "Penjaga kos", singkat: "penjaga kos", kategori: "keamanan", jenis: "benefit",
    sumber: { kolom: "penjaga", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Ada penjaga atau pengelola di lokasi.", tersedia: true,
  },
  {
    kode: "akses24", nama: "Akses 24 jam", singkat: "akses 24 jam", kategori: "keamanan", jenis: "benefit",
    sumber: null, satuan: "ya/tidak", deskripsi: "Bebas keluar masuk kapan saja.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("akses 24 jam"),
  },
  // ------------------------------ bersama ------------------------------
  {
    kode: "parkir_motor", nama: "Parkir motor", singkat: "parkir motor", kategori: "bersama", jenis: "benefit",
    sumber: { kolom: "parkir_motor_sepeda", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Tersedia lahan parkir motor atau sepeda.", tersedia: true,
  },
  {
    kode: "parkir_mobil", nama: "Parkir mobil", singkat: "parkir mobil", kategori: "bersama", jenis: "benefit",
    sumber: { kolom: "parkir_mobil", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Tersedia lahan parkir mobil.", tersedia: true,
  },
  {
    kode: "dapur", nama: "Dapur bersama", singkat: "dapur", kategori: "bersama", jenis: "benefit",
    sumber: null, satuan: "ya/tidak", deskripsi: "Dapur yang bisa dipakai penghuni.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("dapur"),
  },
  {
    kode: "wifi", nama: "Wi-Fi", singkat: "Wi-Fi", kategori: "bersama", jenis: "benefit",
    sumber: { kolom: "wifi", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Internet sudah disediakan kos.", tersedia: true,
  },
  {
    kode: "ruang_tamu", nama: "Ruang tamu", singkat: "ruang tamu", kategori: "bersama", jenis: "benefit",
    sumber: { kolom: "ruang_tamu", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Ada ruang untuk menerima tamu.", tersedia: true,
  },
  {
    kode: "ruang_jemur", nama: "Ruang jemur", singkat: "ruang jemur", kategori: "bersama", jenis: "benefit",
    sumber: { kolom: "ruang_jemur", tipe: "biner" }, satuan: "ya/tidak",
    deskripsi: "Ada tempat menjemur pakaian.", tersedia: true,
  },
  // ------------------------------- aturan ------------------------------
  {
    kode: "jam_malam", nama: "Jam malam", singkat: "jam malam", kategori: "aturan", jenis: "cost",
    sumber: null, satuan: "tingkat", deskripsi: "Makin ketat, makin kurang bebas.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("aturan jam malam"),
  },
  {
    kode: "tamu", nama: "Aturan tamu", singkat: "aturan tamu", kategori: "aturan", jenis: "cost",
    sumber: null, satuan: "tingkat", deskripsi: "Seberapa ketat aturan menerima tamu.",
    tersedia: false, alasanTidakTersedia: BELUM_ADA("aturan tamu"),
  },
] as const satisfies readonly PieceConfig[];

/** Kode semua piece di katalog (tersedia maupun belum). */
export type KodeKriteria = (typeof DATA_KATALOG)[number]["kode"];

export type KriteriaInfo = Omit<PieceConfig, "kode"> & { kode: KodeKriteria };

/** Seluruh katalog, termasuk yang belum tersedia (untuk dokumentasi/test). */
export const KATALOG_KRITERIA: readonly KriteriaInfo[] = DATA_KATALOG;

/** Hanya piece yang datanya ada. Inilah yang boleh tampil di UI dan diterima API. */
export const KRITERIA_TERSEDIA: readonly KriteriaInfo[] = KATALOG_KRITERIA.filter((k) => k.tersedia);

const PER_KODE = new Map<string, KriteriaInfo>(KATALOG_KRITERIA.map((k) => [k.kode, k]));

/** Rakitan awal (mengikuti mockup 09/10): harga, jarak, luas, CCTV. */
export const KRITERIA_DEFAULT: readonly KodeKriteria[] = ["harga", "jarak_kampus", "luas", "cctv"];

/**
 * F2: apakah pencari "putra"/"putri" ikut melihat kos "campur"?
 * Keputusan grup BELUM final (AUDIT.md T06) — default false = tipe harus sama persis.
 */
export const IKUTKAN_CAMPUR_DEFAULT = false;

export function isKodeKriteria(v: unknown): v is KodeKriteria {
  return typeof v === "string" && PER_KODE.has(v);
}

/** Kode dikenal DAN datanya tersedia. */
export function isKodeTersedia(v: unknown): v is KodeKriteria {
  return isKodeKriteria(v) && PER_KODE.get(v)!.tersedia;
}

/** Info piece; undefined kalau kode tidak dikenal. */
export function getKriteria(kode: string): KriteriaInfo | undefined {
  return PER_KODE.get(kode);
}

/** Info piece yang pasti ada (kode sudah bertipe KodeKriteria). */
export function infoKriteria(kode: KodeKriteria): KriteriaInfo {
  return PER_KODE.get(kode)!;
}

export function namaKategori(kode: KategoriKriteria): string {
  return KATEGORI_KRITERIA.find((k) => k.kode === kode)?.nama ?? kode;
}

/** Piece per kategori, urut katalog. Default hanya yang tersedia. */
export function kriteriaPerKategori(
  kategori: KategoriKriteria,
  { hanyaTersedia = true }: { hanyaTersedia?: boolean } = {},
): KriteriaInfo[] {
  return (hanyaTersedia ? KRITERIA_TERSEDIA : KATALOG_KRITERIA).filter((k) => k.kategori === kategori);
}

export type KelompokKriteria = {
  kode: KategoriKriteria;
  nama: string;
  kriteria: KriteriaInfo[];
};

/** Kategori beserta piece-nya (yang tersedia); kategori tanpa piece tersedia dibuang. */
export function katalogTerkelompok(): KelompokKriteria[] {
  return KATEGORI_KRITERIA.map((k) => ({ ...k, kriteria: kriteriaPerKategori(k.kode) })).filter(
    (k) => k.kriteria.length > 0,
  );
}

/** Teks arah untuk UI. */
export function arahKriteria(jenis: JenisKriteria): string {
  return jenis === "cost" ? "Makin kecil makin baik" : "Makin besar makin baik";
}
