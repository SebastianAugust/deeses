/**
 * Pembantu koordinat untuk peta. MapLibre/GeoJSON memakai urutan [lng, lat], sedangkan
 * data aplikasi memakai {lat, lng}: semua konversi lewat sini supaya tidak tertukar.
 * Fungsi MURNI (tanpa I/O).
 */

export type Titik = { lat: number; lng: number };

/** [lng, lat] untuk setLngLat, fitBounds, center, dan koordinat GeoJSON. */
export type LngLat = [lng: number, lat: number];

export function keLngLat(t: Titik): LngLat {
  return [t.lng, t.lat];
}

const METER_PER_DERAJAT_LAT = 111_320;

/**
 * Cincin tertutup (titik pertama = terakhir) berbentuk lingkaran beradius `radiusM`
 * di sekitar `pusat`, urutan [lng, lat], untuk Polygon GeoJSON. Pendekatan datar
 * (cukup akurat untuk ratusan meter).
 */
export function cincinLingkaran(pusat: Titik, radiusM: number, langkah = 64): LngLat[] {
  const dLat = radiusM / METER_PER_DERAJAT_LAT;
  const dLng = radiusM / (METER_PER_DERAJAT_LAT * Math.cos((pusat.lat * Math.PI) / 180));
  const cincin: LngLat[] = [];
  for (let i = 0; i <= langkah; i++) {
    const a = (i / langkah) * 2 * Math.PI;
    cincin.push([pusat.lng + dLng * Math.cos(a), pusat.lat + dLat * Math.sin(a)]);
  }
  return cincin;
}
