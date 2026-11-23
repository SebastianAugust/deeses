"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bath, Check, Maximize, Users, Zap, type LucideIcon } from "lucide-react";
import { CatatanSkorRelatif } from "@/components/catatan-skor-relatif";
import { ScoreBar } from "@/components/score-bar";
import { CatatanDataKos } from "@/components/catatan-data-kos";
import { JarakKampus } from "@/components/jarak-kampus";
import { TautanPeta } from "@/components/detail/tautan-peta";
import { jelaskanPeringkat, skorKriteria } from "@/lib/explain";
import {
  CATATAN_DATA_SIMULASI,
  adaJarakPerKampus,
  formatJarakKampus,
  formatJarakMeter,
  formatSkor,
  formatTanggal,
  teksJarak,
} from "@/lib/format";
import { labelTipe } from "@/lib/ringkasan";
import { ATRIBUSI_OSM, infoKategori, pilihTempatTerdekat, teksJarakGarisLurus } from "@/lib/poi";
import { pembandingTerlaluSedikit } from "@/lib/skor-relatif";
import { usePoi } from "@/lib/use-poi";
import { infoKriteria, type KodeKriteria } from "@/config/kriteria";
import type { KosDetail, KosDetailResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

/*
 * Bagian kolom kiri halaman /kos/[id] (mockup 08). Semua field opsional:
 * yang kosong disembunyikan atau tampil "Belum ada data" (muted), tidak
 * pernah "undefined".
 */

const BELUM_ADA = <span className="font-semibold text-muted">Belum ada data</span>;

function ada<T>(daftar: T[] | null | undefined): daftar is T[] {
  return Array.isArray(daftar) && daftar.length > 0;
}

/* --------------------------------- Judul --------------------------------- */

export function JudulKos({
  kos,
  peringkat,
  dariHasil,
}: {
  kos: KosDetail;
  peringkat: KosDetailResponse["peringkat"];
  /** Badge "#rank dari N untukmu" hanya kalau datang dari halaman hasil. */
  dariHasil: boolean;
}) {
  const pil = "rounded-[9px] px-[11px] py-[5px] text-xs";
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {dariHasil && peringkat ? (
          <span className={cn(pil, "bg-accent font-extrabold text-white")}>
            #{peringkat.rank} dari {peringkat.total} untukmu
          </span>
        ) : null}
        <span className={cn(pil, "bg-soft font-bold text-accent-ink")}>{labelTipe(kos.tipe)}</span>
        <span className={cn(pil, "border border-line bg-white/75 font-bold text-muted")}>
          Skor SAW {formatSkor(kos.skor_saw)}
        </span>
      </div>
      <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.03em] lg:text-[42px]">
        {kos.nama}
      </h1>
      {kos.alamat ? <p className="text-sm text-muted lg:text-[15px]">{kos.alamat}</p> : null}
      <JarakKampus kos={kos} className="text-sm text-muted lg:text-[15px]" />
      <CatatanDataKos kos={kos} harga={false} className="-mt-1 text-xs" />
      <TautanPeta
        nama={kos.nama}
        placeId={kos.gmaps_place_id}
        lat={kos.lat}
        lng={kos.lng}
        koordinat_status={kos.koordinat_status}
        className="-mt-1"
      />
    </div>
  );
}

/* --------------------------------- Fakta --------------------------------- */

