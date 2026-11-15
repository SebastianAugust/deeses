"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { tandaiNavigasiInternal } from "@/lib/riwayat";

/** Mencatat bahwa pengguna sudah berpindah halaman di dalam app (lihat lib/riwayat). */
export function NavigationTracker() {
  const pathname = usePathname();
  const sebelumnya = useRef<string | null>(null);

  useEffect(() => {
    if (sebelumnya.current !== null && sebelumnya.current !== pathname) {
      tandaiNavigasiInternal(sebelumnya.current);
    }
    sebelumnya.current = pathname;
  }, [pathname]);

  return null;
}
