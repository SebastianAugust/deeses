/**
 * Penanda "sudah pernah pindah halaman di dalam app" untuk sesi JS ini.
 * Dipakai tombol back: router.back() hanya aman kalau entri sebelumnya
 * memang halaman Kosjati (bukan situs lain / tab baru).
 * Diisi oleh <NavigationTracker /> di root layout. Reset saat halaman dimuat ulang.
 */
let sudahNavigasi = false;

export function tandaiNavigasiInternal() {
  sudahNavigasi = true;
}

export function adaRiwayatInternal(): boolean {
  return sudahNavigasi;
}
