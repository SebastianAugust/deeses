/**
 * Klasifikasi event `wheel` di atas peta untuk mouse/touchpad (pointer: fine). Fungsi MURNI.
 *
 * Di Windows/Chrome:
 * - pinch dua jari di touchpad dikirim sebagai wheel dengan ctrlKey = true (deltaY kecil);
 * - swipe dua jari di touchpad presisi = wheel dengan deltaX/deltaY kecil dan bulat (mode piksel);
 * - roda mouse = deltaY besar dan bulat (±100 atau ±120 per klik, deltaX 0), atau deltaMode
 *   "baris"/"halaman" (Firefox).
 */

/** Bagian event wheel yang dibutuhkan (WheelEvent memenuhi bentuk ini). */
export type DataRoda = {
  deltaX: number;
  deltaY: number;
  /** 0 = piksel, 1 = baris, 2 = halaman. */
  deltaMode: number;
  ctrlKey: boolean;
  shiftKey: boolean;
};

export type JenisRoda = "pinch" | "roda" | "touchpad";

/** deltaY (piksel) minimum agar dianggap satu klik roda mouse, bukan swipe touchpad. */
export const AMBANG_RODA_MOUSE_PX = 50;
/** Level zoom per piksel delta: pinch/Ctrl+scroll (touchpad mengirim delta kecil) dan roda mouse. */
export const FAKTOR_ZOOM_PINCH = 0.01;
export const FAKTOR_ZOOM_RODA = 0.005;
/** Batas perubahan zoom per satu event (level), supaya satu event tak melonjak. */
export const MAKS_ZOOM_PER_EVENT = 1;

const PX_PER_BARIS = 40;
const PX_PER_HALAMAN = 800;

/** Delta dalam piksel, apa pun deltaMode-nya. */
function keMiliPiksel(delta: number, deltaMode: number): number {
  if (deltaMode === 1) return delta * PX_PER_BARIS;
  if (deltaMode === 2) return delta * PX_PER_HALAMAN;
  return delta;
}

export function jenisRoda(e: DataRoda): JenisRoda {
  if (e.ctrlKey) return "pinch"; // pinch touchpad ATAU Ctrl + scroll
  if (e.deltaMode !== 0) return "roda";
  const bulat = Number.isInteger(e.deltaY);
  if (Math.abs(e.deltaY) >= AMBANG_RODA_MOUSE_PX && e.deltaX === 0 && bulat) return "roda";
  return "touchpad";
}

export type AksiRoda =
  | { jenis: "zoom"; /** perubahan level zoom (positif = zoom in) */ delta: number }
  | { jenis: "geser"; /** offset piksel untuk map.panBy */ dx: number; dy: number };

const jepit = (v: number, maks: number) => Math.max(-maks, Math.min(maks, v));

/**
 * Aksi untuk satu event wheel. Scroll ke bawah (deltaY > 0) = zoom out; swipe dua jari
 * menggeser sesuai arah delta (arah "natural" sudah diatur sistem operasi).
 * Shift menukar sumbu: scroll vertikal jadi geser horizontal (bila deltaX belum terisi).
 */
export function aksiRoda(e: DataRoda): AksiRoda {
  const jenis = jenisRoda(e);
  if (jenis === "touchpad") {
    const swap = e.shiftKey && e.deltaX === 0;
    return { jenis: "geser", dx: swap ? e.deltaY : e.deltaX, dy: swap ? 0 : e.deltaY };
  }
  const px = keMiliPiksel(e.deltaY, e.deltaMode);
  const faktor = jenis === "pinch" ? FAKTOR_ZOOM_PINCH : FAKTOR_ZOOM_RODA;
  // `0 -` menghindari -0 saat delta 0.
  return { jenis: "zoom", delta: 0 - jepit(px * faktor, MAKS_ZOOM_PER_EVENT) };
}
