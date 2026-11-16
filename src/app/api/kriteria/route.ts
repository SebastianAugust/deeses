import { KRITERIA } from "@/config/kriteria";

/**
 * GET /api/kriteria → daftar kriteria dari src/config/kriteria.ts
 * (tidak ada tabel kriteria). Tidak membaca data runtime, jadi boleh diprerender.
 */
export async function GET() {
  return Response.json(KRITERIA);
}
