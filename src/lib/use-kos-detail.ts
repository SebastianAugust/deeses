"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchKosDetail } from "./api";
import type { FilterState } from "./query";
import type { KosDetailResponse } from "./types";

export type KosDetailState =
  | { status: "loading" }
  | { status: "success"; data: KosDetailResponse }
  | { status: "notfound" }
  /** 422: data kos belum lengkap / kosong di kriteria terpasang — mengulang tidak membantu. */
  | { status: "belum-lengkap"; pesan: string }
  | { status: "error"; error: string };

type Tersimpan = { kunci: string; state: KosDetailState };

/** Ambil detail 1 kos dari /api/kos/[id] dengan filter yang sama seperti hasil. */
export function useKosDetail(id: string, filter: FilterState) {
  const { budget, tipe } = filter;
  const kriteria = filter.kriteria.join(",");
  const [percobaan, setPercobaan] = useState(0);
  const [tersimpan, setTersimpan] = useState<Tersimpan | null>(null);
  const kunci = `${id}|${budget}|${tipe}|${kriteria}|${percobaan}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchKosDetail(id, { budget, tipe, kriteria: kriteria.split(",").filter(Boolean) as FilterState["kriteria"] }, ctrl.signal)
      .then((data) => setTersimpan({ kunci, state: { status: "success", data } }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        let state: KosDetailState;
        if (e instanceof ApiError && e.status === 404) state = { status: "notfound" };
        else if (e instanceof ApiError && e.status === 422) state = { status: "belum-lengkap", pesan: e.message };
        else state = { status: "error", error: e instanceof Error ? e.message : "Gagal memuat detail kos." };
        setTersimpan({ kunci, state });
      });
    return () => ctrl.abort();
  }, [id, budget, tipe, kriteria, kunci]);

  const cobaLagi = useCallback(() => setPercobaan((n) => n + 1), []);
  const state: KosDetailState =
    tersimpan && tersimpan.kunci === kunci ? tersimpan.state : { status: "loading" };
  return { ...state, cobaLagi } as KosDetailState & { cobaLagi: () => void };
}
