import { adaJarakPerKampus, adaJarakRute, formatJarakKampus, teksJarak } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  kos: {
    jarak_km?: number | null;
    jarak_imputasi?: boolean;
    jarak_unpad_km?: number | null;
    jarak_itb_km?: number | null;
  };
  /**
   * "blok": dua baris ("Jarak ke Unpad  1,3 km" / "Jarak ke ITB  2,1 km").
   * "ringkas": satu baris ("Unpad 1,3 km · ITB 2,1 km") untuk kartu sempit.
   */
  varian?: "blok" | "ringkas";
  className?: string;
};

/**
 * Jarak ke Unpad dan ITB (perkiraan jarak rute), dibulatkan 0,1 km; kosong → "-".
 * Label "perkiraan jarak rute" TIDAK ada di sini: pasang <CatatanDataKos> satu kali di bawah blok.
 * Data lama tanpa jarak per kampus tetapi dengan C2 → satu jarak ke kampus terdekat (tampilan lama).
 */
export function JarakKampus({ kos, varian = "blok", className }: Props) {
  const lama = !adaJarakPerKampus(kos) && adaJarakRute(kos);
  const unpad = formatJarakKampus(kos.jarak_unpad_km);
  const itb = formatJarakKampus(kos.jarak_itb_km);

  if (varian === "ringkas") {
    return (
      <span className={cn("tabular-nums", className)}>
        {lama ? (
          teksJarak({ jarak_km: kos.jarak_km ?? null, jarak_imputasi: kos.jarak_imputasi })
        ) : (
          <>
            Unpad {unpad} · ITB {itb}
          </>
        )}
      </span>
    );
  }
  const baris: [string, string][] = lama
    ? [["Jarak ke kampus terdekat", teksJarak({ jarak_km: kos.jarak_km ?? null, jarak_imputasi: kos.jarak_imputasi })]]
    : [
        ["Jarak ke Unpad", unpad],
        ["Jarak ke ITB", itb],
      ];
  return (
    <dl className={cn("grid grid-cols-[max-content_auto] justify-start gap-x-4 gap-y-0.5", className)}>
      {baris.map(([label, nilai]) => (
        <div key={label} className="contents">
          <dt>{label}</dt>
          <dd className="font-bold tabular-nums text-ink">{nilai}</dd>
        </div>
      ))}
    </dl>
  );
}
