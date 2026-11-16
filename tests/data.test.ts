import { describe, expect, it } from "vitest";
import { KODE_KRITERIA, URUTAN_DEFAULT } from "@/config/kriteria";
import { detailKos, keRankResult, urutkanKos } from "@/lib/peringkat";
import { PETUNJUK_RLS, KosDataError, galatKeBody, keKosDataError } from "@/lib/repo/galat";
import {
  KOLOM_FASILITAS,
  diagnostikData,
  isKosLengkap,
  keAlamat,
  keBoolean,
  keKoordinat,
  keKosInfo,
  keTipe,
  petakanBaris,
  type BarisKos,
} from "@/lib/repo/mapper";
import { formatJarak, teksJarak, teksJarakKeKampus } from "@/lib/format";
import { hargaUntukSebaran, hitungSebaran, jumlahDiBawah } from "@/lib/sebaran";
import type { RankRequest } from "@/lib/types";
import {
  validasiIdKos,
  validasiQueryDetail,
  validasiQuerySebaran,
  validasiRankRequest,
} from "@/lib/validasi";
import { jenisKunci, normalisasiUrl } from "@/lib/supabase/kunci";
import fixture from "./fixtures/baris-kos.json";

const ASLI = fixture.baris as BarisKos[];
const [THE75, GREEN, ANNISA] = ASLI;

function ubah(dasar: BarisKos, perubahan: BarisKos): BarisKos {
  return { ...dasar, ...perubahan };
}

