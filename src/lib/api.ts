import type { SebaranHarga } from "./sebaran";
import type { RankRequest, RankResult, TipePenghuni } from "./types";

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
