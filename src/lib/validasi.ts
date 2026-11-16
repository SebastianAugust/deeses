/**
 * Validasi input endpoint (zod). Fungsi murni; dites di tests/validasi.test.ts.
 * Kriteria & jumlahnya dibaca dari src/config/kriteria.ts.
 */
import { z } from "zod";
import { KODE_KRITERIA, rentangKodeKriteria, type Kriteria } from "@/config/kriteria";
import { cekUrutan } from "./dss/bobot";
import { DEFAULT_FILTER } from "./query";
import type { RankRequest, TipePenghuni } from "./types";

export type HasilValidasi<T> = { ok: true; data: T } | { ok: false; error: string };

const PESAN_TIPE = "`tipe` harus salah satu dari: putra, putri, campur.";
const PESAN_BUDGET = "`budget` harus berupa angka positif.";

const skemaTipe = z.enum(["putra", "putri", "campur"], { error: PESAN_TIPE });

const skemaBudget = z
  .number({ error: PESAN_BUDGET })
  .refine((n) => Number.isFinite(n) && n > 0, { message: PESAN_BUDGET });

const skemaUrutan = z
  .array(z.string(), { error: () => pesanUrutan() })
  .refine((u) => cekUrutan(u, KODE_KRITERIA) === null, { message: pesanUrutan() })
  .transform((u) => u as Kriteria[]);

function pesanUrutan(): string {
  return `\`urutan_kriteria\` harus berisi ${rentangKodeKriteria()}, masing-masing tepat satu kali.`;
}

export const skemaRankRequest = z.object(
  {
    budget: skemaBudget,
    tipe: skemaTipe,
    urutan_kriteria: skemaUrutan,
  },
  { error: "Body harus berupa objek JSON." },
);

function keHasil<T>(r: { success: true; data: T } | { success: false; error: z.ZodError }): HasilValidasi<T> {
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.issues[0]?.message ?? "Input tidak valid." };
}

/** Body POST /api/rank. */
export function validasiRankRequest(body: unknown): HasilValidasi<RankRequest> {
  return keHasil(skemaRankRequest.safeParse(body));
}

type Params = { get(name: string): string | null };

const kosong = (v: string | null) => v === null || v.trim() === "";

/**
 * Query GET /api/kos/[id]?budget&tipe&urutan=C1,C2,…
 * Param yang tidak ada → nilai default filter; yang ada tapi tidak valid → error.
 */
export function validasiQueryDetail(params: Params): HasilValidasi<RankRequest> {
  const budget = params.get("budget");
  const tipe = params.get("tipe");
  const urutan = params.get("urutan");
  return keHasil(
    skemaRankRequest.safeParse({
      budget: kosong(budget) ? DEFAULT_FILTER.budget : Number(budget),
      tipe: kosong(tipe) ? DEFAULT_FILTER.tipe : tipe!.trim().toLowerCase(),
      urutan_kriteria: kosong(urutan)
        ? [...DEFAULT_FILTER.urutan]
        : urutan!.split(",").map((k) => k.trim().toUpperCase()),
    }),
  );
}

/** Query GET /api/sebaran-harga?tipe= (kosong/tidak ada = semua tipe). */
export function validasiQuerySebaran(params: Params): HasilValidasi<TipePenghuni | undefined> {
  const tipe = params.get("tipe");
  if (kosong(tipe)) return { ok: true, data: undefined };
  return keHasil(skemaTipe.safeParse(tipe!.trim().toLowerCase()));
}

/** id kos di URL: id tabel adalah int8 → hanya digit. */
export function validasiIdKos(id: string): HasilValidasi<string> {
  return /^\d{1,19}$/.test(id) ? { ok: true, data: id } : { ok: false, error: "Kos tidak ditemukan." };
}
