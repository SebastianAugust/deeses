import type { NextRequest } from "next/server";
import { rankTopsis } from "@/lib/explain";
import { getMockKos } from "@/lib/mock";
import { urutkanKos } from "@/lib/peringkat";
import { parseFilter, toRankRequest } from "@/lib/query";
import type { KosDetailResponse } from "@/lib/types";

/**
 * GET /api/kos/[id]?budget=…&tipe=…&urutan=C1,…
 * → { kos: KosDetail, peringkat: { rank, total, rank_topsis, berikutnya } | null }
 *
 * Skor & rank dihitung dengan filter yang sama seperti POST /api/rank, supaya
 * bagian "Kenapa direkomendasikan" di halaman detail konsisten dengan hasil.
 * `peringkat` null kalau kos ini tidak lolos filter (mis. dibuka dari carousel).
 *
 * TODO: ambil dari Supabase (tabel kos + detail) dan pakai perhitungan SAW
 * asli. Saat ini DATA CONTOH dari src/lib/mock.ts.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/kos/[id]">) {
  const { id } = await ctx.params;
  const kos = getMockKos(id);
  if (!kos) {
    return Response.json({ error: "Kos tidak ditemukan." }, { status: 404 });
  }

  const filter = parseFilter(request.nextUrl.searchParams);
  const daftar = urutkanKos(toRankRequest(filter));
  const i = daftar.findIndex((k) => k.id === id);

  let body: KosDetailResponse;
  if (i < 0) {
    body = { kos, peringkat: null };
  } else {
    const diHasil = daftar[i];
    const berikut = daftar[i + 1];
    body = {
      kos: diHasil,
      peringkat: {
        rank: diHasil.rank,
        total: daftar.length,
        rank_topsis: rankTopsis(diHasil, daftar),
        berikutnya: berikut
          ? {
              id: berikut.id,
              nama: berikut.nama,
              rank: berikut.rank,
              skor_saw: berikut.skor_saw,
              foto_url: berikut.foto_url,
            }
          : null,
      },
    };
  }
  return Response.json(body);
}
