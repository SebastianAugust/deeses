/**
 * Tautan pencarian Google Maps berdasarkan NAMA kos (bukan koordinat: koordinat
 * di data belum terverifikasi). Hanya membangun URL; tidak memanggil layanan Google.
 */

/** Spasi dirapikan, akhiran pembeda seperti " (2)" dibuang. */
function rapikanNama(nama: string): string {
  return nama
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*\(\d+\)$/, "")
    .trim();
}

/**
 * "Kost Pondok Kaca II (2)" → https://www.google.com/maps/search/?api=1&query=Kost%20Pondok%20Kaca%20II%20Jatinangor
 * Kata "Jatinangor" ditambahkan hanya bila belum ada di nama. Nama kosong → null.
 */
export function urlCariGoogleMaps(nama: string): string | null {
  const bersih = rapikanNama(nama ?? "");
  if (bersih === "") return null;
  const query = /jatinangor/i.test(bersih) ? bersih : `${bersih} Jatinangor`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
