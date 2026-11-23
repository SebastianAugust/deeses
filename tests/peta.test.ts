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
    expect(urlCariGoogleMaps("  Kost   Hoop \t Tipe  B  ")).toBe(`${DASAR}Kost%20Hoop%20Tipe%20B%20Jatinangor`);
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
