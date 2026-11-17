/**
 * Penanda navigasi internal untuk sesi JS ini (diisi <NavigationTracker />).
 * Dipakai tombol back: router.back() hanya aman kalau entri sebelumnya
 * memang halaman aplikasi ini (bukan situs lain / tab baru) — dan, bila diminta,
 * memang halaman tertentu (mis. /hasil). Reset saat halaman dimuat ulang.
 */
let sudahNavigasi = false;
let jalurSebelumnya: string | null = null;

export function tandaiNavigasiInternal(dari: string) {
  sudahNavigasi = true;
  jalurSebelumnya = dari;
}

export function adaRiwayatInternal(): boolean {
  return sudahNavigasi;
}

/** Pathname halaman sebelumnya di dalam app (null kalau belum pindah halaman). */
export function halamanSebelumnya(): string | null {
  return jalurSebelumnya;
}
