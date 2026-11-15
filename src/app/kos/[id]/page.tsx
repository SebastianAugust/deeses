import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Halaman } from "@/components/halaman";
import { ambilKos } from "@/lib/kos-server";
import { DetailSkeleton, DetailView } from "./detail-view";

/*
 * /kos/[id] sengaja dinamis: isinya bergantung pada id (dan nanti data
 * Supabase). Dengan cacheComponents + partialPrefetching, membaca `params` di
 * generateMetadata() memicu "Blocking Route — URL data in generateMetadata()".
 * Perbaikan sesuai pesan Next.js ([dynamic]): render penanda yang memanggil
 * `await connection()` di dalam <Suspense>, sehingga metadata boleh ditunda ke
 * request time. Pembacaan `params` di halaman juga berada di dalam <Suspense>
 * (fallback skeleton), jadi App Shell route tidak terikat ke satu URL.
 */

export async function generateMetadata({ params }: PageProps<"/kos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const kos = await ambilKos(id);
  if (!kos) return { title: "Kos tidak ditemukan · kosjati" };
  return {
    title: kos.nama,
    description: `${kos.nama} di Jatinangor — harga, fasilitas, aturan, dan kenapa direkomendasikan untukmu.`,
  };
}

/** Menandai bahwa route ini memang dirender per request (lihat komentar di atas). */
async function Koneksi() {
  await connection();
  return null;
}

function PenandaDinamis() {
  return (
    <Suspense fallback={null}>
      <Koneksi />
    </Suspense>
  );
}

/** Cek keberadaan kos di server; id tak dikenal → notFound() (not-found.tsx segmen ini). */
async function PastikanAda({
  params,
  children,
}: Pick<PageProps<"/kos/[id]">, "params"> & { children: ReactNode }) {
  const { id } = await params;
  if (!(await ambilKos(id))) notFound();
  return children;
}

export default function DetailKosPage({ params }: PageProps<"/kos/[id]">) {
  return (
    <Halaman>
      <PenandaDinamis />
      {/* params & query params (useSearchParams di DetailView) hanya dibaca di
          dalam boundary ini; fallback = skeleton halaman detail. */}
      <Suspense fallback={<DetailSkeleton />}>
        <PastikanAda params={params}>
          <DetailView />
        </PastikanAda>
      </Suspense>
    </Halaman>
  );
}
