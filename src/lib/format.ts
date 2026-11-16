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

type DenganJarak = { jarak_km: number; jarak_imputasi?: boolean };

/**
 * "0,3 km", atau "jarak belum diketahui" kalau jarak hanya hasil imputasi (median,
 * bukan data asli) — angka karangan tidak ditampilkan.
 */
export function teksJarak(kos: DenganJarak): string {
  return kos.jarak_imputasi ? "jarak belum diketahui" : formatJarak(kos.jarak_km);
}

/** "0,3 km ke kampus", atau "jarak belum diketahui". */
export function teksJarakKeKampus(kos: DenganJarak): string {
  return kos.jarak_imputasi ? "jarak belum diketahui" : `${formatJarak(kos.jarak_km)} ke kampus`;
}
