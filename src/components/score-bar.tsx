"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
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
  /** Lebar kolom label (px), menimpa bawaan (100px, atau 96px kalau ringkas). */
  lebarLabel?: number;
  /** Mulai terisi hanya saat bar masuk viewport (untuk konten di bawah lipatan). */
  saatTerlihat?: boolean;
  className?: string;
};

/**
 * Bar skor kriteria: track warna line, isi accent (nilai < 0,6 pakai muted).
 * Terisi dari 0 ke nilainya saat pertama tampil (berurutan antarbaris).
 */
export function ScoreBar({
  label,
  nilai,
  index = 0,
  ringkas = false,
  lebarLabel,
  saatTerlihat = false,
  className,
}: ScoreBarProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const terlihat = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const v = Math.min(1, Math.max(0, nilai));
  const lebar = `${Math.round(v * 100)}%`;
  const siap = !saatTerlihat || terlihat;
  const kolomLabel = lebarLabel ?? (ringkas ? 96 : 100);

  return (
    <div
      ref={ref}
      className={cn("grid items-center", ringkas ? "gap-2 text-xs" : "gap-2.5 text-xs", className)}
      style={{ gridTemplateColumns: `${kolomLabel}px minmax(0,1fr) ${ringkas ? 30 : 34}px` }}
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
          animate={{ width: siap || reduced ? lebar : "0%" }}
          transition={
            reduced ? { duration: 0 } : { ...TRANSISI_LAMBAT, delay: index * STAGGER_DETIK }
          }
        />
      </div>
      <AnimatedText value={formatSkor(v)} className="justify-end font-bold" />
    </div>
  );
}
