"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Spinner } from "./indikator-muat";

/**
 * Isi tombol berupa <Link>: selama navigasi pending, tampilkan spinner dan
 * tahan klik berikutnya (lapisan transparen yang preventDefault, sehingga
 * Link tidak menavigasi dua kali). Harus dirender di dalam <Link>.
 */
export function StatusTautan({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? <Spinner /> : null}
      {children}
      {pending ? (
        <span
          aria-hidden
          className="absolute inset-0 cursor-progress"
          onClick={(e) => e.preventDefault()}
        />
      ) : null}
    </>
  );
}
