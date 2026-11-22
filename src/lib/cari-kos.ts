/**
 * Pencarian kos berdasarkan nama (murni, tanpa I/O): seluruhnya di klien atas
 * daftar ringkas dari GET /api/kos.
 */

/** Bentuk minimal yang dibutuhkan pencarian; nama kosong/null tidak membuat galat. */
export type DapatDicari = { id: string; nama: string | null | undefined };

export type HasilCari<T> = {
  /** Kecocokan teratas, paling banyak `batas`. */
  hasil: T[];
  /** Jumlah SELURUH kecocokan (bisa lebih besar dari `hasil.length`). */
  total: number;
};

export const BATAS_HASIL_DEFAULT = 8;

/** Kata umum yang diabaikan di query ("kost pondok kaca" ≈ "pondok kaca"). */
const KATA_UMUM: ReadonlySet<string> = new Set(["kost", "kos"]);

type Terpetakan = {
  /** Teks ternormalisasi (spasi belum dirapikan); satu entri `awal`/`akhir` per karakter. */
  teks: string;
  /** Indeks awal (UTF-16) karakter asal untuk tiap karakter di `teks`. */
  awal: number[];
  /** Indeks akhir (eksklusif) karakter asal untuk tiap karakter di `teks`. */
  akhir: number[];
};

/**
 * Normalisasi per karakter supaya posisi di teks hasil bisa dipetakan kembali
 * ke string asli (dipakai untuk menebalkan bagian yang cocok): huruf kecil,
 * diakritik dibuang, selain huruf/angka menjadi spasi.
 */
function petakan(s: string): Terpetakan {
  let teks = "";
  const awal: number[] = [];
  const akhir: number[] = [];
  let i = 0;
  for (const ch of s) {
    const panjang = ch.length;
    const dasar = ch.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    for (const c of dasar) {
      const bersih = /[\p{L}\p{N}]/u.test(c) ? c : " ";
      for (let k = 0; k < bersih.length; k++) {
        teks += bersih[k];
        awal.push(i);
        akhir.push(i + panjang);
      }
    }
    i += panjang;
  }
  return { teks, awal, akhir };
}

/** Huruf kecil, tanpa diakritik, tanda baca → spasi, spasi dirapikan. */
export function normalisasi(s: string | null | undefined): string {
  return petakan(s ?? "").teks.replace(/ +/g, " ").trim();
}

/**
 * Token query (unik). Kata umum "kost"/"kos" dibuang, kecuali query hanya
 * berisi kata-kata itu — maka dipertahankan supaya tetap bisa dicari.
 */
export function tokenQuery(query: string): string[] {
  const semua = [...new Set(normalisasi(query).split(" ").filter(Boolean))];
  const inti = semua.filter((t) => !KATA_UMUM.has(t));
  return inti.length > 0 ? inti : semua;
}

/** Bandingkan id sebagai angka bila keduanya angka (tanpa batas ukuran), selain itu sebagai teks. */
export function bandingkanId(a: string, b: string): number {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const x = a.replace(/^0+(?=\d)/, "");
    const y = b.replace(/^0+(?=\d)/, "");
    if (x.length !== y.length) return x.length - y.length;
    if (x !== y) return x < y ? -1 : 1;
    return 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

type Cocok<T> = { kos: T; nama: string; tingkat: 0 | 1 | 2 };

/**
 * Cari kos yang namanya memuat SEMUA token query (urutan bebas).
 * Urutan: (0) nama diawali query, (1) tiap token mengawali sebuah kata,
 * (2) sisanya; seri → nama lalu id (id dibanding sebagai angka).
 */
export function cariKos<T extends DapatDicari>(
  daftar: readonly T[],
  query: string,
  batas: number = BATAS_HASIL_DEFAULT,
): HasilCari<T> {
  const token = tokenQuery(query);
  if (token.length === 0) return { hasil: [], total: 0 };
  const inti = token.join(" ");

  const cocok: Cocok<T>[] = [];
  for (const kos of daftar) {
    const nama = normalisasi(kos.nama);
    if (nama === "" || !token.every((t) => nama.includes(t))) continue;

    const kata = nama.split(" ");
    let i = 0;
    while (i < kata.length - 1 && KATA_UMUM.has(kata[i])) i++;
    const namaInti = kata.slice(i).join(" ");

    let tingkat: 0 | 1 | 2 = 2;
    if (namaInti.startsWith(inti) || nama.startsWith(inti)) tingkat = 0;
    else if (token.every((t) => kata.some((k) => k.startsWith(t)))) tingkat = 1;
    cocok.push({ kos, nama, tingkat });
  }

  cocok.sort(
    (a, b) =>
      a.tingkat - b.tingkat ||
      (a.nama < b.nama ? -1 : a.nama > b.nama ? 1 : 0) ||
      bandingkanId(a.kos.id, b.kos.id),
  );

  const maks = Number.isFinite(batas) ? Math.max(0, Math.floor(batas)) : BATAS_HASIL_DEFAULT;
  return { hasil: cocok.slice(0, maks).map((c) => c.kos), total: cocok.length };
}

export type SegmenSorot = { teks: string; cocok: boolean };

/**
 * Pecah `nama` menjadi potongan (cocok / tidak) untuk ditebalkan, tanpa HTML.
 * Pencocokan memakai normalisasi yang sama dengan pencarian, jadi "pondok"
 * menebalkan "Pondok" dan "cafe" menebalkan "Café".
 */
export function segmenSorot(nama: string, query: string): SegmenSorot[] {
  const token = tokenQuery(query);
  if (nama === "" || token.length === 0) return [{ teks: nama, cocok: false }];

  const { teks, awal, akhir } = petakan(nama);
  const tandai = new Array<boolean>(nama.length).fill(false);
  let ada = false;
  for (const t of token) {
    for (let dari = teks.indexOf(t); dari !== -1; dari = teks.indexOf(t, dari + t.length)) {
      for (let p = awal[dari]; p < akhir[dari + t.length - 1]; p++) tandai[p] = true;
      ada = true;
    }
  }
  if (!ada) return [{ teks: nama, cocok: false }];

  const hasil: SegmenSorot[] = [];
  for (let i = 0; i < nama.length; i++) {
    const terakhir = hasil[hasil.length - 1];
    if (terakhir && terakhir.cocok === tandai[i]) terakhir.teks += nama[i];
    else hasil.push({ teks: nama[i], cocok: tandai[i] });
  }
  return hasil;
}

/** Sorotan berikutnya pada daftar `jumlah` baris (berputar); -1 = belum ada sorotan. */
export function geserSorotan(aktif: number, jumlah: number, arah: "bawah" | "atas"): number {
  if (jumlah <= 0) return -1;
  if (arah === "bawah") return aktif < 0 ? 0 : (aktif + 1) % jumlah;
  return aktif < 0 ? jumlah - 1 : (aktif - 1 + jumlah) % jumlah;
}
