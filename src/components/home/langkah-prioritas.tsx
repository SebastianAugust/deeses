"use client";

import { motion, type Variants } from "motion/react";
import { PrioritasSortable } from "@/components/prioritas-sortable";
import type { Kriteria } from "@/config/kriteria";
import { useKriteria, urutanDefaultDari } from "@/lib/use-kriteria";
import { LangkahTiles } from "./langkah-tiles";

/**
 * Isi kolom kiri Home desktop pada langkah prioritas (mockup 07a): tile
 * langkah berstatus, judul, daftar prioritas satu kolom (3 teratas menonjol),
 * lalu ringkasan + Reset. Tiap blok adalah anak variants `anak` supaya masuk
 * berurutan (stagger) dari wadah induknya.
 */
export function LangkahPrioritas({
  urutan,
  onUrutan,
  onKembali,
  anak,
}: {
  urutan: Kriteria[];
  onUrutan: (urutan: Kriteria[]) => void;
  /** Klik tile langkah 1 (selesai) → kembali ke langkah awal. */
  onKembali: () => void;
  anak: Variants;
}) {
  const kriteria = useKriteria();
  const urutanDefault = kriteria.status === "success" ? urutanDefaultDari(kriteria.data) : null;
  const jumlah = kriteria.status === "success" ? kriteria.data.length : urutan.length;
  const sudahDefault = !urutanDefault || urutan.join(",") === urutanDefault.join(",");

  return (
    <>
      <motion.div variants={anak}>
        <LangkahTiles mode="status" onKeLangkahSelesai={onKembali} />
      </motion.div>

      <motion.div variants={anak} className="flex flex-col gap-3">
        <h1 className="text-[52px] leading-[1.05] font-extrabold tracking-[-0.035em]">
          Apa yang paling penting buatmu?
        </h1>
        <p className="max-w-[560px] text-[17px] leading-[1.55] text-muted">
          Seret dari yang paling penting. Urutan ini jadi bobot penilaian, jadi kos yang unggul di
          prioritas teratasmu akan naik ke atas.
        </p>
      </motion.div>

      <motion.div variants={anak} className="flex flex-col gap-2.5">
        <PrioritasSortable varian="besar" urutan={urutan} onChange={onUrutan} />
        <div className="flex items-center justify-between px-1.5 text-[13px] text-muted">
          <span>{jumlah} kriteria · bobot dihitung otomatis</span>
          <button
            type="button"
            onClick={() => urutanDefault && onUrutan([...urutanDefault])}
            disabled={sudahDefault}
            className="tekan tautan -my-2 min-h-9 rounded-lg px-2 font-semibold text-accent-ink"
          >
            Reset urutan
          </button>
        </div>
      </motion.div>
    </>
  );
}
