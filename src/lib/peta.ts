/**
 * Tautan Google Maps untuk kos: PENCARIAN berdasarkan NAMA (koordinat di data
 * belum terverifikasi), atau tautan langsung ke tempat bila data punya place ID
 * Google (kolom gmaps_place_id). Hanya membangun URL; tidak memanggil layanan Google.
 */

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
  const url = `${BASIS}${encodeURIComponent(query)}`;
  const id = typeof placeId === "string" ? placeId.trim() : "";
  return id === "" ? url : `${url}&query_place_id=${encodeURIComponent(id)}`;
}
