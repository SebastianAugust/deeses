"use client";

import { useEffect, useState } from "react";
import { fetchSebaranHarga } from "./api";
import type { SebaranHarga } from "./sebaran";
import type { TipePenghuni } from "./types";

/**
 * Sebaran harga untuk tipe tertentu. Saat tipe diganti, sebaran lama tetap
 * dikembalikan sampai yang baru tiba (grafik tidak berkedip). `undefined`
 * hanya sebelum data pertama termuat (atau kalau gagal).
 */
export function useSebaranHarga(tipe: TipePenghuni): SebaranHarga | undefined {
  const [sebaran, setSebaran] = useState<SebaranHarga | undefined>(undefined);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchSebaranHarga(tipe, ctrl.signal)
      .then(setSebaran)
      .catch(() => {
        // Grafik bersifat pelengkap; kalau gagal, skeleton tetap tampil dan
        // slider masih bisa dipakai.
      });
    return () => ctrl.abort();
  }, [tipe]);

  return sebaran;
}
