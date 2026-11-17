"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  KRITERIA_TERSEDIA,
  arahKriteria,
  infoKriteria,
  katalogTerkelompok,
  type KodeKriteria,
} from "@/config/kriteria";
import { TRANSISI } from "@/lib/motion";
import { useKategoriAktif } from "@/lib/use-kategori-aktif";
import { cn } from "@/lib/utils";
import { ChipKategori } from "./bagian";

const ID_BAGIAN = (kategori: string) => `lemari-${kategori}`;

/**
 * "Lemari kriteria" (mockup 10): bottom sheet hampir setinggi layar (sisa 96px
 * di atas) berisi semua piece tersedia per kategori. Dibangun di atas
 * @base-ui Dialog (fokus terkunci di dalam, Escape/scrim menutup, fokus kembali
 * ke pemicu). Animasi masuk/keluar dengan motion; prefers-reduced-motion
 * ditangani <MotionProvider reducedMotion="user"> (hanya opacity yang tersisa).
 *
 * Harus dirender di dalam <Dialog.Root> yang sama dengan pemicunya.
 */
export function LemariSheet({
  open,
  kriteria,
  onToggle,
}: {
  open: boolean;
  kriteria: KodeKriteria[];
  onToggle: (kode: KodeKriteria) => void;
}) {
  const kelompok = useMemo(() => katalogTerkelompok(), []);
  const idBagian = useMemo(() => kelompok.map((k) => ID_BAGIAN(k.kode)), [kelompok]);
  // Callback ref → state: isi portal bisa terpasang setelah render pertama.
  const [wadah, setWadah] = useState<HTMLDivElement | null>(null);
  const [aktifKat, tandaiKat] = useKategoriAktif(idBagian, {
    root: wadah,
    rootMargin: "0px 0px -65% 0px",
    aktif: open && wadah !== null,
  });

  function lompat(e: MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    tandaiKat(id);
    const el = document.getElementById(id);
    if (!wadah || !el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // `wadah` relative → offsetTop bagian sudah relatif terhadap kontainer gulir.
    wadah.scrollTo({ top: Math.max(0, el.offsetTop - 4), behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <AnimatePresence>
      {open ? (
        <Dialog.Portal keepMounted>
          <Dialog.Backdrop
            className="fixed inset-0 z-40 bg-[rgba(26,29,36,0.45)]"
            render={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSISI} />}
          />
          <Dialog.Popup
            className="fixed inset-x-0 top-24 bottom-0 z-50 mx-auto flex max-w-[480px] flex-col overflow-hidden rounded-t-[24px] bg-white text-ink shadow-[0_-10px_40px_rgba(26,29,36,0.25)] outline-none"
            render={
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={TRANSISI}
              />
            }
          >
            <div className="flex flex-none flex-col gap-2.5 border-b border-line px-4 pt-2.5 pb-2.5">
              <div aria-hidden className="h-1 w-10 self-center rounded-full bg-[#D5DCEA]" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-px">
                  <Dialog.Title className="text-lg font-extrabold">Lemari kriteria</Dialog.Title>
                  <Dialog.Description className="text-[12.5px] font-semibold text-accent-ink">
                    {kriteria.length} dipasang dari {KRITERIA_TERSEDIA.length}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="tekan tombol-utama h-11 cursor-pointer rounded-[12px] bg-accent px-[18px] text-[14.5px] font-extrabold text-white">
                  Selesai
                </Dialog.Close>
              </div>
              <nav aria-label="Lompat ke kategori" className="-mr-4 flex gap-2 overflow-x-auto pr-4 pb-0.5">
                {kelompok.map((k) => {
                  const id = ID_BAGIAN(k.kode);
                  return (
                    <ChipKategori
                      key={k.kode}
                      chip={{
                        kode: k.kode,
                        nama: k.nama,
                        jumlah: kriteria.filter((kode) => infoKriteria(kode).kategori === k.kode).length,
                      }}
                      href={`#${id}`}
                      aktif={aktifKat === id}
                      onPilih={(e) => lompat(e, id)}
                      className="px-3.5 text-[13.5px]"
                    />
                  );
                })}
              </nav>
            </div>

            <div ref={setWadah} className="relative flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-4 pt-1.5 pb-6">
              {kelompok.map((k) => (
                <section key={k.kode} id={ID_BAGIAN(k.kode)} aria-labelledby={`judul-${ID_BAGIAN(k.kode)}`} className="flex flex-col gap-2 pt-3">
                  <h3
                    id={`judul-${ID_BAGIAN(k.kode)}`}
                    className="text-[12.5px] font-extrabold tracking-[0.04em] text-muted uppercase"
                  >
                    {k.nama}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {k.kriteria.map((p) => {
                      const terpasang = kriteria.includes(p.kode);
                      return (
                        <li
                          key={p.kode}
                          className={cn(
                            "flex min-h-[62px] items-center gap-3 rounded-[14px] border-[1.5px] py-2 pr-2 pl-3.5",
                            terpasang ? "border-accent bg-soft" : "border-line bg-white",
                          )}
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-[15px] font-bold">{p.nama}</span>
                            <span className="text-xs text-muted">{arahKriteria(p.jenis)}</span>
                          </span>
                          <button
                            type="button"
                            aria-pressed={terpasang}
                            aria-label={`Pasang ${p.nama}`}
                            onClick={() => onToggle(p.kode)}
                            className={cn(
                              "tekan flex size-11 flex-none cursor-pointer items-center justify-center rounded-[12px]",
                              terpasang ? "bg-accent text-white" : "border border-line bg-[#F3F6FB] text-accent-ink",
                            )}
                          >
                            {terpasang ? (
                              <Check size={20} strokeWidth={2.8} aria-hidden />
                            ) : (
                              <Plus size={20} strokeWidth={2.8} aria-hidden />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      ) : null}
    </AnimatePresence>
  );
}
