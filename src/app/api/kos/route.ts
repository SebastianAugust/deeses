import { connection } from "next/server";
import { keRingkas } from "@/lib/peringkat";
import { kosRepository } from "@/lib/repo";
import { galatKeBody } from "@/lib/repo/galat";

/**
 * GET /api/kos → daftar ringkas semua kos (untuk carousel):
 * [{ id, nama, harga, tipe, jarak_km, jarak_imputasi, foto_url, url }], urut id.
 */
export async function GET() {
  // Jangan diprerender saat build (build tidak boleh bergantung pada koneksi DB);
  // data tetap di-cache di memori lewat `use cache` di repository.
  await connection();
  try {
    const semua = await kosRepository().listKos();
    return Response.json(semua.map(keRingkas));
  } catch (e) {
    const { body, status } = galatKeBody(e);
    return Response.json(body, { status });
  }
}
