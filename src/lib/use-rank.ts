"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchRank } from "./api";
import type { FilterState } from "./query";
import type { Kriteria, RankResult } from "./types";

export type RankState =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: RankResult[]; error?: undefined }
  | { status: "error"; data?: undefined; error: string };

type Tersimpan = { kunci: string; data?: RankResult[]; error?: string };

/**
 * Ambil peringkat dari /api/rank untuk filter tertentu.
 * - `debounceMs`: tunda permintaan (mis. saat slider digeser).
 * - `dataTerakhir`: hasil sukses terakhir, tetap tersedia selama memuat ulang.
 */
export function useRank(filter: FilterState, { debounceMs = 0 }: { debounceMs?: number } = {}) {
  const { budget, tipe } = filter;
  const urutan = filter.urutan.join(",");
  const [percobaan, setPercobaan] = useState(0);
  const [tersimpan, setTersimpan] = useState<Tersimpan | null>(null);
  const [dataTerakhir, setDataTerakhir] = useState<RankResult[] | undefined>(undefined);

  const kunci = `${budget}|${tipe}|${urutan}|${percobaan}`;

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchRank(
        { budget, tipe, urutan_kriteria: urutan.split(",") as Kriteria[] },
        ctrl.signal,
      )
        .then((data) => {
          setTersimpan({ kunci, data });
          setDataTerakhir(data);
        })
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setTersimpan({
            kunci,
            error: e instanceof Error ? e.message : "Gagal memuat rekomendasi.",
          });
        });
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [budget, tipe, urutan, kunci, debounceMs]);

  const cobaLagi = useCallback(() => setPercobaan((n) => n + 1), []);

  let state: RankState = { status: "loading" };
  if (tersimpan && tersimpan.kunci === kunci) {
    if (tersimpan.data) state = { status: "success", data: tersimpan.data };
    else state = { status: "error", error: tersimpan.error ?? "Gagal memuat rekomendasi." };
  }

  return { ...state, dataTerakhir, cobaLagi };
}
