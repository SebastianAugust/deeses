"use client";

import Link from "next/link";
import { ArrowRight, Copy, MessageCircle, Phone } from "lucide-react";
import { KosPhoto } from "@/components/kos-photo";
import { KELAS_TOMBOL_SEKUNDER, PrimaryButton } from "@/components/primary-button";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { useToast } from "@/components/toast";
import { formatRupiah, formatSkor, inisial } from "@/lib/format";
import { pesanWa, tautanTelp, tautanWa } from "@/lib/kontak";
import type { KosDetail, KosRingkas } from "@/lib/types";
import { cn } from "@/lib/utils";

const LUAR = { target: "_blank", rel: "noopener noreferrer" } as const;

function infoBiaya(kos: KosDetail): string | null {
  const bagian = [
    kos.listrik_termasuk == null
      ? null
      : kos.listrik_termasuk
        ? "Listrik termasuk"
        : "Listrik belum termasuk",
    kos.deposit != null ? `Deposit ${formatRupiah(kos.deposit)}` : null,
  ].filter(Boolean);
  return bagian.length ? bagian.join(" · ") : null;
}

function useSalinAlamat(alamat: string | null | undefined) {
  const toast = useToast();
  if (!alamat) return null;
  return async () => {
    try {
      await navigator.clipboard.writeText(alamat);
      toast({ pesan: "Alamat disalin" });
    } catch {
      toast({ pesan: "Gagal menyalin alamat" });
    }
  };
}

/**
 * Kartu harga & kontak (kolom kanan desktop; di mobile tampil di alur konten).
 * Ada WA → "Chat WhatsApp" (pesan terisi). Ada telepon → "Telepon". Tidak ada
 * kontak sama sekali → hanya pesan "belum tersedia". Listing sumber hanya tautan
 * kecil "Lihat listing sumber ↗", bukan CTA utama (CTA utama = halaman detail ini).
 */
export function KontakCard({ kos }: { kos: KosDetail }) {
  const salin = useSalinAlamat(kos.alamat);
  const biaya = infoBiaya(kos);
  const adaKontak = Boolean(kos.kontak_wa || kos.kontak_telp);

  return (
    <section
      aria-label="Harga dan kontak pengelola"
      className="flex flex-col gap-3.5 rounded-[26px] border border-white/95 bg-white/70 p-[22px] shadow-[0_18px_44px_rgba(30,45,90,.12)] backdrop-blur-[24px] backdrop-saturate-[1.6]"
    >
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[32px] font-extrabold tracking-[-0.02em] tabular-nums">
            {formatRupiah(kos.harga)}
          </span>
          <span className="text-[15px] text-muted">/ bulan</span>
        </p>
        {biaya ? <p className="text-[13px] text-muted">{biaya}</p> : null}
      </div>

      <hr className="border-line" />

      {kos.kontak_nama ? (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-11 flex-none items-center justify-center rounded-full bg-soft font-extrabold text-accent-ink"
          >
            {inisial(kos.kontak_nama)}
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold">{kos.kontak_nama}</span>
            <span className="text-xs text-muted">Pengelola kos</span>
          </div>
        </div>
      ) : null}

      {adaKontak ? (
        <>
          {kos.kontak_wa ? (
            <PrimaryButton
              href={tautanWa(kos.kontak_wa, kos.nama)}
              {...LUAR}
              block
              className="h-[54px] text-base"
            >
              <MessageCircle size={20} aria-hidden />
              Chat WhatsApp
            </PrimaryButton>
          ) : null}
          {kos.kontak_telp || salin ? (
            <div className={cn("grid gap-2", kos.kontak_telp && salin && "grid-cols-2")}>
              {kos.kontak_telp ? (
                <a
                  href={tautanTelp(kos.kontak_telp)}
                  className={cn(KELAS_TOMBOL_SEKUNDER, "h-[46px] rounded-[14px] text-sm")}
                >
                  <Phone size={16} aria-hidden />
                  Telepon
                </a>
              ) : null}
              {salin ? (
                <button
                  type="button"
                  onClick={salin}
                  className={cn(KELAS_TOMBOL_SEKUNDER, "h-[46px] rounded-[14px] text-sm")}
                >
                  <Copy size={16} aria-hidden />
                  Salin alamat
                </button>
              ) : null}
            </div>
          ) : null}
          {kos.kontak_wa ? (
            <p className="text-xs leading-normal text-muted">Pesan otomatis: “{pesanWa(kos.nama)}”</p>
          ) : null}
          {kos.sumber_url ? (
            <a
              href={kos.sumber_url}
              {...LUAR}
              className="tautan self-center text-[13px] font-semibold text-accent-ink"
            >
              Lihat listing sumber ↗
            </a>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Kontak pengelola belum tersedia di data kami.</p>
          {salin ? (
            <button
              type="button"
              onClick={salin}
              className={cn(KELAS_TOMBOL_SEKUNDER, "h-[46px] rounded-[14px] text-sm")}
            >
              <Copy size={16} aria-hidden />
              Salin alamat
            </button>
          ) : null}
        </>
      )}
      {!adaKontak && kos.sumber_url ? (
        <a
          href={kos.sumber_url}
          {...LUAR}
          className="tautan self-center text-[13px] font-semibold text-accent-ink"
        >
          Hubungi lewat listing sumber ↗
        </a>
      ) : null}
    </section>
  );
}

/** Pintasan ke kos peringkat berikutnya (params sama). */
export function KosBerikutnya({ kos, href }: { kos: KosRingkas; href: string }) {
  return (
    <Link
      href={href}
      className="kartu-angkat group flex items-center gap-3 rounded-[20px] border border-white/95 bg-white/55 px-4 py-3.5 text-ink hover:bg-white/80 hover:shadow-[0_10px_24px_rgba(30,45,90,.10)]"
    >
      <KosPhoto
        src={kos.foto_url}
        nama={kos.nama}
        iconSize={0}
        label={null}
        className="h-11 w-14 flex-none rounded-[10px]"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted">Berikutnya · #{kos.rank}</span>
        <span className="truncate text-sm font-bold">
          {kos.nama} · {formatSkor(kos.skor_saw)}
        </span>
      </span>
      <ArrowRight
        size={18}
        className="text-accent-ink transition-[translate] duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
        aria-hidden
      />
    </Link>
  );
}

/** Bar bawah mobile: harga + tombol kontak (hanya kalau ada WA/telepon; listing sumber tidak jadi CTA). */
export function KontakBarMobile({ kos }: { kos: KosDetail }) {
  return (
    <StickyBottomBar className="pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col">
        <span className="text-[17px] font-extrabold tabular-nums">{formatRupiah(kos.harga)}</span>
        <span className="text-xs text-muted">per bulan</span>
      </div>
      {kos.kontak_wa ? (
        <PrimaryButton href={tautanWa(kos.kontak_wa, kos.nama)} {...LUAR} className="h-[50px] px-5">
          <MessageCircle size={18} aria-hidden />
          Chat WhatsApp
        </PrimaryButton>
      ) : kos.kontak_telp ? (
        <PrimaryButton href={tautanTelp(kos.kontak_telp)} className="h-[50px] px-5">
          <Phone size={18} aria-hidden />
          Telepon
        </PrimaryButton>
      ) : null}
    </StickyBottomBar>
  );
}
