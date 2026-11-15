import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { BackLink } from "./back-link";

type StepHeaderProps = {
  backHref: string;
  backLabel: string;
  /** true → tombol back memakai router.back() bila ada riwayat di app. */
  backPakaiRiwayat?: boolean;
  langkah: number;
  total: number;
  /** Aksi di kanan, mis. tombol Reset. */
  kanan?: ReactNode;
};

/** Baris atas wizard: tombol kembali, "Langkah n dari m", dan progress bar 4px. */
export function StepHeader({
  backHref,
  backLabel,
  backPakaiRiwayat = false,
  langkah,
  total,
  kanan,
}: StepHeaderProps) {
  return (
    <header>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <BackLink
          href={backHref}
          pakaiRiwayat={backPakaiRiwayat}
          aria-label={backLabel}
          className="tekan tombol-kaca flex size-11 flex-none items-center justify-center rounded-full border-transparent text-ink"
        >
          <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
        </BackLink>
        <span className="flex-1 text-[13px] font-semibold text-muted">
          Langkah {langkah} dari {total}
        </span>
        {kanan}
      </div>
      <div
        role="progressbar"
        aria-label="Kemajuan langkah"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={langkah}
        className="mx-5 h-1 rounded-sm bg-line"
      >
        <div
          className="h-1 rounded-sm bg-accent"
          style={{ width: `${(langkah / total) * 100}%` }}
        />
      </div>
    </header>
  );
}
