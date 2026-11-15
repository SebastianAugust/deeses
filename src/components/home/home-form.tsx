"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { BudgetHistogramSlider } from "@/components/BudgetHistogramSlider";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";
import { TinggiHalus } from "@/components/tinggi-halus";
import { TipeSegmented } from "@/components/tipe-segmented";
import { TRANSISI_CEPAT } from "@/lib/motion";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  PARAM_OK,
  buildHref,
  type FilterState,
  type LangkahHome,
} from "@/lib/query";
import type { SebaranHarga } from "@/lib/sebaran";
import type { RankResult } from "@/lib/types";
import type { RankState } from "@/lib/use-rank";
import { useSibukSingkat } from "@/lib/use-sibuk";
import { KosTumpuk } from "./kos-tumpuk";

type HomeFormProps = {
  filter: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  sebaran?: SebaranHarga;
  /** Sebaran untuk tipe baru sedang dimuat (indikator kecil di hitungan). */
  memuatSebaran?: boolean;
  rank: RankState & { dataTerakhir?: RankResult[] };
  langkah: LangkahHome;
  /** Desktop: pindah ke langkah prioritas (tanpa pindah route). */
  onLanjut: () => void;
  /** Desktop: kembali ke langkah awal. */
  onKembali: () => void;
};

/**
 * Kartu kaca Home: budget + tipe (selalu sama, tidak di-unmount), lalu bagian
 * bawah yang berganti sesuai langkah dengan animasi tinggi halus.
 * - awal: "Lanjut atur prioritas" (mobile → /prioritas, desktop → langkah prioritas).
 * - prioritas (desktop): "Kembali", tumpukan foto "N kos siap diurutkan",
 *   tombol besar "Lihat rekomendasi" → /hasil dengan penanda ok.
 */
export function HomeForm({
  filter,
  onChange,
  sebaran,
  memuatSebaran,
  rank,
  langkah,
  onLanjut,
  onKembali,
}: HomeFormProps) {
  const idBudget = useId();
  const idTipe = useId();
  // Cegah klik ganda saat pindah langkah.
  const [sibuk, jalankan] = useSibukSingkat();

  return (
    <GlassCard
      padding="none"
      className="mx-5 mt-[22px] flex flex-col gap-4 rounded-[24px] p-4 lg:m-0 lg:gap-3.5 lg:rounded-[28px] lg:bg-white/62 lg:p-[26px] lg:shadow-[0_18px_44px_rgba(30,45,90,.12)] lg:backdrop-blur-[24px]"
      role="form"
      aria-label="Cari kos"
    >
      <div className="flex flex-col gap-2">
        <span id={idBudget} className="text-sm font-bold lg:text-base">
          Budget maks per bulan
        </span>
        <BudgetHistogramSlider
          besarDiDesktop
          labelledBy={idBudget}
          value={filter.budget}
          onChange={(budget) => onChange({ budget })}
          bins={sebaran?.bins}
          memuat={memuatSebaran}
          min={sebaran?.min ?? BUDGET_MIN}
          max={sebaran?.max ?? BUDGET_MAX}
          step={sebaran?.step ?? BUDGET_STEP}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span id={idTipe} className="text-sm font-bold lg:mt-1.5 lg:text-base">
          Tipe penghuni
        </span>
        <TipeSegmented
          besarDiDesktop
          value={filter.tipe}
          onChange={(tipe) => onChange({ tipe })}
          labelledBy={idTipe}
        />
      </div>

      <TinggiHalus>
        <AnimatePresence mode="wait" initial={false}>
          {langkah === "awal" ? (
            <motion.div
              key="awal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSISI_CEPAT}
              className="flex flex-col items-center gap-1 pt-1"
            >
              <PrimaryButton href={buildHref("/prioritas", filter)} block className="text-base lg:hidden">
                Lanjut atur prioritas
              </PrimaryButton>
              <PrimaryButton
                onClick={() => jalankan(onLanjut)}
                memuat={sibuk}
                block
                className="hidden text-base lg:flex"
              >
                Lanjut atur prioritas
                <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
              </PrimaryButton>
              <Link
                href={buildHref("/filter", filter)}
                className="tekan tautan inline-flex min-h-11 items-center rounded-lg px-2 text-[13px] font-semibold text-accent-ink lg:hidden"
              >
                Atur filter lebih detail
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="prioritas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={TRANSISI_CEPAT}
              className="flex flex-col gap-3.5 pt-1"
            >
              <button
                type="button"
                onClick={onKembali}
                className="tekan tautan -my-1 -ml-1 inline-flex min-h-9 items-center gap-1 self-start rounded-lg px-1.5 text-[13px] font-semibold text-accent-ink"
              >
                <ChevronLeft size={16} strokeWidth={2.4} aria-hidden />
                Kembali
              </button>
              <KosTumpuk rank={rank} filter={filter} />
              <PrimaryButton
                href={buildHref("/hasil", filter, PARAM_OK)}
                block
                className="h-[60px] rounded-[18px] text-lg shadow-[0_12px_26px_rgba(29,95,209,.30)] hover:shadow-[0_16px_32px_rgba(29,95,209,.36)]"
              >
                Lihat rekomendasi
                <ArrowRight size={20} strokeWidth={2.4} aria-hidden />
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </TinggiHalus>
    </GlassCard>
  );
}
