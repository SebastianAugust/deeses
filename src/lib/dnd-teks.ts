/**
 * Teks aksesibilitas dnd-kit (bahasa Indonesia) yang dipakai bersama oleh
 * daftar prioritas di /hasil, rak desktop, dan daftar mobile di /prioritas.
 */
import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";
import { getKriteria } from "@/config/kriteria";

export const INSTRUKSI_SERET =
  "Tekan spasi atau Enter untuk mengangkat kriteria. Gunakan panah atas dan bawah untuk memindahkan, spasi atau Enter untuk meletakkan, Escape untuk membatalkan.";

/** Nama kriteria dari id dnd (kode, atau "katalog:kode"). */
export function namaDariId(id: UniqueIdentifier): string {
  const kode = String(id).replace(/^katalog:/, "");
  return getKriteria(kode)?.nama ?? kode;
}

/** Pengumuman untuk daftar yang hanya bisa diurutkan ulang. */
export function pengumumanUrutan(urutan: readonly string[]): Announcements {
  const posisi = (id: UniqueIdentifier) => urutan.indexOf(String(id)) + 1;
  return {
    onDragStart: ({ active }) => `${namaDariId(active.id)} diangkat dari posisi ${posisi(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${namaDariId(active.id)} dipindah ke posisi ${posisi(over.id)} dari ${urutan.length}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${namaDariId(active.id)} diletakkan di posisi ${posisi(over.id)} dari ${urutan.length}.`
        : `${namaDariId(active.id)} diletakkan.`,
    onDragCancel: ({ active }) =>
      `Pemindahan dibatalkan. ${namaDariId(active.id)} kembali ke posisi ${posisi(active.id)}.`,
  };
}