// ---------------------------------------------------------------------------
describe("mapper baris → Kos", () => {
  it("baris asli dipetakan dengan benar", () => {
    const k = petakanBaris(ANNISA);
    expect(k.id).toBe("53376778");
    expect(k.nama).toBe("Kost Pondok Annisa UNPAD Tipe A");
    expect(k.tipe).toBe("putri");
    expect(k.harga).toBe(745000);
    expect(k.jarak_km).toBe(0.108);
    expect(k.luas_m2).toBe(8.16);
    expect(k.nilai).toEqual({ C1: 745000, C2: 0.108, C3: 0.188, C4: 8.16, C5: 0.5, C6: 0.5, C7: 0.6667, C8: 0.75 });
    expect(k.jarak_imputasi).toBe(false);
    expect(isKosLengkap(k)).toBe(true);
  });

  it("alamat placeholder, lat/lng/url/foto_url kosong → null", () => {
    const k = petakanBaris(THE75);
    expect(k.alamat).toBeNull(); // "Jatinangor, Sumedang" = placeholder
    expect([k.lat, k.lng, k.url, k.foto_url]).toEqual([null, null, null, null]);
    expect(keAlamat("  jatinangor, sumedang ")).toBeNull();
    expect(keAlamat("")).toBeNull();
    expect(keAlamat(null)).toBeNull();
    expect(keAlamat("Jl. Raya Jatinangor No. 1")).toBe("Jl. Raya Jatinangor No. 1");
  });

  it("lat/lng teks → angka, tidak valid → null", () => {
    expect(keKoordinat("-6.9301", 90)).toBe(-6.9301);
    expect(keKoordinat(" 107.77 ", 180)).toBe(107.77);
    expect(keKoordinat("", 90)).toBeNull();
    expect(keKoordinat("abc", 90)).toBeNull();
    expect(keKoordinat("-6,93", 90)).toBeNull(); // koma tidak ditebak
    expect(keKoordinat("95", 90)).toBeNull(); // di luar rentang lintang
    expect(keKoordinat(null, 180)).toBeNull();
  });

  it("tipe: lowercase + trim, di luar daftar → null (tipe_asli disimpan)", () => {
    expect(keTipe(" Putri ")).toBe("putri");
    expect(keTipe("CAMPUR")).toBe("campur");
    expect(keTipe("perempuan")).toBeNull();
    expect(keTipe("")).toBeNull();
    const k = petakanBaris(ubah(GREEN, { tipe_penghuni: "laki-laki" }));
    expect(k.tipe).toBeNull();
    expect(k.tipe_asli).toBe("laki-laki");
    expect(isKosLengkap(k)).toBe(false);
  });

  it("fasilitas 0/1 → boolean, selain itu null", () => {
    const k = petakanBaris(THE75);
    expect(Object.keys(k.fasilitas)).toEqual([...KOLOM_FASILITAS]);
    expect(k.fasilitas.jendela).toBe(true);
    expect(k.fasilitas.termasuk_listrik).toBe(false);
    expect(keBoolean(1)).toBe(true);
    expect(keBoolean("0")).toBe(false);
    expect(keBoolean(2)).toBeNull();
    expect(keBoolean(null)).toBeNull();
  });

  it("jarak_imputasi = C2 persis 1,1 (heuristik sementara)", () => {
    expect(petakanBaris(ubah(ANNISA, { C2: 1.1 })).jarak_imputasi).toBe(true);
    expect(petakanBaris(ubah(ANNISA, { C2: 1.11 })).jarak_imputasi).toBe(false);
  });

  it("id int → string, kolom kriteria huruf kecil (c1) tetap terbaca", () => {
    const kecil: BarisKos = {};
    for (const [k, v] of Object.entries(ANNISA)) kecil[/^C\d+$/.test(k) ? k.toLowerCase() : k] = v;
    const k = petakanBaris(kecil);
    expect(k.id).toBe("53376778");
    expect(k.nilai.C3).toBe(0.188);
    expect(isKosLengkap(k)).toBe(true);
  });

  it("nilai kosong tidak dikarang: harga/kriteria null → tidak lengkap untuk DSS", () => {
    expect(isKosLengkap(petakanBaris(ubah(ANNISA, { harga: null })))).toBe(false);
    const tanpaC5 = petakanBaris(ubah(ANNISA, { C5: null }));
    expect(tanpaC5.nilai.C5).toBeNull();
    expect(isKosLengkap(tanpaC5)).toBe(false);
    expect(petakanBaris(ubah(ANNISA, { nama: "  " })).nama).toBe("Kos tanpa nama");
  });

  it("keKosInfo: data turunan dari tabel, sisanya null", () => {
    const info = keKosInfo(petakanBaris(ANNISA));
    expect(info.luas_kamar).toBe("8,16 m²");
    expect(info.luas_m2).toBe(8.16);
    expect(info.kamar_mandi).toBe("dalam");
    expect(info.listrik_termasuk).toBe(false);
    expect(info.fasilitas_kamar).toEqual(["Jendela", "Kloset jongkok", "Wi-Fi", "TV"]);
    expect(info.fasilitas_bersama).toEqual(["Penjaga kos", "Parkir motor/sepeda", "Ruang tamu", "Ruang jemur"]);
    for (const f of ["deposit", "aturan", "sekitar", "foto_urls", "kontak_nama", "kontak_wa", "kontak_telp", "sumber_url", "diperbarui_at", "alamat"] as const) {
      expect(info[f]).toBeNull();
    }
  });

  it("foto_urls = [foto_url] bila ada, null bila kosong", () => {
    expect(keKosInfo(petakanBaris(ubah(ANNISA, { foto_url: "https://contoh.test/f.jpg" }))).foto_urls).toEqual([
      "https://contoh.test/f.jpg",
    ]);
    expect(keKosInfo(petakanBaris(ANNISA)).foto_urls).toBeNull();
  });

  it("sumber_url = url (null bila url kosong)", () => {
    expect(keKosInfo(petakanBaris(ubah(ANNISA, { url: "https://contoh.test/kos/1" }))).sumber_url).toBe(
      "https://contoh.test/kos/1",
    );
    expect(keKosInfo(petakanBaris(ubah(ANNISA, { url: "  " }))).sumber_url).toBeNull();
    expect(keKosInfo(petakanBaris(ANNISA)).sumber_url).toBeNull();
  });

  it("diagnostik menghitung kolom terisi dan tipe di luar daftar", () => {
    const semua = [
      ...ASLI.map(petakanBaris),
      petakanBaris(ubah(GREEN, { id: 1, tipe_penghuni: "laki-laki", url: "https://contoh.test/1", foto_url: "https://contoh.test/1.jpg" })),
    ];
    expect(diagnostikData(semua)).toMatchObject({
      total: 4,
      lengkap_untuk_dss: 3,
      foto_url_terisi: 1,
      url_terisi: 1,
      alamat_terisi: 0,
      koordinat_terisi: 0,
      tipe_di_luar_daftar: { "laki-laki": 1 },
    });
  });
});

