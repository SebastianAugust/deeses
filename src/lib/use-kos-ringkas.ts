"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchKosRingkas } from "./api";
import type { KosRingkasCarousel } from "./types";

export type KosRingkasState =
  | { status: "loading" }
  | { status: "success"; data: KosRingkasCarousel[] }
  | { status: "error"; error: string };

type Tersimpan = { percobaan: number; state: KosRingkasState };

/** Daftar ringkas semua kos dari GET /api/kos (untuk carousel "Kos di data kami"). */
export function useKosRingkas() {
  const [percobaan, setPercobaan] = useState(0);
  const [tersimpan, setTersimpan] = useState<Tersimpan | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchKosRingkas(ctrl.signal)
      .then((data) => setTersimpan({ percobaan, state: { status: "success", data } }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setTersimpan({
          percobaan,
          state: { status: "error", error: e instanceof Error ? e.message : "Gagal memuat daftar kos." },
        });
      });
    return () => ctrl.abort();
  }, [percobaan]);

  const cobaLagi = useCallback(() => setPercobaan((n) => n + 1), []);
  const state: KosRingkasState =
    tersimpan && tersimpan.percobaan === percobaan ? tersimpan.state : { status: "loading" };
  return { ...state, cobaLagi } as KosRingkasState & { cobaLagi: () => void };
}
