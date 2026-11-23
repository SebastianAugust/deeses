"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoPlaceholder } from "@/components/photo-placeholder";
import { cn } from "@/lib/utils";

type FotoKosProps = {
  src: string;
  alt: string;
  /** Atribut `sizes` next/image (lebar tampil foto). */
  sizes: string;
  /** "cover" untuk galeri/thumbnail, "contain" untuk lightbox. */
  isi?: "cover" | "contain";
  prioritas?: boolean;
  className?: string;
  /** Dipanggil (dengan `src`) saat gambar gagal dimuat, mis. supaya galeri membuangnya. */
  onGagal?: (src: string) => void;
};

/**
 * Foto kos dengan next/image (mengisi wadah `relative`). Saat selesai dimuat:
 * blur + transparan → tajam. Lapisan .foto-zoom membesar sedikit saat wadah
 * induknya (.galeri-item / .kartu-angkat) di-hover.
 *
 * SVG lokal dan foto dari URL luar (hasil scraping) ditampilkan tanpa optimisasi
 * (`unoptimized`), sehingga host foto belum perlu didaftarkan di next.config.ts.
 * TODO: daftarkan host di images.remotePatterns lalu aktifkan optimisasi.
 * Gambar gagal dimuat → PhotoPlaceholder (bukan kotak kosong) + `onGagal`.
 */
export function FotoKos({ src, alt, sizes, isi = "cover", prioritas = false, className, onGagal }: FotoKosProps) {
  const [dimuat, setDimuat] = useState(false);
  const [gagalSrc, setGagalSrc] = useState<string | null>(null);
  if (gagalSrc === src) {
    return <PhotoPlaceholder label={null} iconSize={28} className={cn("absolute inset-0 rounded-none", className)} />;
  }
  return (
    <div className={cn("foto-zoom absolute inset-0", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={prioritas}
        unoptimized={src.endsWith(".svg") || /^https?:\/\//.test(src)}
        // Sebagian CDN memblokir hotlink bila ada Referer; next/image meneruskan prop ini ke <img>.
        referrerPolicy="no-referrer"
        onLoad={() => setDimuat(true)}
        onError={() => {
          setGagalSrc(src);
          onGagal?.(src);
        }}
        className={cn(
          "transition-[opacity,filter] duration-250 ease-out",
          isi === "cover" ? "object-cover" : "object-contain",
          dimuat ? "opacity-100 blur-0" : "opacity-0 blur-md",
        )}
      />
    </div>
  );
}
