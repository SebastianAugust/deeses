"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "motion/react";
import { STAGGER_DETIK, TRANSISI } from "@/lib/motion";
import { CariKos } from "@/components/cari-kos";
import { DEFAULT_FILTER, buildHref, type FilterState } from "@/lib/query";
import { gantiUrl } from "@/lib/use-filter";
import { useSebaranHarga } from "@/lib/use-sebaran";
import { HomeForm } from "./home-form";
import { LangkahTiles } from "./langkah-tiles";

const wadah: Variants = {
  tersembunyi: { opacity: 0 },
  tampil: { opacity: 1, transition: { ...TRANSISI, staggerChildren: STAGGER_DETIK } },
};
const anak: Variants = {
  tersembunyi: { opacity: 0, y: 12 },
  tampil: { opacity: 1, y: 0, transition: TRANSISI },
};

/**
 * Area dua kolom Home (langkah 1: budget & tipe).
 * - Mobile: hero → kartu form → "Cara kerjanya".
 * - Desktop: hero + "Cara kerjanya" di kiri, kartu form di kanan.
 * Tombol lanjut membawa filter ke /prioritas (langkah 2: rakit kriteria).
 */
export function HomeUtama({ initial }: { initial: FilterState }) {
  const [filter, setFilter] = useState<FilterState>(initial);
  const { data: sebaran, memuat: memuatSebaran } = useSebaranHarga(filter.tipe);
  const pertama = useRef(true);

  // Jaga URL selaras dengan state (budget/tipe/kriteria). Render pertama dilewati
  // supaya "/" tetap bersih.
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    gantiUrl(buildHref("/", filter));
  }, [filter]);

  function ubah(patch: Partial<FilterState>) {
    setFilter((f) => ({ ...f, ...patch }));
  }

  return (
    <div className="flex scroll-mt-6 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-x-14 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_480px] xl:gap-x-16">
      {/* Kolom kiri. Di mobile `contents`, supaya hero & "Cara kerjanya" bisa
          diurutkan mengapit kartu form (order-1 / order-3). */}
      <motion.div
        variants={wadah}
        initial="tersembunyi"
        animate="tampil"
        className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-10 lg:pt-6"
      >
        <motion.div
          variants={anak}
          className="relative z-30 order-1 flex flex-col gap-2.5 px-5 pt-2.5 lg:gap-4 lg:px-0 lg:pt-0"
        >
          <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em] lg:text-[46px] lg:leading-[1.08]">
            Cari kos di Jatinangor yang paling pas buatmu
          </h1>
          <p className="text-sm leading-normal text-muted lg:max-w-[520px] lg:text-base">
            Atur budget, pilih kriteria yang kamu pedulikan, lalu kami urutkan kos yang cocok dari skor
            tertinggi.
          </p>
          {/* Pintasan ke kos tertentu berdasarkan nama, tanpa mengisi budget. z-30 di
              pembungkus hero supaya dropdown tampil di atas kartu form / "Cara kerjanya". */}
          <CariKos filter={DEFAULT_FILTER} className="mt-1.5 lg:max-w-[520px]" />
        </motion.div>

        <motion.section
          variants={anak}
          aria-labelledby="judul-cara"
          className="order-3 flex flex-col gap-3 px-5 pt-[26px] lg:px-0 lg:pt-0"
        >
          <h2 id="judul-cara" className="text-[17px] font-extrabold">
            Cara kerjanya
          </h2>
          <LangkahTiles />
        </motion.section>
      </motion.div>

      <div className="order-2 lg:col-start-2 lg:row-start-1 lg:self-start">
        <HomeForm filter={filter} onChange={ubah} sebaran={sebaran} memuatSebaran={memuatSebaran} />
      </div>
    </div>
  );
}
