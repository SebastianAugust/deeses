"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
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
import { KriteriaIcon } from "@/components/kriteria-icon";
import { PrimaryButton } from "@/components/primary-button";
import { StepHeader } from "@/components/step-header";
import { StickyBottomBar } from "@/components/sticky-bottom-bar";
import { infoKriteria } from "@/lib/explain";
import { DEFAULT_URUTAN, buildHref } from "@/lib/query";
import type { Kriteria } from "@/lib/types";
import { gantiUrl, useFilter } from "@/lib/use-filter";
import { formatPersen, rankSumWeights } from "@/lib/weights";
import { cn } from "@/lib/utils";

const hanyaVertikal: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const nama = (id: UniqueIdentifier) => infoKriteria(id as Kriteria).nama;

type BarisProps = {
  kode: Kriteria;
  /** Bobot per posisi (indeks 0 = prioritas tertinggi). */
  bobotPosisi: number[];
};

function BarisKriteria({ kode, bobotPosisi }: BarisProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
    index,
    newIndex,
  } = useSortable({ id: kode });
  const info = infoKriteria(kode);
  // Selama menyeret, nomor & bobot mengikuti posisi sementara tiap baris.
  const posisi = isSorting ? newIndex : index;
  const total = bobotPosisi.length;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: `${CSS.Translate.toString(transform) ?? ""}${isDragging ? " scale(1.03)" : ""}`,
        transition,
      }}
      className={cn(
        "relative flex h-14 cursor-grab items-center gap-3 rounded-[16px] pl-2.5 backdrop-blur-[20px] backdrop-saturate-[1.6] select-none",
        isDragging
          ? "z-10 cursor-grabbing border-2 border-accent bg-white/78 shadow-[0_14px_28px_rgba(29,95,209,.28)]"
          : "border border-white/90 bg-white/55 shadow-[0_4px_12px_rgba(30,45,90,.10)]",
      )}
      {...listeners}
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-soft text-accent-ink">
        <KriteriaIcon nama={info.ikon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold">
          {posisi + 1}. {info.nama}
        </span>
        <span className="truncate text-[11px] text-muted">
          {isDragging ? "Sedang dipindah…" : info.hint}
        </span>
      </div>
      <span className="rounded-lg bg-soft px-2 py-1 text-xs font-bold text-accent-ink tabular-nums">
        {formatPersen(bobotPosisi[posisi])}
      </span>
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Pindahkan ${info.nama}, posisi ${posisi + 1} dari ${total}`}
        className="flex size-11 flex-none cursor-grab touch-none items-center justify-center rounded-[12px] text-muted focus-visible:outline-2 focus-visible:outline-accent"
        {...attributes}
      >
        <GripVertical size={18} aria-hidden />
      </button>
    </li>
  );
}

export function PrioritasList() {
  const filter = useFilter();
  const [urutan, setUrutan] = useState<Kriteria[]>(filter.urutan);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const bobot = rankSumWeights(urutan);
  const bobotPosisi = urutan.map((k) => bobot[k]);
  const sekarang = { ...filter, urutan };

  function terapkan(baru: Kriteria[]) {
    setUrutan(baru);
    gantiUrl(buildHref("/prioritas", { ...filter, urutan: baru }));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const dari = urutan.indexOf(active.id as Kriteria);
    const ke = urutan.indexOf(over.id as Kriteria);
    if (dari < 0 || ke < 0) return;
    terapkan(arrayMove(urutan, dari, ke));
  }

  const posisi = (id: UniqueIdentifier) => urutan.indexOf(id as Kriteria) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${nama(active.id)} diangkat dari posisi ${posisi(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nama(active.id)} dipindah ke posisi ${posisi(over.id)} dari ${urutan.length}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nama(active.id)} diletakkan di posisi ${posisi(over.id)} dari ${urutan.length}.`
        : `${nama(active.id)} diletakkan.`,
    onDragCancel: ({ active }) =>
      `Pemindahan dibatalkan. ${nama(active.id)} kembali ke posisi ${posisi(active.id)}.`,
  };

  const sudahDefault = urutan.join(",") === DEFAULT_URUTAN.join(",");

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-28">
      <StepHeader
        backHref={buildHref("/filter", sekarang)}
        backLabel="Kembali"
        backPakaiRiwayat
        langkah={2}
        total={2}
        kanan={
          <button
            type="button"
            onClick={() => terapkan([...DEFAULT_URUTAN])}
            disabled={sudahDefault}
            className="min-h-11 px-2 text-[13px] font-semibold text-accent-ink disabled:opacity-50"
          >
            Reset
          </button>
        }
      />

      <div className="flex flex-col gap-1.5 px-5 pt-[18px] pb-3.5">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Apa yang paling penting?</h1>
        <p className="text-[13px] leading-normal text-muted">
          Seret untuk mengurutkan. Paling atas dapat bobot terbesar.
        </p>
      </div>

      <DndContext
        id="prioritas-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[hanyaVertikal]}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Tekan spasi atau Enter untuk mengangkat kriteria. Gunakan panah atas dan bawah untuk memindahkan, spasi atau Enter untuk meletakkan, Escape untuk membatalkan.",
          },
        }}
      >
        <SortableContext items={urutan} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2 px-4" aria-label="Urutan prioritas kriteria">
            {urutan.map((kode) => (
              <BarisKriteria key={kode} kode={kode} bobotPosisi={bobotPosisi} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <StickyBottomBar>
        <PrimaryButton href={buildHref("/hasil", sekarang)} block className="text-base">
          Tampilkan hasil
        </PrimaryButton>
      </StickyBottomBar>
    </main>
  );
}
