import { Suspense } from "react";
import { GlassCard } from "@/components/glass-card";
import { KosCarousel } from "@/components/home/kos-carousel";
import { HomeForm } from "@/components/home/home-form";
import { HomeFormFromUrl } from "@/components/home/home-form-url";
import { DEFAULT_FILTER } from "@/lib/query";

const LANGKAH = ["Pilih budget & tipe", "Urutkan prioritas", "Lihat peringkat"];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-10">
      <header className="flex items-center justify-between px-5 py-2.5">
        <span className="text-xl font-extrabold tracking-[-0.02em]">
          kosjati<span className="text-accent-ink">.</span>
        </span>
        <a href="#tentang" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink">
          Tentang
        </a>
      </header>

      <div className="flex flex-col gap-2.5 px-5 pt-2.5">
        <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em]">
          Cari kos di Jatinangor yang paling pas buatmu
        </h1>
        <p className="text-sm leading-normal text-muted">
          Atur budget dan prioritasmu, lalu kami urutkan kos yang cocok dari skor tertinggi.
        </p>
      </div>

      {/* Nilai awal dari query params → useSearchParams → wajib di dalam Suspense.
          Fallback = form yang sama dengan nilai default (masuk HTML statis). */}
      <Suspense fallback={<HomeForm initial={DEFAULT_FILTER} />}>
        <HomeFormFromUrl />
      </Suspense>

      <section aria-labelledby="judul-cara" className="flex flex-col gap-3 px-5 pt-[26px]">
        <h2 id="judul-cara" className="text-[17px] font-extrabold">
          Cara kerjanya
        </h2>
        <ol className="grid grid-cols-3 gap-2.5">
          {LANGKAH.map((teks, i) => (
            <li
              key={teks}
              className="flex flex-col gap-2 rounded-[18px] border border-white/90 bg-white/55 p-3 backdrop-blur-[20px]"
            >
              <span
                aria-hidden
                className="flex size-[30px] items-center justify-center rounded-[10px] bg-soft text-sm font-extrabold text-accent-ink"
              >
                {i + 1}
              </span>
              <span className="text-[13px] leading-[1.3] font-bold">{teks}</span>
            </li>
          ))}
        </ol>
      </section>

      <KosCarousel />

      <section id="tentang" aria-labelledby="judul-tentang" className="scroll-mt-4 px-5 pt-[26px]">
        <GlassCard className="flex flex-col gap-1.5 rounded-[20px]">
          <h2 id="judul-tentang" className="text-[15px] font-extrabold">
            Tentang
          </h2>
          <p className="text-[13px] leading-normal text-muted">
            Kosjati mengurutkan kos dengan metode SAW (Simple Additive Weighting) pada 8 kriteria.
            Bobot tiap kriteria dihitung dari urutan prioritasmu, dan TOPSIS ditampilkan sebagai
            pembanding di halaman detail. Data yang tampil saat ini masih data contoh.
          </p>
        </GlassCard>
      </section>
    </main>
  );
}
