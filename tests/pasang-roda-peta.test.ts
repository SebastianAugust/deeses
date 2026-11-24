import { describe, expect, it, vi } from "vitest";
import { jumlahListenerRoda, pasangRoda, type PetaUntukRoda } from "@/lib/pasang-roda-peta";

type Pendengar = (e: unknown) => void;

function elemenPalsu(tinggi = 380, kiri = 100, atas = 50) {
  const pendengar = new Map<string, Set<Pendengar>>();
  const el = {
    clientHeight: tinggi,
    addEventListener(tipe: string, fn: Pendengar) {
      if (!pendengar.has(tipe)) pendengar.set(tipe, new Set());
      pendengar.get(tipe)!.add(fn);
    },
    removeEventListener(tipe: string, fn: Pendengar) {
      pendengar.get(tipe)?.delete(fn);
    },
    getBoundingClientRect: () => ({ left: kiri, top: atas }),
  };
  const jumlah = () => pendengar.get("wheel")?.size ?? 0;
  const kirim = (e: Record<string, unknown>) => pendengar.get("wheel")?.forEach((fn) => fn(e));
  return { el: el as unknown as HTMLElement, jumlah, kirim };
}

function petaPalsu(wadah: HTMLElement) {
  const peta = {
    scrollZoom: { enable: vi.fn(), disable: vi.fn() },
    getContainer: () => wadah,
    getZoom: () => 16,
    panBy: vi.fn(),
    zoomTo: vi.fn(),
    unproject: vi.fn((t: [number, number]) => ({ titik: t })),
  };
  return peta satisfies PetaUntukRoda;
}

const wheel = (p: Record<string, unknown> = {}) => ({
  deltaX: 0,
  deltaY: 0,
  deltaMode: 0,
  ctrlKey: false,
  shiftKey: false,
  clientX: 0,
  clientY: 0,
  cancelable: true,
  preventDefault: vi.fn(),
  ...p,
});

describe("pasangRoda: siklus hidup listener", () => {
  it("memasang tepat satu listener dan mematikan scrollZoom bawaan; pelepas mengembalikannya", () => {
    const { el, jumlah } = elemenPalsu();
    const peta = petaPalsu(el);
    const awal = jumlahListenerRoda();
    const lepas = pasangRoda(el, peta);
    expect(jumlah()).toBe(1);
    expect(jumlahListenerRoda()).toBe(awal + 1);
    expect(peta.scrollZoom.disable).toHaveBeenCalledTimes(1);
    lepas();
    expect(jumlah()).toBe(0);
    expect(jumlahListenerRoda()).toBe(awal);
    expect(peta.scrollZoom.enable).toHaveBeenCalledTimes(1);
  });

  it("memasang lagi pada elemen yang sama (StrictMode/efek berulang) tidak menggandakan listener", () => {
    const { el, jumlah, kirim } = elemenPalsu();
    const peta = petaPalsu(el);
    const awal = jumlahListenerRoda();
    pasangRoda(el, peta);
    pasangRoda(el, peta);
    const lepas = pasangRoda(el, peta);
    expect(jumlah()).toBe(1);
    expect(jumlahListenerRoda()).toBe(awal + 1);
    kirim(wheel({ deltaY: 10 }));
    expect(peta.panBy).toHaveBeenCalledTimes(1); // satu event = satu aksi, bukan tiga
    lepas();
  });

  it("pelepas lama tidak mencabut listener yang baru; memanggil pelepas dua kali aman", () => {
    const { el, jumlah } = elemenPalsu();
    const peta = petaPalsu(el);
    const awal = jumlahListenerRoda();
    const lepasLama = pasangRoda(el, peta);
    const lepasBaru = pasangRoda(el, peta);
    lepasLama(); // sudah dilepas otomatis saat dipasang ulang
    expect(jumlah()).toBe(1);
    lepasBaru();
    lepasBaru();
    expect(jumlah()).toBe(0);
    expect(jumlahListenerRoda()).toBe(awal);
  });

  it("dua pembungkus berbeda masing-masing punya listener sendiri", () => {
    const a = elemenPalsu();
    const b = elemenPalsu();
    const lepasA = pasangRoda(a.el, petaPalsu(a.el));
    const lepasB = pasangRoda(b.el, petaPalsu(b.el));
    expect([a.jumlah(), b.jumlah()]).toEqual([1, 1]);
    lepasA();
    expect([a.jumlah(), b.jumlah()]).toEqual([0, 1]);
    lepasB();
  });
});

describe("pasangRoda: aksi per event", () => {
  it("swipe (tanpa ctrl) → panBy dengan delta apa adanya, event dibatalkan", () => {
    const { el, kirim } = elemenPalsu();
    const peta = petaPalsu(el);
    const lepas = pasangRoda(el, peta);
    const e = wheel({ deltaX: 8, deltaY: -13 });
    kirim(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(peta.panBy).toHaveBeenCalledWith([8, -13], { animate: false });
    expect(peta.zoomTo).not.toHaveBeenCalled();
    lepas();
  });

  it("ctrlKey → zoomTo di sekitar kursor (relatif kontainer)", () => {
    const { el, kirim } = elemenPalsu(380, 100, 50);
    const peta = petaPalsu(el);
    const lepas = pasangRoda(el, peta);
    kirim(wheel({ ctrlKey: true, deltaY: -20, clientX: 160, clientY: 90 }));
    expect(peta.unproject).toHaveBeenCalledWith([60, 40]);
    expect(peta.zoomTo).toHaveBeenCalledTimes(1);
    const [zoom, opsi] = peta.zoomTo.mock.calls[0];
    expect(zoom).toBeCloseTo(16.2, 10);
    expect(opsi).toEqual({ around: { titik: [60, 40] }, duration: 0 });
    expect(peta.panBy).not.toHaveBeenCalled();
    lepas();
  });

  it("event yang tak bisa dibatalkan (cancelable=false): preventDefault TIDAK dipanggil, peta tetap bergerak", () => {
    const { el, kirim } = elemenPalsu();
    const peta = petaPalsu(el);
    const lepas = pasangRoda(el, peta);
    const e = wheel({ deltaY: 30, cancelable: false });
    kirim(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(peta.panBy).toHaveBeenCalledWith([0, 30], { animate: false });
    lepas();
  });

  it("setelah dilepas, event tidak lagi ditangani", () => {
    const { el, kirim } = elemenPalsu();
    const peta = petaPalsu(el);
    const lepas = pasangRoda(el, peta);
    lepas();
    kirim(wheel({ deltaY: 30 }));
    expect(peta.panBy).not.toHaveBeenCalled();
  });
});
