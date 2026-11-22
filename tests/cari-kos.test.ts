import { describe, expect, it } from "vitest";
import {
  BATAS_HASIL_DEFAULT,
  bandingkanId,
  cariKos,
  geserSorotan,
  normalisasi,
  segmenSorot,
  tokenQuery,
} from "@/lib/cari-kos";

type K = { id: string; nama: string | null; harga: number | null; tipe: "putra" | "putri" | "campur" | null };
const kos = (id: string, nama: string | null, harga: number | null = 1_000_000): K => ({
  id,
  nama,
  harga,
  tipe: harga === null ? null : "putri",
});
const ids = (r: { hasil: K[] }) => r.hasil.map((k) => k.id);

describe("normalisasi & token", () => {
  it("huruf kecil, tanpa diakritik, spasi dan tanda baca dirapikan", () => {
    expect(normalisasi("  Kost   PONDOK-Kaca (II) ")).toBe("kost pondok kaca ii");
    expect(normalisasi("Café Résidence")).toBe("cafe residence");
    expect(normalisasi(null)).toBe("");
    expect(normalisasi(undefined)).toBe("");
  });

  it("kata umum kost/kos dibuang, tetapi dipertahankan bila hanya itu isi query", () => {
    expect(tokenQuery("kost pondok kaca")).toEqual(["pondok", "kaca"]);
    expect(tokenQuery("KOS Pondok")).toEqual(["pondok"]);
    expect(tokenQuery("kost")).toEqual(["kost"]);
    expect(tokenQuery("kos kost")).toEqual(["kos", "kost"]);
    expect(tokenQuery("pondok pondok")).toEqual(["pondok"]);
    expect(tokenQuery("   ")).toEqual([]);
  });
});

describe("cariKos", () => {
  const data = [
    kos("1", "Kost Pondok Kaca II Tipe B"),
    kos("2", "Griya Kaca Pondok"),
    kos("3", "Kos Mawar"),
    kos("4", "Wisma Whoopee"),
  ];

  it("tidak peka huruf besar/kecil dan diakritik", () => {
    expect(ids(cariKos(data, "PONDOK KACA"))).toEqual(["1", "2"]);
    expect(ids(cariKos([kos("9", "Kos Café Indah")], "cafe"))).toEqual(["9"]);
    expect(ids(cariKos([kos("9", "Kos Cafe Indah")], "CAFÉ"))).toEqual(["9"]);
  });

  it("token boleh tidak berurutan; semua token harus ada", () => {
    expect(ids(cariKos(data, "kaca pondok"))).toEqual(["2", "1"]);
    expect(ids(cariKos(data, "pondok mawar"))).toEqual([]);
  });

  it("kata kost/kos di query diabaikan: 'pondok kaca' = 'kost pondok kaca'", () => {
    expect(ids(cariKos(data, "pondok kaca"))).toEqual(ids(cariKos(data, "kost pondok kaca")));
    expect(ids(cariKos(data, "kos pondok kaca"))).toEqual(["1", "2"]);
  });

  it("query hanya 'kost'/'kos' tetap mencari (nama yang memuatnya)", () => {
    expect(ids(cariKos(data, "kost"))).toEqual(["1"]);
    // "kos mawar" < "kost pondok…" (spasi lebih kecil dari "t"), keduanya diawali query.
    expect(ids(cariKos(data, "kos"))).toEqual(["3", "1"]);
  });

  it("urutan: diawali query → kata diawali token → sisanya", () => {
    const d = [
      kos("1", "Wisma Whoopee"), // 'hoop' di tengah kata → tingkat 2
      kos("2", "Griya Hoop Indah"), // kata diawali 'hoop' → tingkat 1
      kos("3", "Hoop Residence"), // nama diawali 'hoop' → tingkat 0
    ];
    expect(ids(cariKos(d, "hoop"))).toEqual(["3", "2", "1"]);
  });

  it("awalan dihitung setelah kata kost/kos di depan nama", () => {
    const d = [kos("1", "Wisma Pondok Kaca"), kos("2", "Kost Pondok Kaca II")];
    expect(ids(cariKos(d, "pondok"))).toEqual(["2", "1"]);
  });

  it("seri diurutkan nama lalu id (id sebagai angka, bukan teks)", () => {
    const d = [kos("100", "Kos Sama"), kos("20", "Kos Sama"), kos("3", "Kos Sama"), kos("5", "Kos Alfa Sama")];
    // 'sama': "Kos Sama" (x3) diawali query setelah 'kos'; "Kos Alfa Sama" hanya diawali kata → belakangan
    expect(ids(cariKos(d, "sama"))).toEqual(["3", "20", "100", "5"]);
  });

  it("nama dobel: dua kos bernama sama muncul keduanya, urutan stabil", () => {
    const d = [kos("20", "Kost Melati", 900_000), kos("3", "Kost Melati", 1_100_000)];
    const a = cariKos(d, "melati");
    const b = cariKos([...d].reverse(), "melati");
    expect(ids(a)).toEqual(["3", "20"]);
    expect(ids(b)).toEqual(["3", "20"]);
    expect(a.total).toBe(2);
  });

  it("batas hasil + total kecocokan", () => {
    const d = Array.from({ length: 12 }, (_, i) => kos(String(i + 1), `Kos Melati ${i + 1}`));
    const r = cariKos(d, "melati");
    expect(r.hasil).toHaveLength(BATAS_HASIL_DEFAULT);
    expect(r.total).toBe(12);
    const k = cariKos(d, "melati", 3);
    expect(k.hasil).toHaveLength(3);
    expect(k.total).toBe(12);
    expect(cariKos(d, "melati", 0)).toEqual({ hasil: [], total: 12 });
    expect(cariKos(d, "melati", -5).hasil).toEqual([]);
  });

  it("tahan nama kosong/null dan harga/tipe null", () => {
    const d = [kos("1", null, null), kos("2", "", null), kos("3", "   ", 1), kos("4", "Kos Tanpa Harga", null)];
    const r = cariKos(d, "tanpa");
    expect(ids(r)).toEqual(["4"]);
    expect(r.hasil[0].harga).toBeNull();
    expect(r.hasil[0].tipe).toBeNull();
    expect(cariKos([{ id: "1", nama: undefined }], "x").total).toBe(0);
  });

  it("query kosong atau hanya spasi/tanda baca → tidak ada hasil", () => {
    expect(cariKos(data, "")).toEqual({ hasil: [], total: 0 });
    expect(cariKos(data, "   ")).toEqual({ hasil: [], total: 0 });
    expect(cariKos(data, " - . ")).toEqual({ hasil: [], total: 0 });
  });

  it("tidak mengubah daftar masukan", () => {
    const salinan = JSON.stringify(data);
    cariKos(data, "kaca");
    expect(JSON.stringify(data)).toBe(salinan);
  });
});

