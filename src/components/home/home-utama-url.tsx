"use client";

import { useSearchParams } from "next/navigation";
import { parseLangkah } from "@/lib/query";
import { useFilter } from "@/lib/use-filter";
import { HomeUtama } from "./home-utama";

/** HomeUtama dengan nilai awal & langkah dari query params (harus di dalam <Suspense>). */
export function HomeUtamaFromUrl() {
  const filter = useFilter();
  const langkah = parseLangkah(useSearchParams());
  return <HomeUtama initial={filter} langkah={langkah} />;
}
