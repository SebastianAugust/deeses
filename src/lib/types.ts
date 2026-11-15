export type Kriteria = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8";

export type JenisKriteria = "cost" | "benefit";

/** Nama ikon lucide-react yang dipakai tiap kriteria. */
export type IkonKriteria =
  | "Wallet"
  | "MapPin"
  | "ShoppingBag"
  | "Maximize"
  | "Star"
  | "ShieldCheck"
  | "UserCog"
  | "Leaf";

export type KriteriaInfo = {
  kode: Kriteria;
  nama: string;
  jenis: JenisKriteria;
  hint: string;
  ikon: IkonKriteria;
};

export const KRITERIA: readonly KriteriaInfo[] = [
  { kode: "C1", nama: "Biaya sewa", jenis: "cost", hint: "Makin murah makin baik", ikon: "Wallet" },
  { kode: "C2", nama: "Jarak ke kampus", jenis: "cost", hint: "Makin dekat makin baik", ikon: "MapPin" },
  { kode: "C3", nama: "Akses layanan", jenis: "cost", hint: "Makin dekat makin baik", ikon: "ShoppingBag" },
  { kode: "C4", nama: "Luas kamar", jenis: "benefit", hint: "Makin luas makin baik", ikon: "Maximize" },
  { kode: "C5", nama: "Fasilitas", jenis: "benefit", hint: "Makin lengkap makin baik", ikon: "Star" },
  { kode: "C6", nama: "Keamanan", jenis: "benefit", hint: "Makin tinggi makin baik", ikon: "ShieldCheck" },
  { kode: "C7", nama: "Pengelolaan", jenis: "benefit", hint: "Makin tertata makin baik", ikon: "UserCog" },
  { kode: "C8", nama: "Lingkungan", jenis: "benefit", hint: "Makin nyaman makin baik", ikon: "Leaf" },
];

export const KODE_KRITERIA: readonly Kriteria[] = KRITERIA.map((k) => k.kode);

export type TipePenghuni = "putra" | "putri" | "campur";

export const TIPE_PENGHUNI: readonly TipePenghuni[] = ["putra", "putri", "campur"];

export type RankRequest = {
  budget: number;
  tipe: TipePenghuni;
  urutan_kriteria: Kriteria[];
};

export type RankResult = {
  id: string;
  nama: string;
  rank: number;
  harga: number;
  jarak_km: number;
  tipe: TipePenghuni;
  foto_url: string | null;
  url: string;
  skor_saw: number;
  skor_topsis: number;
  skor_kriteria: Record<Kriteria, number>;
};

export function isKriteria(v: unknown): v is Kriteria {
  return typeof v === "string" && (KODE_KRITERIA as readonly string[]).includes(v);
}

export function isTipePenghuni(v: unknown): v is TipePenghuni {
  return typeof v === "string" && (TIPE_PENGHUNI as readonly string[]).includes(v);
}
