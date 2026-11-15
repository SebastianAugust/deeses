import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Spinner } from "./indikator-muat";
import { StatusTautan } from "./status-tautan";

// .tekan: transisi 150 ms + scale .98 saat ditekan. .tombol-utama: hover lebih
// gelap (#1A55BC) + bayangan lebih besar (globals.css). Focus ring global.
const KELAS =
  "tekan tombol-utama relative inline-flex h-[52px] items-center justify-center gap-2 rounded-[16px] bg-accent px-[22px] text-[15px] font-bold text-white no-underline shadow-glow";

type SebagaiLink = { href: string } & Omit<ComponentProps<typeof Link>, "href">;
type SebagaiTombol = { href?: undefined } & ComponentProps<"button">;

type PrimaryButtonProps = (SebagaiLink | SebagaiTombol) & {
  /** Lebar penuh. */
  block?: boolean;
  /** Tombol: tampilkan spinner + disabled (cegah klik ganda). */
  memuat?: boolean;
};

/**
 * Tombol utama: datar, bg accent, tinggi 52px. Jadi <Link> kalau diberi `href`
 * (spinner otomatis selama navigasi pending).
 */
export function PrimaryButton({
  block = false,
  memuat = false,
  className,
  children,
  ...props
}: PrimaryButtonProps) {
  const kelas = cn(KELAS, block && "flex w-full", className);
  if (props.href !== undefined) {
    return (
      <Link className={kelas} {...props}>
        <StatusTautan>{children}</StatusTautan>
      </Link>
    );
  }
  const { disabled, ...tombol } = props;
  return (
    <button
      type="button"
      className={kelas}
      disabled={disabled || memuat}
      aria-busy={memuat || undefined}
      {...tombol}
    >
      {memuat ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** Kelas tombol sekunder (kaca kuat + border line), untuk <button>/<Link>. */
export const KELAS_TOMBOL_SEKUNDER =
  "tekan tombol-kaca relative flex h-[52px] items-center justify-center gap-2 rounded-[16px] bg-white/78 text-[15px] font-semibold text-ink";
