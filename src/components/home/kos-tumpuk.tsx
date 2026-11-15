"use client";

import { AnimatedText } from "@/components/animated-text";
import { IndikatorMuat } from "@/components/indikator-muat";
import { KosPhoto } from "@/components/kos-photo";
import { formatRupiahSingkat } from "@/lib/format";
import type { FilterState } from "@/lib/query";
import { labelTipe } from "@/lib/ringkasan";
import type { RankResult } from "@/lib/types";
import type { RankState } from "@/lib/use-rank";
import { cn } from "@/lib/utils";

const UKURAN = "size-[38px] flex-none rounded-[12px] border-2 border-white";

/**
 * Blok "N kos siap diurutkan": tumpukan 3 thumbnail (overlap −12px) + badge
 * "+sisa", dengan subteks "Tipe · maks Rp …". Satu-satunya hitungan di langkah
 * prioritas Home.
 */
export function KosTumpuk({
  rank,
  filter,
}: {
  rank: RankState & { dataTerakhir?: RankResult[] };
  filter: FilterState;
}) {
  const daftar = rank.status === "success" ? rank.data : rank.dataTerakhir;
  const jumlah = daftar?.length;
  const tiga = daftar?.slice(0, 3) ?? [];
  const sisa = jumlah ? jumlah - tiga.length : 0;

  let judul;
  if (rank.status === "error" && jumlah === undefined) judul = "Jumlah kos belum tersedia";
  else if (jumlah === undefined) judul = "Menghitung kos…";
  else if (jumlah === 0) judul = "Belum ada kos yang cocok";
  else
    judul = (
      <span className="inline-flex items-baseline">
        <AnimatedText value={jumlah} />
        &nbsp;kos siap diurutkan
      </span>
    );

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-line bg-white/70 px-3.5 py-3">
      <div className="flex flex-none" aria-hidden>
        {jumlah === undefined
          ? [0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(UKURAN, "animate-pulse bg-line motion-reduce:animate-none", i > 0 && "-ml-3")}
              />
            ))
          : null}
        {tiga.map((kos, i) => (
          <KosPhoto
            key={kos.id}
            src={kos.foto_url}
            nama={kos.nama}
            iconSize={0}
            label={null}
            className={cn(UKURAN, i > 0 && "-ml-3")}
          />
        ))}
        {sisa > 0 ? (
          <span
            className={cn(
              UKURAN,
              "-ml-3 flex items-center justify-center bg-soft text-[11px] font-extrabold text-accent-ink",
            )}
          >
            +{sisa}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col" aria-live="polite">
        <span className="flex items-center gap-2 text-base font-extrabold">
          {judul}
          {rank.status === "loading" && jumlah !== undefined ? <IndikatorMuat label="Menghitung ulang" /> : null}
        </span>
        <span className="text-xs text-muted">
          {jumlah === 0
            ? "Coba naikkan budget atau ganti tipe"
            : `${labelTipe(filter.tipe)} · maks ${formatRupiahSingkat(filter.budget)}`}
        </span>
      </div>
    </div>
  );
}
