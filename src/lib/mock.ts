/**
 * ⚠️ DATA CONTOH — BUKAN DATA ASLI.
 *
 * Semua nama kos, harga, jarak, dan skor di file ini fiktif (diambil dari
 * mockup di design/mockups) dan hanya dipakai agar UI bisa dikembangkan
 * sebelum database + perhitungan SAW/TOPSIS dari tim Model/Backend siap.
 * Jangan dipakai untuk analisis atau ditampilkan sebagai hasil sungguhan.
 */
import type { Kriteria, RankResult, TipePenghuni } from "./types";

/** 6 kos dari mockup — skor tertinggi, urutannya dipertahankan. */
const KOS_MOCKUP: RankResult[] = [
  {
    id: "kos-melati",
    nama: "Kos Melati",
    rank: 1,
    harga: 1_050_000,
    jarak_km: 0.3,
    tipe: "putri",
    foto_url: null,
    url: "https://mamikos.com",
    skor_saw: 0.82,
    skor_topsis: 0.79,
    skor_kriteria: { C1: 0.9, C2: 0.8, C3: 0.7, C4: 0.5, C5: 0.85, C6: 0.9, C7: 0.6, C8: 0.55 },
  },
  {
    id: "kos-mawar",
    nama: "Kos Mawar",
    rank: 2,
    harga: 900_000,
    jarak_km: 0.6,
    tipe: "putri",
    foto_url: null,
    url: "https://mamikos.com",
    skor_saw: 0.74,
    skor_topsis: 0.72,
    skor_kriteria: { C1: 0.95, C2: 0.7, C3: 0.65, C4: 0.55, C5: 0.6, C6: 0.7, C7: 0.65, C8: 0.6 },
  },
  {
    id: "kos-anggrek",
    nama: "Kos Anggrek",
    rank: 3,
    harga: 1_150_000,
    jarak_km: 1.1,
    tipe: "putri",
    foto_url: null,
    url: "https://mamikos.com",
    skor_saw: 0.69,
    skor_topsis: 0.7,
    skor_kriteria: { C1: 0.7, C2: 0.55, C3: 0.6, C4: 0.85, C5: 0.9, C6: 0.75, C7: 0.7, C8: 0.65 },
  },
  {
    id: "kos-kenanga",
    nama: "Kos Kenanga",
    rank: 4,
    harga: 950_000,
    jarak_km: 0.9,
    tipe: "putri",
    foto_url: null,
    url: "https://mamikos.com",
    skor_saw: 0.65,
    skor_topsis: 0.63,
    skor_kriteria: { C1: 0.85, C2: 0.6, C3: 0.55, C4: 0.6, C5: 0.55, C6: 0.6, C7: 0.5, C8: 0.7 },
  },
  {
    id: "kos-dahlia",
    nama: "Kos Dahlia",
    rank: 5,
    harga: 1_000_000,
    jarak_km: 1.4,
    tipe: "putri",
    foto_url: null,
    url: "https://mamikos.com",
    skor_saw: 0.61,
    skor_topsis: 0.62,
    skor_kriteria: { C1: 0.8, C2: 0.45, C3: 0.5, C4: 0.7, C5: 0.65, C6: 0.55, C7: 0.6, C8: 0.75 },
  },
  {
    id: "kos-teratai",
    nama: "Kos Teratai",
    rank: 6,
    harga: 800_000,
    jarak_km: 1.8,
    tipe: "putri",
    foto_url: null,
    url: "https://mamikos.com",
    skor_saw: 0.58,
    skor_topsis: 0.55,
    skor_kriteria: { C1: 1, C2: 0.35, C3: 0.4, C4: 0.45, C5: 0.4, C6: 0.5, C7: 0.45, C8: 0.6 },
  },
];

