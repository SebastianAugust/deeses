"use client";

import { ScoreBar } from "@/components/score-bar";
import { infoKriteria, jelaskanPeringkat } from "@/lib/explain";
import { formatSkor } from "@/lib/format";
import { labelTipe } from "@/lib/ringkasan";
import type { Kriteria, RankResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Potongan isi detail kos, dipakai bersama oleh halaman /kos/[id] (mobile)
 * dan panel detail kanan di /hasil (desktop). `ringkas` = ukuran panel desktop.
 */

export function DetailBadges({
  kos,
  total,
  ringkas = false,
}: {
  kos: RankResult;
  total: number;
  ringkas?: boolean;
}) {
  const ukuran = ringkas ? "rounded-[7px] px-[9px] py-[3px] text-[11px]" : "rounded-lg px-2.5 py-1 text-xs";
  return (
    <div className="flex gap-1.5">
      <span className={cn("bg-accent font-extrabold text-white", ukuran)}>
        #{kos.rank} dari {total}
      </span>
      <span className={cn("bg-soft font-bold text-accent-ink", ukuran)}>{labelTipe(kos.tipe)}</span>
    </div>
  );
}

export function SkorTiles({
  kos,
  rankTopsis,
  ringkas = false,
}: {
  kos: RankResult;
  rankTopsis: number;
  ringkas?: boolean;
}) {
  const tile = cn(
    "flex flex-col gap-0.5 border border-line bg-white/78",
    ringkas ? "rounded-[12px] px-2.5 py-2" : "rounded-[14px] px-3 py-2.5",
  );
  const angka = cn("font-extrabold tabular-nums", ringkas ? "text-lg" : "text-xl");
  return (
    <dl className={cn("grid grid-cols-2", ringkas ? "gap-2" : "gap-2.5")}>
      <div className={tile}>
        <dt className="text-[11px] text-muted">Skor SAW</dt>
        <dd className={cn(angka, "text-accent-ink")}>{formatSkor(kos.skor_saw)}</dd>
      </div>
      <div className={tile}>
        <dt className="text-[11px] text-muted">{ringkas ? "TOPSIS" : "Pembanding TOPSIS"}</dt>
        <dd className={angka}>
          <span className="sr-only">Peringkat </span>#{rankTopsis}{" "}
          <span className="text-xs font-semibold text-muted">
            · <span className="sr-only">skor </span>
            {formatSkor(kos.skor_topsis)}
          </span>
        </dd>
      </div>
    </dl>
  );
}

export function SkorKriteriaList({
  kos,
  urutan,
  ringkas = false,
  judul = true,
}: {
  kos: RankResult;
  /** Urutan prioritas pengguna (bar diurutkan sesuai ini). */
  urutan: Kriteria[];
  ringkas?: boolean;
  judul?: boolean;
}) {
  return (
    <section
      aria-label={judul ? undefined : "Skor per kriteria"}
      className={cn("flex flex-col", ringkas ? "gap-[7px]" : "gap-2")}
    >
      {judul ? <h2 className="text-[15px] font-extrabold">Skor per kriteria</h2> : null}
      {urutan.map((kode, i) => (
        <ScoreBar
          key={kode}
          index={i}
          ringkas={ringkas}
          label={infoKriteria(kode).nama}
          nilai={kos.skor_kriteria[kode]}
        />
      ))}
    </section>
  );
}

export function KenapaBox({
  kos,
  urutan,
  ringkas = false,
  className,
}: {
  kos: RankResult;
  urutan: Kriteria[];
  ringkas?: boolean;
  className?: string;
}) {
  const penjelasan = jelaskanPeringkat(kos, urutan);
  return (
    <section
      className={cn(
        "flex flex-col gap-1 bg-soft",
        ringkas ? "rounded-[14px] p-3" : "rounded-[20px] p-3.5",
        className,
      )}
    >
      <h2 className={cn("font-extrabold", ringkas ? "text-[13px]" : "text-sm")}>
        Kenapa peringkat {kos.rank}?
      </h2>
      <p className="text-xs leading-[1.45]">{penjelasan.teks}</p>
    </section>
  );
}
