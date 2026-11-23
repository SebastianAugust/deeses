/**
 * Mapper baris tabel public.kos → tipe aplikasi. Fungsi MURNI (tanpa I/O),
 * dites di tests/data.test.ts dengan fixture baris.
 *
 * Nilai kriteria dibaca dari kolom mentah yang ditunjuk katalog
 * (src/config/kriteria.ts, field `sumber`). Kolom komposit C3, C5–C8 tidak dipakai.
 * Nilai yang tidak ada TIDAK dikarang: diisi null (kos lalu dikecualikan di DSS
 * hanya bila kriteria itu dipasang).
 */
import { KRITERIA_TERSEDIA, type KodeKriteria, type SumberKriteria } from "@/config/kriteria";
import {
  isBasisHarga,
  isKoordinatStatus,
  isLuasStatus,
  isTipePenghuni,
  type BasisHarga,
  type KoordinatStatus,
  type KosInfo,
  type LuasStatus,
  type TipePenghuni,
} from "@/lib/types";

export const KOLOM_FASILITAS = [
  "termasuk_listrik",
  "jendela",
  "k_mandi_dalam",
  "kloset_duduk",
  "kloset_jongkok",
  "shower",
  "air_panas",
  "cctv",
  "wifi",
  "penjaga",
  "ac",
  "parkir_mobil",
  "parkir_motor_sepeda",
  "tv",
  "ruang_tamu",
  "ruang_jemur",
  "pembayaran_per_bulan",
  "pembayaran_per_tahun",
] as const;

export type Fasilitas = (typeof KOLOM_FASILITAS)[number];

/**
 * Label tampilan + kelompok. "lain" = bukan fasilitas fisik (listrik, cara bayar,
 * kamar mandi dalam) — ditampilkan lewat field khusus di KosInfo.
 * Pembagian kamar/bersama adalah keputusan tim (AUDIT.md tabel kontrak).
 */
export const LABEL_FASILITAS: Record<Fasilitas, { label: string; grup: "kamar" | "bersama" | "lain" }> = {
  termasuk_listrik: { label: "Listrik termasuk", grup: "lain" },
  jendela: { label: "Jendela", grup: "kamar" },
  k_mandi_dalam: { label: "Kamar mandi dalam", grup: "lain" },
  kloset_duduk: { label: "Kloset duduk", grup: "kamar" },
  kloset_jongkok: { label: "Kloset jongkok", grup: "kamar" },
  shower: { label: "Shower", grup: "kamar" },
  air_panas: { label: "Air panas", grup: "kamar" },
  cctv: { label: "CCTV", grup: "bersama" },
  wifi: { label: "Wi-Fi", grup: "kamar" },
  penjaga: { label: "Penjaga kos", grup: "bersama" },
  ac: { label: "AC", grup: "kamar" },
  parkir_mobil: { label: "Parkir mobil", grup: "bersama" },
  parkir_motor_sepeda: { label: "Parkir motor/sepeda", grup: "bersama" },
  tv: { label: "TV", grup: "kamar" },
  ruang_tamu: { label: "Ruang tamu", grup: "bersama" },
  ruang_jemur: { label: "Ruang jemur", grup: "bersama" },
  pembayaran_per_bulan: { label: "Bisa bayar per bulan", grup: "lain" },
  pembayaran_per_tahun: { label: "Bisa bayar per tahun", grup: "lain" },
};

/** Kolom foto di tabel (text, boleh null / tidak ada), urut tampil. */
export const KOLOM_FOTO = ["foto_url_1", "foto_url_2", "foto_url_3", "foto_url_4", "foto_url_5"] as const;
export const MAKS_FOTO = KOLOM_FOTO.length;

/** Alamat placeholder dari prepare_data.py — bukan alamat asli. */
const ALAMAT_PLACEHOLDER = "jatinangor, sumedang";