/*
 * DATA CONTOH tambahan (34 kos, "Kos Contoh 7" … "Kos Contoh 40") supaya
 * grafik sebaran harga terisi: harga Rp 550 rb – 3 jt, mayoritas 800 rb – 1,3 jt,
 * tipe bergantian putra / campur / putri. Skor dibangkitkan secara
 * deterministik (seed tetap) dan dibatasi < 0,58 agar 6 kos mockup tetap di
 * peringkat teratas.
 */
const HARGA_CONTOH = [
  550_000, 600_000, 650_000, 700_000, 750_000, 800_000, 850_000, 850_000, 900_000, 900_000,
  950_000, 950_000, 1_000_000, 1_000_000, 1_050_000, 1_100_000, 1_100_000, 1_150_000,
  1_200_000, 1_200_000, 1_250_000, 1_250_000, 1_300_000, 1_300_000, 1_400_000, 1_500_000,
  1_600_000, 1_750_000, 1_900_000, 2_100_000, 2_300_000, 2_500_000, 2_750_000, 3_000_000,
];
const TIPE_CONTOH: TipePenghuni[] = ["putra", "campur", "putri"];

/** PRNG kecil (mulberry32) — hasil sama di server & client, tidak acak tiap build. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bulat2 = (n: number) => Math.round(n * 100) / 100;

function buatKosContoh(): RankResult[] {
  const acak = prng(20261115);
  const antara = (lo: number, hi: number) => lo + (hi - lo) * acak();
  // Bobot rank-sum untuk urutan default C1,C2,C6,C5,C3,C4,C7,C8.
  const bobot: Record<Kriteria, number> = {
    C1: 16 / 72, C2: 14 / 72, C6: 12 / 72, C5: 10 / 72, C3: 8 / 72, C4: 6 / 72, C7: 4 / 72, C8: 2 / 72,
  };

  return HARGA_CONTOH.map((harga, i) => {
    const no = i + 7;
    const jarak = bulat2(antara(0.2, 3));
    const mahal = (harga - 500_000) / 2_500_000; // 0 = termurah, 1 = termahal
    const skor_kriteria: Record<Kriteria, number> = {
      C1: bulat2(1 - mahal * 0.9),
      C2: bulat2(Math.max(0.1, 1 - jarak / 3.2)),
      C3: bulat2(antara(0.3, 0.9)),
      C4: bulat2(Math.min(1, 0.35 + mahal * 0.5 + antara(0, 0.15))),
      C5: bulat2(Math.min(1, 0.3 + mahal * 0.55 + antara(0, 0.15))),
      C6: bulat2(antara(0.4, 0.95)),
      C7: bulat2(antara(0.35, 0.9)),
      C8: bulat2(antara(0.4, 0.9)),
    };
    const mentah = (Object.keys(bobot) as Kriteria[]).reduce(
      (s, k) => s + bobot[k] * skor_kriteria[k],
      0,
    );
    const skor_saw = bulat2(0.3 + 0.27 * mentah);
    return {
      id: `kos-contoh-${no}`,
      nama: `Kos Contoh ${no}`,
      rank: 0,
      harga,
      jarak_km: Math.round(jarak * 10) / 10,
      tipe: TIPE_CONTOH[i % TIPE_CONTOH.length],
      foto_url: null,
      url: "https://mamikos.com",
      skor_saw,
      skor_topsis: bulat2(Math.min(0.57, Math.max(0.2, skor_saw + antara(-0.04, 0.04)))),
      skor_kriteria,
    };
  });
}

/** Semua DATA CONTOH (40 kos), urut skor SAW, rank global 1…40. */
export const MOCK_KOS: RankResult[] = [...KOS_MOCKUP, ...buatKosContoh()]
  .sort((a, b) => b.skor_saw - a.skor_saw)
  .map((k, i) => ({ ...k, rank: i + 1 }));

/** DATA CONTOH — cari satu kos berdasarkan id. */
export function getMockKos(id: string): RankResult | undefined {
  return MOCK_KOS.find((k) => k.id === id);
}
