import { cn } from "@/lib/utils";

type RankBadgeProps = {
  rank: number;
  /** Teks tambahan setelah nomor, mis. "Paling cocok". */
  label?: string;
  className?: string;
};

/** Pill kaca kecil "#1" untuk ditaruh di atas foto. */
export function RankBadge({ rank, label, className }: RankBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/90 bg-white/78 px-2.5 py-1 text-xs font-extrabold text-ink backdrop-blur-md",
        className,
      )}
    >
      #{rank}
      {label ? ` ${label}` : null}
    </span>
  );
}
