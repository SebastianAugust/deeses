"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LABEL_LOKASI_PERKIRAAN } from "@/lib/format";
import { urlGoogleMaps } from "@/lib/peta";
import {
  ATRIBUSI_OSM,
  KATEGORI_POI,
  RADIUS_PERKIRAAN_M,
  RADIUS_POI_M,
  koordinatValid,
  pilihTempatTerdekat,
  type KategoriPoi,
} from "@/lib/poi";
import { usePoi } from "@/lib/use-poi";
import { cn } from "@/lib/utils";
import { IKON_KATEGORI } from "./ikon-poi";
import { PetaGagal } from "./peta-gagal";
import type { PropsPeta } from "./peta-maplibre";

const KERANGKA = "h-full w-full animate-pulse rounded-[inherit] bg-soft/70 motion-reduce:animate-none";

// MapLibre hanya untuk klien dan hanya dimuat saat bagian peta terlihat di layar.
// Bila chunk-nya gagal diunduh (jaringan/blokir), tampilkan pesan + tautan Google Maps,
// bukan error halaman.
const PetaMaplibre = dynamic<PropsPeta>(
  () =>
    import("./peta-maplibre").catch(() => ({
      default: ({ urlCadangan }: PropsPeta) => <PetaGagal href={urlCadangan} />,
    })),
  {
    ssr: false,
    loading: () => <div className={KERANGKA} aria-hidden />,
  },
);

type Props = {
  nama: string;
  lat?: number | null;
  lng?: number | null;
  koordinat_status?: string | null;
  className?: string;
};

/**
 * Peta interaktif (MapLibre + OpenFreeMap, data OpenStreetMap): pin kos + tempat penting sekitar (≤ 3 per kategori,
 * radius 1,2 km, jarak garis lurus), dengan chip filter kategori. Kos tanpa koordinat
 * valid tidak mendapat peta. Tidak memakai Google Maps/Places.
 */
export function PetaSekitar({ nama, lat, lng, koordinat_status, className }: Props) {
  const judul = (
    <h2 id="judul-peta" className="text-lg font-extrabold">
      Peta sekitar kos
    </h2>
  );

  if (!koordinatValid(lat, lng)) {
    return (
      <section aria-labelledby="judul-peta" className={cn("flex flex-col gap-2", className)}>
        {judul}
        <p className="text-sm text-muted">Lokasi belum tersedia.</p>
      </section>
    );
  }
  return (
    <PetaBerkoordinat
      nama={nama}
      lat={lat as number}
      lng={lng as number}
      perkiraan={koordinat_status === "perkiraan"}
      status={koordinat_status}
      judul={judul}
      className={className}
    />
  );
}

function PetaBerkoordinat({
  nama,
  lat,
  lng,
  perkiraan,
  status,
  judul,
  className,
}: {
  nama: string;
  lat: number;
  lng: number;
  perkiraan: boolean;
  status?: string | null;
  judul: React.ReactNode;
  className?: string;
}) {
  const bingkai = useRef<HTMLDivElement>(null);
  const [terlihat, setTerlihat] = useState(false);
  const [mati, setMati] = useState<ReadonlySet<KategoriPoi>>(new Set());
  const poi = usePoi(terlihat);
  const urlCadangan = useMemo(
    () => urlGoogleMaps({ nama, lat, lng, koordinat_status: status }),
    [nama, lat, lng, status],
  );

  // Muat MapLibre dan data tempat hanya setelah bingkai peta mendekati layar.
  useEffect(() => {
    const el = bingkai.current;
    if (!el || terlihat) return;
    if (typeof IntersectionObserver === "undefined") {
      // Peramban tanpa IntersectionObserver: muat langsung (di luar badan efek).
      const t = setTimeout(() => setTerlihat(true), 0);
      return () => clearTimeout(t);
    }
    const pengamat = new IntersectionObserver(
      (entri) => {
        if (entri.some((e) => e.isIntersecting)) {
          setTerlihat(true);
          pengamat.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [terlihat]);

  const terdekat = useMemo(
    () => (poi.status === "siap" ? pilihTempatTerdekat({ lat, lng }, poi.data) : []),
    [poi, lat, lng],
  );
  const jumlahPerKategori = useMemo(() => {
    const m = new Map<KategoriPoi, number>();
    for (const t of terdekat) m.set(t.kategori, (m.get(t.kategori) ?? 0) + 1);
    return m;
  }, [terdekat]);
  const tampil = useMemo(() => terdekat.filter((t) => !mati.has(t.kategori)), [terdekat, mati]);

  function alihkan(kode: KategoriPoi) {
    setMati((awal) => {
      const baru = new Set(awal);
      if (baru.has(kode)) baru.delete(kode);
      else baru.add(kode);
      return baru;
    });
  }

  const kategoriAda = KATEGORI_POI.filter((k) => jumlahPerKategori.has(k.kode));

  return (
    <section aria-labelledby="judul-peta" className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {judul}
        {perkiraan ? (
          <span className="rounded-md border border-line bg-white/70 px-1.5 py-px text-[11px] font-semibold text-muted">
            {LABEL_LOKASI_PERKIRAAN}
          </span>
        ) : null}
      </div>

      {kategoriAda.length > 0 ? (
        <ul
          className="flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
          aria-label="Tampilkan kategori tempat"
        >
          {kategoriAda.map((k) => {
            const nyala = !mati.has(k.kode);
            const Ikon = IKON_KATEGORI[k.kode];
            return (
              <li key={k.kode} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={nyala}
                  onClick={() => alihkan(k.kode)}
                  className={cn(
                    "tekan inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border py-1 pl-1.5 pr-3 text-xs font-semibold",
                    nyala
                      ? "border-accent/40 bg-soft text-accent-ink"
                      : "border-line bg-white/60 text-muted line-through decoration-muted/60",
                  )}
                >
                  <span
                    aria-hidden
                    className="flex size-6 items-center justify-center rounded-full text-white"
                    style={{ background: nyala ? k.warna : "#9aa1b0" }}
                  >
                    <Ikon size={14} strokeWidth={2.3} />
                  </span>
                  {k.label}
                  <span className="tabular-nums opacity-70">{jumlahPerKategori.get(k.kode)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div
        ref={bingkai}
        className={cn(
          "relative isolate w-full min-w-0 overflow-hidden rounded-[20px] border border-white/95 bg-soft/50 shadow-[0_8px_24px_rgba(30,45,90,.10)]",
          "h-[320px] lg:h-[380px]",
        )}
      >
        {terlihat ? (
          <PetaMaplibre
            nama={nama}
            lat={lat}
            lng={lng}
            perkiraan={perkiraan}
            urlCadangan={urlCadangan}
            tempat={tampil}
          />
        ) : (
          <div className={KERANGKA} aria-hidden />
        )}
      </div>

      <p className="text-[11px] leading-snug text-muted" role="note">
        {poi.status === "gagal"
          ? "Tempat sekitar belum bisa dimuat. "
          : poi.status === "siap" && terdekat.length === 0
            ? `Belum ada data tempat dalam radius ${RADIUS_POI_M / 1000} km. `
            : null}
        {perkiraan ? `Lingkaran menandai kira-kira ±${RADIUS_PERKIRAAN_M} m dari titik perkiraan. ` : null}
        Jarak garis lurus (bukan rute). Peta: OpenFreeMap, © OpenMapTiles; data tempat sekitar: {ATRIBUSI_OSM}.
      </p>
    </section>
  );
}
