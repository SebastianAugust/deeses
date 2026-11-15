"use client";

import { useState } from "react";
import { User, Users, type LucideIcon } from "lucide-react";
import { BudgetHistogramSlider } from "@/components/BudgetHistogramSlider";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";
import { StepHeader } from "@/components/step-header";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  buildHref,
  type FilterState,
} from "@/lib/query";
import type { TipePenghuni } from "@/lib/types";
import { gantiUrl, useFilter } from "@/lib/use-filter";
import { useRank } from "@/lib/use-rank";
import { useSebaranHarga } from "@/lib/use-sebaran";
import { cn } from "@/lib/utils";

const CHIP_BUDGET = [
  { nilai: 800_000, label: "≤ 800 rb" },
  { nilai: 1_000_000, label: "≤ 1 jt" },
  { nilai: 1_200_000, label: "≤ 1,2 jt" },
  { nilai: 1_500_000, label: "≤ 1,5 jt" },
];

const TIPE: { nilai: TipePenghuni; label: string; Ikon: LucideIcon }[] = [
  { nilai: "putra", label: "Putra", Ikon: User },
  { nilai: "putri", label: "Putri", Ikon: User },
  { nilai: "campur", label: "Campur", Ikon: Users },
];

export function FilterForm() {
  const dariUrl = useFilter();
  const [filter, setFilter] = useState<FilterState>(dariUrl);
  const rank = useRank(filter, { debounceMs: 300 });
  const sebaran = useSebaranHarga(filter.tipe);

  function ubah(patch: Partial<FilterState>) {
    const baru = { ...filter, ...patch };
    setFilter(baru);
    gantiUrl(buildHref("/filter", baru));
  }

  const jumlah = rank.status === "success" ? rank.data.length : rank.dataTerakhir?.length;
  const teksJumlah =
    rank.status === "error"
      ? "Tidak tersedia"
      : jumlah === undefined
        ? "Menghitung…"
        : `${jumlah} kos cocok`;

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-32">
      <StepHeader backHref={buildHref("/", filter)} backLabel="Kembali ke beranda" langkah={1} total={2} />

      <div className="flex flex-col gap-1.5 px-5 pt-5">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Mulai dari batasmu</h1>
        <p className="text-sm leading-normal text-muted">
          Kos di luar batas ini tidak ikut dihitung.
        </p>
      </div>

      <GlassCard className="mx-4 mt-5 flex flex-col gap-3 rounded-[24px]">
        <span id="label-budget" className="text-sm font-bold">
          Budget maksimal per bulan
        </span>
        <BudgetHistogramSlider
          labelledBy="label-budget"
          value={filter.budget}
          onChange={(budget) => ubah({ budget })}
          bins={sebaran?.bins}
          min={sebaran?.min ?? BUDGET_MIN}
          max={sebaran?.max ?? BUDGET_MAX}
          step={sebaran?.step ?? BUDGET_STEP}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pintasan budget">
          {CHIP_BUDGET.map((chip) => {
            const aktif = filter.budget === chip.nilai;
            return (
              <button
                key={chip.nilai}
                type="button"
                aria-pressed={aktif}
                onClick={() => ubah({ budget: chip.nilai })}
                className={cn(
                  "h-11 rounded-full px-3.5 text-[13px] transition-colors",
                  aktif
                    ? "border-[1.5px] border-accent bg-soft font-bold text-accent-ink"
                    : "border border-line bg-white/78 font-semibold text-ink hover:bg-white",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      <div className="flex flex-col gap-3 px-4 pt-[22px]">
        <span id="label-tipe" className="pl-1 text-sm font-bold">
          Tipe penghuni
        </span>
        <div className="grid grid-cols-3 gap-2.5" role="group" aria-labelledby="label-tipe">
          {TIPE.map(({ nilai, label, Ikon }) => {
            const aktif = filter.tipe === nilai;
            return (
              <button
                key={nilai}
                type="button"
                aria-pressed={aktif}
                onClick={() => ubah({ tipe: nilai })}
                className={cn(
                  "flex h-24 flex-col items-center justify-center gap-2 rounded-[20px] text-sm transition-colors",
                  aktif
                    ? "border-2 border-accent bg-soft font-bold text-accent-ink"
                    : "border border-white/90 bg-white/55 font-semibold text-ink backdrop-blur-[20px] hover:bg-white/78",
                )}
              >
                <Ikon size={24} strokeWidth={1.8} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <StickyBottomBar>
        <div className="flex flex-1 flex-col" aria-live="polite">
          <span className="text-xs text-muted">Perkiraan</span>
          <span className="text-base font-extrabold">{teksJumlah}</span>
        </div>
        <PrimaryButton href={buildHref("/prioritas", filter)}>Lanjut ke prioritas</PrimaryButton>
      </StickyBottomBar>
    </main>
  );
}
