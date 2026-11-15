import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// .tekan (globals.css): transisi 150 ms + scale .98 saat ditekan.
// Hover sedikit lebih terang; focus ring dari aturan global :focus-visible.
const KELAS =
  "tekan inline-flex h-[52px] items-center justify-center gap-2 rounded-[16px] bg-accent px-[22px] text-[15px] font-bold text-white no-underline shadow-glow hover:brightness-110 disabled:pointer-events-none disabled:opacity-50";

type SebagaiLink = { href: string } & Omit<ComponentProps<typeof Link>, "href">;
type SebagaiTombol = { href?: undefined } & ComponentProps<"button">;

type PrimaryButtonProps = (SebagaiLink | SebagaiTombol) & {
  /** Lebar penuh. */
  block?: boolean;
};

/** Tombol utama: datar, bg accent, tinggi 52px. Jadi <Link> kalau diberi `href`. */
export function PrimaryButton({ block = false, className, ...props }: PrimaryButtonProps) {
  const kelas = cn(KELAS, block && "flex w-full", className);
  if (props.href !== undefined) {
    return <Link className={kelas} {...props} />;
  }
  return <button type="button" className={kelas} {...props} />;
}

/** Kelas tombol sekunder (kaca kuat + border line), untuk <button>/<Link>. */
export const KELAS_TOMBOL_SEKUNDER =
  "tekan flex h-[52px] items-center justify-center rounded-[16px] border border-line bg-white/78 text-[15px] font-semibold text-ink hover:bg-white";
