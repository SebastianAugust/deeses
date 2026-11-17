/**
 * Konstanta animasi aplikasi. Semua animasi pendek (150–250 ms) dan ease-out.
 * Nilai CSS yang setara ada di globals.css (.tekan, .kartu-angkat, view transition).
 *
 * prefers-reduced-motion: <MotionProvider> memakai reducedMotion="user", jadi
 * animasi transform & layout dari motion otomatis mati dan hanya opacity yang
 * tersisa. Animasi non-transform (mis. lebar bar skor) cek useReducedMotion().
 */

/** Durasi dalam detik (format motion). */
export const DURASI = {
  cepat: 0.15,
  normal: 0.2,
  lambat: 0.25,
} as const;

/** cubic-bezier(0, 0, 0.2, 1) — ease-out standar. */
export const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];

export const TRANSISI = { duration: DURASI.normal, ease: EASE_OUT };
export const TRANSISI_CEPAT = { duration: DURASI.cepat, ease: EASE_OUT };
export const TRANSISI_LAMBAT = { duration: DURASI.lambat, ease: EASE_OUT };

/** Jeda antarkartu saat muncul berurutan, dan batas kartu yang diberi jeda. */
export const STAGGER_DETIK = 0.04;
export const STAGGER_MAKS = 8;

/** Jeda kemunculan kartu ke-i (kartu ke-9 dst. muncul bersama kartu ke-8). */
export function jedaStagger(i: number): number {
  return Math.min(i, STAGGER_MAKS - 1) * STAGGER_DETIK;
}

/** Lama badge "▲ n" / "▼ n" tampil setelah peringkat berubah. */
export const DURASI_BADGE_PERUBAHAN_MS = 2000;

/** Lama toast tampil sebelum hilang sendiri. */
export const DURASI_TOAST_MS = 5000;

/** Transisi dnd-kit (baris lain bergeser) — format CSS. */
export const TRANSISI_DND = { duration: 200, easing: "cubic-bezier(0, 0, 0.2, 1)" };
