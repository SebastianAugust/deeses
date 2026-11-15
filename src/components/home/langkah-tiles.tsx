"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const LANGKAH = [
  { cara: "Pilih budget & tipe", status: "Budget & tipe" },
  { cara: "Urutkan prioritas", status: "Urutkan prioritas" },
  { cara: "Lihat peringkat", status: "Lihat peringkat" },
];

/**
 * 3 tile langkah Home. "cara" = tile bernomor "Cara kerjanya" (langkah awal);
 * "status" = tile berstatus di langkah prioritas (1 selesai, 2 aktif, 3 belum).
 * Tile & kotak angkanya memakai layoutId yang sama di kedua mode, jadi saat
 * langkah berganti tile terlihat "berubah status", bukan diganti.
 * Harus berada di dalam <LayoutGroup> yang sama.
 *
 * Di mode status, tile langkah selesai berupa <button> (kembali ke langkah itu;
 * hover border accent tipis). Tile aktif & terkunci tidak bereaksi.
 */
export function LangkahTiles({
  mode,
  onKeLangkahSelesai,
}: {
  mode: "cara" | "status";
  onKeLangkahSelesai?: () => void;
}) {
  if (mode === "cara") {
    return (
      <ol className="grid grid-cols-3 gap-2.5 lg:max-w-[560px]">
        {LANGKAH.map((l, i) => (
          <li key={i} className="flex">
            <motion.div
              layoutId={`langkah-tile-${i}`}
              className="flex w-full flex-col gap-2 rounded-[18px] border border-white/90 bg-white/55 p-3 backdrop-blur-[20px] lg:p-4"
            >
              <motion.span
                layoutId={`langkah-angka-${i}`}
                aria-hidden
                className="flex size-[30px] items-center justify-center rounded-[10px] bg-soft text-sm font-extrabold text-accent-ink"
              >
                {i + 1}
              </motion.span>
              <motion.span layout="position" className="text-[13px] leading-[1.3] font-bold lg:text-sm">
                {l.cara}
              </motion.span>
            </motion.div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol aria-label="Langkah" className="grid max-w-[640px] grid-cols-3 gap-3">
      {LANGKAH.map((l, i) => {
        const selesai = i === 0;
        const aktif = i === 1;
        const bisaDiklik = selesai && onKeLangkahSelesai !== undefined;
        const isi = (
          <>
            <motion.span
              layoutId={`langkah-angka-${i}`}
              aria-hidden
              className={cn(
                "flex size-[30px] flex-none items-center justify-center rounded-[10px] text-sm font-extrabold",
                selesai && "bg-accent text-white",
                aktif && "bg-soft text-accent-ink",
                !selesai && !aktif && "bg-line text-muted",
              )}
            >
              {selesai ? <Check size={16} strokeWidth={2.6} /> : i + 1}
            </motion.span>
            <motion.span
              layout="position"
              className={cn(
                "text-left text-[13px] leading-[1.3]",
                aktif ? "font-bold text-ink" : "font-semibold text-muted",
              )}
            >
              {selesai ? <span className="sr-only">Selesai: </span> : null}
              {l.status}
            </motion.span>
          </>
        );
        const kelas = cn(
          "flex w-full items-center gap-2.5 rounded-[18px] px-4 py-3.5",
          aktif
            ? "border-[1.5px] border-accent bg-white shadow-[0_8px_20px_rgba(29,95,209,.14)]"
            : "border border-white/90 bg-white/45",
        );

        return (
          <li key={i} className="flex" aria-current={aktif ? "step" : undefined}>
            {bisaDiklik ? (
              <motion.button
                type="button"
                layoutId={`langkah-tile-${i}`}
                onClick={onKeLangkahSelesai}
                aria-label="Langkah 1 selesai: budget & tipe. Kembali untuk mengubah."
                className={cn(
                  kelas,
                  "tekan hover:border-accent/55 hover:bg-white/70",
                )}
              >
                {isi}
              </motion.button>
            ) : (
              <motion.div layoutId={`langkah-tile-${i}`} className={kelas}>
                {isi}
              </motion.div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
