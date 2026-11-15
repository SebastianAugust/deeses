import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton /hasil mobile (kartu #1, grid #2–#3, satu baris ringkas). */
export function HasilMobileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat rekomendasi" className="flex flex-col px-5 pt-4">
      <Skeleton className="mb-3.5 h-6 w-32 bg-line" />
      <Skeleton className="h-[196px] rounded-[20px] bg-line" />
      <Skeleton className="mt-2.5 h-5 w-40 bg-line" />
      <Skeleton className="mt-2 h-4 w-32 bg-line" />
      <div className="grid grid-cols-2 gap-3 pt-[18px]">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-[110px] rounded-[16px] bg-line" />
            <Skeleton className="h-4 w-24 bg-line" />
            <Skeleton className="h-4 w-28 bg-line" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-[60px] w-[72px] rounded-[12px] bg-line" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-32 bg-line" />
          <Skeleton className="h-4 w-24 bg-line" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton kartu horizontal kolom tengah desktop. */
export function DaftarDesktopSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Memuat rekomendasi" className="flex flex-col gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <li
          key={i}
          className="flex gap-3.5 rounded-[20px] border border-white/90 bg-white/55 p-2.5"
        >
          <Skeleton className="h-[104px] w-[120px] rounded-[14px] bg-line xl:w-[150px]" />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <Skeleton className="h-5 w-40 bg-line" />
            <Skeleton className="h-4 w-48 bg-line" />
            <Skeleton className="h-4 w-28 bg-line" />
            <Skeleton className="h-[5px] w-full bg-line" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Skeleton panel detail kanan desktop / isi halaman detail mobile. */
export function DetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat detail kos"
      className="flex flex-col gap-3 rounded-[24px] border border-white/90 bg-white/62 p-3"
    >
      <Skeleton className="h-[190px] rounded-[18px] bg-line" />
      <Skeleton className="h-5 w-28 bg-line" />
      <Skeleton className="h-7 w-44 bg-line" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-[12px] bg-line" />
        <Skeleton className="h-14 rounded-[12px] bg-line" />
      </div>
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className="h-3.5 bg-line" />
      ))}
    </div>
  );
}
