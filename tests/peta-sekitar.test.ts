import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PetaSekitar } from "@/components/peta/peta-sekitar";

const html = (props: Record<string, unknown>) =>
  renderToStaticMarkup(h(PetaSekitar, { nama: "Kost Uji", ...props } as never));

describe("<PetaSekitar>: kos tanpa koordinat valid tidak mendapat peta", () => {
  it.each([
    ["tanpa lat/lng", {}],
    ["null", { lat: null, lng: null }],
    ["lat saja", { lat: -6.93, lng: null }],
    ["NaN", { lat: Number.NaN, lng: 107.77 }],
    ["di luar rentang", { lat: 91, lng: 107.77 }],
  ])("%s → teks 'Lokasi belum tersedia', tanpa wadah peta", (_, koordinat) => {
    const out = html(koordinat);
    expect(out).toContain("Lokasi belum tersedia");
    expect(out).toContain("Peta sekitar kos");
    expect(out).not.toContain("Aktifkan peta");
    expect(out).not.toContain("leaflet");
  });

  it("koordinat valid → bingkai peta (kerangka) dan atribusi OSM di render server, tanpa memuat Leaflet", () => {
    const out = html({ lat: -6.93, lng: 107.77, koordinat_status: "geokode" });
    expect(out).not.toContain("Lokasi belum tersedia");
    expect(out).toContain("© OpenStreetMap contributors (ODbL)");
    expect(out).toContain("h-[300px]"); // tinggi mobile; desktop lg:h-[360px]
    expect(out).toContain("lg:h-[360px]");
    expect(out).not.toContain("lokasi perkiraan");
  });

  it("status perkiraan → label 'lokasi perkiraan' dan penjelasan lingkaran ±200 m", () => {
    const out = html({ lat: -6.93, lng: 107.77, koordinat_status: "perkiraan" });
    expect(out).toContain("lokasi perkiraan");
    expect(out).toContain("±200 m");
  });

  it("varian ringkas (panel) lebih pendek", () => {
    expect(html({ lat: -6.93, lng: 107.77, ringkas: true })).toContain("h-[240px]");
  });
});
