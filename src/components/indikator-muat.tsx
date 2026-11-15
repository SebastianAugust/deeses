import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Indikator loading kecil. Dengan reduced motion, berkedip (opacity) alih-alih berputar. */
export function IndikatorMuat({ label = "Memperbarui", className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center text-muted", className)}>
      <LoaderCircle
        size={14}
        strokeWidth={2.4}
        className="animate-spin motion-reduce:animate-pulse"
        aria-hidden
      />
      <span className="sr-only">{label}…</span>
    </span>
  );
}
