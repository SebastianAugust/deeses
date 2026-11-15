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

/** 0.82 → "0,82" */
export function formatSkor(nilai: number): string {
  return nilai.toFixed(2).replace(".", ",");
}

/** 0.3 → "0,3 km" */
export function formatJarak(km: number): string {
  return `${km.toFixed(1).replace(".", ",")} km`;
}
