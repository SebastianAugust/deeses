import type { ReactNode } from "react";
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

/** Foto kos; jatuh ke PhotoPlaceholder kalau `foto_url` null. */
export function KosPhoto({ src, nama, className, iconSize, label, children }: KosPhotoProps) {
  if (!src) {
    return (
      <PhotoPlaceholder className={className} iconSize={iconSize} label={label}>
        {children}
      </PhotoPlaceholder>
    );
  }
  return (
    <div className={cn("relative overflow-hidden rounded-[18px] bg-line", className)}>
      {/* TODO: ganti ke next/image setelah host foto didaftarkan di
          images.remotePatterns (next.config.ts). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Foto ${nama}`}
        loading="lazy"
        className="absolute inset-0 size-full object-cover"
      />
      {children}
    </div>
  );
}
