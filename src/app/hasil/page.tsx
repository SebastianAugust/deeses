import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { MOCK_KOS } from "@/lib/mock";

export const metadata: Metadata = { title: "Hasil — Kosjati" };

// Kerangka — search pill, kartu #1, grid #2–#3, baris ringkas, state kosong,
// dan tata letak desktop mengikuti design/mockups/03, 05, 06 di tahap berikutnya.
// Daftar di bawah masih DATA CONTOH (src/lib/mock.ts), belum memanggil /api/rank.
export default function HasilPage() {
  return (
    <PageContainer wide className="gap-4">
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Hasil rekomendasi</h1>
      <p className="text-xs text-muted">Urut skor SAW</p>
      <ul className="flex flex-col gap-2">
        {MOCK_KOS.map((kos) => (
          <li key={kos.id}>
            <Link
              href={`/kos/${kos.id}`}
              className="text-sm font-bold text-accent-ink underline-offset-4 hover:underline"
            >
              #{kos.rank} {kos.nama}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/prioritas" className="text-sm font-semibold text-ink">
        Ubah prioritas
      </Link>
    </PageContainer>
  );
}
