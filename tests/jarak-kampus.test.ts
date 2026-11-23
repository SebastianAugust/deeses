import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatatanDataKos } from "@/components/catatan-data-kos";
import { JarakKampus } from "@/components/jarak-kampus";

/** Teks tampilan: tag dibuang, spasi antar elemen dirapikan. */
function teks(el: ReturnType<typeof h>): string {
  return renderToStaticMarkup(el)
    .replace(/<\/(dt|dd|div|span)>/g, "$& ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const kos = { jarak_km: 1.3, jarak_imputasi: false, jarak_unpad_km: 1.34, jarak_itb_km: 2.15 };

describe("<JarakKampus>", () => {
  it("blok: dua baris Unpad dan ITB, dibulatkan 0,1 km dengan koma", () => {
    expect(teks(h(JarakKampus, { kos }))).toBe("Jarak ke Unpad 1,3 km Jarak ke ITB 2,1 km");
    const html = renderToStaticMarkup(h(JarakKampus, { kos }));
    expect(html.match(/<dt/g)).toHaveLength(2);
  });

  it("nilai null → \"-\" per baris", () => {
    expect(teks(h(JarakKampus, { kos: { ...kos, jarak_itb_km: null } }))).toBe("Jarak ke Unpad 1,3 km Jarak ke ITB -");
    expect(teks(h(JarakKampus, { kos: { jarak_km: null, jarak_unpad_km: null, jarak_itb_km: null } }))).toBe(
      "Jarak ke Unpad - Jarak ke ITB -",
    );
  });

  it("ringkas: satu baris", () => {
    expect(teks(h(JarakKampus, { kos, varian: "ringkas" }))).toBe("Unpad 1,3 km · ITB 2,1 km");
    expect(teks(h(JarakKampus, { kos: { ...kos, jarak_unpad_km: null }, varian: "ringkas" }))).toBe("Unpad - · ITB 2,1 km");
  });

  it("data lama (tanpa jarak per kampus, C2 ada) → satu jarak terdekat seperti dulu", () => {
    const lama = { jarak_km: 1.8, jarak_imputasi: false };
    expect(teks(h(JarakKampus, { kos: lama }))).toBe("Jarak ke kampus terdekat 1,8 km");
    expect(teks(h(JarakKampus, { kos: lama, varian: "ringkas" }))).toBe("1,8 km");
  });

  it("tidak memuat label \"perkiraan jarak rute\" (satu label per blok dipasang terpisah)", () => {
    expect(teks(h(JarakKampus, { kos }))).not.toContain("perkiraan");
  });
});

describe("<CatatanDataKos>: label sekali per blok", () => {
  it("jarak per kampus ada → tepat satu \"perkiraan jarak rute\"", () => {
    const t = teks(h(CatatanDataKos, { kos: { ...kos, koordinat_status: "perkiraan" } }));
    expect(t.match(/perkiraan jarak rute/g)).toHaveLength(1);
    expect(t).toContain("lokasi perkiraan");
  });

  it("semua jarak kosong → tanpa label jarak", () => {
    const t = teks(h(CatatanDataKos, { kos: { jarak_km: null, jarak_unpad_km: null, jarak_itb_km: null, koordinat_status: "perkiraan" } }));
    expect(t).toBe("lokasi perkiraan");
  });
});