/**
 * Nilai C2 hasil imputasi median di prepare_data.py (data LAMA).
 * Hanya dipakai untuk baris tanpa koordinat_status: data bersih menghitung C2
 * ulang sebagai jarak rute, jadi 1,1 di sana nilai asli, bukan imputasi.
 */
const C2_IMPUTASI = 1.1;

/** Baris mentah dari Supabase (select *). */
export type BarisKos = Record<string, unknown>;

/** Kos dalam bentuk aplikasi. */
export type Kos = {
  id: string;
  nama: string;
  alamat: string | null;
  lat: number | null;
  lng: number | null;
  /** Mutu titik lat/lng; null = kolom tidak ada / nilai tak dikenal. */
  koordinat_status: KoordinatStatus | null;
  /** "tidak_tercantum" = C4 kosong karena listing tidak menyebut ukuran kamar. */
  luas_status: LuasStatus | null;
  /** "tahun_dibagi_12" = harga dihitung dari tarif tahunan ÷ 12. */
  basis_harga: BasisHarga | null;
  /** null kalau nilai di tabel bukan putra/putri/campur (lihat `tipe_asli`). */
  tipe: TipePenghuni | null;
  tipe_asli: string | null;
  harga: number | null;
  /** Nilai mentah per kriteria tersedia (kolom dari katalog). null = tidak ada / bukan angka. */
  nilai: Partial<Record<KodeKriteria, number | null>>;
  /** = C2. */
  jarak_km: number | null;
  /** Heuristik data lama: C2 persis 1,1 (median imputasi) pada baris tanpa koordinat_status. */
  jarak_imputasi: boolean;
  /** = C4. */
  luas_m2: number | null;
  url: string | null;
  /** Foto pertama (= foto_urls[0]) atau null. */
  foto_url: string | null;
  /** Semua foto valid, urut, tanpa duplikat, maks MAKS_FOTO. Bisa kosong. */
  foto_urls: string[];
  /** Place ID Google; null bila kolom gmaps_place_id belum ada / kosong. */
  gmaps_place_id: string | null;
  fasilitas: Record<Fasilitas, boolean | null>;
};

