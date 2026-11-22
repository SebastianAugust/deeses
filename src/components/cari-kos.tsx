"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Spinner } from "@/components/indikator-muat";
import { KosPhoto } from "@/components/kos-photo";
import { Skeleton } from "@/components/ui/skeleton";
import { cariKos, geserSorotan, segmenSorot, tokenQuery } from "@/lib/cari-kos";
import { formatRupiah, teksJarak } from "@/lib/format";
import { buildHref, type FilterState, type ParamTambahan } from "@/lib/query";
import { labelTipe } from "@/lib/ringkasan";
import type { KosRingkasCarousel } from "@/lib/types";
import { useSibukSingkat } from "@/lib/use-sibuk";
import { useKosRingkas } from "@/lib/use-kos-ringkas";
import { cn } from "@/lib/utils";

type CariKosProps = {
  /** Filter yang dibawa ke /kos/[id] (Home: DEFAULT_FILTER; /hasil: filter saat ini). */
  filter: FilterState;
  /** Param tambahan di URL detail, mis. PARAM_OK dari /hasil. */
  paramTambahan?: ParamTambahan;
  /** Tinggi 44px (header desktop) alih-alih 52px. */
  kompak?: boolean;
  className?: string;
};

/** Nama dengan bagian yang cocok ditebalkan (tanpa dangerouslySetInnerHTML). */
function NamaSorot({ nama, query }: { nama: string; query: string }) {
  return (
    <>
      {segmenSorot(nama, query).map((s, i) =>
        s.cocok ? (
          <b key={i} className="font-extrabold">
            {s.teks}
          </b>
        ) : (
          <span key={i}>{s.teks}</span>
        ),
      )}
    </>
  );
}

