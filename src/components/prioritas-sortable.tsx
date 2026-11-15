"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
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
import { useReducedMotion } from "motion/react";
import { AnimatedText } from "@/components/animated-text";
import { KriteriaIcon } from "@/components/kriteria-icon";
import { infoKriteria } from "@/lib/explain";
import { TRANSISI_DND } from "@/lib/motion";
import type { Kriteria } from "@/lib/types";
import { useDiBrowser } from "@/lib/use-media";
import { formatPersen, rankSumWeights } from "@/lib/weights";
import { cn } from "@/lib/utils";

type Varian = "penuh" | "ringkas" | "besar";
type Keadaan = "diam" | "bayangan" | "melayang";

/** Varian "besar": 3 prioritas teratas tampil lebih menonjol. */
const JUMLAH_MENONJOL = 3;

const hanyaVertikal: Modifier = ({ transform }) => ({ ...transform, x: 0 });
const nama = (id: UniqueIdentifier) => infoKriteria(id as Kriteria).nama;

/* ------------------------------ Tampilan baris ----------------------------- */

function kelasBaris(varian: Varian, keadaan: Keadaan, menonjol = false) {
  if (varian === "besar") {
    return cn(
      "relative flex items-center gap-3.5 rounded-[18px] px-[18px] select-none backdrop-blur-[20px] backdrop-saturate-[1.6]",
      menonjol ? "h-[68px]" : "h-14",
      keadaan === "melayang" &&
        "cursor-grabbing border-2 border-accent bg-white shadow-[0_16px_34px_rgba(29,95,209,.25)] scale-[1.015] rotate-[-0.4deg] motion-reduce:scale-100 motion-reduce:rotate-0",
      keadaan === "bayangan" &&
        "border-[1.5px] border-dashed border-accent/50 bg-soft/60 [&>*]:opacity-40",
      keadaan === "diam" &&
        cn(
          "group/baris cursor-grab border border-white/95",
          menonjol
            ? "bg-white/72 shadow-[0_8px_22px_rgba(30,45,90,.08)] hover:bg-white/90"
            : "bg-white/50 hover:bg-white/80",
        ),
    );
  }
  const penuh = varian === "penuh";
  return cn(
    "relative flex items-center select-none",
    penuh
      ? "h-14 gap-3 rounded-[16px] pl-2.5 backdrop-blur-[20px] backdrop-saturate-[1.6]"
      : "h-[38px] gap-2 rounded-[11px] px-2.5",
    keadaan === "melayang" &&
      cn(
        "cursor-grabbing bg-white scale-[1.03] motion-reduce:scale-100",
        penuh
          ? "border-2 border-accent shadow-[0_14px_28px_rgba(29,95,209,.28)]"
          : "border-[1.5px] border-accent shadow-[0_8px_18px_rgba(29,95,209,.25)]",
      ),
    keadaan === "bayangan" &&
      "border-[1.5px] border-dashed border-accent/50 bg-soft/60 [&>*]:opacity-40",
    keadaan === "diam" &&
      cn(
        "group/baris cursor-grab transition-colors duration-150 ease-out",
        penuh
          ? "border border-white/90 bg-white/55 shadow-[0_4px_12px_rgba(30,45,90,.10)] hover:bg-white/85"
          : "border border-line bg-white/60 hover:bg-white/90",
      ),
  );
}

/** Ikon pegangan: abu, menjadi ink saat baris di-hover. */
const KELAS_PEGANGAN = "flex-none text-[#8A91A1] transition-colors duration-150 group-hover/baris:text-ink";

