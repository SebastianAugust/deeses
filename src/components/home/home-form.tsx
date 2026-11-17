"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BudgetHistogramSlider } from "@/components/BudgetHistogramSlider";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";
import { TipeSegmented } from "@/components/tipe-segmented";
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP, buildHref, type FilterState } from "@/lib/query";
import type { SebaranHarga } from "@/lib/sebaran";

type HomeFormProps = {
  filter: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  sebaran?: SebaranHarga;
  /** Sebaran untuk tipe baru sedang dimuat (indikator kecil di hitungan). */
  memuatSebaran?: boolean;
};

/**
 * Kartu kaca Home: budget + tipe, lalu "Lanjut rakit kriteria" → /prioritas
 * (membawa budget, tipe, dan kriteria yang sudah ada di URL).
 */
export function HomeForm({ filter, onChange, sebaran, memuatSebaran }: HomeFormProps) {
  const idBudget = useId();
  const idTipe = useId();

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

      <div className="flex flex-col items-center gap-1 pt-1">
        <PrimaryButton href={buildHref("/prioritas", filter)} block className="text-base">
          Lanjut rakit kriteria
          <ArrowRight size={18} strokeWidth={2.4} aria-hidden />
        </PrimaryButton>
        <Link
          href={buildHref("/filter", filter)}
          className="tekan tautan inline-flex min-h-11 items-center rounded-lg px-2 text-[13px] font-semibold text-accent-ink lg:hidden"
        >
          Atur filter lebih detail
        </Link>
      </div>
    </GlassCard>
  );
}
