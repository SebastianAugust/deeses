/**
 * State filter + urutan prioritas disimpan di query params URL:
 *   ?budget=1200000&tipe=putri&urutan=C1,C2,C6,C5,C3,C4,C7,C8
 */
import { URUTAN_DEFAULT, isKriteria, type Kriteria } from "@/config/kriteria";
import { isTipePenghuni, type RankRequest, type TipePenghuni } from "./types";

export type FilterState = {
  budget: number;
  tipe: TipePenghuni;
  urutan: Kriteria[];
};

export const BUDGET_MIN = 500_000;
export const BUDGET_MAX = 3_000_000;
export const BUDGET_STEP = 100_000;

/** Urutan default diturunkan dari config (`prioritasDefault`). */
export const DEFAULT_URUTAN: readonly Kriteria[] = URUTAN_DEFAULT;

export const DEFAULT_FILTER: FilterState = {
  budget: 1_200_000,
  tipe: "putri",
  urutan: [...DEFAULT_URUTAN],
};

/** Bentuk `searchParams` di Server Component (sudah di-await) atau URLSearchParams di client. */
export type SearchParamsInput =
  | URLSearchParams
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function ambil(params: SearchParamsInput, key: string): string | undefined {
  if ("get" in params && typeof params.get === "function") {
    return params.get(key) ?? undefined;
  }
  const v = (params as Record<string, string | string[] | undefined>)[key];
  return Array.isArray(v) ? v[0] : v;
}

function parseBudget(raw: string | undefined): number {
  if (!raw || raw.trim() === "") return DEFAULT_FILTER.budget;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_FILTER.budget;
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, Math.round(n)));
}

/**
 * Urutan harus memuat semua kriteria di config tepat satu kali. Kode tak dikenal/duplikat
 * dibuang; kriteria yang hilang ditambahkan di belakang mengikuti urutan default.
 */
function parseUrutan(raw: string | undefined): Kriteria[] {
  const hasil: Kriteria[] = [];
  for (const bagian of (raw ?? "").split(",")) {
    const kode = bagian.trim().toUpperCase();
    if (isKriteria(kode) && !hasil.includes(kode)) hasil.push(kode);
  }
  for (const kode of DEFAULT_URUTAN) {
    if (!hasil.includes(kode)) hasil.push(kode);
  }
  return hasil;
}

/** Baca filter dari query params; param kosong/tidak valid → nilai default. */
export function parseFilter(params: SearchParamsInput): FilterState {
  const tipe = ambil(params, "tipe")?.toLowerCase();
  return {
    budget: parseBudget(ambil(params, "budget")),
    tipe: isTipePenghuni(tipe) ? tipe : DEFAULT_FILTER.tipe,
    urutan: parseUrutan(ambil(params, "urutan")),
  };
}

/** Param tambahan di luar filter, mis. { pilih: "kos-melati" } (undefined/null = tidak ditulis). */
export type ParamTambahan = Record<string, string | null | undefined>;

/** FilterState → "budget=1200000&tipe=putri&urutan=C1,C2,…" (tanpa "?"). */
export function buildQuery(state: FilterState, tambahan?: ParamTambahan): string {
  let q = `budget=${state.budget}&tipe=${state.tipe}&urutan=${state.urutan.join(",")}`;
  for (const [k, v] of Object.entries(tambahan ?? {})) {
    if (v) q += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  }
  return q;
}

/** Contoh: buildHref("/hasil", state, { pilih: id }) → "/hasil?budget=…&tipe=…&urutan=…&pilih=…" */
export function buildHref(pathname: string, state: FilterState, tambahan?: ParamTambahan): string {
  return `${pathname}?${buildQuery(state, tambahan)}`;
}

/**
 * Penanda alur desktop: /hasil hanya boleh dibuka lewat tombol "Lihat
 * rekomendasi" di langkah prioritas (atau dari dalam /hasil sendiri).
 * Tanpa `ok=1`, /hasil desktop dialihkan ke /?langkah=prioritas.
 */
export const PARAM_OK = { ok: "1" } as const;

export function adaPenandaOk(params: { get(name: string): string | null }): boolean {
  return params.get("ok") === "1";
}

/** Langkah Home desktop: / = "awal", /?langkah=prioritas = "prioritas". */
export type LangkahHome = "awal" | "prioritas";

export function parseLangkah(params: { get(name: string): string | null }): LangkahHome {
  return params.get("langkah") === "prioritas" ? "prioritas" : "awal";
}

/** URL Home untuk langkah tertentu (langkah awal tidak menulis param). */
export function hrefHome(state: FilterState, langkah: LangkahHome): string {
  return buildHref("/", state, { langkah: langkah === "prioritas" ? "prioritas" : undefined });
}

/** FilterState → body untuk POST /api/rank. */
export function toRankRequest(state: FilterState): RankRequest {
  return { budget: state.budget, tipe: state.tipe, urutan_kriteria: state.urutan };
}