function BarisMemuat() {
  return (
    <div aria-hidden="true" className="flex flex-col divide-y divide-line">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex min-h-[56px] items-center gap-3 px-3 py-2">
          <Skeleton className="size-10 flex-none rounded-[10px] bg-line" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-3/5 bg-line" />
            <Skeleton className="h-3 w-2/5 bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Pencarian kos berdasarkan nama di antara SEMUA kos (bukan hanya hasil filter).
 * Combobox: input + daftar saran; seluruh penyaringan di klien atas GET /api/kos.
 * Memilih saran → /kos/[id] dengan filter yang diberikan lewat props.
 */
export function CariKos({ filter, paramTambahan, kompak = false, className }: CariKosProps) {
  const router = useRouter();
  const rank = useKosRingkas();
  const [sibuk, jalankan] = useSibukSingkat();
  const uid = useId();
  const idDaftar = `${uid}-daftar`;
  const idOpsi = (i: number) => `${uid}-opsi-${i}`;

  const wadah = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [teks, setTeks] = useState("");
  const [terbuka, setTerbuka] = useState(false);
  const [aktif, setAktif] = useState(0);

  const data = rank.status === "success" ? rank.data : null;
  const pencarian = useMemo(() => (data ? cariKos(data, teks) : null), [data, teks]);
  const hasil = pencarian?.hasil ?? [];
  const sisa = (pencarian?.total ?? 0) - hasil.length;

  const adaQuery = tokenQuery(teks).length > 0;
  const tampil = terbuka && adaQuery;
  const adaDaftar = tampil && hasil.length > 0;
  const sorot = adaDaftar ? Math.min(aktif, hasil.length - 1) : -1;

  const hrefKos = (kos: KosRingkasCarousel) =>
    buildHref(`/kos/${encodeURIComponent(kos.id)}`, filter, paramTambahan);

  // Klik di luar menutup dropdown.
  useEffect(() => {
    if (!terbuka) return;
    function luar(e: PointerEvent) {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setTerbuka(false);
    }
    document.addEventListener("pointerdown", luar);
    return () => document.removeEventListener("pointerdown", luar);
  }, [terbuka]);

  // Baris yang disorot lewat keyboard tetap terlihat di dalam dropdown yang bisa digulir.
  useEffect(() => {
    if (sorot >= 0) document.getElementById(`${uid}-opsi-${sorot}`)?.scrollIntoView({ block: "nearest" });
  }, [sorot, uid]);

  function ubahTeks(nilai: string) {
    setTeks(nilai);
    setAktif(0);
    setTerbuka(true);
  }

  function hapus() {
    setTeks("");
    setAktif(0);
    setTerbuka(false);
    input.current?.focus();
  }

  function tekanTombol(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        if (!adaQuery) return;
        e.preventDefault();
        if (!terbuka) setTerbuka(true);
        else setAktif(geserSorotan(sorot, hasil.length, e.key === "ArrowDown" ? "bawah" : "atas"));
        break;
      case "Enter":
        if (adaDaftar && sorot >= 0) {
          e.preventDefault();
          setTerbuka(false);
          router.push(hrefKos(hasil[sorot]));
        }
        break;
      case "Escape":
        if (tampil) {
          e.preventDefault();
          setTerbuka(false);
        }
        break;
      case "Tab":
        // Saat ada daftar saran: tutup. Pada keadaan galat fokus boleh lanjut ke "Coba lagi".
        if (adaDaftar) setTerbuka(false);
        break;
    }
  }

  let pesan: string | null = null;
  if (tampil) {
    if (rank.status === "loading") pesan = "Memuat daftar kos";
    else if (rank.status === "error") pesan = "Daftar kos gagal dimuat";
    else if (hasil.length === 0) pesan = `Tidak ada kos bernama ${teks.trim()}`;
    else pesan = `${pencarian?.total ?? 0} kos ditemukan`;
  }

  return (
    <div
      ref={wadah}
      className={cn("relative", className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setTerbuka(false);
      }}
    >
      <div
        className={cn(
          "glass flex items-center gap-2.5 rounded-full pl-4 text-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
          kompak ? "h-11 pr-1" : "h-[52px] pr-1.5",
        )}
      >
        <Search size={18} strokeWidth={2.2} className="flex-none text-muted" aria-hidden />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label="Cari kos berdasarkan nama"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={adaDaftar}
          aria-controls={adaDaftar ? idDaftar : undefined}
          aria-activedescendant={sorot >= 0 ? idOpsi(sorot) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Cari nama kos, mis. Pondok Kaca"
          value={teks}
          onChange={(e) => ubahTeks(e.target.value)}
          onFocus={() => setTerbuka(true)}
          onKeyDown={tekanTombol}
          className="h-full min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-muted/75"
        />
        {teks !== "" ? (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={hapus}
            className={cn(
              "tekan flex flex-none items-center justify-center rounded-full text-muted hover:bg-white/70 hover:text-ink",
              kompak ? "size-9" : "size-11",
            )}
          >
            <X size={18} strokeWidth={2.2} aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Pengumuman untuk pembaca layar (jumlah hasil / keadaan). */}
      <div role="status" aria-live="polite" className="sr-only">
        {pesan}
      </div>

      {tampil ? (
        <div
          // Cegah fokus pindah dari input saat menekan area dropdown (Safari tidak memfokuskan tautan).
          onMouseDown={(e) => e.preventDefault()}
          className="glass-strong absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[min(60dvh,30rem)] overflow-y-auto overscroll-contain rounded-[22px] shadow-[0_18px_44px_rgba(30,45,90,.16)]"
        >
          {rank.status === "loading" ? (
            <div aria-busy="true">
              <BarisMemuat />
            </div>
          ) : null}

          {rank.status === "error" ? (
            <div className="flex flex-col items-start gap-1 px-4 py-3.5">
              <p className="text-[13px] text-muted">Daftar kos gagal dimuat.</p>
              <button
                type="button"
                onClick={() => jalankan(rank.cobaLagi)}
                disabled={sibuk}
                aria-busy={sibuk || undefined}
                className="tekan tautan -my-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-[13px] font-bold text-accent-ink"
              >
                {sibuk ? <Spinner size={14} /> : null}
                Coba lagi
              </button>
            </div>
          ) : null}

          {rank.status === "success" && hasil.length === 0 ? (
            <div className="flex flex-col gap-0.5 px-4 py-4">
              <p className="text-sm font-bold break-words">Tidak ada kos bernama “{teks.trim()}”</p>
              <p className="text-[13px] text-muted">Coba sebagian nama saja atau ejaan lain.</p>
            </div>
          ) : null}

          {adaDaftar ? (
            <>
              <ul id={idDaftar} role="listbox" aria-label="Hasil pencarian kos" className="flex flex-col divide-y divide-line">
                {hasil.map((kos, i) => (
                  <li key={kos.id} role="presentation">
                    <Link
                      id={idOpsi(i)}
                      role="option"
                      aria-selected={i === sorot}
                      tabIndex={-1}
                      href={hrefKos(kos)}
                      onMouseMove={() => {
                        if (i !== sorot) setAktif(i);
                      }}
                      onClick={(e) => {
                        // Ctrl/Cmd/Shift-klik membuka tab/jendela baru: dropdown tetap ada.
                        if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) setTerbuka(false);
                      }}
                      className={cn(
                        "flex min-h-[56px] items-center gap-3 px-3 py-2 text-ink transition-colors duration-150",
                        i === sorot ? "bg-soft" : "hover:bg-white/60",
                      )}
                    >
                      <KosPhoto
                        src={kos.foto_url}
                        nama={kos.nama}
                        iconSize={16}
                        label={null}
                        className="size-10 flex-none rounded-[10px]"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="line-clamp-2 text-sm leading-tight font-medium">
                          <NamaSorot nama={kos.nama} query={teks} />
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                          {kos.tipe ? (
                            <span className="rounded-md bg-soft px-1.5 py-px font-bold text-accent-ink">
                              {labelTipe(kos.tipe)}
                            </span>
                          ) : null}
                          <span className="tabular-nums">
                            {kos.harga === null ? "-" : <b className="font-bold text-ink">{formatRupiah(kos.harga)}</b>}
                            {kos.harga === null ? "" : " /bln"}
                          </span>
                          {!kos.jarak_imputasi && kos.jarak_km !== null ? <span>{teksJarak(kos)}</span> : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {sisa > 0 ? (
                <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
                  {sisa} kos lain cocok, persempit pencarianmu
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
