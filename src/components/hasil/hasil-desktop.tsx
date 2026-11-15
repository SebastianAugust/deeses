"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { AnimatedText } from "@/components/animated-text";
import { Crossfade } from "@/components/crossfade";
import { IndikatorMuat } from "@/components/indikator-muat";
import { KosDetailPanel } from "@/components/kos/kos-detail-panel";
import { KosListCard } from "@/components/kos/kos-list-card";
import { ErrorCard } from "@/components/status-card";
import { jelaskanPeringkat } from "@/lib/explain";
import { buildHref, type FilterState } from "@/lib/query";
import { gantiUrl, useFilter } from "@/lib/use-filter";
import { useRank } from "@/lib/use-rank";
import { useRankDelta } from "@/lib/use-rank-delta";
import { useSebaranHarga } from "@/lib/use-sebaran";
import { FilterSidebar } from "./filter-sidebar";
import { DaftarDesktopSkeleton, DetailSkeleton } from "./hasil-skeleton";
import { KosongCard } from "./kosong-card";

function HeaderDesktop() {
  return (
    <header className="border-b border-white/90 bg-white/55 backdrop-blur-[20px] backdrop-saturate-[1.6]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-5 px-7 py-3.5">
        <Link
          href="/"
          aria-label="Kosjati, ke beranda"
          className="text-[22px] font-extrabold tracking-[-0.02em] text-ink"
        >
          kosjati<span className="text-accent-ink">.</span>
        </Link>
        <span className="text-[13px] text-muted">Rekomendasi kos Jatinangor · SAW 8 kriteria</span>
        <span className="flex-1" />
        <Link href="/#tentang" className="text-sm font-semibold text-ink hover:text-accent-ink">
          Cara kerja perhitungan
        </Link>
      </div>
    </header>
  );
}

/**
 * /hasil desktop (≥ lg): 3 kolom — sidebar filter & prioritas, daftar kartu,
 * panel detail. State filter + kos terpilih (?pilih=) disimpan di URL; hasil
 * diperbarui otomatis (debounce 300 ms) dengan animasi perpindahan kartu.
 */
export function HasilDesktop() {
  const dariUrl = useFilter();
  const pilihAwal = useSearchParams().get("pilih");
  const [filter, setFilter] = useState<FilterState>(dariUrl);
  const [pilih, setPilih] = useState<string | null>(pilihAwal);

  const rank = useRank(filter, { debounceMs: 300 });
  const sebaran = useSebaranHarga(filter.tipe);
  const daftar = rank.status === "success" ? rank.data : rank.dataTerakhir;
  const delta = useRankDelta(daftar);

  function simpan(f: FilterState, p: string | null) {
    gantiUrl(buildHref("/hasil", f, { pilih: p }));
  }
  function terapkan(baru: FilterState) {
    setFilter(baru);
    simpan(baru, pilih);
  }
  function pilihKos(id: string) {
    setPilih(id);
    simpan(filter, id);
  }

  const terpilih = daftar?.find((k) => k.id === pilih) ?? daftar?.[0];
  const skorMaks = daftar?.[0]?.skor_saw || 1;
  const memuatAwal = rank.status === "loading" && !daftar;
  const kosong = rank.status === "success" && rank.data.length === 0;

  let kunciTengah = "isi";
  if (memuatAwal) kunciTengah = "skeleton";
  else if (rank.status === "error") kunciTengah = "error";
  else if (kosong) kunciTengah = "kosong";

  let catatanTeratas: string | undefined;
  if (daftar?.[0]) {
    const [a, b] = jelaskanPeringkat(daftar[0], filter.urutan).kelebihan;
    catatanTeratas = `unggul ${a.singkat} & ${b.singkat}`;
  }

  return (
    <div className="flex flex-1 flex-col">
      <HeaderDesktop />
      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-5 px-7 pt-[22px] pb-10">
        <div className="sticky top-[22px] w-[260px] flex-none xl:w-[300px]">
          <FilterSidebar
            filter={filter}
            sebaran={sebaran}
            onChange={(patch) => terapkan({ ...filter, ...patch })}
          />
        </div>

        <main className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-1.5">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em]">
              {daftar ? (
                <span className="inline-flex items-baseline">
                  <AnimatedText value={daftar.length} />
                  &nbsp;kos cocok
                </span>
              ) : (
                "Mencari kos…"
              )}
              {rank.status === "loading" && daftar ? (
                <IndikatorMuat label="Memperbarui peringkat" />
              ) : null}
            </h1>
            <span className="text-[13px] text-muted">Urut skor SAW · diperbarui otomatis</span>
          </div>

          <Crossfade kunci={kunciTengah}>
            {kunciTengah === "skeleton" ? <DaftarDesktopSkeleton /> : null}
            {kunciTengah === "error" && rank.status === "error" ? (
              <div className="mx-auto max-w-[480px] pt-4">
                <ErrorCard pesan={rank.error} onCobaLagi={rank.cobaLagi} />
              </div>
            ) : null}
            {kunciTengah === "kosong" ? (
              <div className="mx-auto max-w-[480px] pt-4">
                <KosongCard filter={filter} terapkan={terapkan} />
              </div>
            ) : null}
            {kunciTengah === "isi" && daftar ? (
              <LayoutGroup>
                <ul className="flex flex-col gap-3" aria-label="Daftar kos, urut skor SAW">
                  <AnimatePresence initial={false}>
                    {daftar.map((kos, i) => (
                      <KosListCard
                        key={kos.id}
                        kos={kos}
                        index={i}
                        skorMaks={skorMaks}
                        catatan={i === 0 ? catatanTeratas : undefined}
                        terpilih={kos.id === terpilih?.id}
                        delta={delta[kos.id]}
                        href={buildHref("/hasil", filter, { pilih: kos.id })}
                        onPilih={() => pilihKos(kos.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </LayoutGroup>
            ) : null}
          </Crossfade>
        </main>

        <div className="sticky top-[22px] max-h-[calc(100vh-44px)] w-[320px] flex-none overflow-y-auto rounded-[24px] xl:w-[380px]">
          <Crossfade kunci={memuatAwal ? "skeleton" : terpilih ? "panel" : "kosong"}>
            {memuatAwal ? <DetailSkeleton /> : null}
            {!memuatAwal && terpilih && daftar ? (
              <KosDetailPanel kos={terpilih} semua={daftar} urutan={filter.urutan} />
            ) : null}
          </Crossfade>
        </div>
      </div>
    </div>
  );
}
