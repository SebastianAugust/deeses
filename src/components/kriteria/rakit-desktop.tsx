"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type MouseEvent,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { PrimaryButton } from "@/components/primary-button";
import { Logo } from "@/components/ui/logo";
import {
  BATAS_PERINGATAN_KRITERIA,
  MAKS_KRITERIA,
  arahKriteria,
  infoKriteria,
  katalogTerkelompok,
  type KodeKriteria,
  type KriteriaInfo,
} from "@/config/kriteria";
import { SITE_NAME } from "@/config/site";
import { INSTRUKSI_SERET, namaDariId } from "@/lib/dnd-teks";
import { TRANSISI_DND } from "@/lib/motion";
import { PARAM_OK, buildHref, type FilterState } from "@/lib/query";
import { useKategoriAktif } from "@/lib/use-kategori-aktif";
import { useDiBrowser } from "@/lib/use-media";
import type { Rakitan } from "@/lib/use-rakitan";
import { bobotPerPosisi, formatPersen } from "@/lib/weights";
import { cn } from "@/lib/utils";
import { BarBobot, ChipKategori, GarisJatuh, IsiPrioritas, labelBaris } from "./bagian";

/* ------------------------------ Logika seret ------------------------------ */

const ZONA_RAK = "zona-rak";
const ZONA_KATALOG = "zona-katalog";
const AWALAN_KATALOG = "katalog:";
const ID_BAGIAN = (kategori: string) => `kat-${kategori}`;

type Asal = { asal: "katalog" | "rak"; kode: KodeKriteria };
type Sasaran = { jenis: "sebelum"; kode: KodeKriteria } | { jenis: "akhir" } | { jenis: "katalog" } | null;

function bacaAsal(id: UniqueIdentifier): Asal {
  const s = String(id);
  return s.startsWith(AWALAN_KATALOG)
    ? { asal: "katalog", kode: s.slice(AWALAN_KATALOG.length) as KodeKriteria }
    : { asal: "rak", kode: s as KodeKriteria };
}

/**
 * Ke mana item akan jatuh, dari elemen di bawah penunjuk.
 * Kartu katalog → sebelum item yang ditunjuk / akhir rak.
 * Item rak → pindah posisi (turun: setelah item ditunjuk), atau lepas di katalog.
 * null = tidak ada perubahan.
 */
function hitungSasaran(aktif: Asal, overId: UniqueIdentifier | null | undefined, kriteria: KodeKriteria[]): Sasaran {
  if (overId == null) return null;
  const o = String(overId);
  const iAktif = kriteria.indexOf(aktif.kode);
  if (o === ZONA_KATALOG) return aktif.asal === "rak" ? { jenis: "katalog" } : null;
  if (o === ZONA_RAK) {
    if (aktif.asal === "rak" && iAktif === kriteria.length - 1) return null;
    return { jenis: "akhir" };
  }
  const iOver = kriteria.indexOf(o as KodeKriteria);
  if (iOver < 0) return null;
  if (aktif.asal === "katalog") return { jenis: "sebelum", kode: kriteria[iOver] };
  if (iOver === iAktif) return null;
  if (iOver > iAktif) {
    const berikut = kriteria[iOver + 1];
    return berikut ? { jenis: "sebelum", kode: berikut } : { jenis: "akhir" };
  }
  return { jenis: "sebelum", kode: kriteria[iOver] };
}

/** Penunjuk → item rak dulu, baru zona. Keyboard → hanya item rak. */
const deteksiTabrakan: CollisionDetection = (args) => {
  if (args.pointerCoordinates) {
    const kena = pointerWithin(args);
    const item = kena.filter((k) => k.id !== ZONA_RAK && k.id !== ZONA_KATALOG);
    return item.length > 0 ? item : kena;
  }
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => c.id !== ZONA_RAK && c.id !== ZONA_KATALOG),
  });
};

/* --------------------------------- Kartu --------------------------------- */

