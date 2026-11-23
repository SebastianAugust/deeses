import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  KATEGORI_POI,
  bacaPoi,
  haversine,
  koordinatValid,
  pilihTempatTerdekat,
  teksJarakGarisLurus,
  type KategoriPoi,
  type Poi,
} from "@/lib/poi";

const KOS = { lat: -6.93, lng: 107.77 };
/** Titik `meter` ke utara KOS (1° lintang = 111.194,93 m pada radius bumi rata-rata). */
const keUtara = (meter: number) => ({ lat: KOS.lat + meter / 111_194.93, lng: KOS.lng });

let n = 0;
const poi = (kategori: KategoriPoi, meter: number, nama = `${kategori}-${meter}`): Poi => ({
  id: `uji/${++n}`,
  nama,
  kategori,
  ...keUtara(meter),
});

describe("haversine", () => {
  it("titik sama → 0; simetris", () => {
    expect(haversine(KOS, KOS)).toBe(0);
    const a = { lat: -6.9313996, lng: 107.7761314 };
    const b = { lat: -6.9336088, lng: 107.7682456 };
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 6);
  });

  it("1° lintang sekitar 111,2 km; 1° bujur di ekuator sama", () => {
    expect(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -2);
    expect(haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111_195, -2);
  });

  it("bujur menyempit mengikuti lintang (cos 6,93° = 0,9927)", () => {
    const d = haversine({ lat: -6.93, lng: 107 }, { lat: -6.93, lng: 108 });
    expect(d).toBeCloseTo(111_195 * Math.cos((6.93 * Math.PI) / 180), -2);
  });

  it("Gerbang Unpad ke ITB Jatinangor sekitar 0,9 km (data nyata)", () => {
    const d = haversine({ lat: -6.9313996, lng: 107.7761314 }, { lat: -6.9336088, lng: 107.7682456 });
    expect(d).toBeGreaterThan(850);
    expect(d).toBeLessThan(950);
  });
});

