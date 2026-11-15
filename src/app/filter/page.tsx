import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterForm } from "./filter-form";

export const metadata: Metadata = { title: "Filter — Kosjati" };

export default function FilterPage() {
  // FilterForm membaca query params (useSearchParams) → wajib di dalam Suspense.
  return (
    <Suspense fallback={null}>
      <FilterForm />
    </Suspense>
  );
}
