"use client";

import { useState } from "react";
import { ChevronLeft, Images } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { PhotoPlaceholder } from "@/components/photo-placeholder";
import { cn } from "@/lib/utils";
import { FotoKos } from "./foto-kos";

type GaleriProps = {
  foto: string[];
  nama: string;
  /** Buka lightbox di foto ke-i. */
  onBuka: (indeks: number) => void;
  className?: string;
};

/** Sudut tile: hanya sudut luar grid yang membulat besar (mockup 08). */
const SUDUT = [
  "rounded-[24px_8px_8px_24px]",
  "rounded-[8px]",
  "rounded-[8px_24px_8px_8px]",
  "rounded-[8px]",
  "rounded-[8px_8px_24px_8px]",
];

/**
 * Galeri desktop: 1 foto besar (2 baris) + 4 foto kecil. Tile berfoto adalah
 * tombol pembuka lightbox (hover: foto sedikit zoom). Tile tanpa foto memakai
 * PhotoPlaceholder dan tidak interaktif.
 */
export function GaleriDesktop({ foto, nama, onBuka, className }: GaleriProps) {
  return (
    <div className={cn("relative grid-cols-[2fr_1fr_1fr] grid-rows-[200px_200px] gap-2.5", className)}>
      {SUDUT.map((sudut, i) => {
        const src = foto[i];
        const kelas = cn("relative overflow-hidden", sudut, i === 0 && "row-span-2");
        if (!src) {
          return (
            <PhotoPlaceholder
              key={i}
              className={kelas}
              iconSize={i === 0 ? 34 : 0}
              label={i === 0 ? (foto.length === 0 ? "Belum ada foto" : "foto kos") : null}
            />
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => onBuka(i)}
            aria-label={`Buka foto ${i + 1} dari ${foto.length}`}
            className={cn("galeri-item bg-line", kelas)}
          >
            <FotoKos
              src={src}
              alt={`Foto ${i + 1} ${nama}`}
              sizes={i === 0 ? "(min-width: 1024px) 600px, 100vw" : "300px"}
              prioritas={i === 0}
            />
          </button>
        );
      })}
      {foto.length > 0 ? (
        <button
          type="button"
          onClick={() => onBuka(0)}
          className="tekan tombol-kaca absolute right-3 bottom-3 inline-flex h-10 items-center gap-2 rounded-[12px] border-white/95 bg-white/85 px-3.5 text-[13px] font-bold text-ink backdrop-blur-md"
        >
          <Images size={16} aria-hidden />
          Lihat semua foto ({foto.length})
        </button>
      ) : null}
    </div>
  );
}

/**
 * Galeri mobile: carousel geser (scroll-snap) dengan indikator "1/N" dan
 * tombol kembali kaca di atas foto.
 */
export function GaleriMobile({
  foto,
  nama,
  onBuka,
  backHref,
  pakaiRiwayat = true,
  className,
}: GaleriProps & { backHref: string; pakaiRiwayat?: boolean | string }) {
  const [aktif, setAktif] = useState(0);

  return (
    <div className={cn("relative h-[260px]", className)}>
      {foto.length === 0 ? (
        <PhotoPlaceholder className="h-full rounded-none" iconSize={34} label="Belum ada foto" />
      ) : (
        <ul
          aria-label={`Foto ${nama}`}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAktif(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
        >
          {foto.map((src, i) => (
            <li key={src + i} className="relative h-full w-full flex-none snap-center">
              <button
                type="button"
                onClick={() => onBuka(i)}
                aria-label={`Buka foto ${i + 1} dari ${foto.length}`}
                className="galeri-item relative block size-full overflow-hidden bg-line"
              >
                <FotoKos src={src} alt={`Foto ${i + 1} ${nama}`} sizes="100vw" prioritas={i === 0} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <BackLink
        href={backHref}
        pakaiRiwayat={pakaiRiwayat}
        aria-label="Kembali"
        className="tekan tombol-kaca absolute top-3.5 left-3.5 flex size-11 items-center justify-center rounded-full border-white/90 bg-white/78 text-ink backdrop-blur-[14px]"
      >
        <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
      </BackLink>

      {foto.length > 1 ? (
        <span
          aria-hidden
          className="absolute right-3.5 bottom-3.5 rounded-[10px] border border-white/90 bg-white/78 px-2.5 py-1 text-xs font-bold text-ink tabular-nums backdrop-blur-[14px]"
        >
          {Math.min(aktif, foto.length - 1) + 1}/{foto.length}
        </span>
      ) : null}
    </div>
  );
}
