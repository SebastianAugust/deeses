import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { PrimaryButton } from "@/components/primary-button";

export const metadata: Metadata = { title: "Prioritas — Kosjati" };

// Kerangka — 8 baris kriteria drag-and-drop (dnd-kit) + bobot rank-sum
// mengikuti design/mockups/02-prioritas.html di tahap berikutnya.
export default function PrioritasPage() {
  return (
    <PageContainer className="gap-4">
      <span className="text-[13px] font-semibold text-muted">Langkah 2 dari 2</span>
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Apa yang paling penting?</h1>
      <p className="text-[13px] leading-normal text-muted">
        Seret untuk mengurutkan. Paling atas dapat bobot terbesar.
      </p>
      <PrimaryButton href="/hasil" block className="text-base">
        Tampilkan hasil
      </PrimaryButton>
    </PageContainer>
  );
}
