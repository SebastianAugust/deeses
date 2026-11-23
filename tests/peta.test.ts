import { describe, expect, it } from "vitest";
import { urlCariGoogleMaps } from "@/lib/peta";

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