function KartuPiece({
  info,
  terpasang,
  penuh,
  onToggle,
}: {
  info: KriteriaInfo;
  terpasang: boolean;
  penuh: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: AWALAN_KATALOG + info.kode,
    disabled: terpasang,
  });
  const idKet = useId();
  const arah = arahKriteria(info.jenis);
  const terkunci = !terpasang && penuh;
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-pressed={terpasang}
      aria-describedby={idKet}
      aria-disabled={terkunci || undefined}
      onClick={onToggle}
      // Hanya seret dengan penunjuk; Enter/spasi tetap = klik (pasang/lepas).
      onPointerDown={terpasang ? undefined : (listeners?.onPointerDown as PointerEventHandler | undefined)}
      className={cn(
        "group flex h-full min-h-[128px] w-full cursor-pointer flex-col items-start gap-2 rounded-[16px] border-[1.5px] p-3.5 text-left text-ink",
        "transition-[border-color,background-color,opacity,translate] duration-150 ease-out hover:-translate-y-px hover:border-accent motion-reduce:hover:translate-y-0",
        terpasang ? "border-accent bg-soft" : "border-line bg-white",
        isDragging && "opacity-45",
        terkunci && "opacity-60",
      )}
    >
      <span className="flex w-full items-start gap-2">
        <GripVertical
          size={14}
          aria-hidden
          className={cn("mt-0.5 flex-none", terpasang ? "text-[#9DB5E3]" : "text-[#6B7383]")}
        />
        <span className="flex-1 text-[15px] leading-[1.3] font-bold">{info.nama}</span>
        <span
          aria-hidden
          className={cn(
            "flex size-[22px] flex-none items-center justify-center rounded-full",
            terpasang ? "bg-accent text-white" : "border border-line bg-[#F3F6FB] text-muted",
          )}
        >
          {terpasang ? <Check size={14} strokeWidth={2.8} /> : <Plus size={14} strokeWidth={2.8} />}
        </span>
      </span>
      <span id={idKet} className="pl-[22px] text-[12.5px] leading-[1.45] text-muted">
        {info.deskripsi}
        <span className="sr-only"> {arah}.</span>
      </span>
      <span
        aria-hidden
        className="mt-auto ml-[22px] rounded-full border border-line bg-[#F3F6FB] px-2 py-0.5 text-[11.5px] font-semibold text-muted"
      >
        {arah}
      </span>
    </button>
  );
}

/* ------------------------------- Item rak -------------------------------- */

function TombolIkon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="tekan flex size-11 flex-none cursor-pointer items-center justify-center rounded-[10px] text-muted hover:bg-soft hover:text-ink disabled:cursor-default disabled:text-[#C4CAD6] disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function ItemRak({
  kode,
  posisi,
  n,
  garisAtas,
  onNaik,
  onTurun,
  onLepas,
}: {
  kode: KodeKriteria;
  posisi: number;
  n: number;
  garisAtas: boolean;
  onNaik: () => void;
  onTurun: () => void;
  onLepas: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({
    id: kode,
    attributes: { role: "group", roleDescription: "kriteria terpasang" },
  });
  const nama = infoKriteria(kode).nama;
  return (
    <li ref={setNodeRef} className="py-1">
      <GarisJatuh tampil={garisAtas} className="mb-1" />
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={labelBaris(kode, posisi, n)}
        className={cn(
          "flex cursor-grab items-center gap-2 rounded-[14px] border border-line bg-[#F9FBFE] py-1 pr-1 pl-2.5 select-none active:cursor-grabbing",
          isDragging && "opacity-45",
        )}
      >
        <GripVertical size={14} aria-hidden className="flex-none text-[#6B7383]" />
        <IsiPrioritas kode={kode} posisi={posisi} n={n} />
        <span className="flex flex-none">
          <TombolIkon label={`Naikkan prioritas ${nama}`} onClick={onNaik} disabled={posisi === 0}>
            <ChevronUp size={16} strokeWidth={2.4} aria-hidden />
          </TombolIkon>
          <TombolIkon label={`Turunkan prioritas ${nama}`} onClick={onTurun} disabled={posisi === n - 1}>
            <ChevronDown size={16} strokeWidth={2.4} aria-hidden />
          </TombolIkon>
          <TombolIkon label={`Lepas ${nama} dari rakitan`} onClick={onLepas}>
            <X size={16} strokeWidth={2.4} aria-hidden />
          </TombolIkon>
        </span>
      </div>
    </li>
  );
}

/* ------------------------------ Header langkah ----------------------------- */

const PIL = "inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-semibold";

