import { describe, expect, it } from "vitest";
import { MAKS_ZOOM_PER_EVENT, aksiRoda, jenisRoda, type DataRoda } from "@/lib/peta-roda";

const roda = (p: Partial<DataRoda>): DataRoda => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  shiftKey: false,
  ...p,
});

describe("jenisRoda", () => {
  it.each<[string, Partial<DataRoda>, string]>([
    ["pinch touchpad Windows (ctrlKey, delta kecil)", { ctrlKey: true, deltaY: -3.5 }, "pinch"],
    ["Ctrl + roda mouse", { ctrlKey: true, deltaY: 100 }, "pinch"],
    ["roda mouse Chrome (100 px, bulat, deltaX 0)", { deltaY: 100 }, "roda"],
    ["roda mouse ke atas (-120)", { deltaY: -120 }, "roda"],
    ["roda mouse Firefox (mode baris)", { deltaMode: 1, deltaY: 3 }, "roda"],
    ["roda mouse mode halaman", { deltaMode: 2, deltaY: 1 }, "roda"],
    ["swipe vertikal touchpad (kecil)", { deltaY: 12 }, "touchpad"],
    ["swipe horizontal touchpad", { deltaX: -18 }, "touchpad"],
    ["swipe diagonal touchpad", { deltaX: 9, deltaY: 14 }, "touchpad"],
    ["swipe cepat besar tapi pecahan (macOS)", { deltaY: 73.5 }, "touchpad"],
    ["swipe cepat besar tapi ada deltaX", { deltaX: 4, deltaY: 90 }, "touchpad"],
    ["tepat di bawah ambang (49) bukan roda", { deltaY: 49 }, "touchpad"],
    ["tepat di ambang (50), bulat, deltaX 0 → roda", { deltaY: 50 }, "roda"],
  ])("%s → %s", (_n, p, jenis) => {
    expect(jenisRoda(roda(p))).toBe(jenis);
  });
});

describe("aksiRoda", () => {
  it("touchpad: geser sesuai deltaX/deltaY (kiri-kanan dan atas-bawah)", () => {
    expect(aksiRoda(roda({ deltaX: 10, deltaY: -6 }))).toEqual({ jenis: "geser", dx: 10, dy: -6 });
    expect(aksiRoda(roda({ deltaX: -22, deltaY: 0 }))).toEqual({ jenis: "geser", dx: -22, dy: 0 });
  });

  it("touchpad + Shift: sumbu ditukar bila deltaX kosong; bila deltaX sudah ada, dibiarkan", () => {
    expect(aksiRoda(roda({ deltaY: 15, shiftKey: true }))).toEqual({ jenis: "geser", dx: 15, dy: 0 });
    expect(aksiRoda(roda({ deltaX: 5, deltaY: 15, shiftKey: true }))).toEqual({ jenis: "geser", dx: 5, dy: 15 });
  });

  it("pinch: ke luar (deltaY negatif) = zoom in, ke dalam = zoom out, faktor 0,01/px", () => {
    expect(aksiRoda(roda({ ctrlKey: true, deltaY: -10 }))).toEqual({ jenis: "zoom", delta: 0.1 });
    expect(aksiRoda(roda({ ctrlKey: true, deltaY: 25 }))).toEqual({ jenis: "zoom", delta: -0.25 });
  });

  it("roda mouse: langkah per klik lebih kecil dari pinch (0,5 level untuk 100 px); scroll ke bawah = zoom out", () => {
    expect(aksiRoda(roda({ deltaY: 100 }))).toEqual({ jenis: "zoom", delta: -0.5 });
    expect(aksiRoda(roda({ deltaY: -100 }))).toEqual({ jenis: "zoom", delta: 0.5 });
  });

  it("mode baris/halaman dikonversi ke piksel (Firefox: 3 baris ≈ 120 px)", () => {
    const a = aksiRoda(roda({ deltaMode: 1, deltaY: 3 }));
    expect(a).toEqual({ jenis: "zoom", delta: -0.6 });
  });

  it("perubahan zoom per event dibatasi", () => {
    const a = aksiRoda(roda({ ctrlKey: true, deltaY: 5000 }));
    expect(a).toEqual({ jenis: "zoom", delta: -MAKS_ZOOM_PER_EVENT });
    const b = aksiRoda(roda({ deltaMode: 2, deltaY: -3 }));
    expect(b).toEqual({ jenis: "zoom", delta: MAKS_ZOOM_PER_EVENT });
  });

  it("delta 0 tidak menghasilkan -0", () => {
    const a = aksiRoda(roda({ ctrlKey: true, deltaY: 0 }));
    expect(Object.is((a as { delta: number }).delta, 0)).toBe(true);
  });
});
