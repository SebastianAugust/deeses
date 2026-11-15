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

/** true di layar ≥ lg. Saat render server/prerender selalu false. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY_DESKTOP).matches,
    () => false,
  );
}

/**
 * Di desktop, ganti halaman ini dengan `href` (router.replace). Mengembalikan
 * true selama redirect berlangsung supaya halaman bisa merender null.
 */
export function useDesktopRedirect(href: string): boolean {
  const desktop = useIsDesktop();
  const router = useRouter();
  useEffect(() => {
    if (desktop) router.replace(href);
  }, [desktop, href, router]);
  return desktop;
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
