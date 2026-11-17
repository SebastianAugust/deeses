import { Suspense } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { Logo } from "@/components/ui/logo";
import { KRITERIA_TERSEDIA, MAKS_KRITERIA } from "@/config/kriteria";
import { SITE_NAME } from "@/config/site";
import { Halaman } from "@/components/halaman";
import { HomeUtama } from "@/components/home/home-utama";
import { HomeUtamaFromUrl } from "@/components/home/home-utama-url";
import { KosCarousel } from "@/components/home/kos-carousel";
import { DEFAULT_FILTER } from "@/lib/query";

/*
 * Home.
 * Mobile: hero → kartu form → cara kerja → carousel (alur bertahap).
 * Desktop (lg): hero + cara kerja di kiri, kartu form (budget & tipe) di kanan.
 * Langkah berikutnya (rakit kriteria) ada di /prioritas.
 */
export default function HomePage() {
  return (
    <Halaman>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-10 lg:max-w-[1220px] lg:px-8">
        <header className="flex items-center justify-between px-5 py-2.5 lg:px-0 lg:py-[22px]">
          <Link href="/" aria-label={`${SITE_NAME}, ke beranda`} className="logo inline-flex min-h-11 items-center">
            <Logo ukuran="lg" />
          </Link>
          <a
            href="#tentang"
            className="tautan inline-flex min-h-11 items-center text-sm font-semibold text-ink lg:text-[15px]"
          >
            Tentang
          </a>
        </header>

        {/* Langkah & nilai awal dari query params → useSearchParams → wajib di
            dalam Suspense. Fallback = langkah awal dengan nilai default (HTML statis). */}
        <Suspense fallback={<HomeUtama initial={DEFAULT_FILTER} />}>
          <HomeUtamaFromUrl />
        </Suspense>

        <KosCarousel />

        <section
          id="tentang"
          aria-labelledby="judul-tentang"
          className="scroll-mt-4 px-5 pt-[26px] lg:px-0 lg:pt-10"
        >
          <GlassCard className="flex flex-col gap-1.5 rounded-[20px] lg:max-w-[720px]">
            <h2 id="judul-tentang" className="text-[15px] font-extrabold">
              Tentang
            </h2>
            <p className="text-[13px] leading-normal text-muted">
              {SITE_NAME} mengurutkan kos dengan metode SAW (Simple Additive Weighting) memakai kriteria
              yang kamu rakit sendiri: 1 sampai {MAKS_KRITERIA} dari {KRITERIA_TERSEDIA.length} kriteria yang datanya
              tersedia. Bobot tiap kriteria dihitung dari urutan prioritasmu (rank-sum), dan TOPSIS ditampilkan
              sebagai pembanding di detail kos. Data sementara: sebagian kos belum punya foto,
              alamat, atau kontak.
            </p>
          </GlassCard>
        </section>
      </main>
    </Halaman>
  );
}
