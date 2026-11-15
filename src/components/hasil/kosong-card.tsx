"use client";

import { useState } from "react";
import { House } from "lucide-react";
import { Spinner } from "@/components/indikator-muat";
import { useSibukSingkat } from "@/lib/use-sibuk";
import { GlassCard } from "@/components/glass-card";
import { KELAS_TOMBOL_SEKUNDER, PrimaryButton } from "@/components/primary-button";
import { useToast } from "@/components/toast";
import { formatRupiah } from "@/lib/format";
import { BUDGET_MAX, type FilterState } from "@/lib/query";

const KENAIKAN_BUDGET = 200_000;

type KosongCardProps = {
  filter: FilterState;
  /** Terapkan filter baru (mobile: router.replace; desktop: state + URL). */
  terapkan: (filter: FilterState) => void;
};

/**
 * State "Belum ada kos yang cocok". Tombol langsung menerapkan perubahan, lalu
 * menampilkan toast dengan "Batalkan" yang mengembalikan filter sebelumnya.
 */
export function KosongCard({ filter, terapkan }: KosongCardProps) {
  const toast = useToast();
  const budgetBaru = Math.min(BUDGET_MAX, filter.budget + KENAIKAN_BUDGET);
  const bisaNaik = budgetBaru > filter.budget;
  const bisaCampur = filter.tipe !== "campur";

  // Tombol yang memicu fetch: spinner + disabled sebentar (cegah klik ganda).
  const [sibuk, jalankan] = useSibukSingkat();
  const [aksiAktif, setAksiAktif] = useState<"budget" | "tipe" | null>(null);

  function ubah(aksi: "budget" | "tipe", patch: Partial<FilterState>, pesan: string) {
    const sebelumnya = filter;
    setAksiAktif(aksi);
    void jalankan(() => {
      terapkan({ ...filter, ...patch });
      toast({ pesan, aksi: { label: "Batalkan", onClick: () => terapkan(sebelumnya) } });
    });
  }

  return (
    <GlassCard
      padding="none"
      className="flex flex-col items-center gap-3 rounded-[28px] px-5 pt-7 pb-5 text-center shadow-[0_10px_30px_rgba(30,45,90,.10)]"
    >
      <span className="flex size-24 items-center justify-center rounded-full bg-soft text-accent-ink">
        <House size={44} strokeWidth={1.6} aria-hidden />
      </span>
      <h1 className="text-[22px] font-extrabold tracking-[-0.01em]">Belum ada kos yang cocok</h1>
      <p className="text-sm leading-[1.55] text-muted">
        Tidak ada kos {filter.tipe} dengan harga sampai {formatRupiah(filter.budget)} per bulan di
        data kami. Coba longgarkan salah satu filter.
      </p>
      <div className="mt-1.5 flex w-full flex-col gap-2.5">
        {bisaNaik ? (
          <PrimaryButton
            block
            memuat={sibuk && aksiAktif === "budget"}
            disabled={sibuk}
            onClick={() =>
              ubah("budget", { budget: budgetBaru }, `Budget dinaikkan ke ${formatRupiah(budgetBaru)}`)
            }
          >
            Naikkan budget ke {formatRupiah(budgetBaru)}
          </PrimaryButton>
        ) : null}
        {bisaCampur ? (
          <button
            type="button"
            disabled={sibuk}
            aria-busy={(sibuk && aksiAktif === "tipe") || undefined}
            onClick={() => ubah("tipe", { tipe: "campur" }, "Tipe diganti ke Campur")}
            className={KELAS_TOMBOL_SEKUNDER}
          >
            {sibuk && aksiAktif === "tipe" ? <Spinner /> : null}
            Ganti tipe ke Campur
          </button>
        ) : null}
      </div>
    </GlassCard>
  );
}
