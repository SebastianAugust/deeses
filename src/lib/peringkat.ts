/**
 * Peringkat kos untuk sebuah permintaan — fungsi MURNI di atas daftar kos.
 * Dipakai bersama oleh POST /api/rank dan GET /api/kos/[id], supaya rank, skor,
 * dan "kenapa direkomendasikan" di detail selalu sama dengan halaman hasil.
 *
 * Alur: kos (id, tipe, harga ada) → F1 budget + F2 tipe → kecualikan kos dengan
 * data kosong di kriteria terpasang → SAW/TOPSIS (src/lib/dss) → mapping kontrak.
 * Pembulatan 4 desimal hanya di sini (tampilan); ranking memakai skor mentah.
 */
import { infoKriteria, type KodeKriteria } from "@/config/kriteria";
import {
  bulatkanTampilan,
  filterKos,
  hitungPeringkat,
  type DefKriteria,
  type HasilKos,
  type HasilPeringkat,
} from "./dss";
import { isKosLengkap, keKosInfo, kriteriaTanpaData, type Kos, type KosLengkap } from "./repo/mapper";
import type {
  KosDetail,
  KosDetailResponse,
  KosRingkasCarousel,
  RankRequest,
  RankResponse,
  RankResult,
} from "./types";

export type KosTerurut = { kos: KosLengkap; hasil: HasilKos<KodeKriteria> };

export type HasilUrut = Omit<HasilPeringkat<KodeKriteria>, "hasil"> & { daftar: KosTerurut[] };

/** Kode terurut → definisi kriteria terurut untuk engine. */
export function defKriteria(kode: readonly KodeKriteria[]): DefKriteria<KodeKriteria>[] {
  return kode.map((k) => ({ kode: k, jenis: infoKriteria(k).jenis }));
}

function keAlternatif(k: KosLengkap) {
  return { id: k.id, harga: k.harga, nilai: k.nilai };
}

function hitung(kandidat: readonly KosLengkap[], kriteria: readonly KodeKriteria[]): HasilUrut {
  const perId = new Map(kandidat.map((k) => [k.id, k]));
  const { hasil, ...sisa } = hitungPeringkat(kandidat.map(keAlternatif), defKriteria(kriteria));
  return { ...sisa, daftar: hasil.map((h) => ({ kos: perId.get(h.id)!, hasil: h })) };
}

/**
 * Kos yang lolos filter dan datanya lengkap untuk kriteria terpasang, urut rank
 * SAW 1..n, beserta jumlah kos yang disembunyikan karena datanya kosong.
 */
export function urutkanKos(semua: readonly Kos[], req: RankRequest): HasilUrut {
  const kandidat = filterKos(semua.filter(isKosLengkap), { budget: req.budget, tipe: req.tipe });
  return hitung(kandidat, req.kriteria);
}

function bulatkanSkor(skor: Record<KodeKriteria, number>): RankResult["skor_kriteria"] {
  const out: RankResult["skor_kriteria"] = {};
  for (const k of Object.keys(skor) as KodeKriteria[]) out[k] = bulatkanTampilan(skor[k]);
  return out;
}

/** Bentuk satu item kontrak POST /api/rank. */
export function keRankResult({ kos, hasil }: KosTerurut): RankResult {
  return {
    id: kos.id,
    nama: kos.nama,
    rank: hasil.rank,
    harga: kos.harga,
    jarak_km: kos.jarak_km,
    jarak_imputasi: kos.jarak_imputasi,
    tipe: kos.tipe,
    foto_url: kos.foto_url,
    url: kos.url,
    skor_saw: bulatkanTampilan(hasil.skor_saw),
    skor_topsis: bulatkanTampilan(hasil.skor_topsis),
    rank_topsis: hasil.rank_topsis,
    skor_kriteria: bulatkanSkor(hasil.skor_kriteria),
    koordinat_status: kos.koordinat_status,
    basis_harga: kos.basis_harga,
    lat: kos.lat,
    lng: kos.lng,
  };
}

/** Bentuk lengkap respons POST /api/rank. */
export function keRankResponse(h: HasilUrut): RankResponse {
  return {
    hasil: h.daftar.map(keRankResult),
    kriteria_dipakai: h.kriteria_dipakai,
    jumlah_tanpa_data: h.jumlah_tanpa_data,
    tanpa_data_per_kriteria: h.tanpa_data_per_kriteria,
    spearman: h.spearman === null ? null : bulatkanTampilan(h.spearman),
  };
}

function keDetail(t: KosTerurut): KosDetail {
  return { ...keRankResult(t), ...keKosInfo(t.kos) };
}

export type HasilDetail =
  | { status: "ada"; data: KosDetailResponse }
  | { status: "tidak-ada" }
  | { status: "tidak-lengkap" }
  | { status: "tanpa-data"; kriteria: KodeKriteria[] };

/**
 * Detail 1 kos dalam konteks permintaan yang sama dengan /api/rank (kriteria
 * yang sama dengan pencarian).
 * - Lolos filter → rank/skor = persis hasil /api/rank, `peringkat` terisi.
 * - Tidak lolos filter (mis. dibuka dari tautan lain) → `peringkat` null; skor
 *   dihitung relatif terhadap kandidat hasil filter + kos ini (min-max butuh
 *   pembanding), jadi angkanya tetap bermakna "dibanding pilihanmu".
 * - Data kos kosong di kriteria terpasang → "tanpa-data" (tidak dinilai, tidak diimputasi).
 */
export function detailKos(semua: readonly Kos[], id: string, req: RankRequest): HasilDetail {
  const kos = semua.find((k) => k.id === id);
  if (!kos) return { status: "tidak-ada" };
  if (!isKosLengkap(kos)) return { status: "tidak-lengkap" };
  const kosong = kriteriaTanpaData(kos, req.kriteria);
  if (kosong.length > 0) return { status: "tanpa-data", kriteria: kosong };

  const { daftar } = urutkanKos(semua, req);
  const i = daftar.findIndex((t) => t.kos.id === id);
  if (i < 0) {
    const kandidat = daftar.map((t) => t.kos);
    const gabung = hitung([...kandidat, kos], req.kriteria).daftar;
    const diri = gabung.find((t) => t.kos.id === id)!;
    return {
      status: "ada",
      data: { kos: keDetail(diri), pembanding: gabung.length, peringkat: null },
    };
  }

  const ini = daftar[i];
  const berikut = daftar[i + 1];
  return {
    status: "ada",
    data: {
      kos: keDetail(ini),
      pembanding: daftar.length,
      peringkat: {
        rank: ini.hasil.rank,
        total: daftar.length,
        rank_topsis: ini.hasil.rank_topsis,
        berikutnya: berikut
          ? {
              id: berikut.kos.id,
              nama: berikut.kos.nama,
              rank: berikut.hasil.rank,
              skor_saw: bulatkanTampilan(berikut.hasil.skor_saw),
              foto_url: berikut.kos.foto_url,
            }
          : null,
      },
    },
  };
}

export function keRingkas(k: Kos): KosRingkasCarousel {
  return {
    id: k.id,
    nama: k.nama,
    harga: k.harga,
    tipe: k.tipe,
    jarak_km: k.jarak_km,
    jarak_imputasi: k.jarak_imputasi,
    foto_url: k.foto_url,
    url: k.url,
  };
}
