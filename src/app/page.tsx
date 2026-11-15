import { Suspense } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { Halaman } from "@/components/halaman";
import { HomeUtama } from "@/components/home/home-utama";
import { HomeUtamaFromUrl } from "@/components/home/home-utama-url";
import { KosCarousel } from "@/components/home/kos-carousel";
import { DEFAULT_FILTER } from "@/lib/query";

/*
 * Home.
 * Mobile: hero → kartu form → cara kerja → carousel (alur bertahap).
 * Desktop (lg): satu halaman dua langkah — / (awal) dan /?langkah=prioritas.
 * Kolom kiri berganti sesuai langkah, kartu form di kanan tetap. Carousel
 * "Kos di data kami" tampil di kedua langkah.
 */
export default function HomePage() {
  return (
    <Halaman>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-10 lg:max-w-[1220px] lg:px-8">
        <header className="flex items-center justify-between px-5 py-2.5 lg:px-0 lg:py-[22px]">
          <Link
            href="/"
            aria-label="Kosjati, ke beranda"
            className="logo text-xl font-extrabold tracking-[-0.02em] lg:text-2xl"
          >
            kosjati<span className="text-accent-ink">.</span>
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
        <Suspense fallback={<HomeUtama initial={DEFAULT_FILTER} langkah="awal" />}>
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
              Kosjati mengurutkan kos dengan metode SAW (Simple Additive Weighting) pada 8 kriteria.
              Bobot tiap kriteria dihitung dari urutan prioritasmu (rank-sum), dan TOPSIS ditampilkan
              sebagai pembanding di detail kos. Data yang tampil saat ini masih data contoh.
            </p>
          </GlassCard>
        </section>
      </main>
    </Halaman>
  );
}
