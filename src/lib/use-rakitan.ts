"use client";

import { useCallback, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useToast } from "@/components/toast";
import { MAKS_KRITERIA, infoKriteria, isKodeTersedia, type KodeKriteria } from "@/config/kriteria";
import { simpanKriteria } from "./kriteria-tersimpan";
import { buildHref, type FilterState } from "./query";
import { gantiUrl } from "./use-filter";

export type Rakitan = {
  /** Kriteria terpasang, index 0 = prioritas tertinggi. */
  kriteria: KodeKriteria[];
  penuh: boolean;
  terpasang: (kode: KodeKriteria) => boolean;
  /** Pasang di akhir, atau sebelum `sebelum`. false kalau rakitan penuh / sudah terpasang. */
  pasang: (kode: KodeKriteria, sebelum?: KodeKriteria | null) => boolean;
  lepas: (kode: KodeKriteria) => void;
  /** Pasang kalau belum, lepas kalau sudah. Mengembalikan true kalau kini terpasang. */
  toggle: (kode: KodeKriteria) => boolean;
  /** Pindahkan dari index `dari` ke index `ke` (semantik arrayMove). */
  pindah: (dari: number, ke: number) => void;
};

/**
 * SATU sumber state kriteria terpasang di halaman /prioritas (desktop & mobile).
 * Setiap perubahan langsung ditulis ke sessionStorage (rakitan sesi, bukan URL
 * supaya link pendek), jadi hasil, detail, dan tombol Back memakai rakitan yang sama.
 */
export function useRakitan(filter: FilterState, pathname = "/prioritas"): Rakitan {
  const [kriteria, setKriteria] = useState<KodeKriteria[]>(filter.kriteria);
  const toast = useToast();
  const { budget, tipe } = filter;

  const simpan = useCallback(
    (baru: KodeKriteria[]) => {
      setKriteria(baru);
      simpanKriteria(baru);
      gantiUrl(buildHref(pathname, { budget, tipe, kriteria: baru }));
    },
    [budget, tipe, pathname],
  );

  const penuh = kriteria.length >= MAKS_KRITERIA;

  const pasang = useCallback(
    (kode: KodeKriteria, sebelum?: KodeKriteria | null) => {
      if (!isKodeTersedia(kode) || kriteria.includes(kode)) return false;
      if (kriteria.length >= MAKS_KRITERIA) {
        toast({ pesan: `Maksimal ${MAKS_KRITERIA} kriteria. Lepas salah satu dulu.` });
        return false;
      }
      const baru = [...kriteria];
      const i = sebelum ? baru.indexOf(sebelum) : -1;
      if (i >= 0) baru.splice(i, 0, kode);
      else baru.push(kode);
      simpan(baru);
      return true;
    },
    [kriteria, simpan, toast],
  );

  const lepas = useCallback(
    (kode: KodeKriteria) => {
      if (!kriteria.includes(kode)) return;
      simpan(kriteria.filter((k) => k !== kode));
      toast({
        pesan: `${infoKriteria(kode).nama} dilepas`,
        aksi: { label: "Batalkan", onClick: () => simpan(kriteria) },
      });
    },
    [kriteria, simpan, toast],
  );

  const toggle = useCallback(
    (kode: KodeKriteria) => {
      if (kriteria.includes(kode)) {
        simpan(kriteria.filter((k) => k !== kode));
        return false;
      }
      return pasang(kode);
    },
    [kriteria, pasang, simpan],
  );

  const pindah = useCallback(
    (dari: number, ke: number) => {
      if (dari === ke || dari < 0 || ke < 0 || dari >= kriteria.length || ke >= kriteria.length) return;
      simpan(arrayMove(kriteria, dari, ke));
    },
    [kriteria, simpan],
  );

  const terpasang = useCallback((kode: KodeKriteria) => kriteria.includes(kode), [kriteria]);

  return { kriteria, penuh, terpasang, pasang, lepas, toggle, pindah };
}
