import { describe, expect, it } from "vitest";
import { MAKS_ZOOM_PER_EVENT, aksiRoda, kePiksel, type DataRoda } from "@/lib/peta-roda";

const TINGGI = 380;
const roda = (p: Partial<DataRoda>): DataRoda => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  shiftKey: false,
  ...p,
});
const aksi = (p: Partial<DataRoda>) => aksiRoda(roda(p), TINGGI);

describe("aksiRoda: tanpa ctrlKey → geser bebas ke segala arah", () => {
  it.each<[string, Partial<DataRoda>, number, number]>([
    ["vertikal kecil", { deltaY: 12 }, 0, 12],
    ["vertikal ke atas", { deltaY: -9 }, 0, -9],
    ["horizontal", { deltaX: -18 }, -18, 0],
    ["diagonal", { deltaX: 9, deltaY: 14 }, 9, 14],
    ["diagonal negatif", { deltaX: -7, deltaY: -21 }, -7, -21],
    // Dulu pola ini (bulat, ≥ 50, deltaX 0) dibaca sebagai klik roda mouse → zoom.
    ["vertikal besar dan bulat (swipe cepat)", { deltaY: 100 }, 0, 100],
    ["vertikal besar bulat ke atas", { deltaY: -120 }, 0, -120],
    ["pecahan (macOS)", { deltaX: 0.5, deltaY: 73.25 }, 0.5, 73.25],
  ])("%s → geser tanpa diubah", (_n, p, dx, dy) => {
    expect(aksi(p)).toEqual({ jenis: "geser", dx, dy });
  });

  it("deltaMode baris (1) dikali 16; halaman (2) dikali tinggi kontainer", () => {
    expect(aksi({ deltaMode: 1, deltaX: 1, deltaY: 3 })).toEqual({ jenis: "geser", dx: 16, dy: 48 });
    expect(aksi({ deltaMode: 2, deltaY: -1 })).toEqual({ jenis: "geser", dx: 0, dy: -TINGGI });
    expect(kePiksel(5, 0, TINGGI)).toBe(5);
  });

  it("Shift menukar sumbu hanya bila deltaX = 0", () => {
    expect(aksi({ deltaY: 15, shiftKey: true })).toEqual({ jenis: "geser", dx: 15, dy: 0 });
    expect(aksi({ deltaX: 5, deltaY: 15, shiftKey: true })).toEqual({ jenis: "geser", dx: 5, dy: 15 });
  });
});

describe("aksiRoda: ctrlKey → zoom", () => {
  it("pinch ke luar (deltaY negatif) = zoom in, ke dalam = zoom out, 0,01 level/px", () => {
    expect(aksi({ ctrlKey: true, deltaY: -10 })).toEqual({ jenis: "zoom", delta: 0.1 });
    expect(aksi({ ctrlKey: true, deltaY: 25 })).toEqual({ jenis: "zoom", delta: -0.25 });
  });

  it("deltaX diabaikan saat zoom; ctrlKey menang atas shiftKey", () => {
    expect(aksi({ ctrlKey: true, shiftKey: true, deltaX: 40, deltaY: -10 })).toEqual({ jenis: "zoom", delta: 0.1 });
  });

  it("deltaMode baris dikonversi (Ctrl + roda Firefox: 3 baris = 48 px)", () => {
    const a = aksi({ ctrlKey: true, deltaMode: 1, deltaY: 3 });
    expect(a.jenis).toBe("zoom");
    expect((a as { delta: number }).delta).toBeCloseTo(-0.48, 10);
  });

  it("perubahan zoom per event dibatasi ±1 level", () => {
    expect(aksi({ ctrlKey: true, deltaY: 5000 })).toEqual({ jenis: "zoom", delta: -MAKS_ZOOM_PER_EVENT });
    expect(aksi({ ctrlKey: true, deltaY: -5000 })).toEqual({ jenis: "zoom", delta: MAKS_ZOOM_PER_EVENT });
  });

  it("delta 0 tidak menghasilkan -0", () => {
    expect(Object.is((aksi({ ctrlKey: true, deltaY: 0 }) as { delta: number }).delta, 0)).toBe(true);
  });
});
