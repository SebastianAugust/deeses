import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { formatRupiahSingkat } from "@/lib/format";
import { buildHref, type FilterState } from "@/lib/query";
import { duaPrioritasTeratas } from "@/lib/ringkasan";

/** Search pill kaca (mobile): ringkasan filter, klik → /filter. */
export function SearchPill({ filter }: { filter: FilterState }) {
  return (
    <Link
      href={buildHref("/filter", filter)}
      aria-label="Ubah filter pencarian"
      className="tekan glass flex h-[52px] items-center gap-3 rounded-full pr-2 pl-[18px] text-ink hover:bg-white/70"
    >
      <Search size={18} strokeWidth={2.2} className="flex-none" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-tight font-bold">
          Kos {filter.tipe} · Jatinangor
        </span>
        <span className="truncate text-xs leading-tight text-muted">
          Maks {formatRupiahSingkat(filter.budget)} · {duaPrioritasTeratas(filter.urutan)} utama
        </span>
      </span>
      <span className="flex size-[38px] flex-none items-center justify-center rounded-full border border-line bg-white/78">
        <SlidersHorizontal size={16} aria-hidden />
      </span>
    </Link>
  );
}
