"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { motion } from "motion/react";
import { AnimatedText } from "@/components/animated-text";
import { CatatanDataKos } from "@/components/catatan-data-kos";
import { CatatanDataSimulasi } from "@/components/catatan-data-simulasi";
import { CatatanSkorRelatif } from "@/components/catatan-skor-relatif";
import { Crossfade } from "@/components/crossfade";
import { IndikatorMuat } from "@/components/indikator-muat";
import { JarakKampus } from "@/components/jarak-kampus";
import { KosPhoto } from "@/components/kos-photo";
import { RankDeltaBadge } from "@/components/kos/rank-delta-badge";
import { PhotoBadge, RankBadge } from "@/components/rank-badge";
import { ErrorCard } from "@/components/status-card";
import { formatRupiah, formatSkor } from "@/lib/format";
import { TRANSISI, jedaStagger } from "@/lib/motion";
import { pembandingTerlaluSedikit } from "@/lib/skor-relatif";
import { PARAM_OK, buildHref, buildQuery, type FilterState } from "@/lib/query";
import { labelTipe } from "@/lib/ringkasan";
import type { RankResponse, RankResult } from "@/lib/types";
import { useFilter } from "@/lib/use-filter";
import { useRank } from "@/lib/use-rank";
import { useRankDelta } from "@/lib/use-rank-delta";
import { CatatanTanpaData } from "./catatan-tanpa-data";
import { SearchPill } from "./search-pill";
import { HasilMobileSkeleton } from "./hasil-skeleton";
import { KosongCard } from "./kosong-card";

/** Pembungkus kartu: muncul berurutan (stagger 40 ms, maks 8 kartu) lalu pindah posisi dengan layout. */
function Muncul({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  const jeda = { ...TRANSISI, delay: jedaStagger(index) };
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ default: TRANSISI, opacity: jeda, y: jeda }}
      className={className}
    >
      {children}
    </motion.li>
  );
}

const BAYANGAN_FOTO =
  "shadow-[0_2px_8px_rgba(30,45,90,.06)] transition-shadow duration-200 group-hover:shadow-[0_10px_24px_rgba(30,45,90,.16)]";

function DaftarMobile({
  data,
  query,
  delta,
  memuat,
  respons,
}: {
  data: RankResult[];
  respons: RankResponse | undefined;
  query: string;
  delta: Record<string, number>;
  /** Sedang memuat ulang: daftar lama tetap tampil + titik berdenyut di judul. */
  memuat: boolean;
}) {
  const [pertama, ...lainnya] = data;
  const duaTiga = lainnya.slice(0, 2);
  const sisanya = lainnya.slice(2);
  // Detail kos dibuka dari hasil → bawa semua params + penanda ok (badge "#rank dari N").
  const href = (kos: RankResult) => `/kos/${kos.id}?${query}&ok=1`;

  return (
    <div className="pb-24">
      <div className="flex items-baseline justify-between px-5 pt-4 pb-2.5">
        <h1 className="flex items-center gap-2 text-lg font-extrabold">
          <span className="inline-flex items-baseline">
            <AnimatedText value={data.length} />
            &nbsp;kos cocok
          </span>
          {memuat ? <IndikatorMuat label="Memperbarui peringkat" /> : null}
        </h1>
        <span className="text-xs text-muted">Urut skor SAW</span>
      </div>
      <CatatanTanpaData respons={respons} className="mx-5 mb-3 -mt-1" />
      {pembandingTerlaluSedikit(data.length) ? (
        <CatatanSkorRelatif jumlah={data.length} className="mx-5 mb-3" />
      ) : null}

      <ul>
        <Muncul index={0} className="mx-5">
          <Link href={href(pertama)} className="kartu-angkat group flex flex-col gap-2 rounded-[20px] text-ink">
            <KosPhoto
              src={pertama.foto_url}
              nama={pertama.nama}
              iconSize={30}
              className={`h-[196px] rounded-[20px] ${BAYANGAN_FOTO}`}
            >
              <RankBadge rank={1} label="Paling cocok" size="lg" className="absolute top-3 left-3" />
              <PhotoBadge
                tone="accent"
                size="lg"
                className="absolute right-3 bottom-3 px-[11px] py-1.5 text-[13px] tabular-nums"
              >
                Skor&nbsp;<AnimatedText value={formatSkor(pertama.skor_saw)} />
              </PhotoBadge>
            </KosPhoto>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[17px] font-extrabold">{pertama.nama}</span>
            </div>
            <JarakKampus kos={pertama} className="-mt-1 text-[13px] text-muted" />
            <div className="flex items-center justify-between">
              <span className="text-[15px]">
                <b>{formatRupiah(pertama.harga)}</b> <span className="text-muted">/ bulan</span>
              </span>
              <span className="flex items-center gap-2">
                <RankDeltaBadge delta={delta[pertama.id]} />
                <span className="rounded-lg bg-soft px-2 py-1 text-xs font-bold text-accent-ink">
                  {labelTipe(pertama.tipe)}
                </span>
              </span>
            </div>
            <CatatanDataKos kos={pertama} />
          </Link>
        </Muncul>
      </ul>

      {duaTiga.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 px-5 pt-[18px]">
          {duaTiga.map((kos, i) => (
            <Muncul key={kos.id} index={i + 1}>
              <Link href={href(kos)} className="kartu-angkat group flex flex-col gap-1.5 rounded-[16px] text-ink">
                <KosPhoto
                  src={kos.foto_url}
                  nama={kos.nama}
                  iconSize={0}
                  label={null}
                  className={`h-[110px] rounded-[16px] ${BAYANGAN_FOTO}`}
                >
                  <RankBadge rank={kos.rank} className="absolute top-2 left-2" />
                  <PhotoBadge className="absolute right-2 bottom-2 tabular-nums">
                    <span className="sr-only">Skor </span>
                    {formatSkor(kos.skor_saw)}
                  </PhotoBadge>
                </KosPhoto>
                <span className="flex items-center justify-between gap-1 text-sm font-bold">
                  <span className="truncate">{kos.nama}</span>
                  <RankDeltaBadge delta={delta[kos.id]} />
                </span>
                <span className="text-[13px]">
                  <b>{formatRupiah(kos.harga)}</b>{" "}
                </span>
                <JarakKampus kos={kos} varian="ringkas" className="text-xs text-muted" />
                <CatatanDataKos kos={kos} jarak={false} />
              </Link>
            </Muncul>
          ))}
        </ul>
      ) : null}

      {sisanya.length > 0 ? (
        <ul className="flex flex-col">
          {sisanya.map((kos, i) => (
            <Muncul key={kos.id} index={i + 3} className="mx-5 mt-4">
              <Link href={href(kos)} className="kartu-angkat group flex items-center gap-3 rounded-[12px] text-ink">
                <KosPhoto
                  src={kos.foto_url}
                  nama={kos.nama}
                  iconSize={0}
                  label={null}
                  className={`h-[60px] w-[72px] flex-none rounded-[12px] ${BAYANGAN_FOTO}`}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">
                    #{kos.rank} {kos.nama}
                  </span>
                  <span className="text-[13px]">
                    <b>{formatRupiah(kos.harga)}</b>{" "}
                  </span>
                  <JarakKampus kos={kos} varian="ringkas" className="text-xs text-muted" />
                  <CatatanDataKos kos={kos} jarak={false} />
                </span>
                <span className="flex flex-col items-end">
                  <span className="text-sm font-extrabold tabular-nums">
                    <span className="sr-only">Skor </span>
                    {formatSkor(kos.skor_saw)}
                  </span>
                  <RankDeltaBadge delta={delta[kos.id]} />
                </span>
              </Link>
            </Muncul>
          ))}
        </ul>
      ) : null}

      <CatatanDataSimulasi className="mx-5 mt-6" />
    </div>
  );
}

