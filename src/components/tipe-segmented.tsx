"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { TRANSISI } from "@/lib/motion";
import { labelTipe } from "@/lib/ringkasan";
import { TIPE_PENGHUNI, type TipePenghuni } from "@/lib/types";
import { cn } from "@/lib/utils";

type TipeSegmentedProps = {
  value: TipePenghuni;
  onChange: (tipe: TipePenghuni) => void;
  /** id elemen judul grup. */
  labelledBy: string;
  /** "md" = pill kaca 44px (mobile/Home), "sm" = kotak 36px (sidebar desktop). */
  size?: "md" | "sm";
  /** Ukuran md, mulai lg tombol 48px & teks 16px (kartu Home desktop). */
  besarDiDesktop?: boolean;
};

/**
 * Tombol segmented Putra / Putri / Campur. Indikator putih bergeser halus ke
 * opsi terpilih (layoutId motion; dengan reduced motion langsung pindah).
 */
export function TipeSegmented({
  value,
  onChange,
  labelledBy,
  size = "md",
  besarDiDesktop = false,
}: TipeSegmentedProps) {
  const idIndikator = useId();
  const kecil = size === "sm";

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className={cn(
        "grid grid-cols-3 gap-1 p-1",
        kecil
          ? "rounded-[12px] border border-line bg-white/60"
          : "rounded-full border border-white/90 bg-white/55 backdrop-blur-[20px]",
      )}
    >
      {TIPE_PENGHUNI.map((tipe) => {
        const aktif = tipe === value;
        return (
          <button
            key={tipe}
            type="button"
            aria-pressed={aktif}
            onClick={() => onChange(tipe)}
            className={cn(
              // .pilihan: hover (teks ink + bg putih 50%) hanya untuk opsi yang belum terpilih.
              "tekan pilihan relative",
              kecil ? "h-9 rounded-[9px] text-[13px]" : "h-11 rounded-full text-sm",
              !kecil && besarDiDesktop && "lg:h-12 lg:text-base",
              aktif ? "font-bold text-accent-ink" : "font-semibold text-muted",
            )}
          >
            {aktif ? (
              <motion.span
                layoutId={idIndikator}
                transition={TRANSISI}
                aria-hidden
                className={cn(
                  "absolute inset-0 bg-white shadow-[0_2px_8px_rgba(30,45,90,.12)]",
                  kecil ? "rounded-[9px]" : "rounded-full",
                )}
              />
            ) : null}
            <span className="relative">{labelTipe(tipe)}</span>
          </button>
        );
      })}
    </div>
  );
}
