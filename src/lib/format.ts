/** Pemisah ribuan titik, tanpa bergantung pada data locale runtime. */
function ribuan(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 1050000 → "Rp 1.050.000" */
export function formatRupiah(nilai: number): string {
  return `Rp ${ribuan(nilai)}`;
}

/** 1200000 → "Rp 1,2 jt", 500000 → "Rp 500 rb" */
export function formatRupiahSingkat(nilai: number): string {
  if (nilai >= 1_000_000) {
    const jt = (nilai / 1_000_000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
    return `Rp ${jt} jt`;
  }
  return `Rp ${Math.round(nilai / 1000)} rb`;
}

/** 0.82 → "0,82" */
export function formatSkor(nilai: number): string {
  return nilai.toFixed(2).replace(".", ",");
}

/** 150 → "150 m", 1250 → "1,3 km" */
export function formatJarakMeter(meter: number): string {
  if (meter < 1000) return `${Math.round(meter)} m`;
  return `${(meter / 1000).toFixed(1).replace(".", ",")} km`;
}

/** "2026-10-05T00:00:00Z" → "5 Oktober 2026" (null kalau tidak valid). */
export function formatTanggal(iso: string): string | null {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${t.getUTCDate()} ${BULAN[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

/** "Ibu Contoh 3" → "IC" */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter((k) => /\p{L}/u.test(k[0] ?? ""));
  return (kata.slice(0, 2).map((k) => k[0]).join("") || "?").toUpperCase();
}

/** 0.3 → "0,3 km"; di bawah 0,1 km tampil dalam meter (0.004 → "4 m", bukan "0,0 km"). */
export function formatJarak(km: number): string {
  if (km < 0.1) return `${Math.max(0, Math.round(km * 1000))} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

type DenganJarak = { jarak_km: number | null; jarak_imputasi?: boolean };

/**
 * "0,3 km", atau "jarak belum diketahui" kalau jarak kosong atau hanya hasil
 * imputasi (median, bukan data asli) — angka karangan tidak ditampilkan.
 */
export function teksJarak(kos: DenganJarak): string {
  return kos.jarak_imputasi || kos.jarak_km === null ? "jarak belum diketahui" : formatJarak(kos.jarak_km);
}

/** "0,3 km ke kampus", atau "jarak belum diketahui". */
export function teksJarakKeKampus(kos: DenganJarak): string {
  return kos.jarak_imputasi || kos.jarak_km === null
    ? "jarak belum diketahui"
    : `${formatJarak(kos.jarak_km)} ke kampus`;
}

/* ------------------------- Catatan mutu data ------------------------- */

export const LABEL_JARAK_RUTE = "perkiraan jarak rute";
export const LABEL_LOKASI_PERKIRAAN = "lokasi perkiraan";
export const CATATAN_HARGA_TAHUNAN = "harga dihitung dari tarif tahunan ÷ 12";
export const CATATAN_DATA_SIMULASI = "Data kos sebagian simulasi/perkiraan (lokasi, jarak, luas), bukan data resmi.";

type DenganStatusData = {
  jarak_km?: number | null;
  jarak_imputasi?: boolean;
  jarak_unpad_km?: number | null;
  jarak_itb_km?: number | null;
  koordinat_status?: string | null;
  basis_harga?: string | null;
};

const adalahAngka = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Minimal salah satu jarak per kampus (Unpad/ITB) ada. */
export function adaJarakPerKampus(kos: DenganStatusData): boolean {
  return adalahAngka(kos.jarak_unpad_km) || adalahAngka(kos.jarak_itb_km);
}

/** Ada jarak yang ditampilkan (per kampus, atau C2 yang bukan imputasi) → berlabel "perkiraan jarak rute". */
export function adaJarakRute(kos: DenganStatusData): boolean {
  return adaJarakPerKampus(kos) || (typeof kos.jarak_km === "number" && !kos.jarak_imputasi);
}

/** 1.84 → "1,8 km" (dibulatkan 0,1 km); null/undefined/bukan angka → "-". */
export function formatJarakKampus(km: number | null | undefined): string {
  return adalahAngka(km) ? formatJarak(km) : "-";
}

/** koordinat_status "perkiraan" → titik lokasi bisa meleset (label "lokasi perkiraan"). */
export function lokasiPerkiraan(kos: DenganStatusData): boolean {
  return kos.koordinat_status === "perkiraan";
}

/** basis_harga "tahun_dibagi_12" → harga bulanan dihitung dari tarif tahunan ÷ 12. */
export function hargaDariTahunan(kos: DenganStatusData): boolean {
  return kos.basis_harga === "tahun_dibagi_12";
}
