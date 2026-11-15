"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FotoKos } from "./foto-kos";

type LightboxProps = {
  foto: string[];
  nama: string;
  /** Indeks foto yang dibuka; null = tertutup. */
  indeks: number | null;
  onGanti: (indeks: number) => void;
  onTutup: () => void;
};

const TOMBOL =
  "tekan flex size-11 flex-none items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/30";

/**
 * Lightbox foto sederhana memakai <dialog> modal bawaan browser: konten di
 * luar dialog otomatis tidak bisa difokus (fokus terkunci di dalam), Esc
 * menutup, panah kiri/kanan berganti foto, dan fokus kembali ke tombol
 * pembuka setelah ditutup.
 */
export function Lightbox({ foto, nama, indeks, onGanti, onTutup }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const terbuka = indeks !== null;
  const n = foto.length;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (terbuka && !d.open) d.showModal();
    if (!terbuka && d.open) d.close();
  }, [terbuka]);

  function geser(arah: 1 | -1) {
    if (indeks === null || n < 2) return;
    onGanti((indeks + arah + n) % n);
  }

  return (
    <dialog
      ref={ref}
      aria-label={`Foto ${nama}`}
      onCancel={(e) => {
        e.preventDefault();
        onTutup();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          geser(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          geser(-1);
        }
      }}
      onClick={(e) => {
        // Klik di latar (bukan di foto/tombol) menutup lightbox.
        if (e.target === e.currentTarget) onTutup();
      }}
      className="lightbox m-0 size-full max-h-none max-w-none bg-transparent p-4 text-white backdrop:bg-[rgba(15,20,30,.88)] lg:p-8"
    >
      {indeks !== null ? (
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold tabular-nums" aria-live="polite">
              Foto {indeks + 1} dari {n}
            </span>
            {/* autoFocus: fokus awal di dalam dialog. */}
            <button
              type="button"
              autoFocus
              onClick={onTutup}
              aria-label="Tutup galeri foto"
              className={TOMBOL}
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <div
            className="relative min-h-0 flex-1"
            onClick={(e) => {
              if (e.target === e.currentTarget) onTutup();
            }}
          >
            <FotoKos
              key={foto[indeks]}
              src={foto[indeks]}
              alt={`Foto ${indeks + 1} ${nama}`}
              sizes="100vw"
              isi="contain"
            />
            {n > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => geser(-1)}
                  aria-label="Foto sebelumnya"
                  className={`${TOMBOL} absolute top-1/2 left-0 -translate-y-1/2`}
                >
                  <ChevronLeft size={22} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => geser(1)}
                  aria-label="Foto berikutnya"
                  className={`${TOMBOL} absolute top-1/2 right-0 -translate-y-1/2`}
                >
                  <ChevronRight size={22} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
          <p className="text-center text-xs text-white/70">Panah kiri/kanan untuk berganti foto · Esc untuk menutup</p>
        </div>
      ) : null}
    </dialog>
  );
}