describe("bandingkanId", () => {
  it("angka dibanding sebagai angka, tanpa batas ukuran", () => {
    expect(bandingkanId("3", "20")).toBeLessThan(0);
    expect(bandingkanId("100", "20")).toBeGreaterThan(0);
    expect(bandingkanId("007", "7")).toBe(0);
    expect(bandingkanId("12345678901234567890", "12345678901234567891")).toBeLessThan(0);
  });
  it("bukan angka → dibanding sebagai teks", () => {
    expect(bandingkanId("a", "b")).toBeLessThan(0);
    expect(bandingkanId("b", "10")).toBeGreaterThan(0);
  });
});

describe("segmenSorot", () => {
  const gabung = (s: { teks: string }[]) => s.map((x) => x.teks).join("");

  it("menebalkan bagian yang cocok dan tidak kehilangan teks", () => {
    const s = segmenSorot("Kost Pondok Kaca II", "pondok kaca");
    expect(gabung(s)).toBe("Kost Pondok Kaca II");
    expect(s.filter((x) => x.cocok).map((x) => x.teks)).toEqual(["Pondok", "Kaca"]);
  });

  it("peka-diakritik tidak menggeser posisi", () => {
    const s = segmenSorot("Résidence Café", "cafe");
    expect(gabung(s)).toBe("Résidence Café");
    expect(s.filter((x) => x.cocok).map((x) => x.teks)).toEqual(["Café"]);
  });

  it("tanpa kecocokan atau query kosong → satu segmen tidak cocok", () => {
    expect(segmenSorot("Kos Mawar", "xyz")).toEqual([{ teks: "Kos Mawar", cocok: false }]);
    expect(segmenSorot("Kos Mawar", "")).toEqual([{ teks: "Kos Mawar", cocok: false }]);
    expect(segmenSorot("", "mawar")).toEqual([{ teks: "", cocok: false }]);
  });
});

describe("geserSorotan (panah atas/bawah pada combobox)", () => {
  it("bawah berputar; atas berputar; tanpa sorotan mulai dari ujung yang sesuai", () => {
    expect(geserSorotan(-1, 3, "bawah")).toBe(0);
    expect(geserSorotan(0, 3, "bawah")).toBe(1);
    expect(geserSorotan(2, 3, "bawah")).toBe(0);
    expect(geserSorotan(-1, 3, "atas")).toBe(2);
    expect(geserSorotan(0, 3, "atas")).toBe(2);
    expect(geserSorotan(2, 3, "atas")).toBe(1);
  });
  it("daftar kosong → tidak ada sorotan", () => {
    expect(geserSorotan(0, 0, "bawah")).toBe(-1);
    expect(geserSorotan(-1, 0, "atas")).toBe(-1);
  });
});
