"use client";

import { AnimatedText } from "@/components/animated-text";
import { IndikatorMuat } from "@/components/indikator-muat";
import type { RankState } from "@/lib/use-rank";
import type { RankResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type PerkiraanCocokProps = {
  rank: RankState & { dataTerakhir?: RankResult[] };
  /** "kalimat" = Home (± N kos cocok), "angka" = bottom bar /filter (N kos cocok). */
  varian?: "kalimat" | "angka";
  className?: string;
};

/**
 * Perkiraan jumlah kos cocok dari /api/rank. Angka berganti dengan animasi;
 * indikator loading kecil tampil selama debounce/fetch.
 */
export function PerkiraanCocok({ rank, varian = "kalimat", className }: PerkiraanCocokProps) {
  const jumlah = rank.status === "success" ? rank.data.length : rank.dataTerakhir?.length;
  const memuat = rank.status === "loading";

  let isi;
  if (rank.status === "error") {
    isi = <span className="text-muted">Perkiraan belum tersedia</span>;
  } else if (jumlah === undefined) {
    isi = <span className="text-muted">Menghitung…</span>;
  } else if (jumlah === 0 && varian === "kalimat") {
    isi = <span className="font-normal text-muted">Belum ada yang cocok, coba naikkan budget</span>;
  } else {
    isi = (
      <span className="inline-flex items-baseline">
        {varian === "kalimat" ? "± " : null}
        <AnimatedText value={jumlah} />
        &nbsp;kos cocok
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-live="polite">
      {isi}
      {memuat && jumlah !== undefined ? <IndikatorMuat label="Menghitung ulang" /> : null}
    </span>
  );
}
