"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchKosDetail } from "./api";
import type { FilterState } from "./query";
import type { KosDetailResponse } from "./types";

export type KosDetailState =
  | { status: "loading" }
  | { status: "success"; data: KosDetailResponse }
  | { status: "notfound" }
  | { status: "error"; error: string };

type Tersimpan = { kunci: string; state: KosDetailState };

/** Ambil detail 1 kos dari /api/kos/[id] dengan filter yang sama seperti hasil. */
export function useKosDetail(id: string, filter: FilterState) {
  const { budget, tipe } = filter;
  const urutan = filter.urutan.join(",");
  const [percobaan, setPercobaan] = useState(0);
  const [tersimpan, setTersimpan] = useState<Tersimpan | null>(null);
  const kunci = `${id}|${budget}|${tipe}|${urutan}|${percobaan}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchKosDetail(id, { budget, tipe, urutan: urutan.split(",") as FilterState["urutan"] }, ctrl.signal)
      .then((data) => setTersimpan({ kunci, state: { status: "success", data } }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        const state: KosDetailState =
          e instanceof ApiError && e.status === 404
            ? { status: "notfound" }
            : { status: "error", error: e instanceof Error ? e.message : "Gagal memuat detail kos." };
        setTersimpan({ kunci, state });
      });
    return () => ctrl.abort();
  }, [id, budget, tipe, urutan, kunci]);

  const cobaLagi = useCallback(() => setPercobaan((n) => n + 1), []);
  const state: KosDetailState =
    tersimpan && tersimpan.kunci === kunci ? tersimpan.state : { status: "loading" };
  return { ...state, cobaLagi } as KosDetailState & { cobaLagi: () => void };
}
