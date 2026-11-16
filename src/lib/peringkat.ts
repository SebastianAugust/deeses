/**
 * Peringkat kos untuk sebuah permintaan — fungsi MURNI di atas daftar kos.
 * Dipakai bersama oleh POST /api/rank dan GET /api/kos/[id], supaya rank, skor,
 * dan "kenapa direkomendasikan" di detail selalu sama dengan halaman hasil.
 *
 * Alur: kos lengkap → F1 budget + F2 tipe (src/lib/dss) → SAW/TOPSIS → mapping kontrak.
 * Pembulatan 4 desimal hanya di sini (tampilan); ranking memakai skor mentah.
 */
import { KRITERIA, type Kriteria } from "@/config/kriteria";
import { bulatkanTampilan, filterKos, hitungPeringkat, type HasilKos } from "./dss";
import { isKosLengkap, keKosInfo, type Kos, type KosLengkap } from "./repo/mapper";
import type { KosDetail, KosDetailResponse, KosRingkasCarousel, RankRequest, RankResult } from "./types";

export type KosTerurut = { kos: KosLengkap; hasil: HasilKos<Kriteria> };

function keAlternatif(k: KosLengkap) {
  return { id: k.id, harga: k.harga, nilai: k.nilai };
}

function hitung(kandidat: readonly KosLengkap[], urutan: readonly Kriteria[]): KosTerurut[] {
  const perId = new Map(kandidat.map((k) => [k.id, k]));
  const { hasil } = hitungPeringkat(kandidat.map(keAlternatif), KRITERIA, urutan);
  return hasil.map((h) => ({ kos: perId.get(h.id)!, hasil: h }));
}

/** Kos yang lolos filter, urut rank SAW 1..n. Hanya kos dengan data lengkap yang dihitung. */
export function urutkanKos(semua: readonly Kos[], req: RankRequest): KosTerurut[] {
  const kandidat = filterKos(semua.filter(isKosLengkap), { budget: req.budget, tipe: req.tipe });
  return hitung(kandidat, req.urutan_kriteria);
}

function bulatkanSkor(skor: Record<Kriteria, number>): Record<Kriteria, number> {
  const out = {} as Record<Kriteria, number>;
  for (const k of Object.keys(skor) as Kriteria[]) out[k] = bulatkanTampilan(skor[k]);
  return out;
}

/** Bentuk kontrak POST /api/rank. */
export function keRankResult({ kos, hasil }: KosTerurut): RankResult {
  return {
    id: kos.id,
    nama: kos.nama,
    rank: hasil.rank,
    harga: kos.harga,
    jarak_km: kos.nilai.C2,
    jarak_imputasi: kos.jarak_imputasi,
    tipe: kos.tipe,
    foto_url: kos.foto_url,
    url: kos.url,
    skor_saw: bulatkanTampilan(hasil.skor_saw),
    skor_topsis: bulatkanTampilan(hasil.skor_topsis),
    rank_topsis: hasil.rank_topsis,
    skor_kriteria: bulatkanSkor(hasil.skor_kriteria),
  };
}

function keDetail(t: KosTerurut): KosDetail {
  return { ...keRankResult(t), ...keKosInfo(t.kos) };
}

export type HasilDetail =
  | { status: "ada"; data: KosDetailResponse }
  | { status: "tidak-ada" }
  | { status: "tidak-lengkap" };

/**
 * Detail 1 kos dalam konteks permintaan yang sama dengan /api/rank.
 * - Lolos filter → rank/skor = persis hasil /api/rank, `peringkat` terisi.
 * - Tidak lolos filter (mis. dibuka dari tautan lain) → `peringkat` null; skor
 *   dihitung relatif terhadap kandidat hasil filter + kos ini (min-max butuh
 *   pembanding), jadi angkanya tetap bermakna "dibanding pilihanmu".
 */
export function detailKos(semua: readonly Kos[], id: string, req: RankRequest): HasilDetail {
  const kos = semua.find((k) => k.id === id);
  if (!kos) return { status: "tidak-ada" };
  if (!isKosLengkap(kos)) return { status: "tidak-lengkap" };

  const daftar = urutkanKos(semua, req);
  const i = daftar.findIndex((t) => t.kos.id === id);
  if (i < 0) {
    const kandidat = daftar.map((t) => t.kos);
    const gabung = hitung([...kandidat, kos], req.urutan_kriteria);
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
