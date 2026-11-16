import { describe, expect, it } from "vitest";
import {
  IKUTKAN_CAMPUR_DEFAULT,
  JUMLAH_KRITERIA,
  KODE_KRITERIA,
  KRITERIA,
  URUTAN_DEFAULT,
  rentangKodeKriteria,
  type Kriteria,
} from "@/config/kriteria";
import {
  UrutanTidakValidError,
  bobotRankSum,
  bulatkanTampilan,
  cekUrutan,
  filterKos,
  hitungPeringkat,
  spearman,
  type Alternatif,
  type DefKriteria,
  type HasilPeringkat,
} from "@/lib/dss";
import type { TipePenghuni } from "@/lib/types";
import { formatPersen, rankSumWeights } from "@/lib/weights";
import golden from "./fixtures/golden-dss.json";

type KasusGolden = {
  keterangan: string;
  kriteria: DefKriteria<string>[];
  urutan: string[];
  alternatif: Alternatif<string>[];
  expected: {
    bobot: Record<string, number>;
    skor_kriteria: Record<string, Record<string, number>>;
    skor_saw: Record<string, number>;
    skor_topsis: Record<string, number>;
    rank: Record<string, number>;
    rank_topsis: Record<string, number>;
    urutan_id: string[];
  };
};

const TOL = golden.toleransi;
const KASUS = golden.kasus as unknown as Record<string, KasusGolden>;

const K3: DefKriteria<"K1" | "K2" | "K3">[] = [
  { kode: "K1", jenis: "cost" },
  { kode: "K2", jenis: "cost" },
  { kode: "K3", jenis: "benefit" },
];
type K3 = "K1" | "K2" | "K3";
const URUT_K3: K3[] = ["K1", "K3", "K2"];

function alt(id: string, harga: number, k2: number, k3: number): Alternatif<K3> {
  return { id, harga, nilai: { K1: harga, K2: k2, K3: k3 } };
}

function dekat(aktual: number, harapan: number) {
  expect(Math.abs(aktual - harapan)).toBeLessThanOrEqual(TOL);
}

