"use client";

import { useCallback, useRef, useState } from "react";

/** Lama minimum state "sibuk" supaya spinner sempat terlihat & klik ganda tertahan. */
const MIN_SIBUK_MS = 400;

const tunggu = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * State loading singkat untuk tombol yang memicu fetch / pindah langkah.
 * `jalankan(fn)` mengabaikan klik berikutnya selama masih sibuk.
 */
export function useSibukSingkat(minMs = MIN_SIBUK_MS) {
  const [sibuk, setSibuk] = useState(false);
  const sibukRef = useRef(false);

  const jalankan = useCallback(
    async (fn: () => unknown) => {
      if (sibukRef.current) return;
      sibukRef.current = true;
      setSibuk(true);
      try {
        await Promise.all([Promise.resolve(fn()), tunggu(minMs)]);
      } finally {
        sibukRef.current = false;
        setSibuk(false);
      }
    },
    [minMs],
  );

  return [sibuk, jalankan] as const;
}
