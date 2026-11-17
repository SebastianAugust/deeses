import { describe, expect, it } from "vitest";
import {
  IKUTKAN_CAMPUR_DEFAULT,
  KRITERIA_DEFAULT,
  KRITERIA_TERSEDIA,
  MAKS_KRITERIA,
  type KodeKriteria,
} from "@/config/kriteria";
import {
  UrutanTidakValidError,
  bobotRankSum,
  bulatkanTampilan,
  cekUrutan,
  filterKos,
  hitungPeringkat,
  normalisasiMinMax,
  spearman,
  type Alternatif,
  type DefKriteria,
  type HasilPeringkat,
} from "@/lib/dss";
import { defKriteria } from "@/lib/peringkat";
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

/**
 * Input engine sekarang = daftar kriteria TERURUT prioritas (sistem lego).
 * Kasus golden lama (kriteria + urutan terpisah) dikonversi di sini tanpa
 * mengubah data maupun nilai harapannya.
 */
function terurut<K extends string>(kriteria: readonly DefKriteria<K>[], urutan: readonly K[]): DefKriteria<K>[] {
  return urutan.map((kode) => {
    const k = kriteria.find((d) => d.kode === kode);
    if (!k) throw new Error(`kode ${kode} tidak ada di kasus`);
    return k;
  });
}
const DEF_K3 = terurut(K3, URUT_K3);

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
  dekat(
    h.kriteria_dipakai.reduce((s, k) => s + k.bobot, 0),
    1,
  );
}

// ---------------------------------------------------------------------------
describe("golden test (audit model Python)", () => {
  for (const [nama, k] of Object.entries(KASUS)) {
    it(`${nama}: ${k.keterangan}`, () => {
      const h = hitungPeringkat(k.alternatif, terurut(k.kriteria, k.urutan));
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
      expect(h.jumlah_tanpa_data).toBe(0);
      cekInvarian(h);
    });
  }

  it("utama_3x3 cocok dengan hitungan tangan dalam pecahan (19/36, 1/2, 5/12)", () => {
    const k = KASUS.utama_3x3;
    const h = hitungPeringkat(k.alternatif, terurut(k.kriteria, k.urutan));
    const saw = Object.fromEntries(h.hasil.map((x) => [x.id, x.skor_saw]));
    dekat(saw.A, 19 / 36);
    dekat(saw.B, 1 / 2);
    dekat(saw.C, 5 / 12);
  });
});