function HeaderLangkah({ filter }: { filter: FilterState }) {
  const n = filter.kriteria.length;
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" aria-label={`${SITE_NAME}, ke beranda`} className="logo inline-flex min-h-11 items-center">
        <Logo ukuran="md" />
      </Link>
      <nav aria-label="Langkah">
        <ol className="flex items-center gap-2">
          <li>
            <Link
              href={buildHref("/", filter)}
              className={cn(PIL, "tekan border border-line bg-white text-muted hover:text-ink")}
            >
              1 Budget &amp; tipe
            </Link>
          </li>
          <li aria-current="step">
            <span className={cn(PIL, "bg-accent text-white")}>2 Kriteria</span>
          </li>
          <li>
            {n > 0 ? (
              <Link
                href={buildHref("/hasil", filter, PARAM_OK)}
                className={cn(PIL, "tekan border border-line bg-white text-muted hover:text-ink")}
              >
                3 Peringkat
              </Link>
            ) : (
              <span aria-disabled="true" className={cn(PIL, "border border-line bg-white text-muted")}>
                3 Peringkat
              </span>
            )}
          </li>
        </ol>
      </nav>
    </header>
  );
}

/* --------------------------------- Halaman -------------------------------- */

/**
 * Langkah kriteria desktop (mockup 09): chip kategori sticky + katalog kartu
 * per kategori di kiri, rak "Rakitanmu" sticky di kanan. Klik kartu = pasang/
 * lepas; seret kartu ke rak = pasang; seret item rak untuk mengurutkan, atau
 * ke katalog untuk melepas. Keyboard: Enter/spasi di kartu = pasang/lepas,
 * tombol naik/turun di rak, atau angkat item rak dengan spasi lalu panah.
 */
