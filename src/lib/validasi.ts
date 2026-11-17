/**
 * Validasi input endpoint (zod). Fungsi murni; dites di tests/data.test.ts dan tests/api.test.ts.
 * Katalog kriteria & batasnya dibaca dari src/config/kriteria.ts.
 */
import { z } from "zod";
import { MAKS_KRITERIA, getKriteria, type KodeKriteria } from "@/config/kriteria";
import { DEFAULT_FILTER } from "./query";
import type { RankRequest, TipePenghuni } from "./types";

export type HasilValidasi<T> = { ok: true; data: T } | { ok: false; error: string };

const PESAN_TIPE = "`tipe` harus salah satu dari: putra, putri, campur.";
const PESAN_BUDGET = "`budget` harus berupa angka positif.";
const PESAN_KRITERIA = "`kriteria` harus berupa daftar kode kriteria (urut prioritas), mis. [\"harga\", \"luas\"].";

const skemaTipe = z.enum(["putra", "putri", "campur"], { error: PESAN_TIPE });

const skemaBudget = z
  .number({ error: PESAN_BUDGET })
  .refine((n) => Number.isFinite(n) && n > 0, { message: PESAN_BUDGET });

/**
 * Daftar kode kriteria terpasang, urut prioritas: 1..MAKS_KRITERIA item, unik,
 * semua ada di katalog dan datanya tersedia.
 */
export const skemaKriteria = z
  .array(z.string({ error: PESAN_KRITERIA }), { error: PESAN_KRITERIA })
  .superRefine((daftar, ctx) => {
    if (daftar.length === 0) {
      ctx.addIssue({ code: "custom", message: "`kriteria` harus berisi minimal 1 kriteria." });
      return;
    }
    if (daftar.length > MAKS_KRITERIA) {
      ctx.addIssue({
        code: "custom",
        message: `\`kriteria\` maksimal ${MAKS_KRITERIA} kriteria, diterima ${daftar.length}.`,
      });
      return;
    }
    const dilihat = new Set<string>();
    for (const kode of daftar) {
      const info = getKriteria(kode);
      if (!info) {
        ctx.addIssue({ code: "custom", message: `kode kriteria tidak dikenal: ${kode}.` });
        return;
      }
      if (!info.tersedia) {
        ctx.addIssue({
          code: "custom",
          message: `kriteria ${kode} belum bisa dipakai: ${info.alasanTidakTersedia ?? "datanya belum ada."}`,
        });
        return;
      }
      if (dilihat.has(kode)) {
        ctx.addIssue({ code: "custom", message: `kode kriteria duplikat: ${kode}.` });
        return;
      }
      dilihat.add(kode);
    }
  })
  .transform((d) => d as KodeKriteria[]);

export const skemaRankRequest = z.object(
  {
    budget: skemaBudget,
    tipe: skemaTipe,
    kriteria: skemaKriteria,
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
 * Query GET /api/kos/[id]?budget&tipe&kriteria=harga,luas,…
 * Param yang tidak ada → nilai default filter; yang ada tapi tidak valid → error.
 */
export function validasiQueryDetail(params: Params): HasilValidasi<RankRequest> {
  const budget = params.get("budget");
  const tipe = params.get("tipe");
  const kriteria = params.get("kriteria");
  return keHasil(
    skemaRankRequest.safeParse({
      budget: kosong(budget) ? DEFAULT_FILTER.budget : Number(budget),
      tipe: kosong(tipe) ? DEFAULT_FILTER.tipe : tipe!.trim().toLowerCase(),
      kriteria: kosong(kriteria)
        ? [...DEFAULT_FILTER.kriteria]
        : kriteria!.split(",").map((k) => k.trim().toLowerCase()),
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
