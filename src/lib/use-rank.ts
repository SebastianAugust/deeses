"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KodeKriteria } from "@/config/kriteria";
import { fetchRank } from "./api";
import type { FilterState } from "./query";
import type { RankResponse, RankResult } from "./types";

export type RankState =
  | { status: "loading"; data?: undefined; respons?: undefined; error?: undefined }
  | { status: "success"; data: RankResult[]; respons: RankResponse; error?: undefined }
  | { status: "error"; data?: undefined; respons?: undefined; error: string };

type Tersimpan = { kunci: string; respons?: RankResponse; error?: string };

const PESAN_TANPA_KRITERIA = "Pasang minimal 1 kriteria dulu untuk melihat peringkat.";

/**
 * Ambil peringkat dari /api/rank untuk filter tertentu.
 * - `debounceMs`: tunda permintaan (mis. saat slider digeser). Permintaan
 *   pertama tidak ditunda supaya halaman cepat terisi.
 * - `dataTerakhir` / `responsTerakhir`: hasil sukses terakhir, tetap tersedia
 *   selama memuat ulang.
 * - Tanpa kriteria terpasang → status error (tidak memanggil API).
 */
export function useRank(filter: FilterState, { debounceMs = 0 }: { debounceMs?: number } = {}) {
  const { budget, tipe } = filter;
  const kriteria = filter.kriteria.join(",");
  const [percobaan, setPercobaan] = useState(0);
  const [tersimpan, setTersimpan] = useState<Tersimpan | null>(null);
  const [responsTerakhir, setResponsTerakhir] = useState<RankResponse | undefined>(undefined);
  const pernahDimuat = useRef(false);

  const kunci = `${budget}|${tipe}|${kriteria}|${percobaan}`;

  useEffect(() => {
    if (kriteria === "") return;
    const ctrl = new AbortController();
    const tunda = pernahDimuat.current ? debounceMs : 0;
    const timer = setTimeout(() => {
      pernahDimuat.current = true;
      fetchRank({ budget, tipe, kriteria: kriteria.split(",") as KodeKriteria[] }, ctrl.signal)
        .then((respons) => {
          setTersimpan({ kunci, respons });
          setResponsTerakhir(respons);
        })
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setTersimpan({
            kunci,
            error: e instanceof Error ? e.message : "Gagal memuat rekomendasi.",
          });
        });
    }, tunda);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [budget, tipe, kriteria, kunci, debounceMs]);

  const cobaLagi = useCallback(() => setPercobaan((n) => n + 1), []);

  let state: RankState = { status: "loading" };
  if (kriteria === "") state = { status: "error", error: PESAN_TANPA_KRITERIA };
  else if (tersimpan && tersimpan.kunci === kunci) {
    if (tersimpan.respons) state = { status: "success", data: tersimpan.respons.hasil, respons: tersimpan.respons };
    else state = { status: "error", error: tersimpan.error ?? "Gagal memuat rekomendasi." };
  }

  return { ...state, dataTerakhir: responsTerakhir?.hasil, responsTerakhir, cobaLagi };
}
