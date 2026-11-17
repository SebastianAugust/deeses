import { SITE_NAME } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Logo SEMENTARA aplikasi: kotak biru (accent) + wordmark nama dari
 * src/config/site.ts. Semua tempat yang menampilkan logo/nama memakai komponen
 * ini, jadi mengganti logo cukup di file ini.
 */
type Ukuran = "sm" | "md" | "lg";

const UKURAN: Record<Ukuran, { kotak: string; teks: string; jarak: string }> = {
  sm: { kotak: "size-6 rounded-[7px]", teks: "text-[15px]", jarak: "gap-2" },
  md: { kotak: "size-7 rounded-[8px]", teks: "text-[17px]", jarak: "gap-2.5" },
  lg: { kotak: "size-8 rounded-[9px]", teks: "text-[22px]", jarak: "gap-2.5" },
};

export function Logo({
  ukuran = "md",
  varian = "lengkap",
  className,
}: {
  ukuran?: Ukuran;
  /** "lengkap" = kotak + wordmark, "ikon" = kotak saja (nama tetap terbaca pembaca layar). */
  varian?: "lengkap" | "ikon";
  className?: string;
}) {
  const u = UKURAN[ukuran];
  return (
    <span className={cn("inline-flex items-center", u.jarak, className)}>
      <span aria-hidden className={cn("flex-none bg-[#1D5FD1]", u.kotak)} />
      {varian === "lengkap" ? (
        <span className={cn("font-extrabold tracking-[-0.01em] text-[#1A1D24]", u.teks)}>{SITE_NAME}</span>
      ) : (
        <span className="sr-only">{SITE_NAME}</span>
      )}
    </span>
  );
}
