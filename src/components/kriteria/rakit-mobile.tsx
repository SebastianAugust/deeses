"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@base-ui/react/dialog";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { ChevronLeft, ChevronUp, GripVertical, Library, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { BackLink } from "@/components/back-link";
import { PrimaryButton } from "@/components/primary-button";
import { Logo } from "@/components/ui/logo";
import {
  BATAS_PERINGATAN_KRITERIA,
  KRITERIA_TERSEDIA,
  MAKS_KRITERIA,
  infoKriteria,
  type KodeKriteria,
} from "@/config/kriteria";
import { bobotPerPosisi, formatPersen } from "@/lib/weights";
import { INSTRUKSI_SERET, pengumumanUrutan } from "@/lib/dnd-teks";
import { TRANSISI_DND } from "@/lib/motion";
import { PARAM_OK, buildHref, type FilterState } from "@/lib/query";
import { useDiBrowser } from "@/lib/use-media";
import type { Rakitan } from "@/lib/use-rakitan";
import { cn } from "@/lib/utils";
import { BarBobot, GarisJatuh, IsiPrioritas, labelBaris } from "./bagian";
import { LemariSheet } from "./lemari-sheet";

const hanyaVertikal: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** Lama sorotan piece yang baru dipasang. */
const SOROT_MS = 1800;

function BarisMobile({
  kode,
  posisi,
  n,
  garisAtas,
  sorot,
  onLepas,
}: {
  kode: KodeKriteria;
  posisi: number;
  n: number;
  garisAtas: boolean;
  sorot: boolean;
  onLepas: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({
    id: kode,
    attributes: { role: "group", roleDescription: "kriteria terpasang" },
  });
  return (
    <li ref={setNodeRef} id={`baris-${kode}`} className="py-[5px]">
      <GarisJatuh tampil={garisAtas} className="mb-1.5" />
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={labelBaris(kode, posisi, n)}
        className={cn(
          // touch-manipulation: geser cepat tetap menggulir halaman; tahan ±0,2 dtk untuk menyeret.
          "flex touch-manipulation items-center gap-3 rounded-[16px] border bg-white py-1.5 pr-1 pl-3 select-none [-webkit-touch-callout:none]",
          "transition-[background-color,border-color,box-shadow] duration-500 ease-out",
          sorot ? "border-accent bg-soft shadow-[0_0_0_3px_rgba(29,95,209,.18)]" : "border-line",
          isDragging && "opacity-45",
        )}
      >
        <GripVertical size={20} aria-hidden className="flex-none text-[#6B7383]" />
        <IsiPrioritas kode={kode} posisi={posisi} n={n} besar />
        <button
          type="button"
          aria-label={`Lepas ${infoKriteria(kode).nama}`}
          onClick={onLepas}
          className="tekan flex size-11 flex-none cursor-pointer items-center justify-center rounded-[12px] text-muted hover:bg-soft hover:text-ink"
        >
          <X size={18} strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    </li>
  );
}

/**
 * Langkah kriteria mobile (mockup 10): daftar prioritas yang bisa diurutkan
 * (tahan lalu geser), dock bawah berisi tombol "Buka lemari kriteria" dan
 * "Lihat peringkat". Lemari = bottom sheet berisi semua piece tersedia.
 */
export function RakitMobile({ filter, rakitan }: { filter: FilterState; rakitan: Rakitan }) {
  const { kriteria } = rakitan;
  const n = kriteria.length;
  const sisa = Math.min(KRITERIA_TERSEDIA.length, MAKS_KRITERIA) - n;
  const reduced = useReducedMotion() ?? false;
  const diBrowser = useDiBrowser();
  const dndId = useId();

  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState<KodeKriteria | null>(null);
  const [atas, setAtas] = useState<KodeKriteria | null>(null);
  const baruRef = useRef<KodeKriteria[]>([]);
  const [sorot, setSorot] = useState<KodeKriteria[]>([]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (sorot.length === 0) return;
    const t = setTimeout(() => setSorot([]), SOROT_MS);
    return () => clearTimeout(t);
  }, [sorot]);

  function toggleDiLemari(kode: KodeKriteria) {
    const kini = rakitan.toggle(kode);
    baruRef.current = kini ? [...baruRef.current, kode] : baruRef.current.filter((k) => k !== kode);
  }

  /** Setelah lemari tertutup: sorot piece yang baru dipasang dan gulir ke yang terakhir. */
  function setelahTertutup(terbuka: boolean) {
    if (terbuka) return;
    const baru = baruRef.current.filter((k) => kriteria.includes(k));
    baruRef.current = [];
    if (baru.length === 0) return;
    setSorot(baru);
    document
      .getElementById(`baris-${baru[baru.length - 1]}`)
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }

  // Posisi garis penanda: pindah turun → setelah item yang ditunjuk.
  let garisSebelum: KodeKriteria | null = null;
  let garisAkhir = false;
  if (aktif && atas && aktif !== atas) {
    const iA = kriteria.indexOf(aktif);
    const iO = kriteria.indexOf(atas);
    if (iO < iA) garisSebelum = atas;
    else if (iO + 1 < n) garisSebelum = kriteria[iO + 1];
    else garisAkhir = true;
  }

  const overlay = (
    <DragOverlay
      modifiers={[hanyaVertikal]}
      dropAnimation={reduced ? null : { duration: TRANSISI_DND.duration, easing: TRANSISI_DND.easing }}
      zIndex={60}
    >
      {aktif ? (
        <div className="flex h-full w-full items-center gap-3 rounded-[16px] border-2 border-accent bg-white py-1.5 pr-3 pl-3 shadow-[0_14px_28px_rgba(29,95,209,.28)]">
          <GripVertical size={20} aria-hidden className="flex-none text-[#6B7383]" />
          <IsiPrioritas kode={aktif} posisi={Math.max(0, kriteria.indexOf(aktif))} n={n} besar />
        </div>
      ) : null}
    </DragOverlay>
  );

  return (
    <Dialog.Root open={buka} onOpenChange={setBuka} onOpenChangeComplete={setelahTertutup}>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3.5 px-4 pt-3 pb-[210px]">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <BackLink
              href={buildHref("/", filter)}
              pakaiRiwayat
              aria-label="Kembali"
              className="tekan tombol-kaca -ml-2 flex size-11 flex-none items-center justify-center rounded-full border-transparent text-ink"
            >
              <ChevronLeft size={20} strokeWidth={2.2} aria-hidden />
            </BackLink>
            <Logo ukuran="sm" />
          </div>
          <span className="text-[12.5px] font-semibold text-muted">Langkah 2 dari 3</span>
        </header>

        <div className="flex flex-col gap-1">
          <h1 className="text-[25px] leading-[1.2] font-extrabold tracking-[-0.01em]">Susun prioritasmu</h1>
          <p className="text-sm leading-[1.45] text-muted">
            Tahan dan geser untuk mengurutkan. Yang paling atas paling berpengaruh.
          </p>
        </div>

        {n === 0 ? (
          <div className="rounded-[16px] border-[1.5px] border-dashed border-[#9DB5E3] bg-[#F3F7FE] px-5 py-8 text-center text-[14.5px] leading-normal text-muted">
            Belum ada kriteria. Buka lemari di bawah untuk memasang.
          </div>
        ) : (
          <>
            <BarBobot n={n} />
            <DndContext
              id={dndId}
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[hanyaVertikal]}
              onDragStart={({ active }) => setAktif(active.id as KodeKriteria)}
              onDragOver={({ over }) => setAtas((over?.id as KodeKriteria | undefined) ?? null)}
              onDragEnd={({ active, over }) => {
                setAktif(null);
                setAtas(null);
                if (!over || active.id === over.id) return;
                rakitan.pindah(kriteria.indexOf(active.id as KodeKriteria), kriteria.indexOf(over.id as KodeKriteria));
                if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(10);
              }}
              onDragCancel={() => {
                setAktif(null);
                setAtas(null);
              }}
              accessibility={{
                announcements: pengumumanUrutan(kriteria),
                screenReaderInstructions: { draggable: INSTRUKSI_SERET },
              }}
            >
              <SortableContext items={kriteria} strategy={() => null}>
                <ol aria-label="Urutan prioritas kriteria" className="-my-[5px] flex flex-col">
                  {kriteria.map((kode, i) => (
                    <BarisMobile
                      key={kode}
                      kode={kode}
                      posisi={i}
                      n={n}
                      garisAtas={garisSebelum === kode}
                      sorot={sorot.includes(kode)}
                      onLepas={() => rakitan.lepas(kode)}
                    />
                  ))}
                </ol>
              </SortableContext>
              <GarisJatuh tampil={garisAkhir} />
              {diBrowser ? createPortal(overlay, document.body) : null}
            </DndContext>
          </>
        )}

        {n > BATAS_PERINGATAN_KRITERIA ? (
          <p role="note" className="rounded-[12px] bg-[#FFF4E0] px-3 py-2.5 text-[13px] leading-[1.45] text-[#7A4300]">
            Kriteria paling bawah hanya dapat bobot {formatPersen(bobotPerPosisi(n)[n - 1])}, hampir tidak
            berpengaruh.
          </p>
        ) : null}
        <p className="text-xs leading-normal text-muted">
          Kos yang datanya kosong di salah satu kriteria terpasang disembunyikan, dan jumlahnya ditampilkan di
          halaman peringkat.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[480px] flex-col gap-3 rounded-t-[22px] border-t border-line bg-white px-4 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(29,95,209,0.12)]">
        <div aria-hidden className="h-1 w-10 self-center rounded-full bg-[#D5DCEA]" />
        <Dialog.Trigger className="tekan flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-[#9DB5E3] bg-[#F3F7FE] px-3.5 text-left text-ink">
          <span className="flex size-[34px] flex-none items-center justify-center rounded-[10px] bg-accent text-white">
            <Library size={18} strokeWidth={2.2} aria-hidden />
          </span>
          <span className="flex flex-1 flex-col gap-px">
            <span className="text-[15px] font-extrabold">Buka lemari kriteria</span>
            <span className="text-[12.5px] text-muted">
              {sisa > 0 ? `${sisa} kriteria lagi bisa dipasang` : `Rakitan penuh (maks ${MAKS_KRITERIA})`}
            </span>
          </span>
          <ChevronUp size={20} strokeWidth={2.4} className="text-muted" aria-hidden />
        </Dialog.Trigger>
        {n > 0 ? (
          <PrimaryButton
            href={buildHref("/hasil", filter, PARAM_OK)}
            block
            className="h-[52px] rounded-[14px] text-base font-extrabold"
          >
            Lihat peringkat
          </PrimaryButton>
        ) : (
          <button
            type="button"
            disabled
            className="h-[52px] cursor-not-allowed rounded-[14px] bg-[#9DB5E3] text-base font-extrabold text-white"
          >
            Lihat peringkat
          </button>
        )}
      </div>

      <LemariSheet open={buka} kriteria={kriteria} onToggle={toggleDiLemari} />
    </Dialog.Root>
  );
}
