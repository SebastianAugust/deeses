import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  KATALOG_KRITERIA,
  KATEGORI_KRITERIA,
  KRITERIA_DEFAULT,
  KRITERIA_TERSEDIA,
  MAKS_KRITERIA,
  getKriteria,
  isKodeKriteria,
  isKodeTersedia,
  katalogTerkelompok,
  kriteriaPerKategori,
} from "@/config/kriteria";
import { parseFilter, parseKriteria } from "@/lib/query";
import { KosDataError } from "@/lib/repo/galat";
import { bacaSumber, petakanBaris, type BarisKos, type Kos } from "@/lib/repo/mapper";
import type { RankResponse } from "@/lib/types";
import { validasiRankRequest } from "@/lib/validasi";
import fixture from "./fixtures/baris-kos.json";

// Route handler memakai kosRepository() (server-only + Supabase): diganti repo palsu.
const repoPalsu = vi.hoisted(() => ({ listKos: async (): Promise<unknown[]> => [] }));
vi.mock("@/lib/repo", () => ({ kosRepository: () => repoPalsu }));

const { POST: postRank } = await import("@/app/api/rank/route");
const { GET: getKriteriaRoute } = await import("@/app/api/kriteria/route");

const ASLI = fixture.baris as BarisKos[];

/** Parser CSV kecil (mendukung field ber-kutip berisi koma) untuk kos_bersih.csv. */
function bacaCsv(path: string): Record<string, string>[] {
  const baris = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const pisah = (l: string) => {
    const out: string[] = [];
    let cur = "";
    let kutip = false;
    for (const ch of l) {
      if (ch === '"') kutip = !kutip;
      else if (ch === "," && !kutip) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const kepala = pisah(baris[0]);
  return baris.slice(1).map((l) => Object.fromEntries(pisah(l).map((v, i) => [kepala[i], v])));
}

// Data bersih (354 kos; dibuat di dss-model-kos-jatinangor/data_bersih), bentuk kolom sama dengan public.kos.
const CSV = bacaCsv(
  fileURLToPath(new URL("../dss-model-kos-jatinangor/data_bersih/kos_bersih.csv", import.meta.url)),
);

// ---------------------------------------------------------------------------
describe("katalog kriteria (src/config/kriteria.ts)", () => {
  it("memuat 25 piece usulan dengan kategori & jenis yang benar", () => {
    const usulan: [string, string, string][] = [
      ["harga", "biaya", "cost"], ["deposit", "biaya", "cost"], ["listrik", "biaya", "benefit"],
      ["jarak_unpad", "lokasi", "cost"], ["jarak_itb", "lokasi", "cost"], ["minimarket", "lokasi", "cost"],
      ["pasar", "lokasi", "cost"], ["luas", "kamar", "benefit"], ["km_dalam", "kamar", "benefit"],
      ["ac", "kamar", "benefit"], ["furnitur", "kamar", "benefit"], ["cctv", "keamanan", "benefit"],
      ["penjaga", "keamanan", "benefit"], ["akses24", "keamanan", "benefit"], ["parkir_motor", "bersama", "benefit"],
      ["parkir_mobil", "bersama", "benefit"], ["dapur", "bersama", "benefit"], ["wifi", "bersama", "benefit"],
      ["jam_malam", "aturan", "cost"], ["tamu", "aturan", "cost"],
      ["tv", "kamar", "benefit"], ["shower", "kamar", "benefit"], ["kloset_duduk", "kamar", "benefit"],
      ["bayar_bulanan", "biaya", "benefit"], ["bayar_tahunan", "biaya", "benefit"],
    ];
    for (const [kode, kategori, jenis] of usulan) {
      expect(getKriteria(kode), kode).toMatchObject({ kategori, jenis });
    }
  });

  it("kode unik, snake_case, kategori dikenal", () => {
    const kode = KATALOG_KRITERIA.map((k) => k.kode);
    expect(new Set(kode).size).toBe(kode.length);
    const kategori = new Set(KATEGORI_KRITERIA.map((k) => k.kode));
    for (const k of KATALOG_KRITERIA) {
      expect(k.kode).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(kategori.has(k.kategori)).toBe(true);
    }
  });

  it("piece tersedia punya kolom yang valid di fixture dan nilainya terbaca di setiap baris", () => {
    for (const k of KRITERIA_TERSEDIA) {
      expect(k.sumber, k.kode).not.toBeNull();
      for (const baris of ASLI) {
        expect(Object.keys(baris), `${k.kode} → ${k.sumber!.kolom}`).toContain(k.sumber!.kolom);
        const v = bacaSumber(baris, k.sumber!);
        expect(typeof v === "number" && Number.isFinite(v), `${k.kode} di baris ${String(baris.id)}`).toBe(true);
      }
    }
  });

  it("piece tersedia: kolomnya ada di kos_bersih.csv dan nilainya TIDAK konstan", () => {
    expect(CSV.length).toBe(354);
    for (const k of KRITERIA_TERSEDIA) {
      const nilai = new Set(CSV.map((b) => bacaSumber(b, k.sumber!)));
      // Satu-satunya kekosongan yang sah: luas (C4) pada kos yang luas_status-nya "tidak_tercantum".
      const kosong = CSV.filter((b) => bacaSumber(b, k.sumber!) === null).map((b) => b.id);
      const sah = k.kode === "luas" ? CSV.filter((b) => b.luas_status === "tidak_tercantum").map((b) => b.id) : [];
      expect(kosong, `${k.kode} ada yang kosong`).toEqual(sah);
      expect(nilai.size, `${k.kode} konstan`).toBeGreaterThan(1);
    }
  });

  it("piece tidak tersedia: tanpa sumber, dengan alasan, dan kolomnya memang tidak ada di data", () => {
    const tidak = KATALOG_KRITERIA.filter((k) => !k.tersedia);
    expect(tidak.map((k) => k.kode).sort()).toEqual(
      ["akses24", "dapur", "deposit", "furnitur", "jam_malam", "jarak_itb", "jarak_unpad", "minimarket", "pasar", "tamu"].sort(),
    );
    const kolomCsv = Object.keys(CSV[0]);
    for (const k of tidak) {
      expect(k.sumber).toBeNull();
      expect(k.alasanTidakTersedia?.length ?? 0).toBeGreaterThan(10);
      expect(kolomCsv).not.toContain(k.kode);
    }
    // Data bersih sudah punya kolom jarak per kampus, tetapi piece jarak_unpad/jarak_itb belum diaktifkan
    // (tidak ada sumber, ditolak API). Mengaktifkannya = tugas terpisah.
    expect(kolomCsv).toContain("jarak_unpad_km");
    expect(kolomCsv).toContain("jarak_itb_km");
  });

  it("kolom sintetis/komposit (C1, C3, C5–C8) tidak dipakai sebagai sumber", () => {
    const kolom = KATALOG_KRITERIA.flatMap((k) => (k.sumber ? [k.sumber.kolom] : []));
    for (const c of ["C1", "C3", "C5", "C6", "C7", "C8"]) expect(kolom).not.toContain(c);
  });

  it("helper: validasi kode, per kategori, terkelompok (kategori kosong dibuang), default valid", () => {
    expect(isKodeKriteria("deposit")).toBe(true);
    expect(isKodeTersedia("deposit")).toBe(false);
    expect(isKodeTersedia("harga")).toBe(true);
    expect(isKodeKriteria("C1")).toBe(false);
    expect(kriteriaPerKategori("biaya").map((k) => k.kode)).toEqual([
      "harga",
      "listrik",
      "bayar_bulanan",
      "bayar_tahunan",
    ]);
    expect(kriteriaPerKategori("biaya", { hanyaTersedia: false }).map((k) => k.kode)).toEqual([
      "harga",
      "deposit",
      "listrik",
      "bayar_bulanan",
      "bayar_tahunan",
    ]);
    const kelompok = katalogTerkelompok();
    expect(kelompok.map((k) => k.kode)).not.toContain("aturan");
    expect(kelompok.flatMap((k) => k.kriteria).length).toBe(KRITERIA_TERSEDIA.length);
    // Jarak dan luas sengaja bukan default (datanya perkiraan), tetapi tetap bisa dipasang.
    expect([...KRITERIA_DEFAULT]).toEqual(["harga", "ac", "km_dalam", "cctv"]);
    expect(isKodeTersedia("jarak_kampus") && isKodeTersedia("luas")).toBe(true);
    expect(getKriteria("jarak_kampus")?.deskripsi).toContain("perkiraan jarak rute (data OpenStreetMap)");
    expect(getKriteria("luas")?.deskripsi).toContain("luas dari ukuran yang tercantum");
    expect(KRITERIA_DEFAULT.length).toBeLessThanOrEqual(MAKS_KRITERIA);
    for (const k of KRITERIA_DEFAULT) expect(isKodeTersedia(k)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("validasi kriteria (zod)", () => {
  const dasar = { budget: 1_000_000, tipe: "putri" };
  const tolak = (kriteria: unknown, pola: RegExp) => {
    const r = validasiRankRequest({ ...dasar, kriteria });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(pola);
  };

  it("menolak kosong, lebih dari 12, kode tak dikenal, duplikat, dan piece belum tersedia", () => {
    tolak([], /minimal 1/);
    const tigaBelas = [...KRITERIA_TERSEDIA.map((k) => k.kode), ...Array(13).fill("harga")].slice(0, 13);
    tolak(tigaBelas, /maksimal 12/);
    tolak(["harga", "C1"], /tidak dikenal: C1/);
    tolak(["harga", "luas", "harga"], /duplikat: harga/);
    tolak(["harga", "deposit"], /deposit belum bisa dipakai/);
    tolak([1], /kriteria/);
  });

  it("menerima 1 sampai 12 piece tersedia (urutan dipertahankan)", () => {
    const semua = KRITERIA_TERSEDIA.map((k) => k.kode);
    for (const n of [1, 2, 4, 8, MAKS_KRITERIA]) {
      const kriteria = semua.slice(0, n).reverse();
      expect(validasiRankRequest({ ...dasar, kriteria })).toEqual({ ok: true, data: { ...dasar, kriteria } });
    }
  });
});

describe("state URL ?kriteria=", () => {
  it("tidak ada → default; kosong → []; kode asing/belum tersedia/duplikat dibuang; maks 12", () => {
    expect(parseKriteria(undefined)).toEqual([...KRITERIA_DEFAULT]);
    expect(parseKriteria("")).toEqual([]);
    expect(parseKriteria("LUAS, harga,deposit,xx,luas")).toEqual(["luas", "harga"]);
    const banyak = [...KRITERIA_TERSEDIA.map((k) => k.kode)].join(",");
    expect(parseKriteria(banyak)).toHaveLength(Math.min(MAKS_KRITERIA, KRITERIA_TERSEDIA.length));
    expect(parseFilter(new URLSearchParams("tipe=putra&kriteria=ac")).kriteria).toEqual(["ac"]);
  });
});

// ---------------------------------------------------------------------------
describe("kontrak POST /api/rank", () => {
  const kos: Kos[] = [
    ...ASLI.map(petakanBaris),
    petakanBaris({ ...ASLI[2], id: 7, nama: "uji-tanpa-luas", C4: null }),
    petakanBaris({ ...ASLI[2], id: 8, nama: "uji-murah", harga: 600_000, C2: 0.5 }),
  ];
  beforeEach(() => {
    repoPalsu.listKos = async () => kos;
  });
  const kirim = (body: unknown) =>
    postRank(
      new Request("http://localhost/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );

  it("200: bentuk respons + field baru", async () => {
    const res = await kirim({ budget: 2_000_000, tipe: "putri", kriteria: ["luas", "harga"] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as RankResponse;
    expect(Object.keys(body).sort()).toEqual(
      ["hasil", "jumlah_tanpa_data", "kriteria_dipakai", "spearman", "tanpa_data_per_kriteria"].sort(),
    );
    expect(body.kriteria_dipakai).toEqual([
      { kode: "luas", bobot: 2 / 3 },
      { kode: "harga", bobot: 1 / 3 },
    ]);
    expect(body.jumlah_tanpa_data).toBe(1);
    expect(body.tanpa_data_per_kriteria).toEqual({ luas: 1, harga: 0 });
    expect(body.hasil.map((h) => h.rank)).toEqual([1, 2, 3]);
    for (const h of body.hasil) {
      expect(Object.keys(h.skor_kriteria)).toEqual(["luas", "harga"]);
      expect(h).toHaveProperty("harga");
      expect(h).toHaveProperty("jarak_km");
      expect(h).toHaveProperty("foto_url");
    }
  });

  it("urutan berbeda → peringkat berbeda", async () => {
    const a = (await (await kirim({ budget: 2_000_000, tipe: "putri", kriteria: ["harga", "luas"] })).json()) as RankResponse;
    const b = (await (await kirim({ budget: 2_000_000, tipe: "putri", kriteria: ["luas", "harga"] })).json()) as RankResponse;
    expect(a.hasil[0].id).toBe("8"); // termurah
    expect(b.hasil[0].id).toBe("38447336"); // terluas (10,4 m²)
  });

  it("400 untuk JSON rusak, format lama, kode tak dikenal, duplikat, belum tersedia, > 12", async () => {
    const kasus: [unknown, RegExp][] = [
      ["{bukan json", /JSON/],
      [{ budget: 1e6, tipe: "putri", urutan_kriteria: ["C1"] }, /kriteria/],
      [{ budget: 1e6, tipe: "putri", kriteria: ["zzz"] }, /tidak dikenal/],
      [{ budget: 1e6, tipe: "putri", kriteria: ["ac", "ac"] }, /duplikat/],
      [{ budget: 1e6, tipe: "putri", kriteria: ["jam_malam"] }, /belum bisa dipakai/],
      [{ budget: 1e6, tipe: "putri", kriteria: Array.from({ length: 13 }, (_, i) => `k${i}`) }, /maksimal 12/],
    ];
    for (const [body, pola] of kasus) {
      const res = await kirim(body);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toMatch(pola);
    }
  });

  it("503 kalau data tidak bisa dibaca (guard tetap ada)", async () => {
    repoPalsu.listKos = async () => {
      throw new KosDataError("KOSONG", "tidak ada baris");
    };
    const res = await kirim({ budget: 1e6, tipe: "putri", kriteria: ["harga"] });
    expect(res.status).toBe(503);
  });
});

describe("kontrak GET /api/kriteria", () => {
  it("hanya piece tersedia, terkelompok per kategori, dengan batas maksimum", async () => {
    const res = await getKriteriaRoute();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      maks_kriteria: number;
      default: string[];
      kategori: { kode: string; nama: string; kriteria: { kode: string; arah: string; jenis: string }[] }[];
    };
    expect(body.maks_kriteria).toBe(MAKS_KRITERIA);
    expect(body.default).toEqual([...KRITERIA_DEFAULT]);
    const kode = body.kategori.flatMap((k) => k.kriteria.map((p) => p.kode));
    expect(kode.sort()).toEqual(KRITERIA_TERSEDIA.map((k) => k.kode).sort());
    for (const g of body.kategori) {
      expect(g.kriteria.length).toBeGreaterThan(0);
      for (const p of g.kriteria) {
        expect(p.arah).toBe(p.jenis === "cost" ? "Makin kecil makin baik" : "Makin besar makin baik");
        expect(p).not.toHaveProperty("sumber");
      }
    }
  });
});
