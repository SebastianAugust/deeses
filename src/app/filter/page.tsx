import type { Metadata } from "next";
import { Suspense } from "react";
import { Halaman } from "@/components/halaman";
import { FilterForm } from "./filter-form";

export const metadata: Metadata = { title: "Budget & tipe" };

export default function FilterPage() {
  // FilterForm membaca query params (useSearchParams) → wajib di dalam Suspense.
  return (
    <Halaman>
      <Suspense fallback={null}>
        <FilterForm />
      </Suspense>
    </Halaman>
  );
}
