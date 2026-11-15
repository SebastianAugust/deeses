import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { MOCK_KOS, getMockKos } from "@/lib/mock";

export const metadata: Metadata = { title: "Detail kos — Kosjati" };

// `cacheComponents` aktif: beri contoh params supaya halaman bisa diprerender.
// TODO: ganti dengan id dari database saat data asli tersedia.
export function generateStaticParams() {
  return MOCK_KOS.map((kos) => ({ id: kos.id }));
}

// Kerangka — galeri foto, skor SAW/TOPSIS, bar skor per kriteria, "Kenapa
// peringkat n?", dan bottom bar mengikuti design/mockups/04-detail.html di
// tahap berikutnya. Data masih DATA CONTOH (src/lib/mock.ts).
export default async function DetailKosPage({ params }: PageProps<"/kos/[id]">) {
  const { id } = await params;
  const kos = getMockKos(id);
  if (!kos) notFound();

  return (
    <PageContainer className="gap-4">
      <Link href="/hasil" className="text-sm font-semibold text-ink">
        ← Kembali ke hasil
      </Link>
      <h1 className="text-[25px] font-extrabold tracking-[-0.02em]">{kos.nama}</h1>
      <a
        href={kos.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-accent-ink underline-offset-4 hover:underline"
      >
        Buka iklan asli
      </a>
    </PageContainer>
  );
}