/** /hasil versi mobile (< lg). */
export function HasilMobile() {
  const filter = useFilter();
  const router = useRouter();
  const rank = useRank(filter);
  const query = buildQuery(filter);
  // Saat memuat ulang (mis. setelah "Naikkan budget"), daftar lama tetap tampil
  // dengan indikator kecil — skeleton penuh hanya untuk muatan pertama.
  const daftar = rank.status === "success" ? rank.data : rank.dataTerakhir;
  const respons = rank.status === "success" ? rank.respons : rank.responsTerakhir;
  const memuat = rank.status === "loading";
  const delta = useRankDelta(daftar);

  function terapkan(baru: FilterState) {
    router.replace(buildHref("/hasil", baru, PARAM_OK), { scroll: false });
  }

  let kunci = "skeleton";
  if (rank.status === "error") kunci = "error";
  else if (daftar && daftar.length === 0) kunci = "kosong";
  else if (daftar) kunci = "isi";

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
      <div className="px-4 pt-3">
        <SearchPill filter={filter} />
      </div>

      <main className="flex flex-1 flex-col">
        <Crossfade kunci={kunci} className="flex flex-1 flex-col">
          {kunci === "skeleton" ? <HasilMobileSkeleton /> : null}
          {rank.status === "error" ? (
            <div className="px-4 pt-6">
              <ErrorCard pesan={rank.error} onCobaLagi={rank.cobaLagi} />
            </div>
          ) : null}
          {kunci === "kosong" ? (
            <div className="px-4 pt-[18vh] pb-10">
              <KosongCard filter={filter} terapkan={terapkan} tanpaData={respons?.jumlah_tanpa_data ?? 0} />
            </div>
          ) : null}
          {kunci === "isi" && daftar ? (
            <DaftarMobile data={daftar} query={query} delta={delta} memuat={memuat} respons={respons} />
          ) : null}
        </Crossfade>
      </main>

      <Link
        href={`/prioritas?${query}`}
        className="tekan glass-strong tombol-kaca fixed bottom-[22px] left-1/2 z-20 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full border-white/90 px-5 text-sm font-bold whitespace-nowrap text-ink shadow-[0_10px_28px_rgba(30,45,90,.10)]"
      >
        <ArrowUpDown size={16} className="text-accent-ink" aria-hidden />
        Ubah kriteria
      </Link>
    </div>
  );
}
