import { keRankResponse, urutkanKos } from "@/lib/peringkat";
import { kosRepository } from "@/lib/repo";
import { galatKeBody } from "@/lib/repo/galat";
import { validasiRankRequest } from "@/lib/validasi";

/**
 * POST /api/rank  { budget, tipe, kriteria: string[] }   (kriteria = kode piece, urut prioritas, 1..12)
 * → { hasil: RankResult[] (urut rank SAW, unik 1..n), kriteria_dipakai: [{kode, bobot}],
 *     jumlah_tanpa_data, tanpa_data_per_kriteria: {kode: jumlah}, spearman }
 * Data: tabel public.kos (Supabase, cache 5 menit) → F1/F2 → kecualikan data kosong
 * di kriteria terpasang → SAW + TOPSIS (src/lib/dss).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body bukan JSON yang valid." }, { status: 400 });
  }

  const input = validasiRankRequest(body);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });

  let semua;
  try {
    semua = await kosRepository().listKos();
  } catch (e) {
    const { body: galat, status } = galatKeBody(e);
    return Response.json(galat, { status });
  }

  return Response.json(keRankResponse(urutkanKos(semua, input.data)));
}
