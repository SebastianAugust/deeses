import { describe, expect, it } from "vitest";
import { haversine } from "@/lib/poi";
import { cincinLingkaran, keLngLat } from "@/lib/peta-geo";

// Kira-kira Jatinangor: lat NEGATIF (~-6,9), lng ~107,77. Kalau tertukar, nilainya jauh berbeda.
const KOS = { lat: -6.9265, lng: 107.7712 };

describe("keLngLat", () => {
  it("urutan [lng, lat], bukan [lat, lng]", () => {
    expect(keLngLat(KOS)).toEqual([107.7712, -6.9265]);
    const [x, y] = keLngLat(KOS);
    expect(x).toBeGreaterThan(100); // lng
    expect(y).toBeLessThan(0); // lat
  });
});

describe("cincinLingkaran", () => {
  const cincin = cincinLingkaran(KOS, 200);

  it("tertutup: titik pertama = terakhir, 65 titik untuk 64 langkah", () => {
    expect(cincin).toHaveLength(65);
    expect(cincin[0]).toEqual(cincin[64]);
  });

  it("urutan [lng, lat]: semua titik dekat (107,77; -6,93), titik pertama di timur pusat", () => {
    for (const [lng, lat] of cincin) {
      expect(Math.abs(lng - KOS.lng)).toBeLessThan(0.01);
      expect(Math.abs(lat - KOS.lat)).toBeLessThan(0.01);
    }
    expect(cincin[0][0]).toBeGreaterThan(KOS.lng);
    expect(cincin[0][1]).toBeCloseTo(KOS.lat, 9);
  });

  it("setiap titik berjarak ≈ radius dari pusat (haversine, toleransi 1%)", () => {
    for (const [lng, lat] of cincin) {
      const d = haversine(KOS, { lat, lng });
      expect(d).toBeGreaterThan(198);
      expect(d).toBeLessThan(202);
    }
  });

  it("radius lebih besar → cincin lebih besar", () => {
    const besar = cincinLingkaran(KOS, 400);
    expect(haversine(KOS, { lng: besar[0][0], lat: besar[0][1] })).toBeGreaterThan(
      haversine(KOS, { lng: cincin[0][0], lat: cincin[0][1] }),
    );
  });
});
