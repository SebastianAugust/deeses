"use client";

import Link from "next/link";
import { ArrowUpDown, House } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { KosPhoto } from "@/components/kos-photo";
import { PrimaryButton } from "@/components/primary-button";
import { PhotoBadge, RankBadge } from "@/components/rank-badge";
import { ErrorCard } from "@/components/status-card";
import { Skeleton } from "@/components/ui/skeleton";
import { jelaskanPeringkat } from "@/lib/explain";
import { formatJarak, formatRupiah, formatSkor } from "@/lib/format";
import { BUDGET_MAX, buildHref, buildQuery, type FilterState } from "@/lib/query";
import { labelTipe } from "@/lib/ringkasan";
import type { RankResult } from "@/lib/types";
import { useFilter } from "@/lib/use-filter";
import { useRank } from "@/lib/use-rank";
import { DesktopNav, SearchPill } from "./search-pill";

const KENAIKAN_BUDGET = 200_000;

/* ----------------------------- Mobile (< lg) ----------------------------- */

function DaftarMobile({ data, query }: { data: RankResult[]; query: string }) {
  const [pertama, ...lainnya] = data;
  const duaTiga = lainnya.slice(0, 2);
  const sisanya = lainnya.slice(2);
  const href = (kos: RankResult) => `/kos/${kos.id}?${query}`;

  return (
    <div className="pb-24 lg:hidden">
      <div className="flex items-baseline justify-between px-5 pt-4 pb-2.5">
        <h1 className="text-lg font-extrabold">{data.length} kos cocok</h1>
        <span className="text-xs text-muted">Urut skor SAW</span>
      </div>

      <Link href={href(pertama)} className="mx-5 flex flex-col gap-2 text-ink">
        <KosPhoto
          src={pertama.foto_url}
          nama={pertama.nama}
          iconSize={30}
          className="h-[196px] rounded-[20px]"
        >
          <RankBadge rank={1} label="Paling cocok" size="lg" className="absolute top-3 left-3" />
          <PhotoBadge
            tone="accent"
            size="lg"
            className="absolute right-3 bottom-3 px-[11px] py-1.5 text-[13px]"
          >
            Skor {formatSkor(pertama.skor_saw)}
          </PhotoBadge>
        </KosPhoto>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[17px] font-extrabold">{pertama.nama}</span>
          <span className="text-[13px] text-muted">{formatJarak(pertama.jarak_km)} ke kampus</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[15px]">
            <b>{formatRupiah(pertama.harga)}</b> <span className="text-muted">/ bulan</span>
          </span>
          <span className="rounded-lg bg-soft px-2 py-1 text-xs font-bold text-accent-ink">
            {labelTipe(pertama.tipe)}
          </span>
        </div>
      </Link>

      {duaTiga.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 px-5 pt-[18px]">
          {duaTiga.map((kos) => (
            <li key={kos.id}>
              <Link href={href(kos)} className="flex flex-col gap-1.5 text-ink">
                <KosPhoto
                  src={kos.foto_url}
                  nama={kos.nama}
                  iconSize={0}
                  label={null}
                  className="h-[110px] rounded-[16px]"
                >
                  <RankBadge rank={kos.rank} className="absolute top-2 left-2" />
                  <PhotoBadge className="absolute right-2 bottom-2">
                    <span className="sr-only">Skor </span>
                    {formatSkor(kos.skor_saw)}
                  </PhotoBadge>
                </KosPhoto>
                <span className="text-sm font-bold">{kos.nama}</span>
                <span className="text-[13px]">
                  <b>{formatRupiah(kos.harga)}</b>{" "}
                  <span className="text-muted">· {formatJarak(kos.jarak_km)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {sisanya.length > 0 ? (
        <ul className="flex flex-col">
          {sisanya.map((kos) => (
            <li key={kos.id}>
              <Link href={href(kos)} className="mx-5 mt-4 flex items-center gap-3 text-ink">
                <KosPhoto
                  src={kos.foto_url}
                  nama={kos.nama}
                  iconSize={0}
                  label={null}
                  className="h-[60px] w-[72px] flex-none rounded-[12px]"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">
                    #{kos.rank} {kos.nama}
                  </span>
                  <span className="text-[13px]">
                    <b>{formatRupiah(kos.harga)}</b>{" "}
                    <span className="text-muted">· {formatJarak(kos.jarak_km)}</span>
                  </span>
                </span>
                <span className="text-sm font-extrabold">
                  <span className="sr-only">Skor </span>
                  {formatSkor(kos.skor_saw)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <Link
        href={`/prioritas?${query}`}
        className="glass-strong fixed bottom-[22px] left-1/2 z-20 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full px-5 text-sm font-bold whitespace-nowrap text-ink shadow-[0_10px_28px_rgba(30,45,90,.10)]"
      >
        <ArrowUpDown size={16} className="text-accent-ink" aria-hidden />
        Ubah prioritas
      </Link>
    </div>
  );
}

/* ----------------------------- Desktop (lg+) ----------------------------- */

function GridDesktop({
  data,
  query,
  filter,
}: {
  data: RankResult[];
  query: string;
  filter: FilterState;
}) {
  const [pertama, ...lainnya] = data;
  const href = (kos: RankResult) => `/kos/${kos.id}?${query}`;
  const [a, b] = jelaskanPeringkat(pertama, filter.urutan).kelebihan;

  return (
    <div className="hidden flex-col gap-[18px] lg:flex">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">
          {data.length} kos cocok untukmu
        </h1>
        <span className="text-[13px] text-muted">Diurutkan berdasarkan skor SAW</span>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[22px]">
        <li className="col-span-2">
          <Link href={href(pertama)} className="flex flex-col gap-2.5 text-ink">
            <KosPhoto
              src={pertama.foto_url}
              nama={pertama.nama}
              iconSize={34}
              className="h-[300px] rounded-[22px]"
            >
              <RankBadge
                rank={1}
                label="Paling cocok"
                size="lg"
                className="absolute top-3.5 left-3.5 px-3 py-1.5 text-[13px]"
              />
              <PhotoBadge
                tone="accent"
                size="lg"
                className="absolute right-3.5 bottom-3.5 px-3 py-1.5 text-sm"
              >
                Skor {formatSkor(pertama.skor_saw)}
              </PhotoBadge>
            </KosPhoto>
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="text-xl font-extrabold">{pertama.nama}</span>
              <span className="text-sm text-muted">
                {formatJarak(pertama.jarak_km)} ke kampus · {labelTipe(pertama.tipe)}
              </span>
            </div>
            <span className="text-[15px]">
              <b>{formatRupiah(pertama.harga)}</b>{" "}
              <span className="text-muted">
                / bulan · unggul di {a.singkat} &amp; {b.singkat}
              </span>
            </span>
          </Link>
        </li>
        {lainnya.map((kos) => (
          <li key={kos.id}>
            <Link href={href(kos)} className="flex flex-col gap-2 text-ink">
              <KosPhoto
                src={kos.foto_url}
                nama={kos.nama}
                iconSize={0}
                label={null}
                className="h-[190px] rounded-[18px]"
              >
                <RankBadge rank={kos.rank} size="md" className="absolute top-2.5 left-2.5" />
                <PhotoBadge size="md" className="absolute right-2.5 bottom-2.5">
                  <span className="sr-only">Skor </span>
                  {formatSkor(kos.skor_saw)}
                </PhotoBadge>
              </KosPhoto>
              <div className="flex justify-between gap-2">
                <span className="text-[15px] font-bold">{kos.nama}</span>
                <span className="text-[13px] text-muted">{formatJarak(kos.jarak_km)}</span>
              </div>
              <span className="text-sm">
                <b>{formatRupiah(kos.harga)}</b> <span className="text-muted">/ bulan</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- State lain ------------------------------ */

function HasilSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat rekomendasi">
      <div className="flex flex-col px-5 pt-4 lg:hidden">
        <Skeleton className="mb-3.5 h-6 w-32 bg-line" />
        <Skeleton className="h-[196px] rounded-[20px] bg-line" />
        <Skeleton className="mt-2.5 h-5 w-40 bg-line" />
        <Skeleton className="mt-2 h-4 w-32 bg-line" />
        <div className="grid grid-cols-2 gap-3 pt-[18px]">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-[110px] rounded-[16px] bg-line" />
              <Skeleton className="h-4 w-24 bg-line" />
              <Skeleton className="h-4 w-28 bg-line" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-[60px] w-[72px] rounded-[12px] bg-line" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-32 bg-line" />
            <Skeleton className="h-4 w-24 bg-line" />
          </div>
        </div>
      </div>

      <div className="hidden flex-col gap-[18px] lg:flex">
        <Skeleton className="h-8 w-72 bg-line" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[22px]">
          <div className="col-span-2 flex flex-col gap-2.5">
            <Skeleton className="h-[300px] rounded-[22px] bg-line" />
            <Skeleton className="h-6 w-48 bg-line" />
            <Skeleton className="h-5 w-64 bg-line" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-[190px] rounded-[18px] bg-line" />
              <Skeleton className="h-5 w-32 bg-line" />
              <Skeleton className="h-4 w-28 bg-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kosong({ filter }: { filter: FilterState }) {
  const budgetBaru = Math.min(BUDGET_MAX, filter.budget + KENAIKAN_BUDGET);
  const bisaNaik = budgetBaru > filter.budget;
  const bisaCampur = filter.tipe !== "campur";

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 pt-6 pb-10">
      <GlassCard
        padding="none"
        className="flex flex-col items-center gap-3 rounded-[28px] px-5 pt-7 pb-5 text-center shadow-[0_10px_30px_rgba(30,45,90,.10)]"
      >
        <span className="flex size-24 items-center justify-center rounded-full bg-soft text-accent-ink">
          <House size={44} strokeWidth={1.6} aria-hidden />
        </span>
        <h1 className="text-[22px] font-extrabold tracking-[-0.01em]">Belum ada kos yang cocok</h1>
        <p className="text-sm leading-[1.55] text-muted">
          Tidak ada kos {filter.tipe} dengan harga sampai {formatRupiah(filter.budget)} per bulan di
          data kami. Coba longgarkan salah satu filter.
        </p>
        <div className="mt-1.5 flex w-full flex-col gap-2.5">
          {bisaNaik ? (
            <PrimaryButton
              href={buildHref("/hasil", { ...filter, budget: budgetBaru })}
              replace
              block
            >
              Naikkan budget ke {formatRupiah(budgetBaru)}
            </PrimaryButton>
          ) : null}
          {bisaCampur ? (
            <Link
              href={buildHref("/hasil", { ...filter, tipe: "campur" })}
              replace
              className="flex h-[52px] items-center justify-center rounded-[16px] border border-line bg-white/78 text-[15px] font-semibold text-ink transition-colors hover:bg-white"
            >
              Ganti tipe ke Campur
            </Link>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}

/* --------------------------------- Halaman -------------------------------- */

export function HasilView() {
  const filter = useFilter();
  const rank = useRank(filter);
  const query = buildQuery(filter);

  return (
    <div className="flex flex-1 flex-col">
      <DesktopNav filter={filter} />
      <div className="mx-auto w-full max-w-[480px] px-4 pt-3 lg:hidden">
        <SearchPill filter={filter} />
      </div>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col lg:max-w-[1200px] lg:px-8 lg:pt-[26px] lg:pb-12">
        {rank.status === "loading" ? <HasilSkeleton /> : null}

        {rank.status === "error" ? (
          <div className="mx-auto w-full max-w-[480px] px-4 pt-6">
            <ErrorCard pesan={rank.error} onCobaLagi={rank.cobaLagi} />
          </div>
        ) : null}

        {rank.status === "success" && rank.data.length === 0 ? <Kosong filter={filter} /> : null}

        {rank.status === "success" && rank.data.length > 0 ? (
          <>
            <DaftarMobile data={rank.data} query={query} />
            <GridDesktop data={rank.data} query={query} filter={filter} />
          </>
        ) : null}
      </main>
    </div>
  );
}
