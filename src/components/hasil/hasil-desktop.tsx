"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { AnimatedText } from "@/components/animated-text";
import { CariKos } from "@/components/cari-kos";
import { CatatanDataSimulasi } from "@/components/catatan-data-simulasi";
import { CatatanSkorRelatif } from "@/components/catatan-skor-relatif";
import { Crossfade } from "@/components/crossfade";
import { IndikatorMuat } from "@/components/indikator-muat";
import { KosDetailPanel } from "@/components/kos/kos-detail-panel";
import { KosListCard } from "@/components/kos/kos-list-card";
import { ErrorCard } from "@/components/status-card";
import { Logo } from "@/components/ui/logo";
import { SITE_NAME } from "@/config/site";
import { jelaskanPeringkat } from "@/lib/explain";
import { simpanKriteria } from "@/lib/kriteria-tersimpan";
import { PARAM_OK, buildHref, type FilterState } from "@/lib/query";
import { gantiUrl, useFilter } from "@/lib/use-filter";
import { pembandingTerlaluSedikit } from "@/lib/skor-relatif";
import { useRank } from "@/lib/use-rank";
import { useRankDelta } from "@/lib/use-rank-delta";
import { useSebaranHarga } from "@/lib/use-sebaran";
import { CatatanTanpaData } from "./catatan-tanpa-data";
import { FilterSidebar } from "./filter-sidebar";
import { DaftarDesktopSkeleton, DetailSkeleton } from "./hasil-skeleton";
import { KosongCard } from "./kosong-card";

function HeaderDesktop({ filter }: { filter: FilterState }) {
  return (
    // z-30: dropdown pencarian nama harus tampil di atas sidebar/daftar/panel di bawah header.
    <header className="relative z-30 border-b border-white/90 bg-white/55 backdrop-blur-[20px] backdrop-saturate-[1.6]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-5 px-7 py-3.5">
        <Link href="/" aria-label={`${SITE_NAME}, ke beranda`} className="logo inline-flex min-h-11 items-center">
          <Logo ukuran="lg" />
        </Link>
        <span className="hidden text-[13px] text-muted xl:inline">
          Rekomendasi kos Jatinangor · SAW {filter.kriteria.length} kriteria
        </span>
        {/* Pintasan ke kos mana pun (tidak terikat filter); detail dibuka dengan filter saat ini. */}
        <div className="flex min-w-[260px] flex-1 justify-center">
          <CariKos filter={filter} paramTambahan={PARAM_OK} kompak className="w-full max-w-[460px]" />
        </div>
        <Link href="/#tentang" className="tautan text-sm font-semibold text-ink">
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
  const { data: sebaran, memuat: memuatSebaran } = useSebaranHarga(filter.tipe);
  const daftar = rank.status === "success" ? rank.data : rank.dataTerakhir;
  const respons = rank.status === "success" ? rank.respons : rank.responsTerakhir;
  const delta = useRankDelta(daftar);

  function simpan(f: FilterState, p: string | null) {
    simpanKriteria(f.kriteria);
    gantiUrl(buildHref("/hasil", f, { ...PARAM_OK, pilih: p }));
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
    const { kelebihan } = jelaskanPeringkat(daftar[0], filter.kriteria);
    if (kelebihan.length > 0) catatanTeratas = `unggul ${kelebihan.map((k) => k.singkat).join(" & ")}`;
  }

  return (
    <div className="flex flex-1 flex-col">
      <HeaderDesktop filter={filter} />
      <div className="mx-auto flex w-full max-w-[1440px] items-start gap-5 px-7 pt-[22px] pb-10">
        <div className="sticky top-[22px] w-[260px] flex-none xl:w-[300px]">
          <FilterSidebar
            filter={filter}
            sebaran={sebaran}
            memuatSebaran={memuatSebaran}
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

          <CatatanTanpaData respons={respons} />

          {daftar && pembandingTerlaluSedikit(daftar.length) ? (
            <CatatanSkorRelatif jumlah={daftar.length} />
          ) : null}

          <Crossfade kunci={kunciTengah}>
            {kunciTengah === "skeleton" ? <DaftarDesktopSkeleton /> : null}
            {kunciTengah === "error" && rank.status === "error" ? (
              <div className="mx-auto max-w-[480px] pt-4">
                <ErrorCard pesan={rank.error} onCobaLagi={rank.cobaLagi} />
              </div>
            ) : null}
            {kunciTengah === "kosong" ? (
              <div className="mx-auto max-w-[480px] pt-4">
                <KosongCard filter={filter} terapkan={terapkan} tanpaData={respons?.jumlah_tanpa_data ?? 0} />
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
                        tanpaBar={pembandingTerlaluSedikit(daftar.length)}
                        catatan={i === 0 ? catatanTeratas : undefined}
                        terpilih={kos.id === terpilih?.id}
                        delta={delta[kos.id]}
                        href={buildHref("/hasil", filter, { ...PARAM_OK, pilih: kos.id })}
                        onPilih={() => pilihKos(kos.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </LayoutGroup>
            ) : null}
          </Crossfade>
          <CatatanDataSimulasi className="pt-1" />
        </main>

        <div className="sticky top-[22px] max-h-[calc(100vh-44px)] w-[320px] flex-none overflow-y-auto rounded-[24px] xl:w-[380px]">
          <Crossfade kunci={memuatAwal ? "skeleton" : terpilih ? "panel" : "kosong"}>
            {memuatAwal ? <DetailSkeleton /> : null}
            {!memuatAwal && terpilih && daftar ? (
              <KosDetailPanel
                kos={terpilih}
                semua={daftar}
                kriteria={filter.kriteria}
                hrefDetail={buildHref(`/kos/${terpilih.id}`, filter, PARAM_OK)}
              />
            ) : null}
          </Crossfade>
        </div>
      </div>
    </div>
  );
}
