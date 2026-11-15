import { buildQuery, type FilterState } from "./query";
import type { SebaranHarga } from "./sebaran";
import type { KosDetailResponse, RankRequest, RankResult, TipePenghuni } from "./types";

/** Error dengan kode HTTP (mis. 404 untuk kos yang tidak ada). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** GET /api/kos/[id] — data lengkap 1 kos + peringkatnya untuk filter yang sama dengan hasil. */
export async function fetchKosDetail(
  id: string,
  filter: FilterState,
  signal?: AbortSignal,
): Promise<KosDetailResponse> {
  const res = await fetch(`/api/kos/${encodeURIComponent(id)}?${buildQuery(filter)}`, { signal });
  if (!res.ok) {
    throw new ApiError(
      res.status === 404 ? "Kos tidak ditemukan." : `Gagal memuat detail kos (kode ${res.status}).`,
      res.status,
    );
  }
  return (await res.json()) as KosDetailResponse;
}

/** GET /api/sebaran-harga — jumlah kos per rentang harga Rp 100 rb. */
export async function fetchSebaranHarga(
  tipe?: TipePenghuni,
  signal?: AbortSignal,
): Promise<SebaranHarga> {
  const url = tipe ? `/api/sebaran-harga?tipe=${tipe}` : "/api/sebaran-harga";
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Gagal memuat sebaran harga (kode ${res.status}).`);
  return (await res.json()) as SebaranHarga;
}

/**
 * Satu-satunya pintu ke POST /api/rank. Dipanggil dari Client Component
 * (URL relatif). Melempar Error berisi pesan dari server kalau gagal.
 */
export async function fetchRank(
  request: RankRequest,
  signal?: AbortSignal,
): Promise<RankResult[]> {
  const res = await fetch("/api/rank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok) {
    let pesan = `Gagal memuat rekomendasi (kode ${res.status}).`;
    try {
      const body: unknown = await res.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        pesan = body.error;
      }
    } catch {
      // body bukan JSON — pakai pesan bawaan
    }
    throw new Error(pesan);
  }

  return (await res.json()) as RankResult[];
}