export function RakitDesktop({ filter, rakitan }: { filter: FilterState; rakitan: Rakitan }) {
  const { kriteria, penuh } = rakitan;
  const n = kriteria.length;
  const kelompok = useMemo(() => katalogTerkelompok(), []);
  const idBagian = useMemo(() => kelompok.map((k) => ID_BAGIAN(k.kode)), [kelompok]);
  const reduced = useReducedMotion() ?? false;
  const diBrowser = useDiBrowser();
  const dndId = useId();

  const [aktifKat, tandaiKat] = useKategoriAktif(idBagian, { rootMargin: "-90px 0px -55% 0px" });
  const [aktif, setAktif] = useState<Asal | null>(null);
  const [sasaran, setSasaran] = useState<Sasaran>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { setNodeRef: refKatalog } = useDroppable({ id: ZONA_KATALOG });
  const { setNodeRef: refRak } = useDroppable({ id: ZONA_RAK });

  useEffect(() => {
    if (!aktif) return;
    document.body.classList.add("sedang-menyeret");
    return () => document.body.classList.remove("sedang-menyeret");
  }, [aktif]);

  function selesai() {
    setAktif(null);
    setSasaran(null);
  }

  function terapkan(a: Asal, s: Sasaran) {
    if (!s) return;
    if (a.asal === "katalog") {
      rakitan.pasang(a.kode, s.jenis === "sebelum" ? s.kode : null);
      return;
    }
    if (s.jenis === "katalog") {
      rakitan.lepas(a.kode);
      return;
    }
    const dari = kriteria.indexOf(a.kode);
    if (s.jenis === "akhir") rakitan.pindah(dari, n - 1);
    else {
      const iSasaran = kriteria.indexOf(s.kode);
      rakitan.pindah(dari, iSasaran > dari ? iSasaran - 1 : iSasaran);
    }
  }

  function posisiAkhir(a: Asal, s: Sasaran): number {
    if (!s || s.jenis === "katalog") return -1;
    if (s.jenis === "akhir") return a.asal === "katalog" ? n + 1 : n;
    const i = kriteria.indexOf(s.kode);
    return a.asal === "katalog" || i < kriteria.indexOf(a.kode) ? i + 1 : i;
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const a = bacaAsal(active.id);
      return a.asal === "katalog"
        ? `${namaDariId(active.id)} diangkat dari katalog. Arahkan ke rakitan untuk memasang.`
        : `${namaDariId(active.id)} diangkat dari posisi ${kriteria.indexOf(a.kode) + 1}.`;
    },
    onDragOver: ({ active, over }) => {
      const s = hitungSasaran(bacaAsal(active.id), over?.id, kriteria);
      if (!s) return `${namaDariId(active.id)} tidak di atas tempat yang bisa dijatuhi.`;
      if (s.jenis === "katalog") return `Di atas katalog. Lepas untuk mencopot ${namaDariId(active.id)}.`;
      return `${namaDariId(active.id)} akan berada di posisi ${posisiAkhir(bacaAsal(active.id), s)}.`;
    },
    onDragEnd: ({ active, over }) => {
      const a = bacaAsal(active.id);
      const s = hitungSasaran(a, over?.id, kriteria);
      if (!s) return `${namaDariId(active.id)} diletakkan, tidak ada perubahan.`;
      if (s.jenis === "katalog") return `${namaDariId(active.id)} dilepas dari rakitan.`;
      const kata = a.asal === "katalog" ? "dipasang" : "dipindah";
      return `${namaDariId(active.id)} ${kata} di posisi ${posisiAkhir(a, s)}.`;
    },
    onDragCancel: ({ active }) => `Dibatalkan. ${namaDariId(active.id)} tidak berubah.`,
  };

  function lompat(e: MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    tandaiKat(id);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  const menyeret = aktif !== null;
  const dariRak = aktif?.asal === "rak";
  const zonaAktif = menyeret && sasaran !== null && sasaran.jenis !== "katalog";
  const bobotTerbawah = n > 0 ? bobotPerPosisi(n)[n - 1] : 0;
  const hrefHasil = buildHref("/hasil", filter, PARAM_OK);

  const overlay = (
    <DragOverlay
      dropAnimation={reduced ? null : { duration: TRANSISI_DND.duration, easing: TRANSISI_DND.easing }}
      zIndex={60}
    >
      {aktif ? (
        aktif.asal === "katalog" ? (
          <div className="flex h-full w-full cursor-grabbing flex-col gap-2 rounded-[16px] border-2 border-accent bg-white p-3.5 shadow-[0_16px_34px_rgba(29,95,209,.25)]">
            <span className="text-[15px] font-bold">{infoKriteria(aktif.kode).nama}</span>
            <span className="text-[12.5px] text-muted">{arahKriteria(infoKriteria(aktif.kode).jenis)}</span>
          </div>
        ) : (
          <div className="flex h-full w-full cursor-grabbing items-center gap-2 rounded-[14px] border-2 border-accent bg-white py-1 pr-3 pl-2.5 shadow-[0_14px_28px_rgba(29,95,209,.28)]">
            <GripVertical size={14} aria-hidden className="flex-none text-[#6B7383]" />
            <IsiPrioritas kode={aktif.kode} posisi={Math.max(0, kriteria.indexOf(aktif.kode))} n={n} />
          </div>
        )
      ) : null}
    </DragOverlay>
  );

  return (
    <div className="flex flex-1 justify-center px-10 pt-7 pb-16">
      <div className="flex w-full max-w-[1280px] flex-col gap-6">
        <HeaderLangkah filter={filter} />

        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px] leading-[1.15] font-extrabold tracking-[-0.02em]">
            Rakit kriteria yang kamu pedulikan
          </h1>
          <p className="max-w-[780px] text-base leading-normal text-muted">
            Klik kartu atau seret ke rakitan. Urutan di rakitan menentukan bobot: yang paling atas paling
            berpengaruh.
          </p>
        </div>

        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={deteksiTabrakan}
          onDragStart={({ active }) => setAktif(bacaAsal(active.id))}
          onDragOver={({ active, over }) => setSasaran(hitungSasaran(bacaAsal(active.id), over?.id, kriteria))}
          onDragEnd={({ active, over }) => {
            const a = bacaAsal(active.id);
            const s = hitungSasaran(a, over?.id, kriteria);
            selesai();
            terapkan(a, s);
          }}
          onDragCancel={selesai}
          accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUKSI_SERET } }}
        >
          <div className="flex items-start gap-6">
            <section
              ref={refKatalog}
              aria-label="Katalog kriteria"
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-[22px] rounded-[20px] outline-offset-8 transition-[outline-color] duration-150",
                dariRak && "outline-2 outline-dashed",
                dariRak && sasaran?.jenis === "katalog" ? "outline-accent" : dariRak ? "outline-[#9DB5E3]" : "",
              )}
            >
              <nav
                aria-label="Lompat ke kategori"
                className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 bg-[rgba(243,246,251,0.94)] px-1 py-3 backdrop-blur-sm"
              >
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
                    />
                  );
                })}
              </nav>

              {dariRak ? (
                <p role="status" className="-mt-3 text-[13px] font-semibold text-accent-ink">
                  Lepas di area katalog untuk mencopot kriteria dari rakitan.
                </p>
              ) : null}

              {kelompok.map((k) => {
                const dipasang = k.kriteria.filter((p) => kriteria.includes(p.kode)).length;
                const idJudul = `judul-${ID_BAGIAN(k.kode)}`;
                return (
                  <section
                    key={k.kode}
                    id={ID_BAGIAN(k.kode)}
                    aria-labelledby={idJudul}
                    className="flex scroll-mt-[76px] flex-col gap-3"
                  >
                    <div className="flex items-baseline gap-2.5">
                      <h2 id={idJudul} className="text-xl font-extrabold">
                        {k.nama}
                      </h2>
                      <span className="text-[13px] font-semibold text-muted">
                        {dipasang} dari {k.kriteria.length} dipasang
                      </span>
                    </div>
                    <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {k.kriteria.map((p) => (
                        <li key={p.kode} className="flex">
                          <KartuPiece
                            info={p}
                            terpasang={kriteria.includes(p.kode)}
                            penuh={penuh}
                            onToggle={() => rakitan.toggle(p.kode)}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </section>

            <aside
              aria-label="Rakitan kriteria"
              className="sticky top-4 flex max-h-[calc(100vh-32px)] w-[400px] flex-none flex-col gap-3 overflow-y-auto p-1 xl:w-[440px]"
            >
              <div
                ref={refRak}
                className={cn(
                  "flex min-h-[300px] flex-col gap-3.5 rounded-[20px] border-2 p-[18px] shadow-[0_8px_30px_rgba(29,95,209,0.08)] transition-colors duration-150",
                  menyeret ? "border-dashed border-accent" : "border-solid border-line",
                  zonaAktif ? "bg-[#EEF4FE]" : "bg-white",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[19px] font-extrabold">Rakitanmu</h2>
                  <span className="text-[13px] font-semibold text-muted">
                    {n} dipasang · maks {MAKS_KRITERIA}
                  </span>
                </div>

                {n === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-[#9DB5E3] bg-[#F3F7FE] px-5 text-center text-[14.5px] leading-normal text-muted">
                    Klik atau seret kartu ke sini
                  </div>
                ) : (
                  <>
                    <BarBobot n={n} />
                    <SortableContext items={kriteria} strategy={() => null}>
                      <ol aria-label="Urutan prioritas kriteria" className="flex flex-col">
                        {kriteria.map((kode, i) => (
                          <ItemRak
                            key={kode}
                            kode={kode}
                            posisi={i}
                            n={n}
                            garisAtas={sasaran?.jenis === "sebelum" && sasaran.kode === kode}
                            onNaik={() => rakitan.pindah(i, i - 1)}
                            onTurun={() => rakitan.pindah(i, i + 1)}
                            onLepas={() => rakitan.lepas(kode)}
                          />
                        ))}
                      </ol>
                    </SortableContext>
                    <GarisJatuh tampil={sasaran?.jenis === "akhir"} />
                  </>
                )}
              </div>

              {n > BATAS_PERINGATAN_KRITERIA ? (
                <p role="note" className="rounded-[12px] bg-[#FFF4E0] px-3 py-2.5 text-[13px] leading-[1.45] text-[#7A4300]">
                  Kriteria paling bawah hanya dapat bobot {formatPersen(bobotTerbawah)}, hampir tidak berpengaruh.
                </p>
              ) : null}
              <p className="rounded-[12px] bg-[#EEF1F6] px-3 py-2.5 text-[12.5px] leading-normal text-muted">
                Kos yang datanya kosong di salah satu kriteria terpasang disembunyikan, dan jumlahnya ditampilkan
                di halaman peringkat.
              </p>
              {n > 0 ? (
                <PrimaryButton href={hrefHasil} block className="h-[52px] flex-none rounded-[14px] text-base font-extrabold">
                  Lihat peringkat dengan {n} kriteria
                </PrimaryButton>
              ) : (
                <button
                  type="button"
                  disabled
                  className="h-[52px] flex-none cursor-not-allowed rounded-[14px] bg-[#9DB5E3] text-base font-extrabold text-white"
                >
                  Lihat peringkat dengan 0 kriteria
                </button>
              )}
            </aside>
          </div>
          {diBrowser ? createPortal(overlay, document.body) : null}
        </DndContext>
      </div>
    </div>
  );
}