function angka(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function teks(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Satu URL foto: teks ter-trim berskema http/https yang valid (host wajib ada).
 * javascript:, data:, relatif, kosong, atau bukan teks → null.
 */
export function keUrlFoto(v: unknown): string | null {
  const t = teks(v);
  if (t === null) return null;
  try {
    const u = new URL(t);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname !== "" ? t : null;
  } catch {
    return null;
  }
}

/**
 * Daftar foto dari nilai kolom mentah: URL tidak valid dibuang, urutan
 * dipertahankan, duplikat persis dibuang, maksimal MAKS_FOTO.
 */
export function keDaftarFoto(nilai: readonly unknown[]): string[] {
  const hasil: string[] = [];
  for (const v of nilai) {
    const url = keUrlFoto(v);
    if (url !== null && !hasil.includes(url) && hasil.length < MAKS_FOTO) hasil.push(url);
  }
  return hasil;
}

/** Ambil kolom; tabel bisa menamai C1 atau c1 tergantung cara dibuat. */
function kolom(baris: BarisKos, nama: string): unknown {
  if (nama in baris) return baris[nama];
  return baris[nama.toLowerCase()];
}

/** "−6.93" → -6.93; kosong/tidak valid/di luar rentang → null. */
export function keKoordinat(v: unknown, batas: 90 | 180): number | null {
  const n = typeof v === "string" ? angka(v) : typeof v === "number" ? angka(v) : null;
  if (n === null || Math.abs(n) > batas) return null;
  return n;
}

export function keTipe(v: unknown): TipePenghuni | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return isTipePenghuni(t) ? t : null;
}

/** Teks status → anggota daftar (huruf besar/spasi dimaafkan); selain itu null, tidak error. */
function keStatus<T extends string>(adalah: (v: unknown) => v is T, v: unknown): T | null {
  const t = typeof v === "string" ? v.trim().toLowerCase() : null;
  return adalah(t) ? t : null;
}

export const keKoordinatStatus = (v: unknown): KoordinatStatus | null => keStatus(isKoordinatStatus, v);
export const keLuasStatus = (v: unknown): LuasStatus | null => keStatus(isLuasStatus, v);
export const keBasisHarga = (v: unknown): BasisHarga | null => keStatus(isBasisHarga, v);

export function keAlamat(v: unknown): string | null {
  const t = teks(v);
  if (t === null || t.toLowerCase() === ALAMAT_PLACEHOLDER) return null;
  return t;
}

/** 1 → true, 0 → false, selain itu (null, 2, "x") → null. */
export function keBoolean(v: unknown): boolean | null {
  const n = angka(v);
  if (n === 1) return true;
  if (n === 0) return false;
  return null;
}

/** Nilai mentah satu kriteria dari baris, sesuai `sumber` di katalog. */
export function bacaSumber(baris: BarisKos, sumber: SumberKriteria): number | null {
  const v = kolom(baris, sumber.kolom);
  if (sumber.tipe === "angka") return angka(v);
  const b = keBoolean(v);
  return b === null ? null : b ? 1 : 0;
}

export function petakanBaris(baris: BarisKos): Kos {
  const idMentah = kolom(baris, "id");
  const id = typeof idMentah === "number" || typeof idMentah === "bigint" ? String(idMentah) : (teks(idMentah) ?? "");

  const nilai: Kos["nilai"] = {};
  for (const k of KRITERIA_TERSEDIA) if (k.sumber) nilai[k.kode] = bacaSumber(baris, k.sumber);

  const fasilitas = {} as Record<Fasilitas, boolean | null>;
  for (const f of KOLOM_FASILITAS) fasilitas[f] = keBoolean(kolom(baris, f));

  // foto_url_1..5; kolom lama "foto_url" (sudah tidak ada di tabel) hanya cadangan bila foto_url_1 kosong.
  const [f1, ...sisaFoto] = KOLOM_FOTO.map((nama) => kolom(baris, nama));
  const foto_urls = keDaftarFoto([keUrlFoto(f1) ?? keUrlFoto(kolom(baris, "foto_url")), ...sisaFoto]);

  const c2 = angka(kolom(baris, "C2"));
  const koordinat_status = keKoordinatStatus(kolom(baris, "koordinat_status"));
  return {
    id,
    nama: teks(kolom(baris, "nama")) ?? "Kos tanpa nama",
    alamat: keAlamat(kolom(baris, "alamat")),
    lat: keKoordinat(kolom(baris, "lat"), 90),
    lng: keKoordinat(kolom(baris, "lng"), 180),
    koordinat_status,
    luas_status: keLuasStatus(kolom(baris, "luas_status")),
    basis_harga: keBasisHarga(kolom(baris, "basis_harga")),
    tipe: keTipe(kolom(baris, "tipe_penghuni")),
    tipe_asli: teks(kolom(baris, "tipe_penghuni")),
    harga: angka(kolom(baris, "harga")),
    nilai,
    jarak_km: c2,
    jarak_imputasi: c2 === C2_IMPUTASI && koordinat_status === null,
    luas_m2: angka(kolom(baris, "C4")),
    url: teks(kolom(baris, "url")),
    foto_url: foto_urls[0] ?? null,
    foto_urls,
    gmaps_place_id: teks(kolom(baris, "gmaps_place_id")),
    fasilitas,
  };
}

/**
 * Kos yang bisa masuk filter DSS: id, tipe valid, dan harga ada. Kelengkapan
 * nilai kriteria dicek per permintaan (hanya kriteria yang dipasang) di src/lib/dss.
 */
export type KosLengkap = Kos & { tipe: TipePenghuni; harga: number };

export function isKosLengkap(k: Kos): k is KosLengkap {
  return k.id !== "" && k.tipe !== null && k.harga !== null;
}

/** Kode kriteria (dari `kriteria`) yang nilainya kosong untuk kos ini. */
export function kriteriaTanpaData(k: Kos, kriteria: readonly KodeKriteria[]): KodeKriteria[] {
  return kriteria.filter((kode) => {
    const v = k.nilai[kode];
    return typeof v !== "number" || !Number.isFinite(v);
  });
}

/** 12 → "12 m²", 12.75 → "12,75 m²". */
function formatLuas(m2: number): string {
  return `${Number(m2.toFixed(2)).toString().replace(".", ",")} m²`;
}

/**
 * Info detail dari data yang ADA di tabel. Yang tidak ada di tabel (kontak, aturan,
 * sekitar, deposit, diperbarui_at) = null. Foto = foto_url_1..5 yang valid. `sumber_url` = kolom `url` (null bila kosong).
 */
export function keKosInfo(k: Kos): KosInfo {
  const daftar = (grup: "kamar" | "bersama") =>
    KOLOM_FASILITAS.filter((f) => LABEL_FASILITAS[f].grup === grup && k.fasilitas[f] === true).map(
      (f) => LABEL_FASILITAS[f].label,
    );
  const mandi = k.fasilitas.k_mandi_dalam;
  return {
    alamat: k.alamat,
    luas_kamar: k.luas_m2 === null ? null : formatLuas(k.luas_m2),
    luas_m2: k.luas_m2,
    luas_status: k.luas_status,
    kamar_mandi: mandi === null ? null : mandi ? "dalam" : "luar",
    listrik_termasuk: k.fasilitas.termasuk_listrik,
    deposit: null,
    fasilitas_kamar: daftar("kamar"),
    fasilitas_bersama: daftar("bersama"),
    aturan: null,
    sekitar: null,
    foto_urls: k.foto_urls.length > 0 ? [...k.foto_urls] : null, // foto_url_1..5 (maks 5)
    kontak_nama: null,
    kontak_wa: null,
    kontak_telp: null,
    sumber_url: k.url,
    diperbarui_at: null,
    gmaps_place_id: k.gmaps_place_id,
  };
}

/** Jumlah kos per nilai ("(tidak ada)" untuk null). */
function hitungPer(semua: readonly Kos[], ambil: (k: Kos) => string | null): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const k of semua) {
    const nilai = ambil(k) ?? "(tidak ada)";
    hasil[nilai] = (hasil[nilai] ?? 0) + 1;
  }
  return hasil;
}

