"use client";

import Link from "next/link";
import { KosPhoto } from "@/components/kos-photo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import { DEFAULT_FILTER, buildHref, buildQuery } from "@/lib/query";
import { useRank } from "@/lib/use-rank";

const JUMLAH = 6;

/** Carousel "Kos di data kami": beberapa kos dari /api/rank dengan filter default. */
export function KosCarousel() {
  const rank = useRank(DEFAULT_FILTER);
  const query = buildQuery(DEFAULT_FILTER);

  return (
    <section aria-labelledby="judul-carousel" className="flex flex-col gap-3 pt-[26px]">
      <div className="flex items-center justify-between px-5">
        <h2 id="judul-carousel" className="text-[17px] font-extrabold">
          Kos di data kami
        </h2>
        <Link
          href={buildHref("/hasil", DEFAULT_FILTER)}
          className="-my-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-accent-ink"
        >
          Lihat semua
        </Link>
      </div>

      {rank.status === "loading" ? (
        <div className="flex gap-3 overflow-hidden px-5" aria-busy="true" aria-label="Memuat kos">
          {[0, 1].map((i) => (
            <div key={i} className="flex w-[200px] flex-none flex-col gap-1.5">
              <Skeleton className="h-[130px] rounded-[18px] bg-line" />
              <Skeleton className="h-4 w-24 bg-line" />
              <Skeleton className="h-4 w-32 bg-line" />
            </div>
          ))}
        </div>
      ) : null}

      {rank.status === "error" ? (
        <p className="px-5 text-[13px] text-muted">
          Daftar kos gagal dimuat.{" "}
          <button
            type="button"
            onClick={rank.cobaLagi}
            className="min-h-11 font-bold text-accent-ink underline underline-offset-4"
          >
            Coba lagi
          </button>
        </p>
      ) : null}

      {rank.status === "success" && rank.data.length === 0 ? (
        <p className="px-5 text-[13px] text-muted">Belum ada kos di data kami.</p>
      ) : null}

      {rank.status === "success" && rank.data.length > 0 ? (
        <ul className="no-scrollbar flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
          {rank.data.slice(0, JUMLAH).map((kos) => (
            <li key={kos.id} className="w-[200px] flex-none snap-start">
              <Link href={`/kos/${kos.id}?${query}`} className="flex flex-col gap-1.5 text-ink">
                <KosPhoto
                  src={kos.foto_url}
                  nama={kos.nama}
                  iconSize={26}
                  className="h-[130px] rounded-[18px]"
                />
                <span className="text-sm font-bold">{kos.nama}</span>
                <span className="text-[13px]">
                  <b>{formatRupiah(kos.harga)}</b> <span className="text-muted">/bln</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
