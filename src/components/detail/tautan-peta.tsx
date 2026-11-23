import { MapPin } from "lucide-react";
import { urlCariGoogleMaps } from "@/lib/peta";
import { cn } from "@/lib/utils";

/**
 * Tautan "Lihat di Google Maps": membuka PENCARIAN nama kos di tab baru
 * (bukan koordinat dari data). Tidak dirender bila nama tidak bisa dicari.
 */
export function TautanPeta({ nama, className }: { nama: string; className?: string }) {
  const href = urlCariGoogleMaps(nama);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Lihat di Google Maps, cari ${nama.trim()}, buka di tab baru`}
      className={cn(
        "tekan tautan inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-[13px] font-semibold text-accent-ink",
        className,
      )}
    >
      <MapPin size={16} aria-hidden />
      Lihat di Google Maps
      <span aria-hidden>↗</span>
    </a>
  );
}
