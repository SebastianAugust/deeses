import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const UKURAN = {
  sm: "rounded-lg px-2 py-[3px] text-[11px]",
  md: "rounded-[10px] px-2.5 py-1 text-xs",
  lg: "rounded-[12px] px-2.5 py-[5px] text-xs",
} as const;

type PhotoBadgeProps = {
  /** "glass" = pill kaca; "accent" = bg accent teks putih (skor #1). */
  tone?: "glass" | "accent";
  size?: keyof typeof UKURAN;
  className?: string;
  children: ReactNode;
};

/** Badge kecil di atas foto. Posisikan dari luar dengan `absolute …`. */
export function PhotoBadge({ tone = "glass", size = "sm", className, children }: PhotoBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-extrabold",
        tone === "glass"
          ? "border border-white/90 bg-white/78 text-ink backdrop-blur-md"
          : "bg-accent text-white",
        UKURAN[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

type RankBadgeProps = {
  rank: number;
  /** Teks tambahan setelah nomor, mis. "Paling cocok". */
  label?: string;
  size?: keyof typeof UKURAN;
  className?: string;
};

/** Pill kaca kecil "#1" untuk ditaruh di atas foto. */
export function RankBadge({ rank, label, size, className }: RankBadgeProps) {
  return (
    <PhotoBadge size={size} className={className}>
      #{rank}
      {label ? ` ${label}` : null}
    </PhotoBadge>
  );
}
