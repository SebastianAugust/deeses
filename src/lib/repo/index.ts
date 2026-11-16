import "server-only";
import { SupabaseKosRepository } from "./supabase";
import type { KosRepository } from "./tipe";

/**
 * SATU-SATUNYA tempat memilih implementasi sumber data kos.
 * Tidak ada fallback ke data contoh: kalau Supabase gagal, route mengembalikan galat.
 */
let repo: KosRepository | null = null;

export function kosRepository(): KosRepository {
  repo ??= new SupabaseKosRepository();
  return repo;
}

export type { KosRepository } from "./tipe";
export type { Kos } from "./mapper";
