import type { KriteriaInfo } from "@/config/kriteria";
import type { SebaranHarga } from "@/lib/sebaran";
import type { TipePenghuni } from "@/lib/types";
import type { Kos } from "./mapper";

/**
 * Sumber data kos (HANYA BACA). Implementasi dipilih di src/lib/repo/index.ts.
 * Semua method melempar KosDataError (src/lib/repo/galat.ts) bila data tidak
 * bisa dibaca atau kosong — tidak pernah jatuh diam-diam ke data palsu.
 */
export interface KosRepository {
  /** Semua kos (seluruh baris tabel, sudah dipetakan). */
  listKos(): Promise<Kos[]>;
  /** Satu kos; null kalau id tidak ada. */
  getKos(id: string): Promise<Kos | null>;
  /** Kriteria (dari src/config/kriteria.ts; tidak ada tabel kriteria). */
  getKriteria(): readonly KriteriaInfo[];
  /** Sebaran harga per Rp 100 rb untuk tipe tertentu (atau semua tipe). */
  sebaranHarga(tipe?: TipePenghuni): Promise<SebaranHarga>;
}
