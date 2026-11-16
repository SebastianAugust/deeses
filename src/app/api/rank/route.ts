import { keRankResult, urutkanKos } from "@/lib/peringkat";
import { kosRepository } from "@/lib/repo";
import { galatKeBody } from "@/lib/repo/galat";
import type { RankResult } from "@/lib/types";
import { validasiRankRequest } from "@/lib/validasi";

/**
 * POST /api/rank  { budget, tipe, urutan_kriteria }
 * → RankResult[] urut rank SAW (unik 1..n); hasil kosong → [].
 * Data: tabel public.kos (Supabase, cache 5 menit) → F1/F2 → SAW + TOPSIS (src/lib/dss).
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

  const data: RankResult[] = urutkanKos(semua, input.data).map(keRankResult);
  return Response.json(data);
}