describe("pilihTempatTerdekat", () => {
  it("urut per kategori (urutan KATEGORI_POI) lalu jarak naik, jarak dibulatkan meter", () => {
    const data = [poi("makan", 700), poi("minimarket", 900), poi("makan", 300), poi("minimarket", 100), poi("kampus", 1000)];
    const hasil = pilihTempatTerdekat(KOS, data);
    expect(hasil.map((t) => `${t.kategori}:${t.jarak_m}`)).toEqual([
      "kampus:1000",
      "minimarket:100",
      "minimarket:900",
      "makan:300",
      "makan:700",
    ]);
    for (const t of hasil) expect(Number.isInteger(t.jarak_m)).toBe(true);
  });

  it("maksimal 3 per kategori (bisa diatur) dan yang diambil yang terdekat", () => {
    const data = [500, 100, 400, 200, 300].map((m) => poi("makan", m));
    expect(pilihTempatTerdekat(KOS, data).map((t) => t.jarak_m)).toEqual([100, 200, 300]);
    expect(pilihTempatTerdekat(KOS, data, { maksPerKategori: 1 }).map((t) => t.jarak_m)).toEqual([100]);
    expect(pilihTempatTerdekat(KOS, data, { maksPerKategori: 0 })).toEqual([]);
  });

  it("batas radius: 1200 m termasuk, lebih jauh dibuang; radius bisa diatur", () => {
    const data = [poi("masjid", 1190), poi("masjid", 1210), poi("spbu", 5000)];
    expect(pilihTempatTerdekat(KOS, data).map((t) => t.jarak_m)).toEqual([1190]);
    expect(pilihTempatTerdekat(KOS, data, { radiusM: 300 })).toEqual([]);
    expect(pilihTempatTerdekat(KOS, data, { radiusM: 6000 })).toHaveLength(3);
    // persis di batas
    const p = poi("masjid", 500);
    const jarak = haversine(KOS, p);
    expect(pilihTempatTerdekat(KOS, [p], { radiusM: jarak })).toHaveLength(1);
    expect(pilihTempatTerdekat(KOS, [p], { radiusM: jarak - 0.01 })).toHaveLength(0);
  });

  it("kos tanpa koordinat valid → daftar kosong", () => {
    const data = [poi("makan", 100)];
    for (const kos of [
      null,
      undefined,
      {},
      { lat: null, lng: null },
      { lat: -6.93, lng: null },
      { lat: null, lng: 107.77 },
      { lat: Number.NaN, lng: 107.77 },
      { lat: 91, lng: 107.77 },
      { lat: -6.93, lng: 181 },
    ]) {
      expect(pilihTempatTerdekat(kos, data), JSON.stringify(kos)).toEqual([]);
    }
  });

  it("tanpa POI → kosong; masukan tidak diubah; tempat berkoordinat rusak dilewati", () => {
    expect(pilihTempatTerdekat(KOS, [])).toEqual([]);
    const data = [poi("makan", 100), { ...poi("makan", 50), lat: Number.NaN }];
    const salinan = JSON.stringify(data);
    expect(pilihTempatTerdekat(KOS, data)).toHaveLength(1);
    expect(JSON.stringify(data)).toBe(salinan);
  });

  it("jarak seri → urut id (deterministik)", () => {
    const a = { ...poi("makan", 200), id: "b" };
    const b = { ...poi("makan", 200), id: "a" };
    expect(pilihTempatTerdekat(KOS, [a, b]).map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("bacaPoi", () => {
  it("entri valid dibaca; rusak dibuang; bukan array → []", () => {
    const ok = { id: "node/1", nama: " Alfamart ", kategori: "minimarket", lat: -6.9, lng: 107.7 };
    expect(bacaPoi([ok])).toEqual([{ ...ok, nama: "Alfamart" }]);
    expect(
      bacaPoi([
        ok,
        null,
        "x",
        { ...ok, id: "" },
        { ...ok, nama: "  " },
        { ...ok, kategori: "bioskop" },
        { ...ok, lat: "-6.9" },
        { ...ok, lng: 200 },
      ]),
    ).toHaveLength(1);
    for (const v of [null, undefined, {}, "x", 1]) expect(bacaPoi(v)).toEqual([]);
  });

  it("berkas public/data/poi-jatinangor.json valid: semua entri lolos, id unik, landmark ada", () => {
    const mentah = JSON.parse(
      readFileSync(fileURLToPath(new URL("../public/data/poi-jatinangor.json", import.meta.url)), "utf8"),
    ) as unknown[];
    const daftar = bacaPoi(mentah);
    expect(daftar).toHaveLength(mentah.length);
    expect(new Set(daftar.map((p) => p.id)).size).toBe(daftar.length);
    expect(daftar.filter((p) => p.kategori === "kampus").map((p) => p.nama)).toEqual([
      "Gerbang Unpad (Tugu Makalangan)",
      "ITB Jatinangor",
    ]);
    // Semua di dalam kotak pencarian skrip.
    for (const p of daftar) {
      expect(p.lat).toBeGreaterThanOrEqual(-6.97);
      expect(p.lat).toBeLessThanOrEqual(-6.9);
      expect(p.lng).toBeGreaterThanOrEqual(107.73);
      expect(p.lng).toBeLessThanOrEqual(107.81);
    }
  });
});

describe("util", () => {
  it("koordinatValid", () => {
    expect(koordinatValid(-6.9, 107.7)).toBe(true);
    expect(koordinatValid(0, 0)).toBe(true);
    for (const [a, b] of [[null, 1], [1, undefined], ["1", 1], [Number.NaN, 1], [91, 1], [1, -181], [Infinity, 1]] as const) {
      expect(koordinatValid(a, b), `${a},${b}`).toBe(false);
    }
  });

  it("teksJarakGarisLurus: dibulatkan 10 m, tanda ± dan koma Indonesia", () => {
    expect(teksJarakGarisLurus(347)).toBe("± 350 m");
    expect(teksJarakGarisLurus(1240)).toBe("± 1,2 km");
    expect(teksJarakGarisLurus(0)).toBe("± 0 m");
  });

  it("kategori unik dan lengkap sesuai skrip", () => {
    const kode = KATEGORI_POI.map((k) => k.kode);
    expect(new Set(kode).size).toBe(kode.length);
    expect([...kode].sort()).toEqual(
      ["apotek", "atm_bank", "kampus", "klinik", "laundry", "makan", "masjid", "minimarket", "pasar", "spbu"].sort(),
    );
  });
});
