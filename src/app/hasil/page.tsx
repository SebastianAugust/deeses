import type { Metadata } from "next";
import { Suspense } from "react";
import { Halaman } from "@/components/halaman";
import { HasilView } from "./hasil-view";

export const metadata: Metadata = { title: "Peringkat" };

export default function HasilPage() {
  // HasilView membaca query params (useSearchParams) → wajib di dalam Suspense.
  return (
    <Halaman>
      <Suspense fallback={null}>
        <HasilView />
      </Suspense>
    </Halaman>
  );
}
