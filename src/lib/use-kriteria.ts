"use client";

import { useCallback, useEffect, useState } from "react";
import type { Kriteria, KriteriaInfo } from "@/config/kriteria";
import { fetchKriteria } from "./api";

export type KriteriaState =
  | { status: "loading" }
  | { status: "success"; data: readonly KriteriaInfo[] }
  | { status: "error"; error: string };

/** Cache modul: daftar kriteria tidak berubah selama sesi, jadi cukup diambil sekali. */
let cache: readonly KriteriaInfo[] | null = null;

/** Urutan default = urut `prioritasDefault` (ikut dari API, bukan konstanta di UI). */
export function urutanDefaultDari(data: readonly KriteriaInfo[]): Kriteria[] {
  return [...data].sort((a, b) => a.prioritasDefault - b.prioritasDefault).map((k) => k.kode);
}

type Tersimpan = { percobaan: number; state: KriteriaState };

/**
 * Daftar kriteria dari GET /api/kriteria (jumlah kriteria = `data.length`; tidak ada
 * angka 8 di UI). Selama memuat → "loading"; gagal → "error" + `cobaLagi`.
 */
export function useKriteria() {
  const [percobaan, setPercobaan] = useState(0);
  const [tersimpan, setTersimpan] = useState<Tersimpan | null>(null);

  useEffect(() => {
    if (cache) return;
    const ctrl = new AbortController();
    fetchKriteria(ctrl.signal)
      .then((data) => {
        cache = data;
        setTersimpan({ percobaan, state: { status: "success", data } });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setTersimpan({
          percobaan,
          state: { status: "error", error: e instanceof Error ? e.message : "Gagal memuat kriteria." },
        });
      });
    return () => ctrl.abort();
  }, [percobaan]);

  const cobaLagi = useCallback(() => {
    setTersimpan(null);
    setPercobaan((n) => n + 1);
  }, []);

  let state: KriteriaState = { status: "loading" };
  if (cache) state = { status: "success", data: cache };
  else if (tersimpan && tersimpan.percobaan === percobaan) state = tersimpan.state;
  return { ...state, cobaLagi } as KriteriaState & { cobaLagi: () => void };
}

/** Urutan default dari API; null selama belum termuat. */
export function useUrutanDefault(): Kriteria[] | null {
  const k = useKriteria();
  return k.status === "success" ? urutanDefaultDari(k.data) : null;
}
