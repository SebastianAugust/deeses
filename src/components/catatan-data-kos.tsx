import {
  CATATAN_HARGA_TAHUNAN,
  LABEL_JARAK_RUTE,
  LABEL_LOKASI_PERKIRAAN,
  adaJarakRute,
  hargaDariTahunan,
  lokasiPerkiraan,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  kos: {
    jarak_km?: number | null;
    jarak_imputasi?: boolean;
    koordinat_status?: string | null;
    basis_harga?: string | null;
  };
  /** Label "perkiraan jarak rute" (hanya bila jarak ditampilkan). */
  jarak?: boolean;
  /** Label "lokasi perkiraan" (koordinat_status = perkiraan). */
  lokasi?: boolean;
  /** Catatan "harga dihitung dari tarif tahunan ÷ 12" (basis_harga = tahun_dibagi_12). */
  harga?: boolean;
  className?: string;
};

/**
 * Label kecil penjelas mutu data di dekat jarak/alamat/harga. Tidak merender apa pun
 * bila tidak ada yang berlaku (mis. data lama tanpa kolom status).
 */
export function CatatanDataKos({ kos, jarak = true, lokasi = true, harga = true, className }: Props) {
  const tampilJarak = jarak && adaJarakRute(kos);
  const tampilLokasi = lokasi && lokasiPerkiraan(kos);
  const tampilHarga = harga && hargaDariTahunan(kos);
  if (!tampilJarak && !tampilLokasi && !tampilHarga) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-muted", className)}>
      {tampilJarak ? <span>{LABEL_JARAK_RUTE}</span> : null}
      {tampilLokasi ? (
        <span className="rounded-md border border-line bg-white/70 px-1.5 py-px font-semibold">
          {LABEL_LOKASI_PERKIRAAN}
        </span>
      ) : null}
      {tampilHarga ? <span>{CATATAN_HARGA_TAHUNAN}</span> : null}
    </span>
  );
}
