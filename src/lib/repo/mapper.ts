/**
 * Mapper baris tabel public.kos → tipe aplikasi. Fungsi MURNI (tanpa I/O),
 * dites di tests/mapper.test.ts dengan fixture baris.
 *
 * Catatan data (lihat dss-model-kos-jatinangor/audit/AUDIT.md):
 * - C3 saat ini proksi SINTETIS 0,15 + 0,35·C2, bukan data asli (ditandai
 *   `sementara: true` di src/config/kriteria.ts).
 * - Nilai yang tidak ada TIDAK dikarang: diisi null.
 */
import { KODE_KRITERIA, type Kriteria } from "@/config/kriteria";
import { isTipePenghuni, type KosInfo, type TipePenghuni } from "@/lib/types";

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

/** Alamat placeholder dari prepare_data.py — bukan alamat asli. */
const ALAMAT_PLACEHOLDER = "jatinangor, sumedang";

/**
 * Nilai C2 hasil imputasi median di prepare_data.py.
 * TODO: hapus heuristik ini saat data punya flag imputasi (kolom jarak_imputasi).
 * Akibatnya kos yang jarak aslinya memang 1,1 km juga ikut tertandai.
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
  /** null kalau nilai di tabel bukan putra/putri/campur (lihat `tipe_asli`). */
  tipe: TipePenghuni | null;
  tipe_asli: string | null;
  harga: number | null;
  /** Nilai mentah per kriteria (C1..Cn dari config). null = tidak ada / bukan angka. */
  nilai: Record<Kriteria, number | null>;
  /** = C2. */
  jarak_km: number | null;
  /** Heuristik sementara: C2 persis 1,1 (median imputasi). */
  jarak_imputasi: boolean;
  /** = C4. */
  luas_m2: number | null;
  url: string | null;
  foto_url: string | null;
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

export function petakanBaris(baris: BarisKos): Kos {
  const idMentah = kolom(baris, "id");
  const id = typeof idMentah === "number" || typeof idMentah === "bigint" ? String(idMentah) : (teks(idMentah) ?? "");

  const nilai = {} as Record<Kriteria, number | null>;
  for (const k of KODE_KRITERIA) nilai[k] = angka(kolom(baris, k));

  const fasilitas = {} as Record<Fasilitas, boolean | null>;
  for (const f of KOLOM_FASILITAS) fasilitas[f] = keBoolean(kolom(baris, f));

  const c2 = angka(kolom(baris, "C2"));
  return {
    id,
    nama: teks(kolom(baris, "nama")) ?? "Kos tanpa nama",
    alamat: keAlamat(kolom(baris, "alamat")),
    lat: keKoordinat(kolom(baris, "lat"), 90),
    lng: keKoordinat(kolom(baris, "lng"), 180),
    tipe: keTipe(kolom(baris, "tipe_penghuni")),
    tipe_asli: teks(kolom(baris, "tipe_penghuni")),
    harga: angka(kolom(baris, "harga")),
    nilai,
    jarak_km: c2,
    jarak_imputasi: c2 === C2_IMPUTASI,
    luas_m2: angka(kolom(baris, "C4")),
    url: teks(kolom(baris, "url")),
    foto_url: teks(kolom(baris, "foto_url")),
    fasilitas,
  };
}

/** Kos yang bisa dihitung DSS: tipe valid, harga dan semua nilai kriteria berupa angka. */
export type KosLengkap = Kos & { tipe: TipePenghuni; harga: number; nilai: Record<Kriteria, number> };

export function isKosLengkap(k: Kos): k is KosLengkap {
  return (
    k.id !== "" &&
    k.tipe !== null &&
    k.harga !== null &&
    KODE_KRITERIA.every((kode) => k.nilai[kode] !== null)
  );
}

/** 12 → "12 m²", 12.75 → "12,75 m²". */
function formatLuas(m2: number): string {
  return `${Number(m2.toFixed(2)).toString().replace(".", ",")} m²`;
}

/**
 * Info detail dari data yang ADA di tabel. Yang tidak ada di tabel (kontak, aturan,
 * sekitar, deposit, diperbarui_at) = null. `sumber_url` = kolom `url` (null bila kosong).
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
    kamar_mandi: mandi === null ? null : mandi ? "dalam" : "luar",
    listrik_termasuk: k.fasilitas.termasuk_listrik,
    deposit: null,
    fasilitas_kamar: daftar("kamar"),
    fasilitas_bersama: daftar("bersama"),
    aturan: null,
    sekitar: null,
    foto_urls: k.foto_url ? [k.foto_url] : null, // tabel hanya punya 1 foto (foto_url)
    kontak_nama: null,
    kontak_wa: null,
    kontak_telp: null,
    sumber_url: k.url,
    diperbarui_at: null,
  };
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
    url_terisi: semua.filter((k) => k.url !== null).length,
    alamat_terisi: semua.filter((k) => k.alamat !== null).length,
    koordinat_terisi: semua.filter((k) => k.lat !== null && k.lng !== null).length,
    jarak_imputasi: semua.filter((k) => k.jarak_imputasi).length,
    tipe_di_luar_daftar: Object.fromEntries(tipeLain),
  };
}
