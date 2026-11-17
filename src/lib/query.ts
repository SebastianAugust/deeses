/**
 * State filter + kriteria terpasang (urut prioritas) disimpan di query params URL:
 *   ?budget=1200000&tipe=putri&kriteria=harga,jarak_kampus,luas,cctv
 * URL adalah satu-satunya sumber state yang dibagi antarhalaman (home, prioritas,
 * hasil, detail).
 */
import { KRITERIA_DEFAULT, MAKS_KRITERIA, isKodeTersedia, type KodeKriteria } from "@/config/kriteria";
import { isTipePenghuni, type RankRequest, type TipePenghuni } from "./types";

export type FilterState = {
  budget: number;
  tipe: TipePenghuni;
  /** Kode piece terpasang, index 0 = prioritas tertinggi. Bisa kosong saat sedang merakit. */
  kriteria: KodeKriteria[];
};

export const BUDGET_MIN = 500_000;
export const BUDGET_MAX = 3_000_000;
export const BUDGET_STEP = 100_000;

export const DEFAULT_FILTER: FilterState = {
  budget: 1_200_000,
  tipe: "putri",
  kriteria: [...KRITERIA_DEFAULT],
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
 * Param `kriteria` tidak ada → rakitan default. Ada → kode dibaca berurutan;
 * kode tak dikenal, belum tersedia, atau duplikat dibuang; maksimal MAKS_KRITERIA.
 * Param ada tapi kosong → [] (pengguna sedang merakit dari nol).
 */
export function parseKriteria(raw: string | undefined): KodeKriteria[] {
  if (raw === undefined) return [...KRITERIA_DEFAULT];
  const hasil: KodeKriteria[] = [];
  for (const bagian of raw.split(",")) {
    const kode = bagian.trim().toLowerCase();
    if (isKodeTersedia(kode) && !hasil.includes(kode) && hasil.length < MAKS_KRITERIA) hasil.push(kode);
  }
  return hasil;
}

/** Baca filter dari query params; param kosong/tidak valid → nilai default. */
export function parseFilter(params: SearchParamsInput): FilterState {
  const tipe = ambil(params, "tipe")?.toLowerCase();
  return {
    budget: parseBudget(ambil(params, "budget")),
    tipe: isTipePenghuni(tipe) ? tipe : DEFAULT_FILTER.tipe,
    kriteria: parseKriteria(ambil(params, "kriteria")),
  };
}

/** Param tambahan di luar filter, mis. { pilih: "kos-melati" } (undefined/null = tidak ditulis). */
export type ParamTambahan = Record<string, string | null | undefined>;

/** FilterState → "budget=1200000&tipe=putri&kriteria=harga,…" (tanpa "?"). */
export function buildQuery(state: FilterState, tambahan?: ParamTambahan): string {
  let q = `budget=${state.budget}&tipe=${state.tipe}&kriteria=${state.kriteria.join(",")}`;
  for (const [k, v] of Object.entries(tambahan ?? {})) {
    if (v) q += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  }
  return q;
}

/** Contoh: buildHref("/hasil", state, { pilih: id }) → "/hasil?budget=…&tipe=…&kriteria=…&pilih=…" */
export function buildHref(pathname: string, state: FilterState, tambahan?: ParamTambahan): string {
  return `${pathname}?${buildQuery(state, tambahan)}`;
}

/**
 * Penanda alur desktop: /hasil hanya boleh dibuka lewat tombol "Lihat
 * peringkat" di langkah kriteria (atau dari dalam /hasil sendiri).
 * Tanpa `ok=1`, /hasil desktop dialihkan ke /prioritas.
 */
export const PARAM_OK = { ok: "1" } as const;

export function adaPenandaOk(params: { get(name: string): string | null }): boolean {
  return params.get("ok") === "1";
}

/** FilterState → body untuk POST /api/rank. */
export function toRankRequest(state: FilterState): RankRequest {
  return { budget: state.budget, tipe: state.tipe, kriteria: state.kriteria };
}
