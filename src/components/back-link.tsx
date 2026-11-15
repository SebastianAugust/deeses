"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adaRiwayatInternal, halamanSebelumnya } from "@/lib/riwayat";

type BackLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Tujuan kalau tidak ada riwayat yang cocok (juga dipakai untuk buka di tab baru). */
  href: string;
  /**
   * true → router.back() bila pengguna datang dari halaman lain di app.
   * string (pathname, mis. "/hasil") → router.back() hanya kalau halaman
   * sebelumnya persis itu.
   */
  pakaiRiwayat?: boolean | string;
};

/** Link kembali: router.back() kalau riwayatnya cocok, selain itu ke `href`. */
export function BackLink({ href, pakaiRiwayat = false, onClick, ...props }: BackLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !pakaiRiwayat || !adaRiwayatInternal()) return;
        if (typeof pakaiRiwayat === "string" && halamanSebelumnya() !== pakaiRiwayat) return;
        // Biarkan ctrl/cmd/shift-klik & klik tengah membuka href seperti biasa.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        router.back();
      }}
      {...props}
    />
  );
}
