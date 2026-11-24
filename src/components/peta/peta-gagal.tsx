import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pengganti peta bila gaya/tile tidak bisa dimuat (jaringan, blokir, tanpa WebGL). */
export function PetaGagal({ href, className }: { href: string | null; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2.5 rounded-[inherit] bg-soft px-4 text-center",
        className,
      )}
    >
      <MapPin size={22} className="text-muted" aria-hidden />
      <p className="text-sm font-semibold text-ink">Peta tidak dapat dimuat</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="tekan tautan inline-flex min-h-10 items-center gap-1.5 rounded-full border border-accent/40 bg-white px-4 text-[13px] font-semibold text-accent-ink"
        >
          Buka di Google Maps
          <span aria-hidden>↗</span>
        </a>
      ) : null}
    </div>
  );
}
