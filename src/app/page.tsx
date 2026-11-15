import { PageContainer } from "@/components/page-container";
import { PrimaryButton } from "@/components/primary-button";

// Kerangka — isi lengkap (hero, kartu ringkas, "Cara kerjanya", carousel)
// mengikuti design/mockups/00-home.html di tahap berikutnya.
export default function HomePage() {
  return (
    <PageContainer className="gap-4">
      <span className="text-xl font-extrabold tracking-[-0.02em]">
        kosjati<span className="text-accent-ink">.</span>
      </span>
      <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.02em]">
        Cari kos di Jatinangor yang paling pas buatmu
      </h1>
      <p className="text-sm leading-normal text-muted">
        Atur budget dan prioritasmu, lalu kami urutkan kos yang cocok dari skor tertinggi.
      </p>
      <PrimaryButton href="/filter" block className="text-base">
        Mulai cari kos
      </PrimaryButton>
    </PageContainer>
  );
}
