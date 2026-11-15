"use client";

import { useFilter } from "@/lib/use-filter";
import { HomeForm } from "./home-form";

/** HomeForm dengan nilai awal dari query params URL (harus di dalam <Suspense>). */
export function HomeFormFromUrl() {
  return <HomeForm initial={useFilter()} />;
}
