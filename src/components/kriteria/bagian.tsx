"use client";

import type { MouseEvent } from "react";
import { AnimatedText } from "@/components/animated-text";
import { infoKriteria, namaKategori, type KodeKriteria } from "@/config/kriteria";
import { bobotPerPosisi, formatPersen } from "@/lib/weights";
import { cn } from "@/lib/utils";

/*
 * Potongan UI lego kriteria yang dipakai bersama oleh rak desktop (mockup 09)
 * dan daftar prioritas + lemari mobile (mockup 10).
 */

/** Bar segmen bobot di atas daftar: lebar = bobot, makin bawah makin pudar. */
export function BarBobot({ n, className }: { n: number; className?: string }) {
  if (n === 0) return null;
  const bobot = bobotPerPosisi(n);
  return (
    <div aria-hidden className={cn("flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-soft", className)}>
      {bobot.map((w, i) => (
        <div
          key={i}
          className="h-full rounded-[2px] bg-accent transition-[flex-grow] duration-200 ease-out motion-reduce:transition-none"
          style={{ flex: `${w} 1 0`, opacity: n <= 1 ? 1 : 1 - (i / (n - 1)) * 0.65 }}
        />
      ))}
    </div>
  );
}

/** Garis biru penanda posisi jatuh saat menyeret. */
export function GarisJatuh({ tampil, className }: { tampil: boolean; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-1 rounded-full transition-colors duration-100", tampil ? "bg-accent" : "bg-transparent", className)}
    />
  );
}

export type ChipKategoriData = { kode: string; nama: string; jumlah: number };

/** Chip kategori (link ke bagian) dengan badge jumlah piece terpasang. */
export function ChipKategori({
  chip,
  href,
  aktif,
  onPilih,
  className,
}: {
  chip: ChipKategoriData;
  href: string;
  aktif: boolean;
  onPilih: (e: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={onPilih}
      aria-current={aktif ? "true" : undefined}
      className={cn(
        "tekan flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-bold whitespace-nowrap",
        aktif ? "border-accent bg-accent text-white" : "border-line bg-white text-ink hover:bg-soft",
        className,
      )}
    >
      <span>{chip.nama}</span>
      {chip.jumlah > 0 ? (
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-extrabold text-accent-ink",
            aktif ? "bg-white" : "bg-soft",
          )}
        >
          <span className="sr-only">, </span>
          {chip.jumlah}
          <span className="sr-only"> terpasang</span>
        </span>
      ) : null}
    </a>
  );
}

/** Isi tengah satu baris rakitan: nomor, nama + kategori, bobot. */
export function IsiPrioritas({
  kode,
  posisi,
  n,
  besar = false,
}: {
  kode: KodeKriteria;
  posisi: number;
  n: number;
  /** Versi mobile (nomor 28px, nama 15px). */
  besar?: boolean;
}) {
  const info = infoKriteria(kode);
  const bobot = bobotPerPosisi(n)[posisi] ?? 0;
  return (
    <>
      <span
        className={cn(
          "flex flex-none items-center justify-center rounded-lg bg-soft font-extrabold text-accent-ink",
          besar ? "size-7 text-[13.5px]" : "size-[26px] text-[13px]",
        )}
      >
        <AnimatedText value={posisi + 1} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={cn("leading-tight font-bold", besar ? "text-[15px]" : "text-[14.5px]")}>{info.nama}</span>
        <span className="text-xs text-muted">{namaKategori(info.kategori)}</span>
      </span>
      <span className="min-w-[46px] flex-none text-right text-[15px] font-extrabold text-accent-ink tabular-nums">
        <AnimatedText value={formatPersen(bobot)} />
      </span>
    </>
  );
}

/** Label aksesibel baris rakitan. */
export function labelBaris(kode: KodeKriteria, posisi: number, n: number): string {
  const bobot = bobotPerPosisi(n)[posisi] ?? 0;
  return `${infoKriteria(kode).nama}, prioritas ${posisi + 1} dari ${n}, bobot ${formatPersen(bobot)}`;
}