function IsiBaris({
  kode,
  posisi,
  bobot,
  varian,
  keadaan,
  pegangan,
  menonjol = false,
}: {
  kode: Kriteria;
  posisi: number;
  bobot: number;
  varian: Varian;
  keadaan: Keadaan;
  /** Elemen pegangan (tombol handle di varian penuh). */
  pegangan?: ReactNode;
  /** Varian besar: termasuk 3 teratas (tile accent, baris lebih tinggi). */
  menonjol?: boolean;
}) {
  const info = infoKriteria(kode);
  if (varian === "besar") {
    return (
      <>
        <GripVertical size={16} className={KELAS_PEGANGAN} aria-hidden />
        <span
          className={cn(
            "w-[22px] text-sm font-extrabold",
            menonjol ? "text-accent-ink" : "text-[#8A91A1]",
          )}
        >
          <AnimatedText value={posisi + 1} />
        </span>
        <span
          className={cn(
            "flex flex-none items-center justify-center rounded-[12px] transition-colors duration-200",
            menonjol ? "size-[42px] bg-accent text-white" : "size-9 bg-soft text-accent-ink",
          )}
        >
          <KriteriaIcon nama={info.ikon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate font-bold", menonjol ? "text-base" : "text-[15px]")}>
            {info.nama}
          </span>
          <span className="truncate text-xs text-muted">
            {keadaan === "melayang" ? "Sedang diseret…" : info.hint}
          </span>
        </div>
        <span
          className={cn(
            "text-[15px] font-extrabold",
            menonjol ? "text-accent-ink" : "text-muted",
          )}
        >
          <AnimatedText value={formatPersen(bobot)} />
        </span>
      </>
    );
  }
  if (varian === "ringkas") {
    return (
      <>
        <span className="w-3.5 text-xs font-bold text-muted tabular-nums">
          <AnimatedText value={posisi + 1} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{info.nama}</span>
        <span className="rounded-md bg-soft px-1.5 py-0.5 text-[11px] font-bold text-accent-ink">
          <AnimatedText value={formatPersen(bobot)} />
        </span>
        <GripVertical size={12} className={KELAS_PEGANGAN} aria-hidden />
      </>
    );
  }
  return (
    <>
      <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-soft text-accent-ink">
        <KriteriaIcon nama={info.ikon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex truncate text-sm font-bold">
          <AnimatedText value={posisi + 1} />. {info.nama}
        </span>
        <span className="truncate text-[11px] text-muted">
          {keadaan === "melayang" ? "Sedang dipindah…" : info.hint}
        </span>
      </div>
      <span className="rounded-lg bg-soft px-2 py-1 text-xs font-bold text-accent-ink">
        <AnimatedText value={formatPersen(bobot)} />
      </span>
      {pegangan ?? (
        <span className="flex size-11 flex-none items-center justify-center text-muted">
          <GripVertical size={18} aria-hidden />
        </span>
      )}
    </>
  );
}

/* ------------------------------ Baris sortable ----------------------------- */

function BarisSortable({
  kode,
  bobotPosisi,
  varian,
  animasi,
}: {
  kode: Kriteria;
  /** Bobot per posisi (indeks 0 = prioritas tertinggi). */
  bobotPosisi: number[];
  varian: Varian;
  animasi: boolean;
}) {
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
  } = useSortable({ id: kode, transition: animasi ? TRANSISI_DND : null });
  // Selama menyeret, nomor & bobot mengikuti posisi sementara tiap baris.
  const posisi = isSorting ? newIndex : index;
  const total = bobotPosisi.length;
  const info = infoKriteria(kode);
  const keadaan: Keadaan = isDragging ? "bayangan" : "diam";
  const style = { transform: CSS.Translate.toString(transform), transition };

  if (varian === "ringkas" || varian === "besar") {
    // Seluruh baris jadi pegangan (fokus keyboard + seret).
    // Tinggi baris (menonjol) mengikuti posisi tersimpan, bukan posisi
    // sementara saat diseret, supaya ukuran tidak berubah di tengah drag.
    const menonjol = varian === "besar" && index < JUMLAH_MENONJOL;
    return (
      <li
        ref={setNodeRef}
        style={style}
        className={cn(kelasBaris(varian, keadaan, menonjol), "tekan touch-none")}
        {...attributes}
        {...listeners}
        aria-label={`${info.nama}, prioritas ${posisi + 1} dari ${total}, bobot ${formatPersen(bobotPosisi[posisi])}`}
      >
        <IsiBaris
          kode={kode}
          posisi={posisi}
          bobot={bobotPosisi[posisi]}
          varian={varian}
          keadaan={keadaan}
          menonjol={menonjol}
        />
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} className={kelasBaris(varian, keadaan)} {...listeners}>
      <IsiBaris
        kode={kode}
        posisi={posisi}
        bobot={bobotPosisi[posisi]}
        varian={varian}
        keadaan={keadaan}
        pegangan={
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Pindahkan ${info.nama}, posisi ${posisi + 1} dari ${total}`}
            className="tekan flex size-11 flex-none cursor-grab touch-none items-center justify-center rounded-[12px] text-muted group-hover/baris:text-ink hover:bg-white/70 active:cursor-grabbing"
            {...attributes}
          >
            <GripVertical size={18} aria-hidden />
          </button>
        }
      />
    </li>
  );
}

/* --------------------------------- Daftar --------------------------------- */

type PrioritasSortableProps = {
  urutan: Kriteria[];
  onChange: (urutan: Kriteria[]) => void;
  /**
   * "penuh" = halaman /prioritas (baris 56px), "ringkas" = sidebar /hasil (38px),
   * "besar" = langkah prioritas di Home desktop (3 teratas 68px, sisanya 56px).
   */
  varian?: Varian;
  className?: string;
};

/**
 * Daftar 8 kriteria yang bisa diurutkan (dnd-kit): pointer + keyboard
 * (spasi/Enter angkat, panah pindah, Escape batal), DragOverlay melayang,
 * baris lain bergeser halus, bobot rank-sum ikut berubah, getar 10 ms saat drop.
 * Perubahan diumumkan lewat live region dnd-kit.
 */
export function PrioritasSortable({
  urutan,
  onChange,
  varian = "penuh",
  className,
}: PrioritasSortableProps) {
  const reduced = useReducedMotion() ?? false;
  const diBrowser = useDiBrowser();
  const dndId = useId();
  const [aktif, setAktif] = useState<Kriteria | null>(null);
  const [atas, setAtas] = useState<Kriteria | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const bobot = rankSumWeights(urutan);
  const bobotPosisi = urutan.map((k) => bobot[k]);
  const posisi = (id: UniqueIdentifier) => urutan.indexOf(id as Kriteria) + 1;

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
    const dari = urutan.indexOf(active.id as Kriteria);
    const ke = urutan.indexOf(over.id as Kriteria);
    if (dari < 0 || ke < 0) return;
    onChange(arrayMove(urutan, dari, ke));
    // Getar singkat di HP (diabaikan browser yang tidak mendukung).
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${nama(active.id)} diangkat dari posisi ${posisi(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nama(active.id)} dipindah ke posisi ${posisi(over.id)} dari ${urutan.length}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nama(active.id)} diletakkan di posisi ${posisi(over.id)} dari ${urutan.length}.`
        : `${nama(active.id)} diletakkan.`,
    onDragCancel: ({ active }) =>
      `Pemindahan dibatalkan. ${nama(active.id)} kembali ke posisi ${posisi(active.id)}.`,
  };

  const posisiMelayang = aktif ? urutan.indexOf(atas ?? aktif) : 0;
  const overlayMenonjol = varian === "besar" && aktif !== null && urutan.indexOf(aktif) < JUMLAH_MENONJOL;

  // Portal ke body: kartu kaca (backdrop-filter) menjadi containing block
  // untuk elemen fixed, jadi overlay harus di luar kartu.
  const overlay = (
    <DragOverlay
      modifiers={[hanyaVertikal]}
      dropAnimation={reduced ? null : { duration: TRANSISI_DND.duration, easing: TRANSISI_DND.easing }}
      zIndex={60}
    >
      {aktif ? (
        <div className={kelasBaris(varian, "melayang", overlayMenonjol)}>
          <IsiBaris
            kode={aktif}
            posisi={posisiMelayang}
            bobot={bobotPosisi[posisiMelayang]}
            varian={varian}
            keadaan="melayang"
            menonjol={overlayMenonjol}
          />
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
      onDragStart={({ active }) => setAktif(active.id as Kriteria)}
      onDragOver={({ over }) => setAtas((over?.id as Kriteria | undefined) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={selesai}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Tekan spasi atau Enter untuk mengangkat kriteria. Gunakan panah atas dan bawah untuk memindahkan, spasi atau Enter untuk meletakkan, Escape untuk membatalkan.",
        },
      }}
    >
      <SortableContext items={urutan} strategy={verticalListSortingStrategy}>
        <ol
          className={cn(
            "flex flex-col",
            varian === "ringkas" ? "gap-1.5" : varian === "besar" ? "gap-2.5" : "gap-2",
            className,
          )}
          aria-label="Urutan prioritas kriteria"
        >
          {urutan.map((kode) => (
            <BarisSortable
              key={kode}
              kode={kode}
              bobotPosisi={bobotPosisi}
              varian={varian}
              animasi={!reduced}
            />
          ))}
        </ol>
      </SortableContext>
      {diBrowser ? createPortal(overlay, document.body) : null}
    </DndContext>
  );
}
