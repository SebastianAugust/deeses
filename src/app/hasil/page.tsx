import type { Metadata } from "next";
import { Suspense } from "react";
import { HasilView } from "./hasil-view";

export const metadata: Metadata = { title: "Hasil — Kosjati" };

export default function HasilPage() {
  // HasilView membaca query params (useSearchParams) → wajib di dalam Suspense.
  return (
    <Suspense fallback={null}>
      <HasilView />
    </Suspense>
  );
}
