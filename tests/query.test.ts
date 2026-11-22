import { beforeEach, describe, expect, it } from "vitest";
import { KRITERIA_DEFAULT, MAKS_KRITERIA, KRITERIA_TERSEDIA, type KodeKriteria } from "@/config/kriteria";
import {
  bacaKriteriaTersimpan,
  resetKriteriaTersimpan,
  simpanKriteria,
} from "@/lib/kriteria-tersimpan";
import { buildApiQuery, buildHref, buildQuery, parseFilter, type FilterState } from "@/lib/query";

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