/** Rank & rank_topsis harus permutasi 1..n, skor & Spearman tidak pernah NaN. */
function cekInvarian<K extends string>(h: HasilPeringkat<K>) {
  const n = h.hasil.length;
  const satuSampaiN = Array.from({ length: n }, (_, i) => i + 1);
  expect(h.hasil.map((x) => x.rank)).toEqual(satuSampaiN); // hasil terurut rank naik
  expect([...h.hasil.map((x) => x.rank_topsis)].sort((a, b) => a - b)).toEqual(satuSampaiN);
  for (const x of h.hasil) {
    expect(Number.isFinite(x.skor_saw)).toBe(true);
    expect(Number.isFinite(x.skor_topsis)).toBe(true);
    for (const v of Object.values<number>(x.skor_kriteria)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  }
  if (h.spearman !== null) {
    expect(Number.isNaN(h.spearman)).toBe(false);
    expect(Math.abs(h.spearman)).toBeLessThanOrEqual(1);
  }
}

// ---------------------------------------------------------------------------
describe("golden test (audit model Python)", () => {
  for (const [nama, k] of Object.entries(KASUS)) {
    it(`${nama}: ${k.keterangan}`, () => {
      const h = hitungPeringkat(k.alternatif, k.kriteria, k.urutan);
      const e = k.expected;

      for (const [kode, w] of Object.entries(e.bobot)) dekat(h.bobot[kode], w);
      expect(h.hasil.map((x) => x.id)).toEqual(e.urutan_id);

      for (const x of h.hasil) {
        dekat(x.skor_saw, e.skor_saw[x.id]);
        dekat(x.skor_topsis, e.skor_topsis[x.id]);
        expect(x.rank).toBe(e.rank[x.id]);
        expect(x.rank_topsis).toBe(e.rank_topsis[x.id]);
        for (const [kode, r] of Object.entries(e.skor_kriteria[x.id])) dekat(x.skor_kriteria[kode], r);
      }
      cekInvarian(h);
    });
  }

  it("utama_3x3 cocok dengan hitungan tangan dalam pecahan (19/36, 1/2, 5/12)", () => {
    const h = hitungPeringkat(KASUS.utama_3x3.alternatif, KASUS.utama_3x3.kriteria, KASUS.utama_3x3.urutan);
    const saw = Object.fromEntries(h.hasil.map((x) => [x.id, x.skor_saw]));
    dekat(saw.A, 19 / 36);
    dekat(saw.B, 1 / 2);
    dekat(saw.C, 5 / 12);
  });
});

// ---------------------------------------------------------------------------
describe("bobot rank-sum", () => {
  it("jumlah = 1 untuk n = 3..10 dan sesuai rumus 2(n−r+1)/(n(n+1))", () => {
    for (let n = 3; n <= 10; n++) {
      const kode = Array.from({ length: n }, (_, i) => `K${i + 1}`);
      const w = bobotRankSum(kode, kode);
      const total = Object.values(w).reduce((s, x) => s + x, 0);
      expect(Math.abs(total - 1)).toBeLessThan(1e-12);
      kode.forEach((k, i) => dekat(w[k], (2 * (n - (i + 1) + 1)) / (n * (n + 1))));
      // makin penting makin besar
      for (let i = 1; i < n; i++) expect(w[kode[i - 1]]).toBeGreaterThan(w[kode[i]]);
    }
  });

  it("n = 8: 22,2 / 19,4 / 16,7 / 13,9 / 11,1 / 8,3 / 5,6 / 2,8 %", () => {
    const kode = Array.from({ length: 8 }, (_, i) => `K${i + 1}`);
    const w = bobotRankSum(kode, kode);
    expect(kode.map((k) => formatPersen(w[k]))).toEqual([
      "22,2%", "19,4%", "16,7%", "13,9%", "11,1%", "8,3%", "5,6%", "2,8%",
    ]);
  });

  it("bobot UI (weights.ts) = bobot DSS untuk urutan default dari config", () => {
    const ui = rankSumWeights([...URUTAN_DEFAULT]);
    const dss = bobotRankSum(URUTAN_DEFAULT, KODE_KRITERIA);
    for (const k of KODE_KRITERIA) expect(ui[k]).toBe(dss[k]);
  });

  it("menolak urutan tidak valid", () => {
    const kode = ["K1", "K2", "K3"];
    const salah: string[][] = [
      ["K1", "K2"], // kurang
      ["K1", "K2", "K3", "K4"], // lebih
      ["K1", "K1", "K3"], // duplikat
      ["K1", "K2", "k3"], // kode tak dikenal (huruf kecil)
      [],
    ];
    for (const u of salah) {
      expect(() => bobotRankSum(u, kode)).toThrow(UrutanTidakValidError);
      expect(cekUrutan(u, kode)).not.toBeNull();
      expect(() => hitungPeringkat([], K3, u as K3[])).toThrow(UrutanTidakValidError);
    }
    expect(cekUrutan(["K3", "K1", "K2"], kode)).toBeNull();
    expect(cekUrutan([1, 2, 3], kode)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("kasus tepi", () => {
  it("0 kandidat → hasil kosong, Spearman null", () => {
    const h = hitungPeringkat([], K3, URUT_K3);
    expect(h.hasil).toEqual([]);
    expect(h.spearman).toBeNull();
    dekat(Object.values(h.bobot).reduce((s, x) => s + x, 0), 1);
  });

  it("1 kandidat → semua skor 1, rank 1, Spearman null", () => {
    const h = hitungPeringkat([alt("A", 900_000, 0.7, 0.4)], K3, URUT_K3);
    expect(h.hasil).toHaveLength(1);
    const [x] = h.hasil;
    expect([x.rank, x.rank_topsis]).toEqual([1, 1]);
    dekat(x.skor_saw, 1); // ½ + ⅓ + ⅙ = 0,9999999999999999 di float
    dekat(x.skor_topsis, 1);
    expect(x.skor_kriteria).toEqual({ K1: 1, K2: 1, K3: 1 });
    expect(h.spearman).toBeNull();
  });

  it("2 kandidat → skor_kriteria hanya 0/1, rank unik, Spearman null (bukan NaN)", () => {
    const h = hitungPeringkat([alt("A", 900_000, 0.5, 0.2), alt("B", 700_000, 1.5, 0.8)], K3, URUT_K3);
    cekInvarian(h);
    for (const x of h.hasil) {
      for (const v of Object.values(x.skor_kriteria)) expect([0, 1]).toContain(v);
    }
    expect(h.spearman).toBeNull();
    // B murah (K1, bobot 1/2) + fasilitas (K3, 1/3) = 5/6; A dekat (K2, 1/6)
    expect(h.hasil.map((x) => x.id)).toEqual(["B", "A"]);
    dekat(h.hasil[0].skor_saw, 5 / 6);
  });

  it("kolom konstan → norm 1 untuk semua, ranking ditentukan kriteria lain", () => {
    const data = [alt("A", 900_000, 0.5, 0.5), alt("B", 700_000, 1, 0.5), alt("C", 1_100_000, 1.5, 0.5)];
    const h = hitungPeringkat(data, K3, ["K3", "K1", "K2"]);
    for (const x of h.hasil) expect(x.skor_kriteria.K3).toBe(1);
    expect(h.hasil.map((x) => x.id)).toEqual(["B", "A", "C"]);
    cekInvarian(h);
  });

  it("seri persis (kos identik) → dipecah harga lalu id, rank tetap unik", () => {
    const data = [
      alt("Z", 800_000, 1, 0.5),
      alt("A", 800_000, 1, 0.5),
      alt("M", 800_000, 1, 0.5),
    ];
    const h = hitungPeringkat(data, K3, URUT_K3);
    expect(h.hasil.map((x) => x.id)).toEqual(["A", "M", "Z"]);
    expect(h.hasil.map((x) => x.rank_topsis)).toEqual([1, 2, 3]);
    for (const x of h.hasil) {
      dekat(x.skor_saw, 1);
      dekat(x.skor_topsis, 1);
    }
    expect(h.spearman).toBeNull(); // skor konstan
  });

  it("SAW seri hanya beda galat float (0,49999999999999994 vs 0,5) dianggap seri", () => {
    const k = KASUS.seri_saw;
    const h = hitungPeringkat(k.alternatif, k.kriteria, k.urutan);
    const saw = h.hasil.map((x) => x.skor_saw);
    expect(saw.some((s) => s !== 0.5)).toBe(true); // memang ada galat float
    expect(h.hasil.map((x) => x.id)).toEqual(["B", "C", "A"]); // dipecah TOPSIS, bukan galat
  });

  it("seri SAW & TOPSIS, harga beda → yang lebih murah menang", () => {
    // dua kos identik kecuali id/harga tidak memengaruhi nilai (K1 dibuat sama lewat nilai)
    const data: Alternatif<K3>[] = [
      { id: "mahal", harga: 900_000, nilai: { K1: 800_000, K2: 1, K3: 0.5 } },
      { id: "murah", harga: 700_000, nilai: { K1: 800_000, K2: 1, K3: 0.5 } },
      alt("lain", 1_000_000, 2, 0.1),
    ];
    const h = hitungPeringkat(data, K3, URUT_K3);
    expect(h.hasil.map((x) => x.id)).toEqual(["murah", "mahal", "lain"]);
  });

  it("nilai tidak berhingga ditolak", () => {
    expect(() => hitungPeringkat([alt("A", 1, Number.NaN, 0)], K3, URUT_K3)).toThrow();
  });

  it("bulatkanTampilan hanya 4 desimal", () => {
    expect(bulatkanTampilan(0.123456)).toBe(0.1235);
    expect(bulatkanTampilan(19 / 36)).toBe(0.5278);
  });
});

// ---------------------------------------------------------------------------
describe("Spearman", () => {
  it("null untuk n < 3, panjang beda, skor konstan, atau nilai tak berhingga", () => {
    expect(spearman([], [])).toBeNull();
    expect(spearman([0.2, 0.3], [0.1, 0.4])).toBeNull();
    expect(spearman([1, 2, 3], [1, 2])).toBeNull();
    expect(spearman([0.5, 0.5, 0.5], [1, 2, 3])).toBeNull();
    expect(spearman([1, 2, 3], [Number.NaN, 2, 3])).toBeNull();
  });

  it("nilai yang diketahui", () => {
    expect(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50])).toBe(1);
    expect(spearman([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBe(-1);
    // Σd² = 4 → ρ = 1 − 6·4/(5·24) = 0,8
    expect(spearman([1, 2, 3, 4, 5], [2, 1, 4, 3, 5])).toBeCloseTo(0.8, 12);
  });
});

// ---------------------------------------------------------------------------
describe("properti acak: rank selalu unik, Spearman tidak pernah NaN", () => {
  /** PRNG deterministik (mulberry32) supaya tes stabil. */
  function prng(seed: number) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("500 skenario acak dengan banyak nilai seri (kriteria config)", () => {
    const rnd = prng(42);
    const pilih = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
    for (let t = 0; t < 500; t++) {
      const n = Math.floor(rnd() * 12); // 0..11 kandidat
      const kandidat: Alternatif<Kriteria>[] = Array.from({ length: n }, (_, i) => {
        const harga = pilih([500_000, 750_000, 1_000_000]);
        const nilai = Object.fromEntries(
          KODE_KRITERIA.map((k) => [k, k === "C1" ? harga : pilih([0, 0.25, 0.5, 1])]),
        ) as Record<Kriteria, number>;
        return { id: `kos-${t}-${i}`, harga, nilai };
      });
      const urutan = [...KODE_KRITERIA].sort(() => rnd() - 0.5);
      const h = hitungPeringkat(kandidat, KRITERIA, urutan);
      expect(h.hasil).toHaveLength(n);
      cekInvarian(h);
      if (n < 3) expect(h.spearman).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
describe("filter F1 + F2", () => {
  type Kos = { id: string; harga: number; tipe: TipePenghuni };
  const daftar: Kos[] = [
    { id: "a", harga: 600_000, tipe: "putri" },
    { id: "b", harga: 1_000_000, tipe: "putri" },
    { id: "c", harga: 1_000_001, tipe: "putri" },
    { id: "d", harga: 700_000, tipe: "campur" },
    { id: "e", harga: 650_000, tipe: "putra" },
  ];
  const id = (xs: Kos[]) => xs.map((x) => x.id);

  it("F1 harga <= budget (inklusif), F2 tipe persis secara default", () => {
    expect(id(filterKos(daftar, { budget: 1_000_000, tipe: "putri" }))).toEqual(["a", "b"]);
    expect(id(filterKos(daftar, { budget: 500_000, tipe: "putri" }))).toEqual([]);
  });

  it("ikutkanCampur menambahkan kos campur untuk putra/putri", () => {
    expect(id(filterKos(daftar, { budget: 1_000_000, tipe: "putri", ikutkanCampur: true }))).toEqual(["a", "b", "d"]);
    expect(id(filterKos(daftar, { budget: 1_000_000, tipe: "putra", ikutkanCampur: true }))).toEqual(["d", "e"]);
    expect(id(filterKos(daftar, { budget: 1_000_000, tipe: "campur", ikutkanCampur: true }))).toEqual(["d"]);
  });

  it("default ikutkanCampur dari config", () => {
    const hasil = id(filterKos(daftar, { budget: 1_000_000, tipe: "putri" }));
    expect(hasil.includes("d")).toBe(IKUTKAN_CAMPUR_DEFAULT);
  });
});

// ---------------------------------------------------------------------------
describe("config kriteria", () => {
  it("n dibaca dari config dan konsisten", () => {
    expect(JUMLAH_KRITERIA).toBe(KRITERIA.length);
    expect(KODE_KRITERIA).toHaveLength(JUMLAH_KRITERIA);
    expect(new Set(KODE_KRITERIA).size).toBe(JUMLAH_KRITERIA);
    expect(cekUrutan(URUTAN_DEFAULT, KODE_KRITERIA)).toBeNull();
  });

  it("C3 ditandai sementara", () => {
    expect(KRITERIA.find((k) => k.kode === "C3")?.sementara).toBe(true);
    expect(KRITERIA.filter((k) => k.sementara).map((k) => k.kode)).toEqual(["C3"]);
  });

  it("pesan rentang kode mengikuti config", () => {
    expect(rentangKodeKriteria()).toBe(`${KODE_KRITERIA[0]}–${KODE_KRITERIA[JUMLAH_KRITERIA - 1]}`);
  });
});
