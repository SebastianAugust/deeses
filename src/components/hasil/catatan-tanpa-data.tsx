import { infoKriteria, type KodeKriteria } from "@/config/kriteria";
import type { RankResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "N kos disembunyikan karena datanya belum ada" — kos yang lolos budget & tipe
 * tetapi datanya kosong di salah satu kriteria terpasang (tidak diimputasi).
 * Tidak dirender kalau jumlahnya 0.
 */
export function CatatanTanpaData({
  respons,
  className,
}: {
  respons: Pick<RankResponse, "jumlah_tanpa_data" | "tanpa_data_per_kriteria"> | undefined;
  className?: string;
}) {
  if (!respons || respons.jumlah_tanpa_data === 0) return null;
  const rincian = (Object.entries(respons.tanpa_data_per_kriteria) as [KodeKriteria, number][])
    .filter(([, n]) => n > 0)
    .map(([kode, n]) => `${infoKriteria(kode).singkat}: ${n}`);
  return (
    <p role="note" className={cn("text-xs leading-normal text-muted", className)}>
      {respons.jumlah_tanpa_data} kos disembunyikan karena datanya belum ada untuk kriteria yang kamu
      pasang{rincian.length > 0 ? ` (${rincian.join(", ")})` : ""}.
    </p>
  );
}
