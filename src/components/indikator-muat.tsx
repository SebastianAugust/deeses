import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Indikator loading kecil di dekat angka hitungan: tiga titik berdenyut.
 * Reduced motion: hanya berkedip (opacity), tanpa membesar-mengecil.
 */
export function IndikatorMuat({ label = "Memperbarui", className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[3px]", className)}>
      {[0, 150, 300].map((jeda) => (
        <span
          key={jeda}
          aria-hidden
          className="titik-denyut size-1.5 rounded-full bg-accent"
          style={{ animationDelay: `${jeda}ms` }}
        />
      ))}
      <span className="sr-only">{label}…</span>
    </span>
  );
}

/** Spinner kecil untuk tombol yang sedang memproses. Reduced motion: berkedip. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={2.4}
      aria-hidden
      className={cn("flex-none animate-spin motion-reduce:animate-pulse", className)}
    />
  );
}
