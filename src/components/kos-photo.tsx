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
 * Foto kos; jatuh ke PhotoPlaceholder kalau `src` null atau gambar gagal dimuat
 * (mis. diblokir hotlink / link mati). Saat foto selesai dimuat: blur +
 * transparan → tajam (250 ms).
 */
export function KosPhoto({ src, nama, className, iconSize, label, children }: KosPhotoProps) {
  // Status dikaitkan ke `src`, supaya ganti foto pada komponen yang sama dimulai dari awal.
  const [status, setStatus] = useState<{ src: string; hasil: "dimuat" | "gagal" } | null>(null);
  const tandai = (hasil: "dimuat" | "gagal") =>
    // Idempoten (objek lama dikembalikan bila sama): ref di bawah dipanggil ulang tiap render.
    setStatus((s) => (s?.src === src && s.hasil === hasil ? s : { src: src as string, hasil }));
  const dimuat = status?.src === src && status.hasil === "dimuat";
  const gagal = status?.src === src && status.hasil === "gagal";

  if (!src || gagal) {
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
      {/* .foto-zoom: membesar 1.03 saat kartu induk (.kartu-angkat) di-hover. */}
      <div className="foto-zoom absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          // Foto dari cache bisa selesai sebelum onLoad terpasang → cek `complete`.
          // Gambar yang sudah rusak sebelum hidrasi tidak memicu onError → `naturalWidth` 0.
          ref={(el) => {
            if (el?.complete) tandai(el.naturalWidth > 0 ? "dimuat" : "gagal");
          }}
          src={src}
          alt={`Foto ${nama}`}
          loading="lazy"
          // Sebagian CDN memblokir hotlink bila ada Referer.
          referrerPolicy="no-referrer"
          onLoad={() => tandai("dimuat")}
          onError={() => tandai("gagal")}
          className={cn(
            "size-full object-cover transition-[opacity,filter] duration-250 ease-out",
            dimuat ? "opacity-100 blur-0" : "opacity-0 blur-md",
          )}
        />
      </div>
      {children}
    </div>
  );
}
