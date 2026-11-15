"use client";

import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Crossfade } from "@/components/crossfade";
import { GlassCard } from "@/components/glass-card";
import { DetailSkeleton } from "@/components/hasil/hasil-skeleton";
import { KosPhoto } from "@/components/kos-photo";
import {
  DetailBadges,
  KenapaBox,
  SkorKriteriaList,
  SkorTiles,
} from "@/components/kos/detail-parts";
import { PrimaryButton } from "@/components/primary-button";
import { ErrorCard, InfoCard } from "@/components/status-card";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { rankTopsis } from "@/lib/explain";
import { formatJarak, formatRupiah } from "@/lib/format";
import { PARAM_OK, buildHref } from "@/lib/query";
import type { RankResult } from "@/lib/types";
import { useFilter } from "@/lib/use-filter";
import { useDesktopRedirect } from "@/lib/use-media";
import { useRank } from "@/lib/use-rank";
import { cn } from "@/lib/utils";

function TombolKembali({ href, mengambang = false }: { href: string; mengambang?: boolean }) {
  return (
    <BackLink
      href={href}
      pakaiRiwayat
      aria-label="Kembali ke hasil"
      className={cn(
        "tekan tombol-kaca flex size-11 items-center justify-center rounded-full border-white/90 bg-white/78 text-ink backdrop-blur-[14px]",
        mengambang && "absolute top-3.5 left-3.5",
      )}
    >
      <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
    </BackLink>
  );
}

export function DetailView() {
  const { id } = useParams<{ id: string }>();
  const filter = useFilter();
  const keHasil = buildHref("/hasil", filter, PARAM_OK);
  // Di desktop, detail tampil sebagai panel kanan di /hasil.
  const keDesktop = useDesktopRedirect(buildHref("/hasil", filter, { ...PARAM_OK, pilih: id }));
  const rank = useRank(filter);

  if (keDesktop) return null;

  const kunci =
    rank.status === "loading" ? "skeleton" : rank.status === "error" ? "error" : "isi";

  return (
    <Crossfade kunci={kunci} className="flex flex-1 flex-col">
      {rank.status === "loading" ? (
        <main className="mx-auto w-full max-w-[480px] px-3 pt-3">
          <DetailSkeleton />
        </main>
      ) : null}

      {rank.status === "error" ? (
        <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-3.5">
          <TombolKembali href={keHasil} />
          <ErrorCard pesan={rank.error} onCobaLagi={rank.cobaLagi} />
        </main>
      ) : null}

      {rank.status === "success" ? <IsiDetail id={id} data={rank.data} keHasil={keHasil} /> : null}
    </Crossfade>
  );
}

function IsiDetail({
  id,
  data,
  keHasil,
}: {
  id: string;
  data: RankResult[];
  keHasil: string;
}) {
  const filter = useFilter();
  const kos = data.find((k) => k.id === id);

  if (!kos) {
    return (
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-3.5">
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

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-28">
      <KosPhoto
        src={kos.foto_url}
        nama={kos.nama}
        iconSize={34}
        label="foto kos (galeri)"
        className="h-[220px] flex-none rounded-none"
      >
        <TombolKembali href={keHasil} mengambang />
      </KosPhoto>

      <GlassCard className="relative mx-3 -mt-5 flex flex-col gap-3 rounded-[24px] shadow-[0_10px_30px_rgba(30,45,90,.10)]">
        <div className="flex flex-col gap-1.5">
          <DetailBadges kos={kos} total={data.length} />
          <h1 className="text-[25px] leading-tight font-extrabold tracking-[-0.02em]">{kos.nama}</h1>
          <span className="text-[13px] text-muted">{formatJarak(kos.jarak_km)} ke kampus</span>
        </div>
        <SkorTiles kos={kos} rankTopsis={rankTopsis(kos, data)} />
        <SkorKriteriaList kos={kos} urutan={filter.urutan} />
      </GlassCard>

      <KenapaBox kos={kos} urutan={filter.urutan} className="mx-3 mt-3" />

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
