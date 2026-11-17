import { formatSkor } from "./format";
import { infoKriteria, type KodeKriteria, type KriteriaInfo } from "@/config/kriteria";
import type { RankResult } from "./types";
import { formatPersen, rankSumWeights } from "./weights";

/**
 * Peringkat TOPSIS sebuah kos di antara hasil yang sama. Pakai `rank_topsis` dari
 * server (unik, aturan seri sama dengan SAW); fallback hitung lokal kalau tidak ada.
 */
export function rankTopsis(kos: RankResult, semua: RankResult[]): number {
  if (kos.rank_topsis !== undefined) return kos.rank_topsis;
  return 1 + semua.filter((k) => k.skor_topsis > kos.skor_topsis).length;
}

/** Skor kriteria terpasang (0 kalau tidak ada di respons — tidak terjadi bila kriteria sama). */
export function skorKriteria(kos: RankResult, kode: KodeKriteria): number {
  return kos.skor_kriteria[kode] ?? 0;
}

export type Penjelasan = {
  /** 1–2 kriteria dengan kontribusi (skor × bobot) tertinggi. */
  kelebihan: KriteriaInfo[];
  /** Kriteria dengan skor terendah (null kalau hanya 1 kriteria terpasang). */
  kekurangan: KriteriaInfo | null;
  /** Kalimat siap tampil untuk kotak "Kenapa peringkat n?". */
  teks: string;
};

/** Nama pendek untuk di tengah kalimat ("harga", "luas kamar", "AC"). */
const nama = (k: KodeKriteria) => infoKriteria(k).singkat;

/**
 * Penjelasan otomatis peringkat sebuah kos, dibangun dari kriteria TERPASANG
 * (urut prioritas):
 * - n = 1: skor hanya dari satu kriteria itu.
 * - n = 2: kriteria dengan kontribusi terbesar + kriteria lainnya beserta bobotnya.
 * - n ≥ 3: 2 kelebihan = (skor × bobot) tertinggi, 1 kekurangan = skor terendah + bobotnya.
 */
export function jelaskanPeringkat(kos: RankResult, kriteria: readonly KodeKriteria[]): Penjelasan {
  const n = kriteria.length;
  if (n === 0) return { kelebihan: [], kekurangan: null, teks: "Belum ada kriteria terpasang." };

  const bobot = rankSumWeights(kriteria);
  const w = (k: KodeKriteria) => bobot[k] ?? 0;
  const s = (k: KodeKriteria) => skorKriteria(kos, k);

  if (n === 1) {
    const [k] = kriteria;
    return {
      kelebihan: [infoKriteria(k)],
      kekurangan: null,
      teks: `Peringkat hanya dinilai dari ${nama(k)}: skornya ${formatSkor(s(k))} dibanding kos lain yang cocok.`,
    };
  }

  const kontribusi = [...kriteria].sort((a, b) => s(b) * w(b) - s(a) * w(a));
  // Seri pada skor terendah → ambil yang prioritasnya paling tinggi (paling terasa).
  const lemah = kriteria.reduce((min, k) => (s(k) < s(min) ? k : min), kriteria[0]);

  if (n === 2) {
    const kuat = kontribusi[0];
    const lain = kriteria.find((k) => k !== kuat)!;
    return {
      kelebihan: [infoKriteria(kuat)],
      kekurangan: infoKriteria(lain),
      teks:
        `Paling terbantu oleh ${nama(kuat)} (skor ${formatSkor(s(kuat))}, bobot ${formatPersen(w(kuat))}). ` +
        `Skor ${nama(lain)} ${formatSkor(s(lain))}, bobotnya ${formatPersen(w(lain))}.`,
    };
  }

  const [a, b] = kontribusi;
  const teratas = kriteria.slice(0, 3);
  const jumlahDiTeratas = n > 3 ? [a, b].filter((k) => teratas.includes(k)).length : 0;
  const konteks =
    jumlahDiTeratas === 2
      ? ", dua dari tiga prioritas teratasmu"
      : jumlahDiTeratas === 1
        ? ", salah satunya termasuk tiga prioritas teratasmu"
        : "";
  const penghubung = w(lemah) < 1 / n ? "tapi bobotnya cuma" : "dan bobotnya";

  const teks =
    `Unggul di ${nama(a)} dan ${nama(b)}${konteks}. ` +
    `Skor terendahnya di ${nama(lemah)} (${formatSkor(s(lemah))}), ` +
    `${penghubung} ${formatPersen(w(lemah))}.`;

  return { kelebihan: [infoKriteria(a), infoKriteria(b)], kekurangan: infoKriteria(lemah), teks };
}
