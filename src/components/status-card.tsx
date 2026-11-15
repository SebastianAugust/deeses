"use client";

import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { useSibukSingkat } from "@/lib/use-sibuk";
import { GlassCard } from "./glass-card";
import { PrimaryButton } from "./primary-button";

type ErrorCardProps = {
  pesan: string;
  onCobaLagi: () => void;
};

/** Pesan galat singkat + tombol coba lagi (spinner + disabled sebentar, cegah klik ganda). */
export function ErrorCard({ pesan, onCobaLagi }: ErrorCardProps) {
  const [sibuk, jalankan] = useSibukSingkat();
  return (
    <GlassCard
      role="alert"
      padding="lg"
      className="flex flex-col items-center gap-3 rounded-[28px] text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-soft text-accent-ink">
        <CircleAlert size={26} strokeWidth={1.8} aria-hidden />
      </span>
      <h2 className="text-lg font-extrabold">Gagal memuat data</h2>
      <p className="text-sm leading-[1.55] text-muted">{pesan}</p>
      <PrimaryButton block memuat={sibuk} onClick={() => jalankan(onCobaLagi)} className="mt-1.5">
        Coba lagi
      </PrimaryButton>
    </GlassCard>
  );
}

/** Kartu pesan netral (mis. kos tidak ditemukan). */
export function InfoCard({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <GlassCard padding="lg" className="flex flex-col items-center gap-3 rounded-[28px] text-center">
      <h1 className="text-[22px] font-extrabold tracking-[-0.01em]">{judul}</h1>
      {children}
    </GlassCard>
  );
}
