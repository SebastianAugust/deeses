/**
 * Tempat penting di sekitar kos (data OpenStreetMap, public/data/poi-jatinangor.json
 * dibuat oleh scripts/ambil-poi.mjs). Fungsi MURNI (tanpa I/O).
 * Data © OpenStreetMap contributors (ODbL).
 */
import { formatJarakMeter } from "./format";

/** Kategori sesuai scripts/ambil-poi.mjs; urutan = urutan tampil (chip dan daftar). */
export const KATEGORI_POI = [
  { kode: "kampus", label: "Kampus", emoji: "🎓", warna: "#7c3aed" },
  { kode: "minimarket", label: "Minimarket", emoji: "🛒", warna: "#0e7c66" },
  { kode: "makan", label: "Makan", emoji: "🍴", warna: "#c2410c" },
  { kode: "pasar", label: "Pasar", emoji: "🧺", warna: "#a16207" },
  { kode: "apotek", label: "Apotek", emoji: "💊", warna: "#be185d" },
  { kode: "klinik", label: "Klinik", emoji: "🏥", warna: "#dc2626" },
  { kode: "atm_bank", label: "ATM/Bank", emoji: "🏧", warna: "#0369a1" },
  { kode: "masjid", label: "Masjid", emoji: "🕌", warna: "#15803d" },
  { kode: "laundry", label: "Laundry", emoji: "👕", warna: "#0891b2" },
  { kode: "spbu", label: "SPBU", emoji: "⛽", warna: "#475569" },
] as const;

export type KategoriPoi = (typeof KATEGORI_POI)[number]["kode"];

export type Poi = { id: string; nama: string; kategori: KategoriPoi; lat: number; lng: number };

/** Tempat beserta jarak garis lurus dari kos (meter, dibulatkan). */
export type TempatTerdekat = Poi & { jarak_m: number };

/** Atribusi wajib data dan tile OpenStreetMap (ODbL). */
export const ATRIBUSI_OSM = "© OpenStreetMap contributors (ODbL)";

/** Lingkaran ketidakpastian di sekitar pin kos berstatus koordinat "perkiraan". */
export const RADIUS_PERKIRAAN_M = 200;

export const RADIUS_POI_M = 1200;
export const MAKS_POI_PER_KATEGORI = 3;

const RADIUS_BUMI_M = 6_371_008.8;

export function infoKategori(kode: KategoriPoi) {
  return KATEGORI_POI.find((k) => k.kode === kode)!;
}

export function isKategoriPoi(v: unknown): v is KategoriPoi {
  return KATEGORI_POI.some((k) => k.kode === v);
}

export type Titik = { lat: number; lng: number };

/** Koordinat yang boleh dipakai: angka hingga dalam rentang bumi. */
export function koordinatValid(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Jarak garis lurus di permukaan bumi (meter), rumus haversine. */
export function haversine(a: Titik, b: Titik): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * RADIUS_BUMI_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Isi berkas POI → daftar valid. Entri rusak (bukan objek, nama kosong, kategori
 * tak dikenal, koordinat tidak valid) dibuang diam-diam; bukan array → [].
 */
export function bacaPoi(data: unknown): Poi[] {
  if (!Array.isArray(data)) return [];
  const hasil: Poi[] = [];
  for (const e of data) {
    if (typeof e !== "object" || e === null) continue;
    const { id, nama, kategori, lat, lng } = e as Record<string, unknown>;
    if (typeof id !== "string" || id === "" || typeof nama !== "string" || nama.trim() === "") continue;
    if (!isKategoriPoi(kategori) || !koordinatValid(lat, lng)) continue;
    hasil.push({ id, nama: nama.trim(), kategori, lat: lat as number, lng: lng as number });
  }
  return hasil;
}

/**
 * Tempat terdekat per kategori dalam radius (meter, batas termasuk), maksimal
 * `maksPerKategori` per kategori. Urutan hasil: urutan KATEGORI_POI, lalu jarak
 * naik (seri → id). Kos tanpa koordinat valid → [].
 */
export function pilihTempatTerdekat(
  kos: { lat?: number | null; lng?: number | null } | null | undefined,
  poi: readonly Poi[],
  { radiusM = RADIUS_POI_M, maksPerKategori = MAKS_POI_PER_KATEGORI } = {},
): TempatTerdekat[] {
  if (!kos || !koordinatValid(kos.lat, kos.lng)) return [];
  const asal = { lat: kos.lat as number, lng: kos.lng as number };
  const hasil: TempatTerdekat[] = [];
  for (const { kode } of KATEGORI_POI) {
    const dekat = poi
      .filter((p) => p.kategori === kode && koordinatValid(p.lat, p.lng))
      .map((p) => ({ p, jarak: haversine(asal, p) }))
      .filter(({ jarak }) => jarak <= radiusM)
      .sort((a, b) => a.jarak - b.jarak || a.p.id.localeCompare(b.p.id))
      .slice(0, Math.max(0, maksPerKategori));
    for (const { p, jarak } of dekat) hasil.push({ ...p, jarak_m: Math.round(jarak) });
  }
  return hasil;
}

/** 347 → "± 350 m", 1240 → "± 1,2 km" (dibulatkan 10 m: garis lurus, bukan rute, jadi tidak perlu presisi). */
export function teksJarakGarisLurus(meter: number): string {
  return `± ${formatJarakMeter(Math.round(meter / 10) * 10)}`;
}
