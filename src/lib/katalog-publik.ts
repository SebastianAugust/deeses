/**
 * Bentuk publik katalog kriteria untuk GET /api/kriteria (fungsi murni, dites).
 * Hanya piece `tersedia`; detail sumber kolom tidak diekspos.
 */
import {
  KRITERIA_DEFAULT,
  MAKS_KRITERIA,
  arahKriteria,
  katalogTerkelompok,
  type JenisKriteria,
  type KategoriKriteria,
  type KodeKriteria,
} from "@/config/kriteria";

export type KriteriaPublik = {
  kode: KodeKriteria;
  nama: string;
  kategori: KategoriKriteria;
  jenis: JenisKriteria;
  arah: string;
  satuan: string;
  deskripsi: string;
};

export type KatalogPublik = {
  maks_kriteria: number;
  default: KodeKriteria[];
  kategori: { kode: KategoriKriteria; nama: string; kriteria: KriteriaPublik[] }[];
};

export function katalogKriteriaPublik(): KatalogPublik {
  return {
    maks_kriteria: MAKS_KRITERIA,
    default: [...KRITERIA_DEFAULT],
    kategori: katalogTerkelompok().map((g) => ({
      kode: g.kode,
      nama: g.nama,
      kriteria: g.kriteria.map((k) => ({
        kode: k.kode,
        nama: k.nama,
        kategori: k.kategori,
        jenis: k.jenis,
        arah: arahKriteria(k.jenis),
        satuan: k.satuan,
        deskripsi: k.deskripsi,
      })),
    })),
  };
}
