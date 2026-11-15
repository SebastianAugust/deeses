import { Suspense } from "react";
import { GlassCard } from "@/components/glass-card";
import { Halaman } from "@/components/halaman";
import { HomeForm } from "@/components/home/home-form";
import { HomeFormFromUrl } from "@/components/home/home-form-url";
import { KosCarousel } from "@/components/home/kos-carousel";
import { DEFAULT_FILTER } from "@/lib/query";

const LANGKAH = ["Pilih budget & tipe", "Urutkan prioritas", "Lihat peringkat"];

/*
 * Mobile: hero → kartu form → cara kerja → carousel (satu kolom, ±480px).
 * Desktop (lg): hero + 3 langkah di kiri, kartu form kaca di kanan.
 */
export default function HomePage() {
  return (
    <Halaman>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-10 lg:max-w-[1200px] lg:px-8">
        <header className="flex items-center justify-between px-5 py-2.5 lg:px-0 lg:py-4">
          <span className="text-xl font-extrabold tracking-[-0.02em] lg:text-[22px]">
            kosjati<span className="text-accent-ink">.</span>
          </span>
          <a
            href="#tentang"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-ink hover:text-accent-ink"
          >
            Tentang
          </a>
        </header>

        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-x-14 lg:gap-y-8 lg:pt-10">
          <div className="flex flex-col gap-2.5 px-5 pt-2.5 lg:col-start-1 lg:row-start-1 lg:gap-4 lg:px-0 lg:pt-0">
            <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em] lg:text-[46px] lg:leading-[1.08]">
              Cari kos di Jatinangor yang paling pas buatmu
            </h1>
            <p className="text-sm leading-normal text-muted lg:max-w-[520px] lg:text-base">
              Atur budget dan prioritasmu, lalu kami urutkan kos yang cocok dari skor tertinggi.
            </p>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {/* Nilai awal dari query params → useSearchParams → wajib di dalam Suspense.
                Fallback = form yang sama dengan nilai default (masuk HTML statis). */}
            <Suspense fallback={<HomeForm initial={DEFAULT_FILTER} />}>
              <HomeFormFromUrl />
            </Suspense>
          </div>

          <section
            aria-labelledby="judul-cara"
            className="flex flex-col gap-3 px-5 pt-[26px] lg:col-start-1 lg:row-start-2 lg:self-start lg:px-0 lg:pt-0"
          >
            <h2 id="judul-cara" className="text-[17px] font-extrabold">
              Cara kerjanya
            </h2>
            <ol className="grid grid-cols-3 gap-2.5 lg:max-w-[560px]">
              {LANGKAH.map((teks, i) => (
                <li
                  key={teks}
                  className="flex flex-col gap-2 rounded-[18px] border border-white/90 bg-white/55 p-3 backdrop-blur-[20px] lg:p-4"
                >
                  <span
                    aria-hidden
                    className="flex size-[30px] items-center justify-center rounded-[10px] bg-soft text-sm font-extrabold text-accent-ink"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-[1.3] font-bold lg:text-sm">{teks}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

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
