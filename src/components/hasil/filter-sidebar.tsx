"use client";

import { useId } from "react";
import { BudgetHistogramSlider } from "@/components/BudgetHistogramSlider";
import { GlassCard } from "@/components/glass-card";
import { PrioritasSortable } from "@/components/prioritas-sortable";
import { TipeSegmented } from "@/components/tipe-segmented";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  DEFAULT_URUTAN,
  type FilterState,
} from "@/lib/query";
import type { SebaranHarga } from "@/lib/sebaran";

type FilterSidebarProps = {
  filter: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  sebaran?: SebaranHarga;
  /** Sebaran untuk tipe baru sedang dimuat (indikator kecil di hitungan). */
  memuatSebaran?: boolean;
};

const JUDUL = "text-xs font-bold tracking-[.04em] text-muted uppercase";

/**
 * Sidebar kiri /hasil desktop: (a) budget + tipe, (b) prioritas drag-and-drop
 * ringkas. Memakai komponen yang sama dengan versi mobile.
 */
export function FilterSidebar({ filter, onChange, sebaran, memuatSebaran }: FilterSidebarProps) {
  const idBudget = useId();
  const idTipe = useId();
  const idPrioritas = useId();
  const sudahDefault = filter.urutan.join(",") === DEFAULT_URUTAN.join(",");

  return (
    <aside aria-label="Filter dan prioritas" className="flex flex-col gap-3.5">
      <GlassCard padding="md" className="flex flex-col gap-2.5 rounded-[22px]">
        <span id={idBudget} className={JUDUL}>
          Budget maks / bulan
        </span>
        <BudgetHistogramSlider
          ringkas
          labelledBy={idBudget}
          value={filter.budget}
          onChange={(budget) => onChange({ budget })}
          bins={sebaran?.bins}
          memuat={memuatSebaran}
          min={sebaran?.min ?? BUDGET_MIN}
          max={sebaran?.max ?? BUDGET_MAX}
          step={sebaran?.step ?? BUDGET_STEP}
        />
        <span id={idTipe} className={`${JUDUL} mt-1.5`}>
          Tipe penghuni
        </span>
        <TipeSegmented
          size="sm"
          labelledBy={idTipe}
          value={filter.tipe}
          onChange={(tipe) => onChange({ tipe })}
        />
      </GlassCard>

      <GlassCard padding="md" className="flex flex-col gap-2 rounded-[22px]">
        <div className="flex items-center justify-between">
          <span id={idPrioritas} className={JUDUL}>
            Prioritas
          </span>
          <button
            type="button"
            onClick={() => onChange({ urutan: [...DEFAULT_URUTAN] })}
            disabled={sudahDefault}
            className="tekan tautan -my-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent-ink"
          >
            Reset
          </button>
        </div>
        <PrioritasSortable
          varian="ringkas"
          urutan={filter.urutan}
          onChange={(urutan) => onChange({ urutan })}
        />
        <p className="text-[11px] leading-[1.4] text-muted">
          Seret untuk mengubah urutan. Peringkat di tengah langsung diperbarui.
        </p>
      </GlassCard>
    </aside>
  );
}