/** Ringkasan kualitas data (untuk log diagnostik & laporan), tanpa data rahasia. */
export function diagnostikData(semua: readonly Kos[]) {
  const tipeLain = new Map<string, number>();
  for (const k of semua) {
    if (k.tipe === null) {
      const t = k.tipe_asli ?? "(kosong)";
      tipeLain.set(t, (tipeLain.get(t) ?? 0) + 1);
    }
  }
  return {
    total: semua.length,
    lengkap_untuk_dss: semua.filter(isKosLengkap).length,
    foto_url_terisi: semua.filter((k) => k.foto_url !== null).length,
    foto_urls_terisi: semua.filter((k) => k.foto_urls.length > 0).length,
    url_terisi: semua.filter((k) => k.url !== null).length,
    alamat_terisi: semua.filter((k) => k.alamat !== null).length,
    koordinat_terisi: semua.filter((k) => k.lat !== null && k.lng !== null).length,
    koordinat_status: hitungPer(semua, (k) => k.koordinat_status),
    luas_status: hitungPer(semua, (k) => k.luas_status),
    basis_harga: hitungPer(semua, (k) => k.basis_harga),
    jarak_imputasi: semua.filter((k) => k.jarak_imputasi).length,
    kosong_per_kriteria: Object.fromEntries(
      KRITERIA_TERSEDIA.map((kr) => [kr.kode, semua.filter((k) => kriteriaTanpaData(k, [kr.kode]).length > 0).length]),
    ),
    tipe_di_luar_daftar: Object.fromEntries(tipeLain),
  };
}
