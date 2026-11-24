import { aksiRoda } from "./peta-roda";

/**
 * Penanganan event `wheel` untuk peta pada pointer halus (mouse/touchpad):
 * ctrlKey (pinch / Ctrl+scroll) = zoom di sekitar kursor, selain itu = geser bebas.
 * Aturan klasifikasinya ada di peta-roda.ts; berkas ini hanya mengurus siklus hidup listener.
 *
 * Jaminan: paling banyak SATU listener per elemen pembungkus (memasang lagi pada elemen yang
 * sama lebih dulu melepas yang lama, jadi aman terhadap StrictMode dan efek yang berulang),
 * dan pelepas yang dikembalikan aman dipanggil berkali-kali.
 */

/** Bagian peta MapLibre yang dipakai (peta sungguhan memenuhi bentuk ini). */
export type PetaUntukRoda<Titik = unknown> = {
  scrollZoom: { enable(): void; disable(): void };
  getContainer(): HTMLElement;
  getZoom(): number;
  panBy(offset: [number, number], opsi: { animate: boolean }): unknown;
  zoomTo(zoom: number, opsi: { around: Titik; duration: number }): unknown;
  unproject(titik: [number, number]): Titik;
};

const DEV = process.env.NODE_ENV !== "production";
const terpasang = new WeakMap<HTMLElement, () => void>();
let jumlahAktif = 0;

/** Jumlah listener wheel peta yang sedang aktif (seharusnya sama dengan jumlah peta di layar). */
export function jumlahListenerRoda(): number {
  return jumlahAktif;
}

function debug(pesan: string, rinci?: unknown) {
  if (DEV) console.debug(`[peta-roda] ${pesan}`, rinci ?? "");
}

/**
 * Pasang listener wheel pada `pembungkus` (sebaiknya elemen yang JUGA mencakup overlay peta:
 * tombol zoom, petunjuk, kontrol). Mematikan scrollZoom bawaan MapLibre selama terpasang.
 * Mengembalikan fungsi pelepas (juga memulihkan scrollZoom).
 */
export function pasangRoda<Titik>(pembungkus: HTMLElement, peta: PetaUntukRoda<Titik>): () => void {
  terpasang.get(pembungkus)?.(); // pastikan hanya satu listener per pembungkus
  peta.scrollZoom.disable();

  let logTerakhir = 0;
  const saatRoda = (e: WheelEvent) => {
    if (e.cancelable) {
      e.preventDefault(); // halaman tidak ikut menggulir / browser tidak zoom
    } else if (DEV && Date.now() - logTerakhir > 1000) {
      // Chrome mengirim wheel yang tak bisa dibatalkan saat guliran halaman sedang berlangsung
      // (scroll latching) atau main thread sibuk: halaman tetap bergulir walau peta ikut bergerak.
      logTerakhir = Date.now();
      debug("event wheel TIDAK bisa dibatalkan (cancelable=false): halaman mungkin ikut menggulir", {
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        ctrlKey: e.ctrlKey,
      });
    }
    const wadah = peta.getContainer();
    const aksi = aksiRoda(e, wadah.clientHeight);
    if (aksi.jenis === "geser") {
      peta.panBy([aksi.dx, aksi.dy], { animate: false });
      return;
    }
    const kotak = wadah.getBoundingClientRect();
    const titik: [number, number] = [e.clientX - kotak.left, e.clientY - kotak.top];
    peta.zoomTo(peta.getZoom() + aksi.delta, { around: peta.unproject(titik), duration: 0 });
  };

  pembungkus.addEventListener("wheel", saatRoda, { passive: false });
  jumlahAktif++;
  debug(`listener dipasang, aktif: ${jumlahAktif}`);

  let sudahDilepas = false;
  const lepas = () => {
    if (sudahDilepas) return;
    sudahDilepas = true;
    pembungkus.removeEventListener("wheel", saatRoda);
    if (terpasang.get(pembungkus) === lepas) terpasang.delete(pembungkus);
    jumlahAktif--;
    try {
      peta.scrollZoom.enable();
    } catch {
      // peta sudah dibongkar
    }
    debug(`listener dilepas, aktif: ${jumlahAktif}`);
  };
  terpasang.set(pembungkus, lepas);
  return lepas;
}
