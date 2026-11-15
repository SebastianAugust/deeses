"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { KosPhoto } from "@/components/kos-photo";
import { PrimaryButton } from "@/components/primary-button";
import { ScoreBar } from "@/components/score-bar";
import { ErrorCard, InfoCard } from "@/components/status-card";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { infoKriteria, jelaskanPeringkat } from "@/lib/explain";
import { formatJarak, formatRupiah, formatSkor } from "@/lib/format";
import { buildHref } from "@/lib/query";
import { labelTipe } from "@/lib/ringkasan";
import { useFilter } from "@/lib/use-filter";
import { useRank } from "@/lib/use-rank";

function TombolKembali({ href, mengambang = false }: { href: string; mengambang?: boolean }) {
  return (
    <Link
      href={href}
      aria-label="Kembali ke hasil"
      className={
        "flex size-11 items-center justify-center rounded-full border border-white/90 bg-white/78 text-ink backdrop-blur-[14px] " +
        (mengambang ? "absolute top-3.5 left-3.5" : "")
      }
    >
      <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
    </Link>
  );
}

export function DetailView() {
  const { id } = useParams<{ id: string }>();
  const filter = useFilter();
  const rank = useRank(filter);
  const keHasil = buildHref("/hasil", filter);

  if (rank.status === "loading") {
    return (
      <main
        className="mx-auto flex w-full max-w-[480px] flex-1 flex-col"
        aria-busy="true"
        aria-label="Memuat detail kos"
      >
        <Skeleton className="h-[220px] rounded-none bg-line lg:mt-6 lg:rounded-[24px]" />
        <GlassCard className="relative mx-3 -mt-5 flex flex-col gap-3 rounded-[24px]">
          <Skeleton className="h-6 w-28 bg-line" />
          <Skeleton className="h-8 w-48 bg-line" />
          <Skeleton className="h-4 w-32 bg-line" />
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-[62px] rounded-[14px] bg-line" />
            <Skeleton className="h-[62px] rounded-[14px] bg-line" />
          </div>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-4 bg-line" />
          ))}
        </GlassCard>
      </main>
    );
  }

  if (rank.status === "error") {
    return (
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-3.5">
        <TombolKembali href={keHasil} />
        <ErrorCard pesan={rank.error} onCobaLagi={rank.cobaLagi} />
      </main>
    );
  }

  const data = rank.data;
  const kos = data.find((k) => k.id === id);

  if (!kos) {
    return (
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-3.5">
        <TombolKembali href={keHasil} />
        <InfoCard judul="Kos tidak ditemukan">
          <p className="text-sm leading-[1.55] text-muted">
            Kos ini tidak ada di hasil untuk filter saat ini. Mungkin harganya di atas budget atau
            tipenya berbeda.
          </p>
          <PrimaryButton href={keHasil} block className="mt-1.5">
            Lihat hasil rekomendasi
          </PrimaryButton>
        </InfoCard>
      </main>
    );
  }

  const rankTopsis = 1 + data.filter((k) => k.skor_topsis > kos.skor_topsis).length;
  const penjelasan = jelaskanPeringkat(kos, filter.urutan);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-28">
      <KosPhoto
        src={kos.foto_url}
        nama={kos.nama}
        iconSize={34}
        className="h-[220px] flex-none rounded-none lg:mt-6 lg:rounded-[24px]"
      >
        <TombolKembali href={keHasil} mengambang />
      </KosPhoto>

      <GlassCard className="relative mx-3 -mt-5 flex flex-col gap-3 rounded-[24px] shadow-[0_10px_30px_rgba(30,45,90,.10)]">
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <span className="rounded-lg bg-accent px-2.5 py-1 text-xs font-extrabold text-white">
              #{kos.rank} dari {data.length}
            </span>
            <span className="rounded-lg bg-soft px-2.5 py-1 text-xs font-bold text-accent-ink">
              {labelTipe(kos.tipe)}
            </span>
          </div>
          <h1 className="text-[25px] leading-tight font-extrabold tracking-[-0.02em]">{kos.nama}</h1>
          <span className="text-[13px] text-muted">{formatJarak(kos.jarak_km)} ke kampus</span>
        </div>

        <dl className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-white/78 px-3 py-2.5">
            <dt className="text-[11px] text-muted">Skor SAW</dt>
            <dd className="text-xl font-extrabold text-accent-ink">{formatSkor(kos.skor_saw)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[14px] border border-line bg-white/78 px-3 py-2.5">
            <dt className="text-[11px] text-muted">Pembanding TOPSIS</dt>
            <dd className="text-xl font-extrabold">
              <span className="sr-only">Peringkat </span>#{rankTopsis}{" "}
              <span className="text-xs font-semibold text-muted">
                · <span className="sr-only">skor </span>
                {formatSkor(kos.skor_topsis)}
              </span>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="judul-skor" className="flex flex-col gap-2">
          <h2 id="judul-skor" className="text-[15px] font-extrabold">
            Skor per kriteria
          </h2>
          {filter.urutan.map((kode) => (
            <ScoreBar key={kode} label={infoKriteria(kode).nama} nilai={kos.skor_kriteria[kode]} />
          ))}
        </section>
      </GlassCard>

      <section
        aria-labelledby="judul-kenapa"
        className="mx-3 mt-3 flex flex-col gap-1 rounded-[20px] bg-soft p-3.5"
      >
        <h2 id="judul-kenapa" className="text-sm font-extrabold">
          Kenapa peringkat {kos.rank}?
        </h2>
        <p className="text-xs leading-[1.45]">{penjelasan.teks}</p>
      </section>

      <StickyBottomBar className="pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col">
          <span className="text-[17px] font-extrabold">{formatRupiah(kos.harga)}</span>
          <span className="text-xs text-muted">per bulan</span>
        </div>
        <PrimaryButton
          href={kos.url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-[50px] px-5"
        >
          Buka iklan asli
        </PrimaryButton>
      </StickyBottomBar>
    </main>
  );
}
