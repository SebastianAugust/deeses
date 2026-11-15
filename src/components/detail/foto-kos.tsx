"use client";

import { useState } from "react";
import Image from "next/image";
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
};

/**
 * Foto kos dengan next/image (mengisi wadah `relative`). Saat selesai dimuat:
 * blur + transparan → tajam. Lapisan .foto-zoom membesar sedikit saat wadah
 * induknya (.galeri-item / .kartu-angkat) di-hover.
 *
 * SVG lokal (DATA CONTOH di /public/contoh) ditampilkan tanpa optimisasi.
 * TODO: foto hasil scraping butuh host di images.remotePatterns (next.config.ts).
 */
export function FotoKos({ src, alt, sizes, isi = "cover", prioritas = false, className }: FotoKosProps) {
  const [dimuat, setDimuat] = useState(false);
  return (
    <div className={cn("foto-zoom absolute inset-0", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={prioritas}
        unoptimized={src.endsWith(".svg")}
        onLoad={() => setDimuat(true)}
        className={cn(
          "transition-[opacity,filter] duration-250 ease-out",
          isi === "cover" ? "object-cover" : "object-contain",
          dimuat ? "opacity-100 blur-0" : "opacity-0 blur-md",
        )}
      />
    </div>
  );
}
