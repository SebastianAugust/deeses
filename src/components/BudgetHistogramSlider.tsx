"use client";

import { useId } from "react";
import { AnimatedText } from "@/components/animated-text";
import { Crossfade } from "@/components/crossfade";
import { IndikatorMuat } from "@/components/indikator-muat";
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
  /** Versi sidebar desktop: nominal 24px, grafik 48px, tanpa label ujung. */
  ringkas?: boolean;
  /** Mulai lg: nominal 36px, grafik 72px (kartu Home desktop). */
  besarDiDesktop?: boolean;
  /** Sebaran baru sedang dimuat → titik berdenyut di samping hitungan (grafik lama tetap tampil). */
  memuat?: boolean;
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
  ringkas = false,
  besarDiDesktop = false,
  memuat = false,
  className,
}: BudgetHistogramSliderProps) {
  const idLabel = useId();
  const labelId = labelledBy ?? idLabel;
  const aktif = binDiBawah(value, min, step);
  const puncak = bins && bins.length > 0 ? Math.max(1, ...bins) : 1;
  const total = bins?.reduce((s, n) => s + n, 0);
  const diBawah = bins ? jumlahDiBawah(bins, value, min, step) : undefined;
  const tinggiGrafik = ringkas ? "h-12" : cn("h-16", besarDiDesktop && "lg:h-[72px]");

  return (
    <div className={cn("flex flex-col", ringkas ? "gap-2.5" : "gap-3", className)}>
      {labelledBy ? null : (
        <span id={idLabel} className="sr-only">
          {label}
        </span>
      )}
      {/* Nilai untuk pembaca layar sudah dibacakan slider (aria-valuetext). */}
      <AnimatedText
        value={formatRupiah(value)}
        className={cn(
          "self-start leading-tight font-extrabold tracking-[-0.02em]",
          ringkas ? "text-2xl" : "text-[28px]",
          besarDiDesktop && "lg:text-4xl",
        )}
      />

      {/* px-3: ruang untuk thumb (24px) yang berpusat tepat di ujung track. */}
      <div className="px-3">
        <Crossfade kunci={bins ? "grafik" : "skeleton"}>
          {bins ? (
            <div
              role="img"
              aria-label={`Grafik sebaran harga: ${total} kos, ${diBawah} di antaranya sampai ${formatRupiah(value)}.`}
              className={cn("flex items-end", tinggiGrafik)}
            >
              {bins.map((jumlah, i) => (
                // Tiap sel tepat 1/n lebar → tepi batang sejajar dengan posisi slider.
                <div key={i} className="flex h-full min-w-0 flex-1 basis-0 items-end px-px">
                  <div
                    className={cn(
                      "w-full rounded-t-[3px] transition-[background-color,height] duration-150 ease-out motion-reduce:transition-colors",
                      i < aktif ? "bg-accent" : "bg-[#CBD5E3]",
                    )}
                    style={{ height: `${Math.max(TINGGI_MIN_PERSEN, (jumlah / puncak) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Skeleton aria-hidden className={cn("rounded-md bg-line", tinggiGrafik)} />
          )}
        </Crossfade>

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

      {ringkas ? null : (
        <div
          className={cn(
            "-mt-1 flex justify-between text-xs text-muted",
            besarDiDesktop && "lg:text-[13px]",
          )}
          aria-hidden
        >
          <span>{formatRupiahSingkat(min)}</span>
          <span>{formatRupiahSingkat(max)}</span>
        </div>
      )}

      <p
        className={cn("flex items-center gap-2 text-muted", ringkas ? "text-xs" : "text-[13px]")}
        aria-live="polite"
      >
        {diBawah === undefined ? (
          <span>Memuat sebaran harga…</span>
        ) : (
          <span>
            <b className="font-bold text-ink">
              <AnimatedText value={diBawah} /> kos
            </b>{" "}
            di bawah budget ini
          </span>
        )}
        {memuat || diBawah === undefined ? <IndikatorMuat label="Memuat sebaran harga" /> : null}
      </p>
    </div>
  );
}
