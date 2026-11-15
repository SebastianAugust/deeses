import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const KELAS =
  "inline-flex h-[52px] items-center justify-center gap-2 rounded-[16px] bg-accent px-[22px] text-[15px] font-bold text-white no-underline shadow-glow transition-colors hover:bg-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";

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
