"use client";

import { motion } from "motion/react";
import { AnimatedText } from "@/components/animated-text";
import { KosPhoto } from "@/components/kos-photo";
import { RankBadge } from "@/components/rank-badge";
import { formatRupiah, formatSkor, teksJarak } from "@/lib/format";
import { TRANSISI, jedaStagger } from "@/lib/motion";
import { labelTipe } from "@/lib/ringkasan";
import type { RankResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RankDeltaBadge } from "./rank-delta-badge";

type KosListCardProps = {
  kos: RankResult;
  /** Posisi di daftar (untuk jeda kemunculan). */
  index: number;
  /** Skor SAW tertinggi di daftar (lebar bar skor relatif terhadapnya). */
  skorMaks: number;
  /** Sembunyikan bar skor (hasil hanya 1–2 kos: bar penuh menyesatkan). */
  tanpaBar?: boolean;
  /** Teks tambahan meta, mis. "unggul biaya & keamanan" untuk #1. */
  catatan?: string;
  terpilih: boolean;
  delta?: number;
  href: string;
  onPilih: () => void;
};

/**
 * Kartu horizontal di kolom tengah /hasil desktop. Muncul berurutan, pindah
 * posisi dengan layout animation saat peringkat berubah. Terpilih: border 2px
 * accent + geser 4px ke kanan. Berupa link ?pilih= (klik biasa → ganti panel
 * tanpa pindah halaman; ctrl/cmd-klik tetap membuka tab baru).
 */
export function KosListCard({
  kos,
  index,
  skorMaks,
  tanpaBar = false,
  catatan,
  terpilih,
  delta,
  href,
  onPilih,
}: KosListCardProps) {
  const jeda = { ...TRANSISI, delay: jedaStagger(index) };
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, x: terpilih ? 4 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ default: TRANSISI, opacity: jeda, y: jeda, layout: TRANSISI }}
    >
      <a
        href={href}
        aria-current={terpilih ? "true" : undefined}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onPilih();
        }}
        className={cn(
          "kartu-angkat flex items-stretch gap-3.5 rounded-[20px] backdrop-blur-[20px]",
          terpilih
            ? "border-2 border-accent bg-white/78 p-[9px] shadow-[0_12px_28px_rgba(29,95,209,.20)]"
            : "border border-white/90 bg-white/55 p-2.5 shadow-[0_6px_18px_rgba(30,45,90,.08)] hover:bg-white/70 hover:shadow-[0_12px_28px_rgba(30,45,90,.14)]",
        )}
      >
        <KosPhoto
          src={kos.foto_url}
          nama={kos.nama}
          iconSize={0}
          label={null}
          className="h-[104px] w-[120px] flex-none rounded-[14px] xl:w-[150px]"
        >
          <RankBadge rank={kos.rank} size="md" className="absolute top-2 left-2 rounded-lg px-2 py-0.5" />
        </KosPhoto>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-base font-extrabold">{kos.nama}</span>
            <span className="text-base font-extrabold text-accent-ink tabular-nums">
              <span className="sr-only">Skor </span>
              <AnimatedText value={formatSkor(kos.skor_saw)} />
            </span>
          </div>
          <span className="truncate text-[13px] text-muted">
            {teksJarak(kos)} · {labelTipe(kos.tipe)}
            {catatan ? ` · ${catatan}` : null}
          </span>
          <span className="text-sm">
            <b>{formatRupiah(kos.harga)}</b> <span className="text-muted">/ bulan</span>
          </span>
          {tanpaBar ? null : (
            <div className="mt-1 h-[5px] rounded-[3px] bg-line" aria-hidden>
              <div
                className="h-[5px] rounded-[3px] bg-accent transition-[width] duration-250 ease-out motion-reduce:transition-none"
                style={{ width: `${Math.round((kos.skor_saw / skorMaks) * 100)}%` }}
              />
            </div>
          )}
        </div>
        <span className="flex w-[34px] flex-none items-center justify-end">
          <RankDeltaBadge delta={delta} />
        </span>
      </a>
    </motion.li>
  );
}
