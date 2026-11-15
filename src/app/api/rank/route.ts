import { keRankResult, urutkanKos } from "@/lib/peringkat";
import {
  KODE_KRITERIA,
  isKriteria,
  isTipePenghuni,
  type RankRequest,
  type RankResult,
} from "@/lib/types";

function validasi(body: unknown): { ok: true; data: RankRequest } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body harus berupa objek JSON." };
  }
  const { budget, tipe, urutan_kriteria } = body as Record<string, unknown>;

  if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
    return { ok: false, error: "`budget` harus berupa angka positif." };
  }
  if (!isTipePenghuni(tipe)) {
    return { ok: false, error: "`tipe` harus salah satu dari: putra, putri, campur." };
  }
  if (
    !Array.isArray(urutan_kriteria) ||
    urutan_kriteria.length !== KODE_KRITERIA.length ||
    !urutan_kriteria.every(isKriteria) ||
    new Set(urutan_kriteria).size !== KODE_KRITERIA.length
  ) {
    return {
      ok: false,
      error: "`urutan_kriteria` harus berisi C1–C8, masing-masing tepat satu kali.",
    };
  }
  return { ok: true, data: { budget, tipe, urutan_kriteria } };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body bukan JSON yang valid." }, { status: 400 });
  }

  const hasil = validasi(body);
  if (!hasil.ok) {
    return Response.json({ error: hasil.error }, { status: 400 });
  }
  // TODO: ganti dengan query database (Supabase Postgres) + perhitungan SAW asli
  // dari tim Model/Backend — lihat src/lib/peringkat.ts (DATA CONTOH).
  const data: RankResult[] = urutkanKos(hasil.data).map(keRankResult);

  return Response.json(data);
}
