import { MapPin } from "lucide-react";
import { urlGoogleMaps, type DataTautanPeta } from "@/lib/peta";
import { cn } from "@/lib/utils";

/**
 * Tautan "Lihat di Google Maps" (tab baru): pin ke koordinat bila titiknya
 * "terverifikasi"/"geokode", selain itu pencarian nama (lihat src/lib/peta.ts).
 * Tidak dirender bila tidak ada nama yang bisa dicari.
 */
export function TautanPeta({
  nama,
  placeId,
  lat,
  lng,
  koordinat_status,
  className,
}: DataTautanPeta & { className?: string }) {
  const href = urlGoogleMaps({ nama, placeId, lat, lng, koordinat_status });
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Lihat ${nama.trim()} di Google Maps, buka di tab baru`}
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
