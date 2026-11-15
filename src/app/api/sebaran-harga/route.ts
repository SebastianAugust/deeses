import type { NextRequest } from "next/server";
import { MOCK_KOS } from "@/lib/mock";
import { hitungSebaran } from "@/lib/sebaran";
import { isTipePenghuni } from "@/lib/types";

/**
 * GET /api/sebaran-harga?tipe=putri
 * → { min: 500000, max: 3000000, step: 100000, bins: number[] }
 * bins[i] = jumlah kos dengan harga di (min + i·step, min + (i+1)·step].
 * Tanpa `tipe` = semua tipe.
 */
export async function GET(request: NextRequest) {
  const tipe = request.nextUrl.searchParams.get("tipe");
  if (tipe !== null && tipe !== "" && !isTipePenghuni(tipe)) {
    return Response.json(
      { error: "`tipe` harus salah satu dari: putra, putri, campur." },
      { status: 400 },
    );
  }

  // TODO: ganti dengan query GROUP BY di Supabase, mis.
  //   select least(greatest(ceil((harga - 500000) / 100000.0) - 1, 0), 24) as bin, count(*)
  //   from kos where (tipe = $1 or $1 is null) and harga <= 3000000 group by bin;
  // Saat ini dihitung dari DATA CONTOH (src/lib/mock.ts).
  const harga = MOCK_KOS.filter((k) => !tipe || k.tipe === tipe).map((k) => k.harga);
  return Response.json(hitungSebaran(harga));
}
