"use client";

import { useEffect, useState } from "react";
import { bacaPoi, type Poi } from "./poi";

const URL_POI = "/data/poi-jatinangor.json";

export type PoiState = { status: "memuat" } | { status: "siap"; data: Poi[] } | { status: "gagal" };

let cache: Poi[] | null = null;
let janji: Promise<Poi[]> | null = null;

/** Satu kali fetch per sesi halaman, dibagi semua pemakai (peta dan daftar sekitar). */
function muatPoi(): Promise<Poi[]> {
  janji ??= fetch(URL_POI)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    })
    .then((json) => {
      cache = bacaPoi(json);
      return cache;
    })
    .catch((e: unknown) => {
      janji = null; // boleh dicoba lagi pada pemakaian berikutnya
      throw e;
    });
  return janji;
}

/**
 * Tempat penting sekitar Jatinangor (public/data/poi-jatinangor.json). Tidak memuat
 * apa pun selama `aktif` false (mis. peta belum terlihat di layar).
 */
export function usePoi(aktif = true): PoiState {
  const [state, setState] = useState<PoiState>(() => (cache ? { status: "siap", data: cache } : { status: "memuat" }));

  useEffect(() => {
    if (!aktif) return;
    let batal = false;
    muatPoi().then(
      (data) => {
        if (!batal) setState({ status: "siap", data });
      },
      () => {
        if (!batal) setState({ status: "gagal" });
      },
    );
    return () => {
      batal = true;
    };
  }, [aktif]);

  return state;
}
