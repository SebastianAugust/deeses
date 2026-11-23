"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { Crossfade } from "@/components/crossfade";
import {
  AturanSekitar,
  CatatanSumber,
  FaktaTiles,
  Fasilitas,
  JudulKos,
  KenapaDirekomendasikan,
} from "@/components/detail/bagian-detail";
import { GaleriDesktop, GaleriMobile } from "@/components/detail/galeri";
import { KontakBarMobile, KontakCard, KosBerikutnya } from "@/components/detail/kontak";
import { Lightbox } from "@/components/detail/lightbox";
import { PrimaryButton } from "@/components/primary-button";
import { ErrorCard, InfoCard } from "@/components/status-card";
import { Logo } from "@/components/ui/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_NAME } from "@/config/site";
import { asalDetail, buildHref, paramAsal, tujuanKembali, type FilterState, type TujuanKembali } from "@/lib/query";
import type { KosDetailResponse } from "@/lib/types";
import { useFilter } from "@/lib/use-filter";
import { useKosDetail } from "@/lib/use-kos-detail";

/** Header kaca desktop: logo, tombol kembali (sesuai asal), "Cara kerja perhitungan". */
function HeaderDetail({ tujuan }: { tujuan: TujuanKembali }) {
  return (
    <header className="hidden border-b border-white/90 bg-white/55 backdrop-blur-[20px] backdrop-saturate-[1.6] lg:block">
      <div className="mx-auto flex max-w-[1220px] flex-wrap items-center gap-5 px-8 py-3.5">
        <Link href="/" aria-label={`${SITE_NAME}, ke beranda`} className="logo inline-flex min-h-11 items-center">
          <Logo ukuran="lg" />
        </Link>
        {/* router.back() kalau halaman sebelumnya memang asalnya (/hasil atau beranda): state & scroll terjaga. */}
        <BackLink
          href={tujuan.href}
          pakaiRiwayat={tujuan.riwayatDesktop}
          className="tekan tombol-kaca inline-flex h-10 items-center gap-1.5 rounded-full bg-white/75 px-3.5 text-sm font-semibold text-ink"
        >
          <ArrowLeft size={16} aria-hidden />
          {tujuan.label}
        </BackLink>
        <span className="flex-1" />
        <Link href="/#tentang" className="tautan text-sm font-semibold text-ink">
          Cara kerja perhitungan
        </Link>
      </div>
    </header>
  );
}

function TombolKembaliMobile({ tujuan }: { tujuan: TujuanKembali }) {
  return (
    <BackLink
      href={tujuan.href}
      pakaiRiwayat={tujuan.riwayatMobile}
      aria-label="Kembali"
      className="tekan tombol-kaca flex size-11 items-center justify-center rounded-full border-white/90 bg-white/78 text-ink lg:hidden"
    >
      <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
    </BackLink>
  );
}

/** Skeleton halaman detail (juga dipakai sebagai fallback <Suspense> di page.tsx). */
export function DetailSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Memuat detail kos"
      className="mx-auto flex w-full max-w-[480px] flex-col gap-6 lg:max-w-[1220px] lg:px-8 lg:pt-6"
    >
      <Skeleton className="h-[260px] rounded-none bg-line lg:h-[410px] lg:rounded-[24px]" />
      <div className="flex flex-col gap-8 px-4 lg:flex-row lg:gap-12 lg:px-0">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-6 w-56 bg-line" />
          <Skeleton className="h-10 w-72 bg-line" />
          <Skeleton className="h-4 w-80 max-w-full bg-line" />
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[104px] rounded-[18px] bg-line" />
            ))}
          </div>
        </div>
        <Skeleton className="hidden h-[320px] rounded-[26px] bg-line lg:block lg:w-[380px]" />
      </div>
    </main>
  );
}

