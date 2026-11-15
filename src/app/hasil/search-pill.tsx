import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { formatRupiahSingkat } from "@/lib/format";
import { buildHref, type FilterState } from "@/lib/query";
import { duaPrioritasTeratas, labelTipe, ringkasPrioritas } from "@/lib/ringkasan";

/** Search pill kaca (mobile): ringkasan filter, klik → /filter. */
export function SearchPill({ filter }: { filter: FilterState }) {
  return (
    <Link
      href={buildHref("/filter", filter)}
      aria-label="Ubah filter pencarian"
      className="glass flex h-[52px] items-center gap-3 rounded-full pr-2 pl-[18px] text-ink"
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

function Segmen({
  href,
  label,
  nilai,
  className,
}: {
  href: string;
  label: string;
  nilai: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`flex h-full min-w-0 flex-col justify-center px-5 text-ink ${className}`}
    >
      <span className="text-[11px] font-bold">{label}</span>
      <span className="truncate text-sm text-muted">{nilai}</span>
    </Link>
  );
}

/** Navbar kaca sticky (desktop) dengan search pill 3 segmen. */
export function DesktopNav({ filter }: { filter: FilterState }) {
  const keFilter = buildHref("/filter", filter);
  return (
    <header className="sticky top-0 z-20 hidden border-b border-white/90 bg-white/55 backdrop-blur-[20px] backdrop-saturate-[1.6] lg:block">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-5 px-8 py-3.5">
        <Link
          href={buildHref("/", filter)}
          aria-label="Kosjati, ke beranda"
          className="text-[22px] font-extrabold tracking-[-0.02em] text-ink"
        >
          kosjati<span className="text-accent-ink">.</span>
        </Link>
        <nav
          aria-label="Ringkasan pencarian"
          className="mx-auto flex h-[54px] max-w-[580px] flex-[1_1_420px] items-center overflow-hidden rounded-full border border-line bg-white/78 shadow-[0_6px_18px_rgba(30,45,90,.10)]"
        >
          <Segmen
            href={keFilter}
            label="Tipe"
            nilai={labelTipe(filter.tipe)}
            className="flex-1 border-r border-line"
          />
          <Segmen
            href={keFilter}
            label="Budget"
            nilai={`≤ ${formatRupiahSingkat(filter.budget)}`}
            className="flex-1 border-r border-line"
          />
          <Segmen
            href={buildHref("/prioritas", filter)}
            label="Prioritas"
            nilai={ringkasPrioritas(filter.urutan)}
            className="flex-[1.3]"
          />
          <Link
            href={keFilter}
            aria-label="Ubah pencarian"
            className="mr-1.5 flex size-[42px] flex-none items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-ink"
          >
            <Search size={18} strokeWidth={2.4} aria-hidden />
          </Link>
        </nav>
        <Link href="/#tentang" className="text-sm font-semibold text-ink">
          Tentang metode
        </Link>
      </div>
    </header>
  );
}
