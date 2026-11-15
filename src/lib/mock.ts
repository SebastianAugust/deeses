/**
 * ⚠️ DATA CONTOH — BUKAN DATA ASLI.
 *
 * Semua nama kos, harga, jarak, dan skor di file ini fiktif (diambil dari
 * mockup di design/mockups) dan hanya dipakai agar UI bisa dikembangkan
 * sebelum database + perhitungan SAW/TOPSIS dari tim Model/Backend siap.
 * Jangan dipakai untuk analisis atau ditampilkan sebagai hasil sungguhan.
 */
import type { RankResult } from "./types";

export const MOCK_KOS: RankResult[] = [
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

/** DATA CONTOH — cari satu kos berdasarkan id. */
export function getMockKos(id: string): RankResult | undefined {
  return MOCK_KOS.find((k) => k.id === id);
}
