import { buildApiQuery, type FilterState } from "./query";
import type { SebaranHarga } from "./sebaran";
import type {
  KosDetailResponse,
  KosRingkasCarousel,
  RankRequest,
  RankResponse,
  TipePenghuni,
} from "./types";

/** Error dengan kode HTTP (mis. 404 untuk kos yang tidak ada). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Ambil pesan `error` dari body JSON galat server (aman ditampilkan), atau pakai `cadangan`. */
async function pesanGalat(res: Response, cadangan: string): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // body bukan JSON
  }
  return cadangan;
}

/** GET /api/kos/[id] — data lengkap 1 kos + peringkatnya untuk filter yang sama dengan hasil. */
export async function fetchKosDetail(
  id: string,
  filter: FilterState,
  signal?: AbortSignal,
): Promise<KosDetailResponse> {
  const res = await fetch(`/api/kos/${encodeURIComponent(id)}?${buildApiQuery(filter)}`, { signal });
  if (!res.ok) {
    throw new ApiError(
      res.status === 404
        ? "Kos tidak ditemukan."
        : await pesanGalat(res, `Gagal memuat detail kos (kode ${res.status}).`),
      res.status,
    );
  }
  return (await res.json()) as KosDetailResponse;
}

/** GET /api/kos — daftar ringkas semua kos (carousel). Pesan galat server dipakai apa adanya. */
export async function fetchKosRingkas(signal?: AbortSignal): Promise<KosRingkasCarousel[]> {
  const res = await fetch("/api/kos", { signal });
  if (!res.ok) throw new Error(await pesanGalat(res, `Gagal memuat daftar kos (kode ${res.status}).`));
  return (await res.json()) as KosRingkasCarousel[];
}

/** GET /api/sebaran-harga — jumlah kos per rentang harga Rp 100 rb. */
export async function fetchSebaranHarga(
  tipe?: TipePenghuni,
  signal?: AbortSignal,
): Promise<SebaranHarga> {
  const url = tipe ? `/api/sebaran-harga?tipe=${tipe}` : "/api/sebaran-harga";
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(await pesanGalat(res, `Gagal memuat sebaran harga (kode ${res.status}).`));
  return (await res.json()) as SebaranHarga;
}

/**
 * Satu-satunya pintu ke POST /api/rank. Dipanggil dari Client Component
 * (URL relatif). Melempar Error berisi pesan dari server kalau gagal.
 */
export async function fetchRank(
  request: RankRequest,
  signal?: AbortSignal,
): Promise<RankResponse> {
  const res = await fetch("/api/rank", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok) {
    throw new Error(await pesanGalat(res, `Gagal memuat rekomendasi (kode ${res.status}).`));
  }

  return (await res.json()) as RankResponse;
}
