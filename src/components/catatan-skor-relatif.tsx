import { cn } from "@/lib/utils";

/**
 * Catatan untuk hasil yang hanya 1–2 kos: bar penuh/kosong di sini bukan mutu
 * sebenarnya, hanya akibat normalisasi terhadap kos yang lolos filter.
 */
export function CatatanSkorRelatif({
  jumlah,
  ringkas = false,
  className,
}: {
  jumlah: number;
  ringkas?: boolean;
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        "bg-soft leading-[1.5] text-muted",
        ringkas ? "rounded-[12px] px-3 py-2 text-[11px]" : "rounded-[14px] px-3.5 py-2.5 text-xs",
        className,
      )}
    >
      <b className="text-ink">Skor relatif terhadap kos yang lolos filter.</b> Hanya {jumlah} kos
      yang dibandingkan, jadi skor dan bar per kriteria belum menggambarkan mutu sebenarnya.
    </p>
  );
}
