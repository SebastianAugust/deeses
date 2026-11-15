"use client";

import { useId } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { formatRupiah, formatRupiahSingkat } from "@/lib/format";
import { binDiBawah, jumlahDiBawah } from "@/lib/sebaran";
import { cn } from "@/lib/utils";

type BudgetHistogramSliderProps = {
  value: number;
  onChange: (value: number) => void;
  /** Jumlah kos per bin (lihat src/lib/sebaran.ts). `undefined` = belum termuat → skeleton. */
  bins?: number[];
  min: number;
  max: number;
  step: number;
  /** Label slider untuk pembaca layar. */
  label?: string;
  /** Pakai elemen label yang sudah ada di luar komponen (id-nya) alih-alih label tersembunyi. */
  labelledBy?: string;
  className?: string;
};

const TINGGI_MIN_PERSEN = 6;

/**
 * Input budget: nominal besar, grafik sebaran harga, lalu slider yang lebarnya
 * sama persis dengan grafik (kiri = min, kanan = max). Batang yang seluruh
 * rentangnya ≤ budget diberi warna accent.
 */
export function BudgetHistogramSlider({
  value,
  onChange,
  bins,
  min,
  max,
  step,
  label = "Budget maksimal per bulan",
  labelledBy,
  className,
}: BudgetHistogramSliderProps) {
  const idLabel = useId();
  const labelId = labelledBy ?? idLabel;
  const aktif = binDiBawah(value, min, step);
  const puncak = bins && bins.length > 0 ? Math.max(1, ...bins) : 1;
  const total = bins?.reduce((s, n) => s + n, 0);
  const diBawah = bins ? jumlahDiBawah(bins, value, min, step) : undefined;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {labelledBy ? null : (
        <span id={idLabel} className="sr-only">
          {label}
        </span>
      )}
      {/* Nilai untuk pembaca layar sudah dibacakan slider (aria-valuetext). */}
      <span aria-hidden className="text-[28px] leading-tight font-extrabold tracking-[-0.02em]">
        {formatRupiah(value)}
      </span>

      {/* px-3: ruang untuk thumb (24px) yang berpusat tepat di ujung track. */}
      <div className="px-3">
        {bins ? (
          <div
            role="img"
            aria-label={`Grafik sebaran harga: ${total} kos, ${diBawah} di antaranya sampai ${formatRupiah(value)}.`}
            className="flex h-16 items-end"
          >
            {bins.map((jumlah, i) => (
              // Tiap sel tepat 1/n lebar → tepi batang sejajar dengan posisi slider.
              <div key={i} className="flex h-full min-w-0 flex-1 basis-0 items-end px-px">
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-colors",
                    i < aktif ? "bg-accent" : "bg-[#CBD5E3]",
                  )}
                  style={{ height: `${Math.max(TINGGI_MIN_PERSEN, (jumlah / puncak) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <Skeleton aria-hidden className="h-16 rounded-md bg-line" />
        )}

        <Slider
          aria-labelledby={labelId}
          thumbAlignment="center"
          min={min}
          max={max}
          step={step}
          value={[value]}
          locale="id-ID"
          format={{ style: "currency", currency: "IDR", maximumFractionDigits: 0 }}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        />
      </div>

      <div className="-mt-1 flex justify-between text-xs text-muted" aria-hidden>
        <span>{formatRupiahSingkat(min)}</span>
        <span>{formatRupiahSingkat(max)}</span>
      </div>

      <p className="text-[13px] text-muted" aria-live="polite">
        {diBawah === undefined ? (
          "Memuat sebaran harga…"
        ) : (
          <>
            <b className="font-bold text-ink">{diBawah} kos</b> di bawah budget ini
          </>
        )}
      </p>
    </div>
  );
}
