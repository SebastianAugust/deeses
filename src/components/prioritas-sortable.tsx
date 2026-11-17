"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { AnimatedText } from "@/components/animated-text";
import { infoKriteria, type KodeKriteria } from "@/config/kriteria";
import { pengumumanUrutan, INSTRUKSI_SERET } from "@/lib/dnd-teks";
import { TRANSISI_DND } from "@/lib/motion";
import { useDiBrowser } from "@/lib/use-media";
import { bobotPerPosisi, formatPersen } from "@/lib/weights";
import { cn } from "@/lib/utils";

const hanyaVertikal: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type Keadaan = "diam" | "bayangan" | "melayang";

function kelasBaris(keadaan: Keadaan) {
  return cn(
    "relative flex h-[38px] items-center gap-2 rounded-[11px] px-2.5 select-none",
    keadaan === "melayang" &&
      "cursor-grabbing scale-[1.03] border-[1.5px] border-accent bg-white shadow-[0_8px_18px_rgba(29,95,209,.25)] motion-reduce:scale-100",
    keadaan === "bayangan" && "border-[1.5px] border-dashed border-accent/50 bg-soft/60 [&>*]:opacity-40",
    keadaan === "diam" &&
      "group/baris cursor-grab border border-line bg-white/60 transition-colors duration-150 ease-out hover:bg-white/90",
  );
}

function IsiBaris({ kode, posisi, bobot }: { kode: KodeKriteria; posisi: number; bobot: number }) {
  return (
    <>
      <span className="w-4 text-xs font-bold text-muted tabular-nums">
        <AnimatedText value={posisi + 1} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{infoKriteria(kode).nama}</span>
      <span className="rounded-md bg-soft px-1.5 py-0.5 text-[11px] font-bold text-accent-ink">
        <AnimatedText value={formatPersen(bobot)} />
      </span>
      <GripVertical
        size={12}
        className="flex-none text-[#6B7383] transition-colors duration-150 group-hover/baris:text-ink"
        aria-hidden
      />
    </>
  );
}

function BarisSortable({
  kode,
  bobotPosisi,
  animasi,
}: {
  kode: KodeKriteria;
  bobotPosisi: number[];
  animasi: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting, index, newIndex } =
    useSortable({ id: kode, transition: animasi ? TRANSISI_DND : null });
  // Selama menyeret, nomor & bobot mengikuti posisi sementara tiap baris.
  const posisi = isSorting ? newIndex : index;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(kelasBaris(isDragging ? "bayangan" : "diam"), "tekan touch-none")}
      {...attributes}
      {...listeners}
      aria-label={`${infoKriteria(kode).nama}, prioritas ${posisi + 1} dari ${bobotPosisi.length}, bobot ${formatPersen(bobotPosisi[posisi])}`}
    >
      <IsiBaris kode={kode} posisi={posisi} bobot={bobotPosisi[posisi]} />
    </li>
  );
}

/**
 * Daftar ringkas kriteria terpasang yang bisa diurutkan ulang (sidebar /hasil
 * desktop). Pointer + keyboard (spasi/Enter angkat, panah pindah, Escape batal),
 * bobot rank-sum ikut berubah, perubahan diumumkan lewat live region dnd-kit.
 * Memasang/melepas piece dilakukan di /prioritas.
 */
export function PrioritasSortable({
  kriteria,
  onChange,
  className,
}: {
  kriteria: KodeKriteria[];
  onChange: (kriteria: KodeKriteria[]) => void;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const diBrowser = useDiBrowser();
  const dndId = useId();
  const [aktif, setAktif] = useState<KodeKriteria | null>(null);
  const [atas, setAtas] = useState<KodeKriteria | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const bobotPosisi = bobotPerPosisi(kriteria.length);

  // Kursor "grabbing" di seluruh halaman selama drag (globals.css: body.sedang-menyeret).
  useEffect(() => {
    if (!aktif) return;
    document.body.classList.add("sedang-menyeret");
    return () => document.body.classList.remove("sedang-menyeret");
  }, [aktif]);

  function selesai() {
    setAktif(null);
    setAtas(null);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    selesai();
    if (!over || active.id === over.id) return;
    const dari = kriteria.indexOf(active.id as KodeKriteria);
    const ke = kriteria.indexOf(over.id as KodeKriteria);
    if (dari < 0 || ke < 0) return;
    onChange(arrayMove(kriteria, dari, ke));
  }

  const posisiMelayang = aktif ? kriteria.indexOf(atas ?? aktif) : 0;
  // Portal ke body: kartu kaca (backdrop-filter) menjadi containing block untuk elemen fixed.
  const overlay = (
    <DragOverlay
      modifiers={[hanyaVertikal]}
      dropAnimation={reduced ? null : { duration: TRANSISI_DND.duration, easing: TRANSISI_DND.easing }}
      zIndex={60}
    >
      {aktif ? (
        <div className={kelasBaris("melayang")}>
          <IsiBaris kode={aktif} posisi={posisiMelayang} bobot={bobotPosisi[posisiMelayang]} />
        </div>
      ) : null}
    </DragOverlay>
  );

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[hanyaVertikal]}
      onDragStart={({ active }) => setAktif(active.id as KodeKriteria)}
      onDragOver={({ over }) => setAtas((over?.id as KodeKriteria | undefined) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={selesai}
      accessibility={{
        announcements: pengumumanUrutan(kriteria),
        screenReaderInstructions: { draggable: INSTRUKSI_SERET },
      }}
    >
      <SortableContext items={kriteria} strategy={verticalListSortingStrategy}>
        <ol className={cn("flex flex-col gap-1.5", className)} aria-label="Urutan prioritas kriteria">
          {kriteria.map((kode) => (
            <BarisSortable key={kode} kode={kode} bobotPosisi={bobotPosisi} animasi={!reduced} />
          ))}
        </ol>
      </SortableContext>
      {diBrowser ? createPortal(overlay, document.body) : null}
    </DndContext>
  );
}
