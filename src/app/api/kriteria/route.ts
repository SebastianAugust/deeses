import { katalogKriteriaPublik } from "@/lib/katalog-publik";

/**
 * GET /api/kriteria → katalog piece yang datanya TERSEDIA, terkelompok per kategori:
 * { maks_kriteria, default: string[], kategori: [{ kode, nama, kriteria: [{ kode, nama,
 *   kategori, jenis, arah, satuan, deskripsi }] }] }
 * Sumber: src/config/kriteria.ts (tidak ada tabel kriteria). Tidak membaca data
 * runtime, jadi boleh diprerender.
 */
export async function GET() {
  return Response.json(katalogKriteriaPublik());
}
