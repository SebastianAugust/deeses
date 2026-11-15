"use client";

import { useEffect, useState } from "react";
import { fetchSebaranHarga } from "./api";
import type { SebaranHarga } from "./sebaran";
import type { TipePenghuni } from "./types";

type Tersimpan = { tipe: TipePenghuni; data: SebaranHarga };

/**
 * Sebaran harga untuk tipe tertentu. Saat tipe diganti, sebaran lama tetap
 * dikembalikan sampai yang baru tiba (grafik tidak berkedip), dengan
 * `memuat: true` supaya UI bisa menampilkan indikator kecil.
 * `data` undefined hanya sebelum data pertama termuat (atau kalau gagal).
 */
export function useSebaranHarga(tipe: TipePenghuni): {
  data: SebaranHarga | undefined;
  memuat: boolean;
} {
  const [tersimpan, setTersimpan] = useState<Tersimpan | undefined>(undefined);
  const [gagal, setGagal] = useState<TipePenghuni | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchSebaranHarga(tipe, ctrl.signal)
      .then((data) => setTersimpan({ tipe, data }))
      .catch(() => {
        // Grafik bersifat pelengkap; kalau gagal, skeleton/grafik lama tetap
        // tampil dan slider masih bisa dipakai.
        if (!ctrl.signal.aborted) setGagal(tipe);
      });
    return () => ctrl.abort();
  }, [tipe]);

  return {
    data: tersimpan?.data,
    memuat: tersimpan?.tipe !== tipe && gagal !== tipe,
  };
}
