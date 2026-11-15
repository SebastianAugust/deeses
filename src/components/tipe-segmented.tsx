"use client";

import type { TipePenghuni } from "@/lib/types";
import { TIPE_PENGHUNI } from "@/lib/types";
import { labelTipe } from "@/lib/ringkasan";
import { cn } from "@/lib/utils";

type TipeSegmentedProps = {
  value: TipePenghuni;
  onChange: (tipe: TipePenghuni) => void;
  /** id elemen judul grup. */
  labelledBy: string;
};

/** Tombol segmented Putra / Putri / Campur dalam wadah pill kaca. */
export function TipeSegmented({ value, onChange, labelledBy }: TipeSegmentedProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex gap-1 rounded-full border border-white/90 bg-white/55 p-1 backdrop-blur-[20px]"
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
              "h-11 flex-1 rounded-full text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              aktif
                ? "bg-white font-bold text-accent-ink shadow-[0_2px_8px_rgba(30,45,90,.12)]"
                : "font-semibold text-muted hover:text-ink",
            )}
          >
            {labelTipe(tipe)}
          </button>
        );
      })}
    </div>
  );
}
