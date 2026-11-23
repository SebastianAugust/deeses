import type { NextRequest } from "next/server";
import { infoKriteria } from "@/config/kriteria";
import { detailKos } from "@/lib/peringkat";
import { kosRepository } from "@/lib/repo";
import { galatKeBody } from "@/lib/repo/galat";
import { validasiIdKos, validasiQueryDetail } from "@/lib/validasi";

/**
 * GET /api/kos/[id]?budget=…&tipe=…&kriteria=harga,luas,…
 * → { kos: KosDetail, peringkat: { rank, total, rank_topsis, berikutnya } | null }
 *
 * Rank & skor dihitung dengan filter DAN kriteria yang sama seperti POST /api/rank.
 * `peringkat` null kalau kos tidak lolos filter. Field detail yang tidak ada di
 * tabel (kontak, aturan, sekitar, deposit, sumber_url, diperbarui_at) = null. foto_urls = foto_url_1..5 yang valid (null bila tidak ada).
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
      { error: "Data kos ini belum lengkap (harga/tipe kosong), jadi belum bisa dinilai." },
      { status: 422 },
    );
  }
  if (hasil.status === "tanpa-data") {
    const nama = hasil.kriteria.map((k) => infoKriteria(k).nama.toLowerCase()).join(", ");
    return Response.json(
      { error: `Data kos ini belum ada untuk kriteria: ${nama}. Kos ini tidak dinilai dengan kriteria tersebut.` },
      { status: 422 },
    );
  }
  return Response.json(hasil.data);
}
