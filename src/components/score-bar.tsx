"use client";

import { motion, useReducedMotion } from "motion/react";
import { AnimatedText } from "@/components/animated-text";
import { formatSkor } from "@/lib/format";
import { STAGGER_DETIK, TRANSISI_LAMBAT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ScoreBarProps = {
  label: string;
  /** Skor ternormalisasi 0–1. */
  nilai: number;
  /** Urutan baris; dipakai untuk jeda kecil antarbaris saat terisi. */
  index?: number;
  /** Versi panel desktop: kolom label 96px, track 7px. */
  ringkas?: boolean;
  className?: string;
};

/**
 * Bar skor kriteria: track warna line, isi accent (nilai < 0,6 pakai muted).
 * Saat pertama tampil terisi dari 0 ke nilainya (berurutan antarbaris).
 */
export function ScoreBar({ label, nilai, index = 0, ringkas = false, className }: ScoreBarProps) {
  const reduced = useReducedMotion();
  const v = Math.min(1, Math.max(0, nilai));
  const lebar = `${Math.round(v * 100)}%`;

  return (
    <div
      className={cn(
        "grid items-center text-xs",
        ringkas
          ? "grid-cols-[96px_minmax(0,1fr)_30px] gap-2"
          : "grid-cols-[100px_minmax(0,1fr)_32px] gap-2.5",
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
        className={cn("rounded bg-line", ringkas ? "h-[7px]" : "h-2")}
      >
        <motion.div
          className={cn("h-full rounded", v < 0.6 ? "bg-muted" : "bg-accent")}
          // Lebar bukan transform, jadi reduced motion dicek manual: langsung ke nilai akhir.
          initial={reduced ? false : { width: "0%" }}
          animate={{ width: lebar }}
          transition={
            reduced ? { duration: 0 } : { ...TRANSISI_LAMBAT, delay: index * STAGGER_DETIK }
          }
        />
      </div>
      <AnimatedText value={formatSkor(v)} className="justify-end font-bold" />
    </div>
  );
}
