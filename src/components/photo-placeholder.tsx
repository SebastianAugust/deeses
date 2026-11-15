import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PhotoPlaceholderProps = {
  /** Atur tinggi/radius dari luar, mis. "h-[196px] rounded-[20px]". */
  className?: string;
  /** Ukuran ikon dalam px. */
  iconSize?: number;
  /** Teks di bawah ikon; `null` untuk menyembunyikan (thumbnail kecil). */
  label?: string | null;
  /** Badge di atas foto (posisikan dengan `absolute`). */
  children?: ReactNode;
};

/**
 * Pengganti foto saat `foto_url` null: gradasi abu + ikon gambar + "foto kos".
 * Lapisan gambar (.foto-zoom) sedikit membesar saat kartu induknya di-hover;
 * badge (children) tidak ikut membesar.
 */
export function PhotoPlaceholder({
  className,
  iconSize = 28,
  label = "foto kos",
  children,
}: PhotoPlaceholderProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-[18px]", className)}>
      <div className="foto-zoom absolute inset-0 flex flex-col items-center justify-center gap-1 bg-linear-135 from-[#E3E6EA] to-[#CDD3DA]">
        {iconSize > 0 ? (
          <ImageIcon size={iconSize} strokeWidth={1.8} className="text-[#7D8590]" aria-hidden />
        ) : null}
        {label ? <span className="text-[11px] text-[#5B6170]">{label}</span> : null}
      </div>
      {children}
    </div>
  );
}
