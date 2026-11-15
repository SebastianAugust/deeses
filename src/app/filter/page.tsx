import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { PrimaryButton } from "@/components/primary-button";

export const metadata: Metadata = { title: "Filter — Kosjati" };

// Kerangka — slider budget, chip cepat, tile tipe penghuni, dan bottom bar
// mengikuti design/mockups/01-filter.html di tahap berikutnya.
export default function FilterPage() {
  return (
    <PageContainer className="gap-4">
      <span className="text-[13px] font-semibold text-muted">Langkah 1 dari 2</span>
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Mulai dari batasmu</h1>
      <p className="text-sm leading-normal text-muted">
        Kos di luar batas ini tidak ikut dihitung.
      </p>
      <PrimaryButton href="/prioritas" block>
        Lanjut ke prioritas
      </PrimaryButton>
    </PageContainer>
  );
}
