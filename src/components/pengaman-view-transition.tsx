"use client";

import { useEffect } from "react";

const DITANDAI = Symbol.for("kosjati.pengamanViewTransition");

/**
 * React <ViewTransition> (lihat components/halaman.tsx) memanggil
 * document.startViewTransition() saat navigasi. Kalau tab sedang tidak
 * terlihat, browser melewati animasinya dan menolak promise `ready` /
 * `finished` dengan "InvalidStateError: Skipped ViewTransition due to document
 * being hidden". Penolakan itu tidak ditangani → muncul sebagai error di
 * overlay dev, padahal navigasinya sendiri tetap berhasil.
 *
 * Pengaman ini hanya menandai promise tersebut sebagai sudah ditangani; isi
 * transisi (update DOM) tidak diubah.
 */
export function PengamanViewTransition() {
  useEffect(() => {
    const doc = document as Document & { [DITANDAI]?: boolean };
    if (typeof doc.startViewTransition !== "function" || doc[DITANDAI]) return;
    const asli = doc.startViewTransition.bind(doc);
    doc.startViewTransition = ((arg?: Parameters<typeof asli>[0]) => {
      const transisi = asli(arg);
      const abaikan = () => {};
      transisi.ready?.catch(abaikan);
      transisi.finished?.catch(abaikan);
      transisi.updateCallbackDone?.catch(abaikan);
      return transisi;
    }) as typeof doc.startViewTransition;
    doc[DITANDAI] = true;
  }, []);
  return null;
}
