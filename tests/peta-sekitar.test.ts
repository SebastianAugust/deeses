import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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
    expect(out).not.toContain("maplibre");
  });

  it("koordinat valid → bingkai peta (kerangka) dan atribusi OpenFreeMap/OpenMapTiles/OSM di render server, tanpa memuat MapLibre", () => {
    const out = html({ lat: -6.93, lng: 107.77, koordinat_status: "geokode" });
    expect(out).not.toContain("Lokasi belum tersedia");
    expect(out).toContain("© OpenStreetMap contributors (ODbL)");
    expect(out).toContain("OpenFreeMap");
    expect(out).toContain("OpenMapTiles");
    expect(out).toContain("h-[320px]"); // tinggi mobile; desktop lg:h-[380px]
    expect(out).toContain("lg:h-[380px]");
    expect(out).not.toContain("lokasi perkiraan");
  });

  it("status perkiraan → label 'lokasi perkiraan' dan penjelasan lingkaran ±200 m", () => {
    const out = html({ lat: -6.93, lng: 107.77, koordinat_status: "perkiraan" });
    expect(out).toContain("lokasi perkiraan");
    expect(out).toContain("±200 m");
  });
});

describe("peta hanya di halaman detail penuh, bukan di /hasil", () => {
  const baca = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

  it("panel detail /hasil dan kartu hasil tidak mengimpor peta/POI (tak ada MapLibre, style, atau poi-jatinangor.json di daftar)", () => {
    for (const rel of [
      "../src/components/kos/kos-detail-panel.tsx",
      "../src/components/hasil/hasil-desktop.tsx",
      "../src/components/hasil/hasil-mobile.tsx",
    ]) {
      const src = baca(rel);
      expect(src, rel).not.toMatch(/components\/peta|peta-sekitar|peta-maplibre|maplibre-gl|use-poi|usePoi/);
    }
  });

  it("halaman /kos/[id] tetap memakai PetaSekitar", () => {
    expect(baca("../src/app/kos/[id]/detail-view.tsx")).toContain("<PetaSekitar");
  });
});
