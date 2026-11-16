import type { NextRequest } from "next/server";
import { detailKos } from "@/lib/peringkat";
import { kosRepository } from "@/lib/repo";
import { galatKeBody } from "@/lib/repo/galat";
import { validasiIdKos, validasiQueryDetail } from "@/lib/validasi";

/**
 * GET /api/kos/[id]?budget=…&tipe=…&urutan=C1,…
 * → { kos: KosDetail, peringkat: { rank, total, rank_topsis, berikutnya } | null }
 *
 * Rank & skor dihitung dengan filter yang sama seperti POST /api/rank.
 * `peringkat` null kalau kos tidak lolos filter. Field detail yang tidak ada di
 * tabel (kontak, aturan, sekitar, deposit, foto_urls, sumber_url, diperbarui_at) = null.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/kos/[id]">) {
  const { id } = await ctx.params;
  const idValid = validasiIdKos(id);
  if (!idValid.ok) return Response.json({ error: idValid.error }, { status: 404 });

  const input = validasiQueryDetail(request.nextUrl.searchParams);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });

  let semua;
  try {
    semua = await kosRepository().listKos();
  } catch (e) {
    const { body, status } = galatKeBody(e);
    return Response.json(body, { status });
  }

  const hasil = detailKos(semua, idValid.data, input.data);
  if (hasil.status === "tidak-ada") {
    return Response.json({ error: "Kos tidak ditemukan." }, { status: 404 });
  }
  if (hasil.status === "tidak-lengkap") {
    return Response.json(
      { error: "Data kos ini belum lengkap (harga/tipe/nilai kriteria kosong), jadi belum bisa dinilai." },
      { status: 422 },
    );
  }
  return Response.json(hasil.data);
}
