import { beforeEach, describe, expect, it } from "vitest";
import { KRITERIA_DEFAULT, MAKS_KRITERIA, KRITERIA_TERSEDIA, type KodeKriteria } from "@/config/kriteria";
import {
  bacaKriteriaTersimpan,
  resetKriteriaTersimpan,
  simpanKriteria,
} from "@/lib/kriteria-tersimpan";
import {
  PARAM_DARI_BERANDA,
  PARAM_OK,
  asalDetail,
  buildApiQuery,
  buildHref,
  buildQuery,
  paramAsal,
  parseFilter,
  tujuanKembali,
  type FilterState,
} from "@/lib/query";

const semua = KRITERIA_TERSEDIA.slice(0, MAKS_KRITERIA).map((k) => k.kode) as KodeKriteria[];
const filter: FilterState = { budget: 1_200_000, tipe: "putri", kriteria: semua };

describe("URL halaman pendek (tanpa kriteria)", () => {
  it("buildQuery/buildHref hanya budget & tipe (+ param tambahan)", () => {
    expect(buildQuery(filter)).toBe("budget=1200000&tipe=putri");
    expect(buildHref("/hasil", filter, { ok: "1", pilih: "123" })).toBe(
      "/hasil?budget=1200000&tipe=putri&ok=1&pilih=123",
    );
    expect(buildHref("/prioritas", filter)).not.toContain("kriteria");
  });

  it("buildApiQuery tetap membawa kriteria (kontrak GET /api/kos/[id])", () => {
    expect(buildApiQuery(filter)).toBe(`budget=1200000&tipe=putri&kriteria=${semua.join(",")}`);
    expect(buildApiQuery({ ...filter, kriteria: [] })).toBe("budget=1200000&tipe=putri&kriteria=");
  });

  it("URL dengan 12 kriteria jauh lebih pendek daripada format lama", () => {
    expect(buildHref("/hasil", filter).length).toBeLessThan(buildApiQuery(filter).length - 40);
    expect(buildHref("/hasil", filter, { ok: "1" }).length).toBeLessThan(50);
  });
});

describe("parseFilter: kriteria dari URL → rakitan sesi → default", () => {
  const p = (s: string) => new URLSearchParams(s);

  it("tanpa ?kriteria= dan tanpa rakitan sesi → default", () => {
    expect(parseFilter(p("budget=900000&tipe=putra")).kriteria).toEqual([...KRITERIA_DEFAULT]);
    expect(parseFilter(p("budget=900000&tipe=putra"), null).kriteria).toEqual([...KRITERIA_DEFAULT]);
  });

  it("memakai rakitan sesi bila URL tanpa kriteria (urutan dipertahankan, kode tak dikenal dibuang)", () => {
    expect(parseFilter(p("tipe=putri"), "luas,harga,xx").kriteria).toEqual(["luas", "harga"]);
  });

  it("rakitan sesi kosong (\"\") = rakitan kosong, bukan default", () => {
    expect(parseFilter(p("tipe=putri"), "").kriteria).toEqual([]);
  });

  it("link lama dengan ?kriteria= menang atas rakitan sesi", () => {
    expect(parseFilter(p("tipe=putri&kriteria=ac"), "luas,harga").kriteria).toEqual(["ac"]);
  });
});

describe("kriteria-tersimpan (tanpa window → jatuh ke memori)", () => {
  beforeEach(() => resetKriteriaTersimpan());

  it("null sebelum pernah diset; setelah simpan terbaca persis; bisa dikosongkan", () => {
    expect(bacaKriteriaTersimpan()).toBeNull();
    simpanKriteria(["luas", "harga"]);
    expect(bacaKriteriaTersimpan()).toBe("luas,harga");
    simpanKriteria([]);
    expect(bacaKriteriaTersimpan()).toBe("");
  });

  it("round-trip lewat parseFilter", () => {
    simpanKriteria(["cctv", "ac", "harga"]);
    expect(parseFilter(new URLSearchParams("tipe=putra"), bacaKriteriaTersimpan()).kriteria).toEqual([
      "cctv",
      "ac",
      "harga",
    ]);
  });
});

