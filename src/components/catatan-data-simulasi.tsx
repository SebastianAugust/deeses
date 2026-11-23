import { CATATAN_DATA_SIMULASI } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Catatan kecil: data kos sebagian simulasi/perkiraan, bukan data resmi. */
export function CatatanDataSimulasi({ className }: { className?: string }) {
  return (
    <p role="note" className={cn("text-xs leading-normal text-muted", className)}>
      {CATATAN_DATA_SIMULASI}
    </p>
  );
}
