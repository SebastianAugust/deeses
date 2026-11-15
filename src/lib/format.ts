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

/** 0.3 → "0,3 km" */
export function formatJarak(km: number): string {
  return `${km.toFixed(1).replace(".", ",")} km`;
}
