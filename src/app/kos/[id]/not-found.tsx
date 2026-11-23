import { ChevronLeft } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { PrimaryButton } from "@/components/primary-button";
import { InfoCard } from "@/components/status-card";

/**
 * Tampil saat /kos/[id] memanggil notFound() (id tidak ada di data).
 * Judul tab "Kos tidak ditemukan" (+ template nama aplikasi dari layout) diatur generateMetadata di page.tsx.
 */
export default function KosTidakDitemukan() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-4 pt-3.5 lg:pt-16">
      <BackLink
        href="/"
        pakaiRiwayat
        aria-label="Kembali"
        className="tekan tombol-kaca flex size-11 items-center justify-center rounded-full border-white/90 bg-white/78 text-ink"
      >
        <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
      </BackLink>
      <InfoCard judul="Kos tidak ditemukan">
        <p className="text-sm leading-[1.55] text-muted">
          Kos ini tidak ada di data kami. Mungkin tautannya salah atau listing-nya sudah dihapus.
        </p>
        <PrimaryButton href="/" block className="mt-1.5">
          Ke beranda
        </PrimaryButton>
      </InfoCard>
    </main>
  );
}