function IsiDetail({
  data,
  filter,
  dariHasil,
  paramTambahan,
  tujuan,
}: {
  data: KosDetailResponse;
  filter: FilterState;
  dariHasil: boolean;
  /** Penanda asal yang ikut terbawa ke detail kos berikutnya. */
  paramTambahan: ReturnType<typeof paramAsal>;
  tujuan: TujuanKembali;
}) {
  const { kos, peringkat } = data;
  const foto = kos.foto_urls?.filter(Boolean) ?? [];
  const [fotoAktif, setFotoAktif] = useState<number | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-28 lg:max-w-[1220px] lg:px-8 lg:pt-6 lg:pb-16">
      <GaleriMobile
        className="lg:hidden"
        foto={foto}
        nama={kos.nama}
        onBuka={setFotoAktif}
        backHref={tujuan.href}
        pakaiRiwayat={tujuan.riwayatMobile}
      />
      <GaleriDesktop className="hidden lg:grid" foto={foto} nama={kos.nama} onBuka={setFotoAktif} />

      <div className="flex flex-col gap-8 px-4 pt-6 lg:flex-row lg:items-start lg:gap-12 lg:px-0 lg:pt-7">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <JudulKos kos={kos} peringkat={peringkat} dariHasil={dariHasil} />
          <FaktaTiles kos={kos} />
          <Fasilitas kos={kos} />
          <AturanSekitar kos={kos} />
          <KenapaDirekomendasikan
            kos={kos}
            peringkat={peringkat}
            pembanding={data.pembanding}
            kriteria={filter.kriteria}
            hrefUbahPrioritas={buildHref("/prioritas", filter)}
          />
          <CatatanSumber kos={kos} />
        </div>

        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-6 lg:w-[380px] lg:flex-none">
          <KontakCard kos={kos} />
          {peringkat?.berikutnya ? (
            <KosBerikutnya
              kos={peringkat.berikutnya}
              href={buildHref(`/kos/${peringkat.berikutnya.id}`, filter, paramTambahan)}
            />
          ) : null}
        </aside>
      </div>

      {/* Mobile: kartu kontak jadi bar bawah sticky (harga + tombol utama). */}
      <div className="lg:hidden">
        <KontakBarMobile kos={kos} />
      </div>

      <Lightbox
        foto={foto}
        nama={kos.nama}
        indeks={fotoAktif}
        onGanti={setFotoAktif}
        onTutup={() => setFotoAktif(null)}
      />
    </main>
  );
}

/**
 * /kos/[id]: halaman detail kos penuh (mockup 08). Data dari GET /api/kos/[id]
 * dengan params yang sama seperti hasil, supaya rank & alasan konsisten.
 * Badge "#rank dari N untukmu" hanya kalau datang dari hasil (`ok=1`).
 */
export function DetailView() {
  const { id } = useParams<{ id: string }>();
  const filter = useFilter();
  const asal = asalDetail(useSearchParams());
  const dariHasil = asal === "hasil";
  const detail = useKosDetail(id, filter);
  const tujuan = tujuanKembali(asal, filter);

  return (
    <div className="flex flex-1 flex-col">
      <HeaderDetail tujuan={tujuan} />
      <Crossfade kunci={detail.status} className="flex flex-1 flex-col">
        {detail.status === "loading" ? <DetailSkeleton /> : null}

        {detail.status === "error" ? (
          <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-3.5 lg:pt-10">
            <TombolKembaliMobile tujuan={tujuan} />
            <ErrorCard pesan={detail.error} onCobaLagi={detail.cobaLagi} />
          </main>
        ) : null}

        {detail.status === "notfound" ? (
          <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-3.5 lg:pt-10">
            <TombolKembaliMobile tujuan={tujuan} />
            <InfoCard judul="Kos tidak ditemukan">
              <p className="text-sm leading-[1.55] text-muted">
                Kos ini tidak ada di data kami. Mungkin tautannya sudah tidak berlaku.
              </p>
              <PrimaryButton href={tujuan.href} block className="mt-1.5">
                {tujuan.labelTombol}
              </PrimaryButton>
            </InfoCard>
          </main>
        ) : null}

        {detail.status === "belum-lengkap" ? (
          <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pt-3.5 lg:pt-10">
            <TombolKembaliMobile tujuan={tujuan} />
            <InfoCard judul="Kos ini belum bisa dinilai">
              <p className="text-sm leading-[1.55] text-muted">{detail.pesan}</p>
              <PrimaryButton href={tujuan.href} block className="mt-1.5">
                {tujuan.labelTombol}
              </PrimaryButton>
            </InfoCard>
          </main>
        ) : null}

        {detail.status === "success" ? (
          <IsiDetail
            key={id}
            data={detail.data}
            filter={filter}
            dariHasil={dariHasil}
            paramTambahan={paramAsal(asal)}
            tujuan={tujuan}
          />
        ) : null}
      </Crossfade>
    </div>
  );
}
