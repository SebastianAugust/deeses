"use client";

import { useEffect, useState } from "react";
import { DURASI_BADGE_PERUBAHAN_MS } from "./motion";
import type { RankResult } from "./types";

/**
 * Perubahan peringkat antara daftar sebelumnya dan sekarang:
 * { [id]: +n naik / −n turun }. Dikosongkan lagi setelah ±2 detik.
 */
export function useRankDelta(daftar: RankResult[] | undefined): Record<string, number> {
  const [sebelumnya, setSebelumnya] = useState(daftar);
  const [delta, setDelta] = useState<Record<string, number>>({});

  // Pola "sesuaikan state saat render" (react.dev): hanya saat daftar berganti.
  if (daftar !== sebelumnya) {
    setSebelumnya(daftar);
    if (sebelumnya && daftar) {
      const lama = new Map(sebelumnya.map((k) => [k.id, k.rank]));
      const baru: Record<string, number> = {};
      for (const k of daftar) {
        const r = lama.get(k.id);
        if (r !== undefined && r !== k.rank) baru[k.id] = r - k.rank;
      }
      setDelta(baru);
    }
  }

  useEffect(() => {
    if (Object.keys(delta).length === 0) return;
    const timer = setTimeout(() => setDelta({}), DURASI_BADGE_PERUBAHAN_MS);
    return () => clearTimeout(timer);
  }, [delta]);

  return delta;
}
