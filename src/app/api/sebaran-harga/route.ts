import type { NextRequest } from "next/server";
import { kosRepository } from "@/lib/repo";
import { galatKeBody } from "@/lib/repo/galat";
import { validasiQuerySebaran } from "@/lib/validasi";

/**
 * GET /api/sebaran-harga?tipe=putri
 * → { min: 500000, max: 3000000, step: 100000, bins: number[], total: number }
 * bins[i] = jumlah kos dengan harga di (min + i·step, min + (i+1)·step] (harga ≤ min → bin 0,
 * > max tidak masuk bin). Kos campur ikut untuk putra/putri sesuai IKUTKAN_CAMPUR_DEFAULT.
 * Tanpa `tipe` = semua tipe.
 */
export async function GET(request: NextRequest) {
  const input = validasiQuerySebaran(request.nextUrl.searchParams);
  if (!input.ok) return Response.json({ error: input.error }, { status: 400 });

  try {
    return Response.json(await kosRepository().sebaranHarga(input.data));
  } catch (e) {
    const { body, status } = galatKeBody(e);
    return Response.json(body, { status });
  }
}
