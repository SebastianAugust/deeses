import { formatSkor } from "@/lib/format";
import { cn } from "@/lib/utils";

type ScoreBarProps = {
  label: string;
  /** Skor ternormalisasi 0–1. */
  nilai: number;
  className?: string;
};

/** Bar skor kriteria: track 8px warna line, isi accent (nilai < 0,6 pakai muted). */
export function ScoreBar({ label, nilai, className }: ScoreBarProps) {
  const v = Math.min(1, Math.max(0, nilai));
  return (
    <div
      className={cn(
        "grid grid-cols-[100px_minmax(0,1fr)_32px] items-center gap-2.5 text-xs",
        className,
      )}
    >
      <span>{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={v}
        aria-valuetext={formatSkor(v)}
        className="h-2 rounded bg-line"
      >
        <div
          className={cn("h-2 rounded", v < 0.6 ? "bg-muted" : "bg-accent")}
          style={{ width: `${Math.round(v * 100)}%` }}
        />
      </div>
      <span className="text-right font-bold">{formatSkor(v)}</span>
    </div>
  );
}