// ---------------------------------------------------------------------------
describe("bobot rank-sum", () => {
  it("jumlah = 1 untuk n = 1..12 dan sesuai rumus 2(n−r+1)/(n(n+1))", () => {
    for (let n = 1; n <= MAKS_KRITERIA; n++) {
      const kode = Array.from({ length: n }, (_, i) => `K${i + 1}`);
      const w = bobotRankSum(kode);
      const total = Object.values(w).reduce((s, x) => s + x, 0);
      expect(Math.abs(total - 1)).toBeLessThan(1e-12);
      kode.forEach((k, i) => dekat(w[k], (2 * (n - (i + 1) + 1)) / (n * (n + 1))));
      // makin penting makin besar
      for (let i = 1; i < n; i++) expect(w[kode[i - 1]]).toBeGreaterThan(w[kode[i]]);
    }
  });

  it("n = 1, 2, 4, 8, 12: nilai persis dan jumlah = 1", () => {
    const persen = (n: number) => {
      const kode = Array.from({ length: n }, (_, i) => `K${i + 1}`);
      const w = bobotRankSum(kode);
      dekat(
        Object.values(w).reduce((s, x) => s + x, 0),
        1,
      );
      return kode.map((k) => formatPersen(w[k]));
    };
    expect(persen(1)).toEqual(["100,0%"]);
    expect(persen(2)).toEqual(["66,7%", "33,3%"]);
    expect(persen(4)).toEqual(["40,0%", "30,0%", "20,0%", "10,0%"]);
    expect(persen(8)).toEqual(["22,2%", "19,4%", "16,7%", "13,9%", "11,1%", "8,3%", "5,6%", "2,8%"]);
    const w12 = persen(12);
    expect(w12).toHaveLength(12);
    expect(w12[0]).toBe("15,4%"); // 24/156
    expect(w12[11]).toBe("1,3%"); // 2/156
  });

  it("bobot UI (weights.ts) = bobot DSS untuk rakitan default dari config", () => {
    const ui = rankSumWeights([...KRITERIA_DEFAULT]);
    const dss = bobotRankSum(KRITERIA_DEFAULT);
    for (const k of KRITERIA_DEFAULT) expect(ui[k]).toBe(dss[k]);
  });

  // Disesuaikan (format input lama): dulu engine mewajibkan permutasi PENUH dari
  // semua kode config, sehingga daftar yang "kurang"/"lebih" ditolak. Sekarang
  // n = panjang daftar terpasang; engine menolak daftar kosong, duplikat, atau
  // bukan string. Kode tak dikenal/tidak tersedia & batas 12 ditolak di validasi API.
  it("menolak urutan tidak valid (kosong, duplikat, bukan string)", () => {
    const salah: unknown[][] = [["K1", "K1", "K3"], [], ["K1", ""], [1, 2, 3]];
    for (const u of salah) {
      expect(() => bobotRankSum(u as string[])).toThrow(UrutanTidakValidError);
      expect(cekUrutan(u)).not.toBeNull();
      expect(() => hitungPeringkat([], (u as K3[]).map((kode) => ({ kode, jenis: "cost" as const })))).toThrow(
        UrutanTidakValidError,
      );
    }
    expect(cekUrutan(["K3", "K1", "K2"])).toBeNull();
    expect(cekUrutan(["K2"])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("kasus tepi", () => {
  it("0 kandidat → hasil kosong, Spearman null", () => {
    const h = hitungPeringkat([], DEF_K3);
    expect(h.hasil).toEqual([]);
    expect(h.spearman).toBeNull();
    dekat(Object.values(h.bobot).reduce((s, x) => s + x, 0), 1);
  });

  it("1 kandidat → semua skor 1, rank 1, Spearman null", () => {
    const h = hitungPeringkat([alt("A", 900_000, 0.7, 0.4)], DEF_K3);
    expect(h.hasil).toHaveLength(1);
    const [x] = h.hasil;
    expect([x.rank, x.rank_topsis]).toEqual([1, 1]);
    dekat(x.skor_saw, 1); // ½ + ⅓ + ⅙ = 0,9999999999999999 di float
    dekat(x.skor_topsis, 1);
    expect(x.skor_kriteria).toEqual({ K1: 1, K2: 1, K3: 1 });
    expect(h.spearman).toBeNull();
  });

  it("2 kandidat → skor_kriteria hanya 0/1, rank unik, Spearman null (bukan NaN)", () => {
    const h = hitungPeringkat([alt("A", 900_000, 0.5, 0.2), alt("B", 700_000, 1.5, 0.8)], DEF_K3);
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
    const h = hitungPeringkat(data, terurut(K3, ["K3", "K1", "K2"]));
    for (const x of h.hasil) expect(x.skor_kriteria.K3).toBe(1);
    expect(h.hasil.map((x) => x.id)).toEqual(["B", "A", "C"]);
    cekInvarian(h);
  });

  it("seri persis (kos identik) → dipecah harga lalu id, rank tetap unik", () => {
    const data = [alt("Z", 800_000, 1, 0.5), alt("A", 800_000, 1, 0.5), alt("M", 800_000, 1, 0.5)];
    const h = hitungPeringkat(data, DEF_K3);
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
    const h = hitungPeringkat(k.alternatif, terurut(k.kriteria, k.urutan));
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
    const h = hitungPeringkat(data, DEF_K3);
    expect(h.hasil.map((x) => x.id)).toEqual(["murah", "mahal", "lain"]);
  });

  // Disesuaikan (perilaku baru, Bagian B): nilai kosong/NaN dulu melempar error;
  // sekarang kandidatnya dikecualikan dan dihitung (tanpa imputasi).
  // normalisasiMinMax tetap menolak nilai kosong kalau dipanggil langsung.
  it("nilai tidak berhingga → kandidat dikecualikan, bukan diimputasi", () => {
    const h = hitungPeringkat([alt("A", 1, Number.NaN, 0), alt("B", 2, 1, 1)], DEF_K3);
    expect(h.hasil.map((x) => x.id)).toEqual(["B"]);
    expect(h.jumlah_tanpa_data).toBe(1);
    expect(h.tanpa_data_per_kriteria).toEqual({ K1: 0, K3: 0, K2: 1 });
    expect(() => normalisasiMinMax([alt("A", 1, Number.NaN, 0)], DEF_K3)).toThrow();
  });

  it("bulatkanTampilan hanya 4 desimal", () => {
    expect(bulatkanTampilan(0.123456)).toBe(0.1235);
    expect(bulatkanTampilan(19 / 36)).toBe(0.5278);
  });
});

// ---------------------------------------------------------------------------
describe("kriteria dinamis (lego)", () => {
  const data: Alternatif<K3>[] = [
    alt("murah-jauh", 600_000, 2.0, 0.2),
    alt("mahal-dekat", 1_400_000, 0.2, 0.9),
    alt("tengah", 1_000_000, 1.0, 0.5),
  ];

  it("urutan prioritas memengaruhi hasil", () => {
    // Kriteria sama (K1 harga, K2 jarak), hanya urutannya ditukar.
    const hargaDulu = hitungPeringkat(data, terurut(K3, ["K1", "K2"]));
    const jarakDulu = hitungPeringkat(data, terurut(K3, ["K2", "K1"]));
    expect(hargaDulu.hasil[0].id).toBe("murah-jauh");
    expect(jarakDulu.hasil[0].id).toBe("mahal-dekat");
    expect(hargaDulu.kriteria_dipakai.map((k) => k.kode)).toEqual(["K1", "K2"]);
    dekat(hargaDulu.bobot.K1, 2 / 3);
    dekat(jarakDulu.bobot.K1, 1 / 3);
    dekat(hargaDulu.hasil[0].skor_saw, 2 / 3);
  });

  it("n = 1: hanya satu kriteria, bobot 1, skor = skor kriteria itu", () => {
    const h = hitungPeringkat(data, terurut(K3, ["K3"]));
    expect(h.kriteria_dipakai).toEqual([{ kode: "K3", bobot: 1 }]);
    expect(h.hasil.map((x) => x.id)).toEqual(["mahal-dekat", "tengah", "murah-jauh"]);
    for (const x of h.hasil) {
      expect(Object.keys(x.skor_kriteria)).toEqual(["K3"]);
      dekat(x.skor_saw, x.skor_kriteria.K3);
    }
  });

  it("kandidat dengan data kosong di kriteria TERPASANG dikecualikan dan dihitung per kriteria", () => {
    const campur: Alternatif<K3>[] = [
      ...data,
      { id: "tanpa-k3", harga: 700_000, nilai: { K1: 700_000, K2: 0.5, K3: null } },
      { id: "tanpa-k2-k3", harga: 800_000, nilai: { K1: 800_000 } },
    ];
    const h = hitungPeringkat(campur, DEF_K3);
    expect(h.hasil.map((x) => x.id).sort()).toEqual(["mahal-dekat", "murah-jauh", "tengah"]);
    expect(h.jumlah_tanpa_data).toBe(2);
    expect(h.tanpa_data_per_kriteria).toEqual({ K1: 0, K3: 2, K2: 1 });
    // Min-max hanya atas kandidat tersisa: hasil sama dengan tanpa kos yang kosong.
    const tanpa = hitungPeringkat(data, DEF_K3);
    expect(h.hasil).toEqual(tanpa.hasil);
    // Kalau K3 tidak dipasang, kos tanpa K3 ikut dinilai.
    const tanpaK3 = hitungPeringkat(campur, terurut(K3, ["K1", "K2"]));
    expect(tanpaK3.jumlah_tanpa_data).toBe(1);
    expect(tanpaK3.hasil.map((x) => x.id)).toContain("tanpa-k3");
  });

  it("semua kandidat kosong → hasil [], Spearman null", () => {
    const h = hitungPeringkat([{ id: "x", harga: 1, nilai: {} }] as Alternatif<K3>[], DEF_K3);
    expect(h.hasil).toEqual([]);
    expect(h.spearman).toBeNull();
    expect(h.jumlah_tanpa_data).toBe(1);
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

  it("500 skenario acak: rakitan 1..12 piece tersedia, urutan acak, banyak nilai seri", () => {
    const rnd = prng(42);
    const pilih = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
    const kodeTersedia = KRITERIA_TERSEDIA.map((k) => k.kode);
    for (let t = 0; t < 500; t++) {
      const n = Math.floor(rnd() * 12); // 0..11 kandidat
      const kandidat: Alternatif<KodeKriteria>[] = Array.from({ length: n }, (_, i) => {
        const harga = pilih([500_000, 750_000, 1_000_000]);
        const nilai = Object.fromEntries(
          kodeTersedia.map((k) => [k, k === "harga" ? harga : pilih([0, 0.25, 0.5, 1])]),
        ) as Record<KodeKriteria, number>;
        return { id: `kos-${t}-${i}`, harga, nilai };
      });
      const jumlah = 1 + Math.floor(rnd() * Math.min(MAKS_KRITERIA, kodeTersedia.length));
      const rakitan = [...kodeTersedia].sort(() => rnd() - 0.5).slice(0, jumlah);
      const h = hitungPeringkat(kandidat, defKriteria(rakitan));
      expect(h.hasil).toHaveLength(n);
      expect(h.kriteria_dipakai.map((k) => k.kode)).toEqual(rakitan);
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
