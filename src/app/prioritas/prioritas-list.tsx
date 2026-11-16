"use client";

import { useState } from "react";
import { PrimaryButton } from "@/components/primary-button";
import { PrioritasSortable } from "@/components/prioritas-sortable";
import { StepHeader } from "@/components/step-header";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { PARAM_OK, buildHref, hrefHome } from "@/lib/query";
import { useUrutanDefault } from "@/lib/use-kriteria";
import type { Kriteria } from "@/config/kriteria";
import { gantiUrl, useFilter } from "@/lib/use-filter";
import { useDesktopRedirect } from "@/lib/use-media";

export function PrioritasList() {
  const filter = useFilter();
  const urutanDefault = useUrutanDefault();
  const [urutan, setUrutan] = useState<Kriteria[]>(filter.urutan);
  const sekarang = { ...filter, urutan };
  // Di desktop, langkah prioritas ada di Home (/?langkah=prioritas).
  const keDesktop = useDesktopRedirect(hrefHome(sekarang, "prioritas"));

  function terapkan(baru: Kriteria[]) {
    setUrutan(baru);
    gantiUrl(buildHref("/prioritas", { ...filter, urutan: baru }));
  }

  if (keDesktop) return null;

  // Reset aktif setelah urutan default dari /api/kriteria termuat.
  const sudahDefault = !urutanDefault || urutan.join(",") === urutanDefault.join(",");

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-28">
      <StepHeader
        backHref={buildHref("/filter", sekarang)}
        backLabel="Kembali"
        backPakaiRiwayat
        langkah={2}
        total={2}
        kanan={
          <button
            type="button"
            onClick={() => urutanDefault && terapkan([...urutanDefault])}
            disabled={sudahDefault}
            className="tekan tautan min-h-11 rounded-[12px] px-2 text-[13px] font-semibold text-accent-ink"
          >
            Reset
          </button>
        }
      />

      <div className="flex flex-col gap-1.5 px-5 pt-[18px] pb-3.5">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Apa yang paling penting?</h1>
        <p className="text-[13px] leading-normal text-muted">
          Seret untuk mengurutkan. Paling atas dapat bobot terbesar.
        </p>
      </div>

      <PrioritasSortable urutan={urutan} onChange={terapkan} className="px-4" />

      <StickyBottomBar>
        <PrimaryButton href={buildHref("/hasil", sekarang, PARAM_OK)} block className="text-base">
          Tampilkan hasil
        </PrimaryButton>
      </StickyBottomBar>
    </main>
  );
}
