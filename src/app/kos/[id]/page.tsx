import type { Metadata } from "next";
import { Suspense } from "react";
import { Halaman } from "@/components/halaman";
import { DetailView } from "./detail-view";

export const metadata: Metadata = { title: "Detail kos — Kosjati" };

export default function DetailKosPage() {
  // DetailView membaca id (useParams) dan query params (useSearchParams) di
  // client, lalu mengambil data lewat /api/rank → wajib di dalam Suspense.
  return (
    <Halaman>
      <Suspense fallback={null}>
        <DetailView />
      </Suspense>
    </Halaman>
  );
}
