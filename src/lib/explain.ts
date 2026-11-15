import { formatSkor } from "./format";
import { KRITERIA, type Kriteria, type KriteriaInfo, type RankResult } from "./types";
import { formatPersen, rankSumWeights } from "./weights";

const INFO = Object.fromEntries(KRITERIA.map((k) => [k.kode, k])) as Record<Kriteria, KriteriaInfo>;

export function infoKriteria(kode: Kriteria): KriteriaInfo {
  return INFO[kode];
}

export type Penjelasan = {
  /** 2 kriteria dengan kontribusi (skor × bobot) tertinggi. */
  kelebihan: [KriteriaInfo, KriteriaInfo];
  /** Kriteria dengan skor terendah. */
  kekurangan: KriteriaInfo;
  /** Kalimat siap tampil untuk kotak "Kenapa peringkat n?". */
  teks: string;
};

/**
 * Penjelasan otomatis peringkat sebuah kos:
 * 2 kelebihan = (skor × bobot) tertinggi, 1 kekurangan = skor terendah + bobotnya.
 */
export function jelaskanPeringkat(kos: RankResult, urutan: Kriteria[]): Penjelasan {
  const bobot = rankSumWeights(urutan);
  const skor = kos.skor_kriteria;

  const kontribusi = [...urutan].sort((a, b) => skor[b] * bobot[b] - skor[a] * bobot[a]);
  const [a, b] = kontribusi;
  // Seri pada skor terendah → ambil yang prioritasnya paling tinggi (paling terasa).
  const lemah = urutan.reduce((min, k) => (skor[k] < skor[min] ? k : min), urutan[0]);

  const tigaTeratas = urutan.slice(0, 3);
  const jumlahDiTeratas = [a, b].filter((k) => tigaTeratas.includes(k)).length;
  const konteks =
    jumlahDiTeratas === 2
      ? ", dua dari tiga prioritas teratasmu"
      : jumlahDiTeratas === 1
        ? ", salah satunya termasuk tiga prioritas teratasmu"
        : "";

  const namaA = INFO[a].nama.toLowerCase();
  const namaB = INFO[b].nama.toLowerCase();
  const namaLemah = INFO[lemah].nama.toLowerCase();
  const penghubung = bobot[lemah] < 1 / urutan.length ? "tapi bobotnya cuma" : "dan bobotnya";

  const teks =
    `Unggul di ${namaA} dan ${namaB}${konteks}. ` +
    `Skor terendahnya di ${namaLemah} (${formatSkor(skor[lemah])}), ` +
    `${penghubung} ${formatPersen(bobot[lemah])}.`;

  return { kelebihan: [INFO[a], INFO[b]], kekurangan: INFO[lemah], teks };
}