export function FaktaTiles({ kos }: { kos: KosDetail }) {
  const fakta: { label: string; ikon: LucideIcon; nilai: string | null }[] = [
    { label: "Luas kamar", ikon: Maximize, nilai: kos.luas_kamar ?? null },
    { label: "Tipe", ikon: Users, nilai: labelTipe(kos.tipe) },
    {
      label: "Kamar mandi",
      ikon: Bath,
      nilai: kos.kamar_mandi ? (kos.kamar_mandi === "dalam" ? "Dalam" : "Luar") : null,
    },
    {
      label: "Listrik",
      ikon: Zap,
      nilai:
        kos.listrik_termasuk == null ? null : kos.listrik_termasuk ? "Termasuk sewa" : "Bayar sendiri",
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {fakta.map(({ label, ikon: Ikon, nilai }) => (
        <div
          key={label}
          className="flex flex-col gap-2 rounded-[18px] border border-white/95 bg-white/60 p-3.5"
        >
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-soft text-accent-ink">
            <Ikon size={18} aria-hidden />
          </span>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="-mt-1.5 text-[15px] font-bold">{nilai ?? BELUM_ADA}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------- Fasilitas ------------------------------- */

function GrupChip({ judul, isi }: { judul: string; isi: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-sm font-bold text-muted">{judul}</h3>
      <ul className="flex flex-wrap gap-2">
        {isi.map((f) => (
          <li
            key={f}
            className="flex h-10 items-center gap-2 rounded-[12px] border border-line bg-white/65 px-3.5 text-sm font-semibold"
          >
            <Check size={16} strokeWidth={2.4} className="text-accent-ink" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Fasilitas({ kos }: { kos: KosDetail }) {
  const kamar = ada(kos.fasilitas_kamar) ? kos.fasilitas_kamar : null;
  const bersama = ada(kos.fasilitas_bersama) ? kos.fasilitas_bersama : null;
  return (
    <section aria-labelledby="judul-fasilitas" className="flex flex-col gap-3.5">
      <h2 id="judul-fasilitas" className="text-[22px] font-extrabold">
        Fasilitas
      </h2>
      {kamar ? <GrupChip judul="Di dalam kamar" isi={kamar} /> : null}
      {bersama ? <GrupChip judul="Fasilitas bersama" isi={bersama} /> : null}
      {!kamar && !bersama ? <p className="text-sm text-muted">Belum ada data fasilitas.</p> : null}
    </section>
  );
}

/* --------------------------- Aturan & sekitar ---------------------------- */

const KARTU_KECIL =
  "flex flex-col gap-3 rounded-[22px] border border-white/95 bg-white/55 p-[18px]";

type BarisSekitar = { nama: string; jarak: string; keterangan?: string; garisLurus?: boolean };

export function AturanSekitar({ kos }: { kos: KosDetail }) {
  const poi = usePoi();
  const [semua, setSemua] = useState(false);
  // Tempat terdekat dari OpenStreetMap. Kampus tidak diulang: jarak Unpad/ITB sudah ada di atas.
  const terdekat = useMemo(
    () => (poi.status === "siap" ? pilihTempatTerdekat(kos, poi.data).filter((t) => t.kategori !== "kampus") : []),
    [poi, kos],
  );
  const namaSudahAda = new Set((kos.sekitar ?? []).map((s) => s.nama.trim().toLowerCase()));
  const barisPoi: BarisSekitar[] = [];
  const kategoriTerlihat = new Set<string>();
  let tersembunyi = 0;
  for (const t of terdekat) {
    if (namaSudahAda.has(t.nama.trim().toLowerCase())) continue;
    const pertama = !kategoriTerlihat.has(t.kategori);
    kategoriTerlihat.add(t.kategori);
    if (!pertama && !semua) {
      tersembunyi += 1;
      continue;
    }
    barisPoi.push({ nama: t.nama, keterangan: infoKategori(t.kategori).label, jarak: teksJarakGarisLurus(t.jarak_m), garisLurus: true });
  }
  const sekitar: BarisSekitar[] = [
    ...(adaJarakPerKampus(kos) || kos.jarak_km === null || kos.jarak_imputasi
      ? [
          { nama: "Jarak ke Unpad", jarak: formatJarakKampus(kos.jarak_unpad_km) },
          { nama: "Jarak ke ITB", jarak: formatJarakKampus(kos.jarak_itb_km) },
        ]
      : [{ nama: "Kampus terdekat (Unpad/ITB)", jarak: teksJarak(kos) }]),
    ...(kos.sekitar ?? []).map((s) => ({ nama: s.nama, jarak: formatJarakMeter(s.jarak_m) })),
    ...barisPoi,
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby="judul-aturan" className={KARTU_KECIL}>
        <h2 id="judul-aturan" className="text-lg font-extrabold">
          Aturan kos
        </h2>
        {ada(kos.aturan) ? (
          <ul className="flex flex-col gap-3">
            {kos.aturan.map((a) => (
              <li key={a} className="flex gap-2.5 text-sm leading-[1.45]">
                <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-accent" />
                {a}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Belum ada data aturan.</p>
        )}
      </section>
      <section aria-labelledby="judul-sekitar" className={KARTU_KECIL}>
        <h2 id="judul-sekitar" className="text-lg font-extrabold">
          Sekitar kos
        </h2>
        <dl className="flex flex-col gap-2">
          {sekitar.map((s, i) => (
            <div key={`${s.nama}-${i}`} className="flex justify-between gap-3 border-b border-line pb-2 text-sm">
              <dt>
                {s.nama}
                {s.keterangan ? <span className="block text-xs text-muted">{s.keterangan}</span> : null}
              </dt>
              <dd className="flex-none text-right font-bold tabular-nums">
                {s.jarak}
                {s.garisLurus ? <span className="block text-[11px] font-normal text-muted">garis lurus</span> : null}
              </dd>
            </div>
          ))}
        </dl>
        {barisPoi.length > 0 && (tersembunyi > 0 || semua) ? (
          <button
            type="button"
            aria-expanded={semua}
            onClick={() => setSemua((v) => !v)}
            className="tekan tautan min-h-9 self-start rounded-lg text-[13px] font-semibold text-accent-ink"
          >
            {semua ? "Tampilkan lebih sedikit" : `Lihat ${tersembunyi} tempat lainnya`}
          </button>
        ) : null}
        <CatatanDataKos kos={kos} lokasi={false} harga={false} />
        {barisPoi.length > 0 ? (
          <p className="text-[11px] leading-snug text-muted">
            ± = jarak garis lurus (bukan rute). Tempat sekitar: {ATRIBUSI_OSM}.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/* ------------------------- Kenapa direkomendasikan ------------------------ */

export function KenapaDirekomendasikan({
  kos,
  peringkat,
  pembanding,
  kriteria,
  hrefUbahPrioritas,
}: {
  kos: KosDetail;
  peringkat: KosDetailResponse["peringkat"];
  /** Jumlah kos yang jadi dasar normalisasi skor (KosDetailResponse.pembanding). */
  pembanding: number;
  /** Kriteria terpasang urut prioritas (sama dengan pencarian). */
  kriteria: KodeKriteria[];
  hrefUbahPrioritas: string;
}) {
  const penjelasan = jelaskanPeringkat(kos, kriteria);
  const sedikit = pembandingTerlaluSedikit(pembanding);
  return (
    <section
      aria-labelledby="judul-kenapa"
      className="flex flex-col gap-4 rounded-[24px] border border-white/95 bg-white/62 p-[18px] shadow-[0_10px_28px_rgba(30,45,90,.08)] backdrop-blur-[20px] backdrop-saturate-[1.6] lg:p-[22px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="judul-kenapa" className="text-xl font-extrabold lg:text-[22px]">
          {peringkat ? "Kenapa direkomendasikan untukmu" : "Skor dibanding pilihanmu"}
        </h2>
        <span className="text-[13px] text-muted">
          SAW <b className="text-accent-ink">{formatSkor(kos.skor_saw)}</b> · pembanding TOPSIS{" "}
          {peringkat ? `#${peringkat.rank_topsis} ` : null}({formatSkor(kos.skor_topsis)})
        </span>
      </div>
      {sedikit ? (
        <CatatanSkorRelatif jumlah={pembanding} />
      ) : (
        <>
          <div className="grid gap-x-7 gap-y-2.5 lg:grid-cols-2">
            {kriteria.map((kode, i) => (
              <ScoreBar
                key={kode}
                index={i}
                saatTerlihat
                lebarLabel={120}
                className="text-[13px]"
                label={infoKriteria(kode).nama}
                nilai={skorKriteria(kos, kode)}
              />
            ))}
          </div>
          <p className="rounded-[16px] bg-soft px-4 py-3.5 text-sm leading-[1.55]">{penjelasan.teks}</p>
        </>
      )}
      <p className="text-xs text-muted">
        Dinilai dari {kriteria.length} kriteria yang kamu pasang, urut prioritasmu.{" "}
        <Link href={hrefUbahPrioritas} className="tautan font-semibold text-accent-ink">
          Ubah kriteria
        </Link>
      </p>
    </section>
  );
}

/* ------------------------------ Catatan sumber ---------------------------- */

export function CatatanSumber({ kos }: { kos: KosDetail }) {
  const tanggal = kos.diperbarui_at ? formatTanggal(kos.diperbarui_at) : null;
  return (
    <p className="text-xs leading-normal text-muted">
      Data dari listing publik{tanggal ? `, terakhir diperbarui ${tanggal}` : ""}.{" "}
      <b className="text-ink">Data sementara:</b> sebagian informasi (alamat, kontak, foto) belum
      terisi. {CATATAN_DATA_SIMULASI} Peta dan tempat sekitar: {ATRIBUSI_OSM}. Informasi bisa berubah,
      pastikan lagi ke pengelola sebelum survei.
    </p>
  );
}
