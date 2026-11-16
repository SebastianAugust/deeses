"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Crossfade } from "@/components/crossfade";
import { Spinner } from "@/components/indikator-muat";
import { useSibukSingkat } from "@/lib/use-sibuk";
import { KosPhoto } from "@/components/kos-photo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import { TRANSISI, jedaStagger } from "@/lib/motion";
import { DEFAULT_FILTER, buildHref, buildQuery } from "@/lib/query";
import { useKosRingkas } from "@/lib/use-kos-ringkas";

const JUMLAH = 6;

/**
 * Carousel "Kos di data kami": beberapa kos dari GET /api/kos (bukan hasil peringkat).
 * Kos yang punya foto ditampilkan lebih dulu; selebihnya urut id.
 */
export function KosCarousel() {
  const rank = useKosRingkas();
  const query = buildQuery(DEFAULT_FILTER);
  const kunci = rank.status === "loading" ? "skeleton" : rank.status;
  const [sibuk, jalankan] = useSibukSingkat();

  return (
    <section aria-labelledby="judul-carousel" className="flex flex-col gap-2 pt-[26px] lg:pt-12">
      <div className="flex items-center justify-between px-5 lg:px-0">
        <h2 id="judul-carousel" className="text-[17px] font-extrabold">
          Kos di data kami
        </h2>
        <Link
          href={buildHref("/hasil", DEFAULT_FILTER)}
          className="tekan tautan -my-2 inline-flex min-h-11 items-center rounded-lg px-1 text-[13px] font-semibold text-accent-ink"
        >
          Lihat semua
        </Link>
      </div>

      <Crossfade kunci={kunci}>
        {rank.status === "loading" ? (
          <div className="flex gap-3 overflow-hidden px-5 pt-1 pb-3 lg:px-0" aria-busy="true" aria-label="Memuat kos">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex w-[200px] flex-none flex-col gap-1.5">
                <Skeleton className="h-[130px] rounded-[18px] bg-line" />
                <Skeleton className="h-4 w-24 bg-line" />
                <Skeleton className="h-4 w-32 bg-line" />
              </div>
            ))}
          </div>
        ) : null}

        {rank.status === "error" ? (
          <p className="px-5 text-[13px] text-muted lg:px-0">
            Daftar kos gagal dimuat.{" "}
            <button
              type="button"
              onClick={() => jalankan(rank.cobaLagi)}
              disabled={sibuk}
              aria-busy={sibuk || undefined}
              className="tekan tautan inline-flex min-h-11 items-center gap-1.5 rounded-lg font-bold text-accent-ink"
            >
              {sibuk ? <Spinner size={14} /> : null}
              Coba lagi
            </button>
          </p>
        ) : null}

        {rank.status === "success" && rank.data.length === 0 ? (
          <p className="px-5 text-[13px] text-muted lg:px-0">Belum ada kos di data kami.</p>
        ) : null}

        {rank.status === "success" && rank.data.length > 0 ? (
          // pt/pb memberi ruang untuk kartu yang terangkat saat hover (overflow-x memotong sumbu y).
          <ul className="no-scrollbar flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pt-1 pb-3 lg:px-0">
            {[...rank.data]
              .sort((a, b) => Number(b.foto_url !== null) - Number(a.foto_url !== null))
              .slice(0, JUMLAH)
              .map((kos, i) => (
              <motion.li
                key={kos.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...TRANSISI, delay: jedaStagger(i) }}
                className="w-[200px] flex-none snap-start"
              >
                <Link
                  href={`/kos/${kos.id}?${query}`}
                  className="kartu-angkat group flex flex-col gap-1.5 rounded-[18px] text-ink"
                >
                  <KosPhoto
                    src={kos.foto_url}
                    nama={kos.nama}
                    iconSize={26}
                    className="h-[130px] rounded-[18px] shadow-[0_2px_8px_rgba(30,45,90,.06)] transition-shadow duration-200 group-hover:shadow-[0_10px_24px_rgba(30,45,90,.16)]"
                  />
                  <span className="text-sm font-bold">{kos.nama}</span>
                  <span className="text-[13px]">
                    {kos.harga === null ? (
                      <span className="text-muted">Harga belum ada data</span>
                    ) : (
                      <>
                        <b>{formatRupiah(kos.harga)}</b> <span className="text-muted">/bln</span>
                      </>
                    )}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        ) : null}
      </Crossfade>
    </section>
  );
}
