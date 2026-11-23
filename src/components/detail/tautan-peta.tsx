import { MapPin } from "lucide-react";
import { urlCariGoogleMaps } from "@/lib/peta";
import { cn } from "@/lib/utils";

/**
 * Tautan "Lihat di Google Maps": membuka PENCARIAN nama kos di tab baru (atau
 * tempatnya langsung bila ada place ID), bukan koordinat dari data. Tidak
 * dirender bila nama tidak bisa dicari.
 */
export function TautanPeta({
  nama,
  placeId,
  className,
}: {
  nama: string;
  /** Place ID Google (opsional): bila ada, tautan membuka tempat itu langsung. */
  placeId?: string | null;
  className?: string;
}) {
  const href = urlCariGoogleMaps(nama, placeId);
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
