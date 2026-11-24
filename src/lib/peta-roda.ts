/**
 * Event `wheel` di atas peta untuk mouse/touchpad (pointer: fine). Fungsi MURNI.
 *
 * Hanya dua mode, TANPA heuristik "roda mouse vs touchpad" (heuristik itu dulu salah membaca
 * swipe vertikal touchpad sebagai klik roda mouse, sehingga men-zoom alih-alih menggeser):
 * - ctrlKey = true → zoom. Di Windows/Chrome pinch dua jari di touchpad dikirim sebagai
 *   wheel dengan ctrlKey = true; Ctrl + scroll juga masuk sini.
 * - selain itu → geser (pan), bebas ke segala arah (deltaX dan deltaY dipakai apa adanya).
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

/** Level zoom per piksel delta (pinch mengirim delta kecil, Ctrl+roda mouse ±100). */
export const FAKTOR_ZOOM = 0.01;
/** Batas perubahan zoom per satu event (level), supaya satu event tak melonjak. */
export const MAKS_ZOOM_PER_EVENT = 1;
/** Piksel per baris untuk deltaMode = 1 (Firefox). deltaMode = 2 memakai tinggi kontainer. */
export const PX_PER_BARIS = 16;

export type AksiRoda =
  | { jenis: "zoom"; /** perubahan level zoom (positif = zoom in) */ delta: number }
  | { jenis: "geser"; /** offset piksel untuk map.panBy */ dx: number; dy: number };

/** Delta dalam piksel apa pun deltaMode-nya. */
export function kePiksel(delta: number, deltaMode: number, tinggiKontainer: number): number {
  if (deltaMode === 1) return delta * PX_PER_BARIS;
  if (deltaMode === 2) return delta * tinggiKontainer;
  return delta;
}

/**
 * Aksi untuk satu event wheel. Zoom: scroll ke bawah / pinch ke dalam (deltaY > 0) = zoom out.
 * Geser: offset = delta (arah "natural" sudah diatur sistem operasi); tanpa penguncian sumbu,
 * ambang, atau pembulatan. Shift menukar sumbu bila deltaX = 0 (scroll vertikal → horizontal).
 */
export function aksiRoda(e: DataRoda, tinggiKontainer: number): AksiRoda {
  const dx = kePiksel(e.deltaX, e.deltaMode, tinggiKontainer);
  const dy = kePiksel(e.deltaY, e.deltaMode, tinggiKontainer);
  if (e.ctrlKey) {
    const delta = -dy * FAKTOR_ZOOM;
    return { jenis: "zoom", delta: Math.max(-MAKS_ZOOM_PER_EVENT, Math.min(MAKS_ZOOM_PER_EVENT, delta)) + 0 };
  }
  if (e.shiftKey && dx === 0) return { jenis: "geser", dx: dy, dy: 0 };
  return { jenis: "geser", dx, dy };
}