describe("asalDetail: dari mana detail kos dibuka", () => {
  const a = (s: string) => asalDetail(new URLSearchParams(s));

  it("ok=1 → hasil; dari=beranda → beranda; selain itu → lain", () => {
    expect(a("budget=1200000&tipe=putri&ok=1")).toBe("hasil");
    expect(a("budget=1200000&tipe=putri&dari=beranda")).toBe("beranda");
    expect(a("budget=1200000&tipe=putri")).toBe("lain");
    expect(a("")).toBe("lain");
  });

  it("keduanya ada → hasil menang", () => {
    expect(a("ok=1&dari=beranda")).toBe("hasil");
  });

  it("nilai aneh → lain (ok harus persis 1, dari harus persis beranda)", () => {
    expect(a("ok=0")).toBe("lain");
    expect(a("ok=true")).toBe("lain");
    expect(a("ok=")).toBe("lain");
    expect(a("dari=Beranda")).toBe("lain");
    expect(a("dari=hasil")).toBe("lain");
    expect(a("dari=")).toBe("lain");
    expect(a("ok=0&dari=beranda")).toBe("beranda");
  });

  it("penanda yang dibuat buildHref terbaca balik", () => {
    expect(asalDetail(new URL(buildHref("/kos/1", filter, PARAM_OK), "http://x").searchParams)).toBe("hasil");
    expect(asalDetail(new URL(buildHref("/kos/1", filter, PARAM_DARI_BERANDA), "http://x").searchParams)).toBe(
      "beranda",
    );
    expect(buildHref("/kos/1", filter, PARAM_DARI_BERANDA)).toBe("/kos/1?budget=1200000&tipe=putri&dari=beranda");
  });
});

describe("paramAsal: penanda ikut terbawa ke detail berikutnya", () => {
  it("hasil → ok=1, beranda → dari=beranda, lain → tidak ada", () => {
    expect(paramAsal("hasil")).toEqual(PARAM_OK);
    expect(paramAsal("beranda")).toEqual(PARAM_DARI_BERANDA);
    expect(paramAsal("lain")).toBeUndefined();
  });
});

describe("tujuanKembali: tujuan & label kembali per asal", () => {
  it("hasil: perilaku lama (/hasil dengan ok=1, label peringkat, riwayat /hasil)", () => {
    expect(tujuanKembali("hasil", filter)).toEqual({
      href: "/hasil?budget=1200000&tipe=putri&ok=1",
      label: "Kembali ke peringkat",
      labelTombol: "Lihat hasil rekomendasi",
      riwayatDesktop: "/hasil",
      riwayatMobile: true,
    });
  });

  it("beranda: ke / dengan riwayat beranda", () => {
    expect(tujuanKembali("beranda", filter)).toEqual({
      href: "/",
      label: "Kembali ke beranda",
      labelTombol: "Ke beranda",
      riwayatDesktop: "/",
      riwayatMobile: "/",
    });
  });

  it("lain: ke / tanpa router.back(), tidak pernah ke /hasil tanpa ok=1", () => {
    const t = tujuanKembali("lain", filter);
    expect(t).toEqual({
      href: "/",
      label: "Ke beranda",
      labelTombol: "Ke beranda",
      riwayatDesktop: false,
      riwayatMobile: false,
    });
    expect(t.href).not.toContain("/hasil");
  });

  it("satu-satunya tujuan /hasil selalu membawa ok=1", () => {
    for (const asal of ["hasil", "beranda", "lain"] as const) {
      const { href } = tujuanKembali(asal, filter);
      if (href.startsWith("/hasil")) expect(href).toContain("ok=1");
    }
  });
});
