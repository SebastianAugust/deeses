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
  /** Dipanggil saat satu foto gagal dimuat (induk membuangnya dari daftar). */
  onGagal?: (src: string) => void;
  className?: string;
};

/*
 * Tata letak galeri desktop per jumlah foto (1–5), supaya tidak ada tile kosong.
 * Tinggi total tetap 410px (2 × 200 + celah). Hanya sudut luar grid yang
 * membulat besar (mockup 08). Kelas ditulis utuh agar terbaca Tailwind.
 */
const GRID_FOTO: Record<number, { grid: string; tile: string[] }> = {
  1: { grid: "grid-cols-1 grid-rows-[410px]", tile: ["rounded-[24px]"] },
  2: {
    grid: "grid-cols-[2fr_1fr] grid-rows-[410px]",
    tile: ["rounded-[24px_8px_8px_24px]", "rounded-[8px_24px_24px_8px]"],
  },
  3: {
    grid: "grid-cols-[2fr_1fr] grid-rows-[200px_200px]",
    tile: ["row-span-2 rounded-[24px_8px_8px_24px]", "rounded-[8px_24px_8px_8px]", "rounded-[8px_8px_24px_8px]"],
  },
  4: {
    grid: "grid-cols-[2fr_1fr_1fr] grid-rows-[200px_200px]",
    tile: [
      "row-span-2 rounded-[24px_8px_8px_24px]",
      "rounded-[8px]",
      "rounded-[8px_24px_8px_8px]",
      "col-span-2 rounded-[8px_8px_24px_8px]",
    ],
  },
  5: {
    grid: "grid-cols-[2fr_1fr_1fr] grid-rows-[200px_200px]",
    tile: [
      "row-span-2 rounded-[24px_8px_8px_24px]",
      "rounded-[8px]",
      "rounded-[8px_24px_8px_8px]",
      "rounded-[8px]",
      "rounded-[8px_8px_24px_8px]",
    ],
  },
};

/**
 * Galeri desktop: 1 foto besar + sampai 4 foto kecil (tata letak menyesuaikan
 * jumlah, lihat GRID_FOTO). Tile adalah tombol pembuka lightbox (hover: foto
 * sedikit zoom). Tanpa foto: satu PhotoPlaceholder penuh.
 */
export function GaleriDesktop({ foto, nama, onBuka, onGagal, className }: GaleriProps) {
  if (foto.length === 0) {
    return (
      <div className={cn("relative grid-cols-1 grid-rows-[410px]", className)}>
        <PhotoPlaceholder className="rounded-[24px]" iconSize={34} label="Belum ada foto" />
      </div>
    );
  }
  const tampil = foto.slice(0, 5);
  const { grid, tile } = GRID_FOTO[tampil.length];
  return (
    <div className={cn("relative gap-2.5", grid, className)}>
      {tampil.map((src, i) => {
        const kelas = cn("relative overflow-hidden", tile[i]);
        return (
          <button
            key={src}
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
              onGagal={onGagal}
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
  onGagal,
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
                <FotoKos src={src} alt={`Foto ${i + 1} ${nama}`} sizes="100vw" prioritas={i === 0} onGagal={onGagal} />
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
