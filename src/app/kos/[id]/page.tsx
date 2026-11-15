import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailView } from "./detail-view";

export const metadata: Metadata = { title: "Detail kos — Kosjati" };

export default function DetailKosPage() {
  // DetailView membaca id (useParams) dan query params (useSearchParams) di
  // client, lalu mengambil data lewat /api/rank → wajib di dalam Suspense.
  return (
    <Suspense fallback={null}>
      <DetailView />
    </Suspense>
  );
}
