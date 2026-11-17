"use client";

import { useFilter } from "@/lib/use-filter";
import { HomeUtama } from "./home-utama";

/** HomeUtama dengan nilai awal dari query params (harus di dalam <Suspense>). */
export function HomeUtamaFromUrl() {
  return <HomeUtama initial={useFilter()} />;
}
