import type { Metadata } from "next";
import { Suspense } from "react";
import { Halaman } from "@/components/halaman";
import { PrioritasView } from "./prioritas-view";

export const metadata: Metadata = { title: "Rakit kriteria" };

export default function PrioritasPage() {
  // PrioritasView membaca query params (useSearchParams) → wajib di dalam Suspense.
  return (
    <Halaman>
      <Suspense fallback={null}>
        <PrioritasView />
      </Suspense>
    </Halaman>
  );
}
