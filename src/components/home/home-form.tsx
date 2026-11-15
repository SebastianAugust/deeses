"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { BudgetHistogramSlider } from "@/components/BudgetHistogramSlider";
import { GlassCard } from "@/components/glass-card";
import { PrimaryButton } from "@/components/primary-button";
import { TipeSegmented } from "@/components/tipe-segmented";
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP, buildHref, type FilterState } from "@/lib/query";
import { gantiUrl } from "@/lib/use-filter";
import { useRank } from "@/lib/use-rank";
import { useSebaranHarga } from "@/lib/use-sebaran";

/**
 * Kartu kaca Home: budget (slider + sebaran harga), tipe penghuni, perkiraan
 * jumlah kos, lalu lanjut ke /prioritas. Nilai awal dari query params.
 */
export function HomeForm({ initial }: { initial: FilterState }) {
  const [filter, setFilter] = useState<FilterState>(initial);
  const sebaran = useSebaranHarga(filter.tipe);
  const rank = useRank(filter, { debounceMs: 300 });
  const idBudget = useId();
  const idTipe = useId();

  function ubah(patch: Partial<FilterState>) {
    const baru = { ...filter, ...patch };
    setFilter(baru);
    gantiUrl(buildHref("/", baru));
  }

  const jumlah = rank.status === "success" ? rank.data.length : rank.dataTerakhir?.length;

  return (
    <GlassCard
      padding="none"
      className="mx-5 mt-[22px] flex flex-col gap-4 rounded-[24px] p-4"
      role="form"
      aria-label="Cari kos"
    >
      <div className="flex flex-col gap-2">
        <span id={idBudget} className="text-sm font-bold">
          Budget maks per bulan
        </span>
        <BudgetHistogramSlider
          value={filter.budget}
          onChange={(budget) => ubah({ budget })}
          bins={sebaran?.bins}
          min={sebaran?.min ?? BUDGET_MIN}
          max={sebaran?.max ?? BUDGET_MAX}
          step={sebaran?.step ?? BUDGET_STEP}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span id={idTipe} className="text-sm font-bold">
          Tipe penghuni
        </span>
        <TipeSegmented
          value={filter.tipe}
          onChange={(tipe) => ubah({ tipe })}
          labelledBy={idTipe}
        />
      </div>

      <p className="text-sm" aria-live="polite">
        {rank.status === "error" ? (
          <span className="text-muted">Perkiraan belum tersedia.</span>
        ) : jumlah === undefined ? (
          <span className="text-muted">Menghitung kos yang cocok…</span>
        ) : jumlah === 0 ? (
          <span className="text-muted">Belum ada yang cocok, coba naikkan budget</span>
        ) : (
          <b className="font-extrabold">± {jumlah} kos cocok</b>
        )}
      </p>

      <div className="flex flex-col items-center gap-1">
        <PrimaryButton href={buildHref("/prioritas", filter)} block className="text-base">
          Lanjut atur prioritas
        </PrimaryButton>
        <Link
          href={buildHref("/filter", filter)}
          className="inline-flex min-h-11 items-center text-[13px] font-semibold text-accent-ink underline-offset-4 hover:underline"
        >
          Atur filter lebih detail
        </Link>
      </div>
    </GlassCard>
  );
}
