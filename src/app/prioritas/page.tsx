import type { Metadata } from "next";
import { Suspense } from "react";
import { Halaman } from "@/components/halaman";
import { PrioritasList } from "./prioritas-list";

export const metadata: Metadata = { title: "Prioritas — Kosjati" };

export default function PrioritasPage() {
  // PrioritasList membaca query params (useSearchParams) → wajib di dalam Suspense.
  return (
    <Halaman>
      <Suspense fallback={null}>
        <PrioritasList />
      </Suspense>
    </Halaman>
  );
}
