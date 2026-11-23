import { describe, expect, it } from "vitest";
import { titikBisaDipercaya, urlCariGoogleMaps, urlGoogleMaps } from "@/lib/peta";

const DASAR = "https://www.google.com/maps/search/?api=1&query=";

describe("urlCariGoogleMaps", () => {
  it("nama biasa → pencarian nama + Jatinangor", () => {
    expect(urlCariGoogleMaps("Kost Pondok Kaca II")).toBe(`${DASAR}Kost%20Pondok%20Kaca%20II%20Jatinangor`);
  });

  it("simbol (&, #, kutip) di-encode agar tidak merusak query", () => {
    const url = urlCariGoogleMaps(`Kos A&B #5 "Indah"`)!;
    expect(url.startsWith(DASAR)).toBe(true);
    const query = url.slice(DASAR.length);
    expect(query).not.toMatch(/[&#" ]/);
    expect(decodeURIComponent(query)).toBe(`Kos A&B #5 "Indah" Jatinangor`);
  });

  it("tanda kurung biasa dipertahankan (hanya akhiran angka yang dibuang)", () => {
    const url = urlCariGoogleMaps("Kos Mawar (Putri)")!;
    expect(decodeURIComponent(url.slice(DASAR.length))).toBe("Kos Mawar (Putri) Jatinangor");
  });

  it("spasi ganda/tepi dirapikan", () => {
    expect(urlCariGoogleMaps("  Kost   Hoop \t Putri  ")).toBe(`${DASAR}Kost%20Hoop%20Putri%20Jatinangor`);
  });

  it("akhiran pembeda ' (2)' dibuang", () => {
    expect(urlCariGoogleMaps("Kost Melati (2)")).toBe(urlCariGoogleMaps("Kost Melati"));
    expect(urlCariGoogleMaps("Kost Melati   (12)  ")).toBe(urlCariGoogleMaps("Kost Melati"));
    // angka di tengah tidak dianggap pembeda
    expect(decodeURIComponent(urlCariGoogleMaps("Kos (2) Indah")!.slice(DASAR.length))).toBe("Kos (2) Indah Jatinangor");
  });

  it("tidak menambah 'Jatinangor' dua kali (tanpa peduli huruf besar/kecil)", () => {
    for (const nama of ["Kost 251 Jatinangor Sumedang", "kos mawar jatinangor", "KOS MAWAR JATINANGOR"]) {
      const query = decodeURIComponent(urlCariGoogleMaps(nama)!.slice(DASAR.length));
      expect(query).toBe(nama);
      expect(query.toLowerCase().split("jatinangor")).toHaveLength(2);
    }
  });

  it("nama kosong, spasi saja, atau hanya akhiran pembeda → null", () => {
    expect(urlCariGoogleMaps("")).toBeNull();
    expect(urlCariGoogleMaps("   \t ")).toBeNull();
    expect(urlCariGoogleMaps(" (2)")).toBeNull();
  });
});

/** Query hasil, sudah di-decode (tanpa parameter lain). */
function query(url: string | null): string {
  return decodeURIComponent(url!.slice(DASAR.length).split("&query_place_id=")[0]);
}

describe("urlCariGoogleMaps: frasa varian \"Tipe ...\" dibuang", () => {
  it("contoh dari tugas", () => {
    expect(query(urlCariGoogleMaps("Kost Pondok Kaca II Tipe B"))).toBe("Kost Pondok Kaca II Jatinangor");
    expect(query(urlCariGoogleMaps("Kost Hoop Tipe C"))).toBe("Kost Hoop Jatinangor");
    expect(query(urlCariGoogleMaps("Kost Pondok Wangi Tipe A Jatinangor Sumedang"))).toBe(
      "Kost Pondok Wangi Jatinangor Sumedang",
    );
  });

  it("kode berupa angka romawi, angka, alfanumerik, kata; huruf besar/kecil bebas", () => {
    expect(query(urlCariGoogleMaps("Kost Mawar tipe II"))).toBe("Kost Mawar Jatinangor");
    expect(query(urlCariGoogleMaps("Kost Mawar TIPE 2"))).toBe("Kost Mawar Jatinangor");
    expect(query(urlCariGoogleMaps("Kost Mawar tipe A1"))).toBe("Kost Mawar Jatinangor");
    expect(query(urlCariGoogleMaps("Kost Mawar Tipe Standar"))).toBe("Kost Mawar Jatinangor");
  });

  it("frasa di tengah nama dibuang, kata lain tetap", () => {
    expect(query(urlCariGoogleMaps("Kost Tipe B Pondok Indah"))).toBe("Kost Pondok Indah Jatinangor");
    expect(query(urlCariGoogleMaps("Kost Pondok Annisa UNPAD Tipe A"))).toBe("Kost Pondok Annisa UNPAD Jatinangor");
  });

  it("nama tanpa \"Tipe\" tidak berubah", () => {
    expect(query(urlCariGoogleMaps("Kost Mawar Indah"))).toBe("Kost Mawar Indah Jatinangor");
    // "tipe" yang bukan kata utuh tidak disentuh
    expect(query(urlCariGoogleMaps("Kost Prototipe A"))).toBe("Kost Prototipe A Jatinangor");
  });

  it("\"Tipe\" tanpa token sesudahnya tidak dibuang", () => {
    expect(query(urlCariGoogleMaps("Kost Mawar Tipe"))).toBe("Kost Mawar Tipe Jatinangor");
  });

  it("hasil pembuangan kosong atau tinggal kost/kos → pakai nama asli yang dirapikan", () => {
    expect(query(urlCariGoogleMaps("Tipe A"))).toBe("Tipe A Jatinangor");
    expect(query(urlCariGoogleMaps("  Kost   Tipe B "))).toBe("Kost Tipe B Jatinangor");
    expect(query(urlCariGoogleMaps("Kos Tipe 2 (2)"))).toBe("Kos Tipe 2 Jatinangor");
  });

  it("digabung dengan akhiran ' (2)'", () => {
    expect(urlCariGoogleMaps("Kost Hoop Tipe C (2)")).toBe(urlCariGoogleMaps("Kost Hoop"));
    expect(urlCariGoogleMaps("Kost Hoop (2) Tipe C")).toBe(urlCariGoogleMaps("Kost Hoop"));
  });
});

describe("urlCariGoogleMaps: place ID", () => {
  const ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";

  it("tanpa placeId (undefined, null, kosong, spasi) → hanya pencarian", () => {
    const polos = `${DASAR}Kost%20Hoop%20Jatinangor`;
    expect(urlCariGoogleMaps("Kost Hoop Tipe C")).toBe(polos);
    expect(urlCariGoogleMaps("Kost Hoop Tipe C", undefined)).toBe(polos);
    expect(urlCariGoogleMaps("Kost Hoop Tipe C", null)).toBe(polos);
    expect(urlCariGoogleMaps("Kost Hoop Tipe C", "")).toBe(polos);
    expect(urlCariGoogleMaps("Kost Hoop Tipe C", "   ")).toBe(polos);
  });

  it("dengan placeId → tautan langsung ke tempat (query + query_place_id)", () => {
    expect(urlCariGoogleMaps("Kost Hoop Tipe C", ID)).toBe(`${DASAR}Kost%20Hoop%20Jatinangor&query_place_id=${ID}`);
    expect(urlCariGoogleMaps("Kost Hoop", `  ${ID}  `)).toBe(`${DASAR}Kost%20Hoop%20Jatinangor&query_place_id=${ID}`);
  });

  it("karakter khusus pada placeId di-encode", () => {
    const url = urlCariGoogleMaps("Kos A", "a b&c#d=e/f?g")!;
    const id = url.split("&query_place_id=")[1];
    expect(id).not.toMatch(/[ &#=/?]/);
    expect(decodeURIComponent(id)).toBe("a b&c#d=e/f?g");
    expect(url.split("&query_place_id=")).toHaveLength(2);
  });

  it("nama kosong tetap null walau ada placeId", () => {
    expect(urlCariGoogleMaps("", ID)).toBeNull();
    expect(urlCariGoogleMaps("  (2)", ID)).toBeNull();
  });
});

describe("urlGoogleMaps: pin langsung vs pencarian nama menurut koordinat_status", () => {
  const PIN = "https://www.google.com/maps/search/?api=1&query=";
  const dasar = { nama: "Kost Pondok Wangi Tipe A (2)", lat: -6.9272491, lng: 107.7793797 };

  it("terverifikasi dan geokode → pin LAT,LNG (koma tidak di-encode)", () => {
    for (const koordinat_status of ["terverifikasi", "geokode"]) {
      expect(urlGoogleMaps({ ...dasar, koordinat_status })).toBe(`${PIN}-6.9272491,107.7793797`);
    }
  });

  it("perkiraan → pencarian nama (tanpa Tipe X dan tanpa (2)), koordinat tidak dipakai", () => {
    const url = urlGoogleMaps({ ...dasar, koordinat_status: "perkiraan" });
    expect(url).toBe(`${PIN}Kost%20Pondok%20Wangi%20Jatinangor`);
    expect(url).not.toContain("6.92");
  });

  it("status tidak ada / null / tak dikenal → pencarian nama seperti sebelumnya", () => {
    const cari = urlCariGoogleMaps(dasar.nama);
    expect(urlGoogleMaps({ ...dasar })).toBe(cari);
    expect(urlGoogleMaps({ ...dasar, koordinat_status: null })).toBe(cari);
    expect(urlGoogleMaps({ ...dasar, koordinat_status: "akurat" })).toBe(cari);
    expect(urlGoogleMaps({ nama: dasar.nama })).toBe(cari);
  });

  it("status terpercaya tetapi koordinat tidak valid → pencarian nama (tidak pernah pin rusak)", () => {
    const cari = urlCariGoogleMaps(dasar.nama);
    for (const [lat, lng] of [
      [null, null],
      [undefined, undefined],
      [-6.9, null],
      [null, 107.7],
      [Number.NaN, 107.7],
      [-6.9, Number.POSITIVE_INFINITY],
      [91, 107.7],
      [-6.9, 181],
    ] as const) {
      expect(urlGoogleMaps({ nama: dasar.nama, lat, lng, koordinat_status: "geokode" }), `${lat},${lng}`).toBe(cari);
    }
  });

  it("pin tetap jadi tautan walau nama kosong; nama kosong tanpa pin → null", () => {
    expect(urlGoogleMaps({ nama: "", lat: -6.9, lng: 107.7, koordinat_status: "geokode" })).toBe(`${PIN}-6.9,107.7`);
    expect(urlGoogleMaps({ nama: "", lat: -6.9, lng: 107.7, koordinat_status: "perkiraan" })).toBeNull();
    expect(urlGoogleMaps({ nama: "  (2)" })).toBeNull();
  });

  it("place ID ditambahkan ke pin maupun pencarian", () => {
    expect(urlGoogleMaps({ ...dasar, koordinat_status: "geokode", placeId: "ChIJabc" })).toBe(
      `${PIN}-6.9272491,107.7793797&query_place_id=ChIJabc`,
    );
    expect(urlGoogleMaps({ ...dasar, koordinat_status: "perkiraan", placeId: "ChIJabc" })).toBe(
      `${PIN}Kost%20Pondok%20Wangi%20Jatinangor&query_place_id=ChIJabc`,
    );
  });

  it("titikBisaDipercaya", () => {
    expect(titikBisaDipercaya("terverifikasi")).toBe(true);
    expect(titikBisaDipercaya("geokode")).toBe(true);
    for (const s of ["perkiraan", null, undefined, "", "lain"]) expect(titikBisaDipercaya(s), String(s)).toBe(false);
  });
});