// ---------------------------------------------------------------------------
describe("validasi input", () => {
  const urutan = [...URUTAN_DEFAULT];

  it("body /api/rank valid", () => {
    const r = validasiRankRequest({ budget: 1_000_000, tipe: "putri", urutan_kriteria: urutan });
    expect(r).toEqual({ ok: true, data: { budget: 1_000_000, tipe: "putri", urutan_kriteria: urutan } });
  });

  it("body /api/rank tidak valid → pesan jelas", () => {
    const salah: [unknown, RegExp][] = [
      [null, /objek JSON/],
      [[1, 2], /objek JSON/],
      [{ budget: -1, tipe: "putri", urutan_kriteria: urutan }, /budget/],
      [{ budget: "1000000", tipe: "putri", urutan_kriteria: urutan }, /budget/],
      [{ budget: Number.POSITIVE_INFINITY, tipe: "putri", urutan_kriteria: urutan }, /budget/],
      [{ budget: 1e6, tipe: "perempuan", urutan_kriteria: urutan }, /tipe/],
      [{ budget: 1e6, tipe: "putri", urutan_kriteria: urutan.slice(1) }, /urutan_kriteria/],
      [{ budget: 1e6, tipe: "putri", urutan_kriteria: [urutan[0], ...urutan.slice(0, -1)] }, /urutan_kriteria/],
      [{ budget: 1e6, tipe: "putri", urutan_kriteria: "C1,C2" }, /urutan_kriteria/],
      [{ budget: 1e6, tipe: "putri" }, /urutan_kriteria/],
    ];
    for (const [body, pola] of salah) {
      const r = validasiRankRequest(body);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(pola);
    }
  });

  it("pesan urutan menyebut rentang kode dari config", () => {
    const r = validasiRankRequest({ budget: 1e6, tipe: "putri", urutan_kriteria: [] });
    expect(!r.ok && r.error).toContain(`${KODE_KRITERIA[0]}–${KODE_KRITERIA[KODE_KRITERIA.length - 1]}`);
  });

  it("query detail: kosong → default, valid → dipakai, tidak valid → error", () => {
    const def = validasiQueryDetail(new URLSearchParams(""));
    expect(def.ok && def.data.urutan_kriteria).toEqual(urutan);
    const isi = validasiQueryDetail(new URLSearchParams(`budget=800000&tipe=Putra&urutan=${[...urutan].reverse().join(",").toLowerCase()}`));
    expect(isi).toEqual({ ok: true, data: { budget: 800_000, tipe: "putra", urutan_kriteria: [...urutan].reverse() } });
    expect(validasiQueryDetail(new URLSearchParams("budget=abc")).ok).toBe(false);
    expect(validasiQueryDetail(new URLSearchParams("tipe=x")).ok).toBe(false);
    expect(validasiQueryDetail(new URLSearchParams("urutan=C1,C2")).ok).toBe(false);
  });

  it("query sebaran & id kos", () => {
    expect(validasiQuerySebaran(new URLSearchParams(""))).toEqual({ ok: true, data: undefined });
    expect(validasiQuerySebaran(new URLSearchParams("tipe=PUTRI"))).toEqual({ ok: true, data: "putri" });
    expect(validasiQuerySebaran(new URLSearchParams("tipe=pria")).ok).toBe(false);
    expect(validasiIdKos("53376778").ok).toBe(true);
    expect(validasiIdKos("kos-melati").ok).toBe(false);
    expect(validasiIdKos("1;drop").ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("sebaran harga", () => {
  it("bin per Rp 100 rb dari 500 rb sampai 3 jt", () => {
    const s = hitungSebaran([416_667, 500_000, 500_001, 600_000, 600_001, 2_999_999, 3_000_000, 3_500_000]);
    expect([s.min, s.max, s.step]).toEqual([500_000, 3_000_000, 100_000]);
    expect(s.bins).toHaveLength(25);
    expect(s.bins[0]).toBe(4); // ≤ 500rb masuk bin 0, (500rb, 600rb]
    expect(s.bins[1]).toBe(1); // 600.001
    expect(s.bins[24]).toBe(2); // (2,9 jt, 3 jt]
    expect(s.bins.reduce((a, b) => a + b, 0)).toBe(7); // 3,5 jt di luar rentang
    expect(s.total).toBe(8);
    expect(jumlahDiBawah(s.bins, 600_000, s.min, s.step)).toBe(4);
  });

  it("filter tipe: campur ikut untuk putra/putri hanya kalau aturan campur aktif", () => {
    const kos = [
      { harga: 700_000, tipe: "putri" as const },
      { harga: 800_000, tipe: "campur" as const },
      { harga: 900_000, tipe: "putra" as const },
      { harga: null, tipe: "putri" as const },
      { harga: 650_000, tipe: null },
    ];
    expect(hargaUntukSebaran(kos)).toEqual([700_000, 800_000, 900_000]);
    expect(hargaUntukSebaran(kos, "putri", false)).toEqual([700_000]);
    expect(hargaUntukSebaran(kos, "putri", true)).toEqual([700_000, 800_000]);
    expect(hargaUntukSebaran(kos, "campur", true)).toEqual([800_000]);
  });
});

// ---------------------------------------------------------------------------
describe("peringkat dari baris (konteks sama untuk /api/rank dan /api/kos/[id])", () => {
  const semua = [
    ...ASLI,
    ubah(ANNISA, { id: 2, nama: "uji-murah", harga: 600_000, C1: 600_000, C2: 0.9, C3: 0.465 }),
    ubah(ANNISA, { id: 3, nama: "uji-mahal", harga: 1_400_000, C1: 1_400_000, C5: 1, C6: 1 }),
    ubah(ANNISA, { id: 4, nama: "uji-tanpa-harga", harga: null }),
  ].map(petakanBaris);
  const req: RankRequest = { budget: 1_500_000, tipe: "putri", urutan_kriteria: [...URUTAN_DEFAULT] };

  it("/api/rank: hanya kos lengkap yang lolos filter, rank unik, skor dibulatkan 4 desimal", () => {
    const hasil = urutkanKos(semua, req).map(keRankResult);
    expect(hasil.map((r) => r.id).sort()).toEqual(["2", "3", "53376778"]);
    expect(hasil.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect([...hasil.map((r) => r.rank_topsis)].sort()).toEqual([1, 2, 3]);
    for (const r of hasil) {
      expect(r.tipe).toBe("putri");
      expect(r.url).toBeNull();
      expect(r.foto_url).toBeNull();
      expect(Number(r.skor_saw.toFixed(4))).toBe(r.skor_saw);
    }
    expect(urutkanKos(semua, { ...req, budget: 100_000 })).toEqual([]);
  });

  it("/api/kos/[id] memakai rank & skor yang sama dengan /api/rank", () => {
    const daftar = urutkanKos(semua, req).map(keRankResult);
    for (const r of daftar) {
      const d = detailKos(semua, r.id, req);
      expect(d.status).toBe("ada");
      if (d.status !== "ada") continue;
      expect(d.data.peringkat).toMatchObject({ rank: r.rank, total: daftar.length, rank_topsis: r.rank_topsis });
      expect(d.data.pembanding).toBe(daftar.length);
      expect(d.data.kos.skor_saw).toBe(r.skor_saw);
      expect(d.data.kos.skor_kriteria).toEqual(r.skor_kriteria);
      expect(d.data.kos.kontak_wa).toBeNull();
      expect(d.data.peringkat?.berikutnya?.id ?? null).toBe(daftar[r.rank]?.id ?? null);
    }
  });

  it("kos yang tidak lolos filter → peringkat null; tidak ada → tidak-ada; data kurang → tidak-lengkap", () => {
    const luar = detailKos(semua, "80619692", req); // campur
    expect(luar.status).toBe("ada");
    if (luar.status === "ada") {
      expect(luar.data.peringkat).toBeNull();
      expect(luar.data.pembanding).toBe(urutkanKos(semua, req).length + 1);
      expect(Number.isFinite(luar.data.kos.skor_saw)).toBe(true);
    }
    expect(detailKos(semua, "999", req).status).toBe("tidak-ada");
    expect(detailKos(semua, "4", req).status).toBe("tidak-lengkap");
  });
});

// ---------------------------------------------------------------------------
describe("galat data", () => {
  it("0 baris & query gagal → petunjuk RLS, status 503", () => {
    for (const kode of ["KOSONG", "QUERY_GAGAL"] as const) {
      const { body, status } = galatKeBody(new KosDataError(kode, "x"));
      expect(status).toBe(503);
      expect(body.petunjuk).toBe(PETUNJUK_RLS);
      expect(body.kode).toBe(kode);
    }
  });

  it("kode tetap terbaca walau error melewati batas `use cache` (hanya message yang tersisa)", () => {
    const lewat = new Error(new KosDataError("KOSONG", "tidak ada baris").message);
    expect(keKosDataError(lewat).kode).toBe("KOSONG");
    expect(keKosDataError(new Error("lain")).kode).toBe("QUERY_GAGAL");
  });

  it("galat konfigurasi tidak memberi petunjuk RLS", () => {
    const { body } = galatKeBody(new KosDataError("KONFIGURASI", "Env belum diisi."));
    expect(body.petunjuk).toMatch(/ANON_KEY/);
    expect(body.petunjuk).not.toBe(PETUNJUK_RLS);
  });
});

// ---------------------------------------------------------------------------
describe("pengaman jenis key (string palsu, bukan key asli)", () => {
  const jwt = (role: string) =>
    `x.${btoa(JSON.stringify({ role })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.y`;

  it("secret / service_role ditolak, anon / publishable diterima", () => {
    expect(jenisKunci("sb_secret_PALSU")).toBe("rahasia");
    expect(jenisKunci(jwt("service_role"))).toBe("rahasia");
    expect(jenisKunci("sb_publishable_PALSU")).toBe("publishable");
    expect(jenisKunci(jwt("anon"))).toBe("anon");
    expect(jenisKunci("asal")).toBe("tidak-dikenal");
    expect(jenisKunci("a.%%%.b")).toBe("tidak-dikenal");
  });
});

describe("normalisasi URL Supabase", () => {
  it("membuang path /rest/v1/, query, dan trailing slash", () => {
    expect(normalisasiUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
    expect(normalisasiUrl("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
    expect(normalisasiUrl(" https://abc.supabase.co?x=1 ")).toBe("https://abc.supabase.co");
    expect(normalisasiUrl("bukan url")).toBe("bukan url");
  });
});

describe("format jarak", () => {
  it("meter di bawah 0,1 km, selain itu km satu desimal; imputasi → belum diketahui", () => {
    expect(formatJarak(0.004)).toBe("4 m");
    expect(formatJarak(0.048)).toBe("48 m");
    expect(formatJarak(0.108)).toBe("0,1 km");
    expect(formatJarak(1.4)).toBe("1,4 km");
    expect(teksJarak({ jarak_km: 1.1, jarak_imputasi: true })).toBe("jarak belum diketahui");
    expect(teksJarakKeKampus({ jarak_km: 0.3 })).toBe("0,3 km ke kampus");
    expect(teksJarakKeKampus({ jarak_km: 1.1, jarak_imputasi: true })).toBe("jarak belum diketahui");
  });
});
