"use client";

import { AnimatePresence, motion } from "motion/react";
import { KosPhoto } from "@/components/kos-photo";
import { PrimaryButton } from "@/components/primary-button";
import { rankTopsis } from "@/lib/explain";
import { formatJarak, formatRupiah } from "@/lib/format";
import { TRANSISI_CEPAT } from "@/lib/motion";
import type { Kriteria, RankResult } from "@/lib/types";
import { DetailBadges, KenapaBox, SkorKriteriaList, SkorTiles } from "./detail-parts";

type KosDetailPanelProps = {
  kos: RankResult;
  semua: RankResult[];
  urutan: Kriteria[];
};

/**
 * Panel detail kanan di /hasil desktop. Berganti kos → isi lama memudar keluar,
 * isi baru masuk (fade + geser 8px) tanpa pindah halaman.
 */
export function KosDetailPanel({ kos, semua, urutan }: KosDetailPanelProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={kos.id}
        aria-label={`Detail ${kos.nama}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={TRANSISI_CEPAT}
        className="flex flex-col gap-3 rounded-[24px] border border-white/90 bg-white/62 p-3 shadow-[0_12px_34px_rgba(30,45,90,.14)] backdrop-blur-[22px] backdrop-saturate-[1.6]"
      >
        <KosPhoto
          src={kos.foto_url}
          nama={kos.nama}
          iconSize={30}
          label="foto kos"
          className="h-[190px] flex-none rounded-[18px]"
        />
        <div className="flex flex-col gap-1 px-1.5">
          <DetailBadges kos={kos} total={semua.length} ringkas />
          <h2 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">{kos.nama}</h2>
          <span className="text-[13px] text-muted">
            {formatJarak(kos.jarak_km)} ke kampus · {formatRupiah(kos.harga)} / bulan
          </span>
        </div>
        <div className="px-1.5">
          <SkorTiles kos={kos} rankTopsis={rankTopsis(kos, semua)} ringkas />
        </div>
        <div className="px-1.5">
          <SkorKriteriaList kos={kos} urutan={urutan} ringkas judul={false} />
        </div>
        <KenapaBox kos={kos} urutan={urutan} ringkas className="mx-1.5" />
        <PrimaryButton
          href={kos.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-1.5 mb-1.5 h-12 rounded-[14px]"
        >
          Buka iklan asli
        </PrimaryButton>
      </motion.section>
    </AnimatePresence>
  );
}
