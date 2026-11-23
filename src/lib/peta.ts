/**
 * Tautan Google Maps untuk kos. Hanya membangun URL; tidak memanggil layanan Google.
 * - koordinat_status "terverifikasi" atau "geokode" (dan lat/lng valid): PIN langsung
 *   ke koordinat (…&query=LAT,LNG).
 * - "perkiraan" atau status tidak ada: PENCARIAN berdasarkan NAMA (titik di data
 *   bisa meleset 1–2 km, jadi tidak dipakai sebagai pin).
 * - Bila data punya place ID Google (kolom gmaps_place_id) ditambahkan query_place_id.
 */
import { isKoordinatStatus, type KoordinatStatus } from "./types";

const BASIS = "https://www.google.com/maps/search/?api=1&query=";

/** Akhiran pembeda seperti " (2)". */
const AKHIRAN_PEMBEDA = /\s*\(\d+\)$/;

/** Frasa varian "Tipe <satu token alfanumerik>", mis. "Tipe B", "tipe II", "Tipe A1". */
const FRASA_TIPE = /\btipe\s+[a-z0-9]+\b/gi;

function rapikanSpasi(teks: string): string {
  return teks.replace(/\s+/g, " ").trim();
}

/** Spasi dirapikan, akhiran pembeda " (2)" dibuang. */
function rapikanNama(nama: string): string {
  return rapikanSpasi(rapikanSpasi(nama).replace(AKHIRAN_PEMBEDA, ""));
}

/**
 * Nama untuk pencarian: rapi + tanpa frasa varian "Tipe <kode>" (varian kamar,
 * bukan bagian nama tempat). Kalau pembuangan menyisakan kosong atau hanya
 * "kost"/"kos", pakai nama yang sudah dirapikan saja.
 */
function namaPencarian(nama: string): string {
  const rapi = rapikanNama(nama);
  const tanpaTipe = rapikanNama(rapi.replace(FRASA_TIPE, " "));
  return tanpaTipe === "" || /^(kost|kos)$/i.test(tanpaTipe) ? rapi : tanpaTipe;
}

/**
 * "Kost Pondok Kaca II Tipe B" → https://www.google.com/maps/search/?api=1&query=Kost%20Pondok%20Kaca%20II%20Jatinangor
 * Kata "Jatinangor" ditambahkan hanya bila belum ada di nama. Dengan `placeId`
 * (string tidak kosong) ditambah `&query_place_id=…` sehingga Maps membuka tempat
 * itu langsung (bentuk resmi Google Maps URLs). Nama kosong → null.
 */
export function urlCariGoogleMaps(nama: string, placeId?: string | null): string | null {
  const bersih = namaPencarian(nama ?? "");
  if (bersih === "") return null;
  const query = /jatinangor/i.test(bersih) ? bersih : `${bersih} Jatinangor`;
  return tambahPlaceId(`${BASIS}${encodeURIComponent(query)}`, placeId);
}

function tambahPlaceId(url: string, placeId?: string | null): string {
  const id = typeof placeId === "string" ? placeId.trim() : "";
  return id === "" ? url : `${url}&query_place_id=${encodeURIComponent(id)}`;
}

/** Koordinat yang boleh jadi pin: angka hingga, dalam rentang bumi (null/NaN/di luar rentang → tidak). */
function koordinatValid(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

/** Status yang titiknya cukup dipercaya untuk pin langsung. */
export function titikBisaDipercaya(status: KoordinatStatus | string | null | undefined): boolean {
  return isKoordinatStatus(status) && status !== "perkiraan";
}

export type DataTautanPeta = {
  nama: string;
  lat?: number | null;
  lng?: number | null;
  koordinat_status?: KoordinatStatus | string | null;
  placeId?: string | null;
};

/**
 * Tautan Maps untuk satu kos: pin LAT,LNG bila koordinat_status "terverifikasi"/"geokode"
 * dan koordinat valid; selain itu pencarian nama (urlCariGoogleMaps). Tanpa nama
 * dan tanpa pin → null.
 */
export function urlGoogleMaps({ nama, lat, lng, koordinat_status, placeId }: DataTautanPeta): string | null {
  if (titikBisaDipercaya(koordinat_status) && koordinatValid(lat, lng)) {
    return tambahPlaceId(`${BASIS}${lat},${lng}`, placeId);
  }
  return urlCariGoogleMaps(nama, placeId);
}
