"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

/** Sama dengan breakpoint `lg` Tailwind. */
const QUERY_DESKTOP = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY_DESKTOP);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Cek langsung (bukan hook) — dipakai di effect/event handler. */
export function layarDesktop(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY_DESKTOP).matches;
}

/** true di layar ≥ lg. Saat render server/prerender selalu false. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, layarDesktop, () => false);
}

/**
 * Di desktop (dan selama `aktif`), ganti halaman ini dengan `href`
 * (router.replace). Mengembalikan true selama redirect berlangsung supaya
 * halaman bisa merender null.
 */
export function useDesktopRedirect(href: string, aktif = true): boolean {
  const desktop = useIsDesktop();
  const router = useRouter();
  useEffect(() => {
    // Cek ulang matchMedia: saat hidrasi, nilai hook bisa masih nilai server.
    if (aktif && layarDesktop()) router.replace(href);
  }, [aktif, desktop, href, router]);
  return desktop && aktif;
}

const noop = () => () => {};

/** true setelah berjalan di browser (untuk portal ke document.body). */
export function useDiBrowser(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
