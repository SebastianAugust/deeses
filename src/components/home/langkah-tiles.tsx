const LANGKAH = ["Pilih budget & tipe", "Rakit kriteriamu", "Lihat peringkat"];

/** 3 tile bernomor "Cara kerjanya" di Home. */
export function LangkahTiles() {
  return (
    <ol className="grid grid-cols-3 gap-2.5 lg:max-w-[560px]">
      {LANGKAH.map((l, i) => (
        <li key={l} className="flex">
          <div className="flex w-full flex-col gap-2 rounded-[18px] border border-white/90 bg-white/55 p-3 backdrop-blur-[20px] lg:p-4">
            <span
              aria-hidden
              className="flex size-[30px] items-center justify-center rounded-[10px] bg-soft text-sm font-extrabold text-accent-ink"
            >
              {i + 1}
            </span>
            <span className="text-[13px] leading-[1.3] font-bold lg:text-sm">{l}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
