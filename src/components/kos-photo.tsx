"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PhotoPlaceholder } from "./photo-placeholder";

type KosPhotoProps = {
  src: string | null;
  /** Nama kos, untuk teks alternatif foto. */
  nama: string;
  className?: string;
  iconSize?: number;
  label?: string | null;
  /** Badge di atas foto (posisikan dengan `absolute`). */
  children?: ReactNode;
};

/**
 * Foto kos; jatuh ke PhotoPlaceholder kalau `foto_url` null.
 * Saat foto selesai dimuat: blur + transparan → tajam (250 ms).
 */
export function KosPhoto({ src, nama, className, iconSize, label, children }: KosPhotoProps) {
  const [dimuat, setDimuat] = useState(false);

  if (!src) {
    return (
      <PhotoPlaceholder className={className} iconSize={iconSize} label={label}>
        {children}
      </PhotoPlaceholder>
    );
  }
  return (
    <div className={cn("relative overflow-hidden rounded-[18px] bg-linear-135 from-[#E3E6EA] to-[#CDD3DA]", className)}>
      {/* TODO: ganti ke next/image setelah host foto didaftarkan di
          images.remotePatterns (next.config.ts). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // Foto dari cache bisa selesai sebelum onLoad terpasang → cek `complete`.
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) setDimuat(true);
        }}
        src={src}
        alt={`Foto ${nama}`}
        loading="lazy"
        onLoad={() => setDimuat(true)}
        className={cn(
          "absolute inset-0 size-full object-cover transition-[opacity,filter] duration-250 ease-out",
          dimuat ? "opacity-100 blur-0" : "opacity-0 blur-md",
        )}
      />
      {children}
    </div>
  );
}
