import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StickyBottomBarProps = {
  children: ReactNode;
  /** Class untuk baris isi (default: flex, rata tengah vertikal, gap 14px). */
  className?: string;
};

/**
 * Bar kaca yang menempel di bawah layar untuk tombol utama.
 * Halaman pemakai perlu memberi ruang di bawah konten (mis. pb-28).
 */
export function StickyBottomBar({ children, className }: StickyBottomBarProps) {
  return (
    <div className="glass-strong fixed inset-x-0 bottom-0 z-20 border-0 border-t border-white/90 shadow-none">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[480px] items-center gap-3.5 px-5 pt-3.5 pb-[max(22px,env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
