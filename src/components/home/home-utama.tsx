"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { STAGGER_DETIK, TRANSISI, TRANSISI_CEPAT } from "@/lib/motion";
import { buildHref, hrefHome, type FilterState, type LangkahHome } from "@/lib/query";
import { dorongUrl, gantiUrl } from "@/lib/use-filter";
import { useMobileRedirect } from "@/lib/use-media";
import { useRank } from "@/lib/use-rank";
import { useSebaranHarga } from "@/lib/use-sebaran";
import { cn } from "@/lib/utils";
import { HomeForm } from "./home-form";
import { LangkahPrioritas } from "./langkah-prioritas";
import { LangkahTiles } from "./langkah-tiles";

/** Konten lama: fade + geser ke atas 12px; konten baru: anak masuk berurutan. */
const wadah: Variants = {
  tersembunyi: { opacity: 0 },
  tampil: { opacity: 1, transition: { ...TRANSISI, staggerChildren: STAGGER_DETIK } },
  keluar: { opacity: 0, y: -12, transition: TRANSISI_CEPAT },
};
const anak: Variants = {
  tersembunyi: { opacity: 0, y: 12 },
  tampil: { opacity: 1, y: 0, transition: TRANSISI },
};

/**
 * Area dua kolom Home.
 * - Mobile: hero → kartu form → "Cara kerjanya" (alur bertahap; langkah
 *   prioritas ada di /prioritas).
 * - Desktop: kolom kiri berganti sesuai langkah (/ = awal, /?langkah=prioritas),
 *   kolom kanan kartu form yang sama (tidak di-unmount).
 *
 * Ganti langkah memakai history.pushState (lihat dorongUrl): URL & tombol Back
 * browser berfungsi, tanpa navigasi route sehingga kartu kanan tetap instance
 * yang sama.
 */
export function HomeUtama({ initial, langkah }: { initial: FilterState; langkah: LangkahHome }) {
  const [filter, setFilter] = useState<FilterState>(initial);
  const { data: sebaran, memuat: memuatSebaran } = useSebaranHarga(filter.tipe);
  const rank = useRank(filter, { debounceMs: 300 });
  const reduced = useReducedMotion();
  const areaRef = useRef<HTMLDivElement>(null);
  const sudahDorong = useRef(false);
  const pertama = useRef(true);

  // Di HP, /?langkah=prioritas diarahkan ke halaman bertahap /prioritas.
  useMobileRedirect(buildHref("/prioritas", filter), langkah === "prioritas");

  // Jaga URL selaras dengan state (budget/tipe/urutan + langkah), termasuk
  // setelah tombol Back browser. Render pertama dilewati supaya "/" tetap bersih.
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    gantiUrl(hrefHome(filter, langkah));
  }, [filter, langkah]);

  function ubah(patch: Partial<FilterState>) {
    setFilter((f) => ({ ...f, ...patch }));
  }

  function lanjut() {
    dorongUrl(hrefHome(filter, "prioritas"));
    sudahDorong.current = true;
    // Kalau pengguna sedang di bawah, gulir halus ke atas area dua kolom.
    const el = areaRef.current;
    if (el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  }

  function kembali() {
    if (sudahDorong.current) {
      sudahDorong.current = false;
      window.history.back();
    } else {
      gantiUrl(hrefHome(filter, "awal"));
    }
  }

  return (
    <div
      ref={areaRef}
      className="flex scroll-mt-6 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-x-14 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_480px] xl:gap-x-16"
    >
      {/* Kolom kiri. Di mobile `contents`, supaya hero & "Cara kerjanya" bisa
          diurutkan mengapit kartu form (order-1 / order-3). */}
      <div className="contents lg:col-start-1 lg:row-start-1 lg:block lg:min-w-0">
        <LayoutGroup id="langkah-home">
          <AnimatePresence mode="wait" initial={false}>
            {langkah === "awal" ? (
              <motion.div
                key="awal"
                variants={wadah}
                initial="tersembunyi"
                animate="tampil"
                exit="keluar"
                className="contents lg:flex lg:flex-col lg:gap-10 lg:pt-6"
              >
                <motion.div
                  variants={anak}
                  className="order-1 flex flex-col gap-2.5 px-5 pt-2.5 lg:gap-4 lg:px-0 lg:pt-0"
                >
                  <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em] lg:text-[46px] lg:leading-[1.08]">
                    Cari kos di Jatinangor yang paling pas buatmu
                  </h1>
                  <p className="text-sm leading-normal text-muted lg:max-w-[520px] lg:text-base">
                    Atur budget dan prioritasmu, lalu kami urutkan kos yang cocok dari skor tertinggi.
                  </p>
                </motion.div>

                <motion.section
                  variants={anak}
                  aria-labelledby="judul-cara"
                  className="order-3 flex flex-col gap-3 px-5 pt-[26px] lg:px-0 lg:pt-0"
                >
                  <h2 id="judul-cara" className="text-[17px] font-extrabold">
                    Cara kerjanya
                  </h2>
                  <LangkahTiles mode="cara" />
                </motion.section>
              </motion.div>
            ) : (
              <motion.div
                key="prioritas"
                variants={wadah}
                initial="tersembunyi"
                animate="tampil"
                exit="keluar"
                // Langkah ini khusus desktop; di HP halaman dialihkan ke /prioritas.
                className="hidden lg:flex lg:flex-col lg:gap-7"
              >
                <LangkahPrioritas
                  urutan={filter.urutan}
                  onUrutan={(urutan) => ubah({ urutan })}
                  onKembali={kembali}
                  anak={anak}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>

      {/* Kolom kanan: kartu form yang sama di kedua langkah. Sticky saat
          langkah prioritas supaya tombol tetap terlihat. */}
      <div
        className={cn(
          "order-2 lg:col-start-2 lg:row-start-1 lg:self-start",
          langkah === "prioritas" && "lg:sticky lg:top-6",
        )}
      >
        <HomeForm
          filter={filter}
          onChange={ubah}
          sebaran={sebaran}
          memuatSebaran={memuatSebaran}
          rank={rank}
          langkah={langkah}
          onLanjut={lanjut}
          onKembali={kembali}
        />
      </div>
    </div>
  );
}
