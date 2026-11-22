/**
 * State filter + kriteria terpasang (urut prioritas) disimpan di query params URL:
 *   ?budget=1200000&tipe=putri
 * Kriteria terpasang (urut prioritas) disimpan di sessionStorage per tab
 * (src/lib/kriteria-tersimpan.ts), bukan di URL, supaya link pendek. Link lama
 * yang masih membawa `&kriteria=a,b,c` tetap dibaca dan menang atas rakitan sesi.
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

/**
 * Baca filter dari query params; param kosong/tidak valid → nilai default.
 * Kriteria: `?kriteria=` di URL (link lama/dibagikan) menang; kalau tidak ada,
 * pakai rakitan sesi (`kriteriaTersimpan`, lihat kriteria-tersimpan.ts); kalau
 * itu pun tidak ada → default.
 */
export function parseFilter(params: SearchParamsInput, kriteriaTersimpan?: string | null): FilterState {
  const tipe = ambil(params, "tipe")?.toLowerCase();
  return {
    budget: parseBudget(ambil(params, "budget")),
    tipe: isTipePenghuni(tipe) ? tipe : DEFAULT_FILTER.tipe,
    kriteria: parseKriteria(ambil(params, "kriteria") ?? kriteriaTersimpan ?? undefined),
  };
}

/** Param tambahan di luar filter, mis. { pilih: "kos-melati" } (undefined/null = tidak ditulis). */
export type ParamTambahan = Record<string, string | null | undefined>;

/**
 * FilterState → "budget=1200000&tipe=putri" (tanpa "?") untuk URL HALAMAN.
 * Kriteria sengaja tidak ikut: rakitan disimpan di sessionStorage
 * (kriteria-tersimpan.ts) supaya URL tetap pendek.
 */
export function buildQuery(state: FilterState, tambahan?: ParamTambahan): string {
  let q = `budget=${state.budget}&tipe=${state.tipe}`;
  for (const [k, v] of Object.entries(tambahan ?? {})) {
    if (v) q += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  }
  return q;
}

/** Query untuk GET /api/kos/[id]: kontrak API tetap membawa kriteria ("budget=…&tipe=…&kriteria=a,b"). */
export function buildApiQuery(state: FilterState): string {
  return `${buildQuery(state)}&kriteria=${state.kriteria.join(",")}`;
}

/** Contoh: buildHref("/hasil", state, { pilih: id }) → "/hasil?budget=…&tipe=…&pilih=…" */
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
