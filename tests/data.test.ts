import { describe, expect, it } from "vitest";
import { KRITERIA_DEFAULT, type KodeKriteria } from "@/config/kriteria";
import { detailKos, keRankResponse, keRankResult, keRingkas, urutkanKos } from "@/lib/peringkat";
import { PETUNJUK_RLS, KosDataError, galatKeBody, keKosDataError } from "@/lib/repo/galat";
import {
  KOLOM_FASILITAS,
  MAKS_FOTO,
  diagnostikData,
  isKosLengkap,
  keAlamat,
  keBoolean,
  keDaftarFoto,
  keJarakKm,
  keKoordinat,
  keKosInfo,
  keTipe,
  keUrlFoto,
  kriteriaTanpaData,
  petakanBaris,
  type BarisKos,
} from "@/lib/repo/mapper";
import {
  CATATAN_DATA_SIMULASI,
  CATATAN_HARGA_TAHUNAN,
  LABEL_JARAK_RUTE,
  LABEL_LOKASI_PERKIRAAN,
  adaJarakRute,
  adaJarakPerKampus,
  formatJarak,
  formatJarakKampus,
  hargaDariTahunan,
  lokasiPerkiraan,
  teksJarak,
  teksJarakKeKampus,
} from "@/lib/format";
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
/** Variasi foto_url_1..5: [semua terisi, hanya 1, tidak ada, foto_url_1 kosong tapi foto_url_2 terisi]. */
const FOTO_FIXTURE = fixture.baris_foto as BarisKos[];

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
    // Nilai kriteria dari KOLOM MENTAH sesuai katalog (bukan komposit C3, C5–C8).
    expect(k.nilai).toEqual({
      harga: 745000,
      listrik: 0,
      jarak_kampus: 0.108,
      jarak_unpad: 0.108,
      jarak_itb: 1.9,
      luas: 8.16,
      km_dalam: 1,
      ac: 0,
      air_panas: 0,
      jendela: 1,
      cctv: 0,
      penjaga: 1,
      parkir_motor: 1,
      parkir_mobil: 0,
      wifi: 1,
      ruang_tamu: 1,
      ruang_jemur: 1,
      shower: 0,
      kloset_duduk: 0,
      tv: 1,
      bayar_bulanan: 1,
      bayar_tahunan: 1,
    });
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

  it("jarak_imputasi = C2 persis 1,1 (heuristik data lama, hanya baris tanpa koordinat_status)", () => {
    expect(petakanBaris(ubah(ANNISA, { C2: 1.1 })).jarak_imputasi).toBe(true);
    expect(petakanBaris(ubah(ANNISA, { C2: 1.11 })).jarak_imputasi).toBe(false);
    // Data bersih: C2 = jarak rute hasil hitung, 1,1 di sana nilai asli.
    expect(petakanBaris(ubah(ANNISA, { C2: 1.1, koordinat_status: "geokode" })).jarak_imputasi).toBe(false);
  });

  it("koordinat_status, luas_status, basis_harga: dibaca; tidak ada/tak dikenal → null tanpa error", () => {
    const lama = petakanBaris(ANNISA); // fixture lama tidak punya kolom status
    expect([lama.koordinat_status, lama.luas_status, lama.basis_harga]).toEqual([null, null, null]);

    const baru = petakanBaris(
      ubah(ANNISA, { koordinat_status: "terverifikasi", luas_status: "tercantum", basis_harga: "tahun_dibagi_12" }),
    );
    expect([baru.koordinat_status, baru.luas_status, baru.basis_harga]).toEqual([
      "terverifikasi",
      "tercantum",
      "tahun_dibagi_12",
    ]);

    for (const s of ["terverifikasi", "geokode", "perkiraan"] as const) {
      expect(petakanBaris(ubah(ANNISA, { koordinat_status: s })).koordinat_status).toBe(s);
    }
    expect(petakanBaris(ubah(ANNISA, { luas_status: "tidak_tercantum", C4: "" })).luas_status).toBe("tidak_tercantum");
    expect(petakanBaris(ubah(ANNISA, { basis_harga: "bulan" })).basis_harga).toBe("bulan");

    // spasi/huruf besar dimaafkan; nilai asing, kosong, angka, null → null
    expect(petakanBaris(ubah(ANNISA, { koordinat_status: "  Perkiraan " })).koordinat_status).toBe("perkiraan");
    for (const aneh of ["", "  ", "akurat", "tahun", 1, null, undefined, {}]) {
      const k = petakanBaris(ubah(ANNISA, { koordinat_status: aneh, luas_status: aneh, basis_harga: aneh }));
      expect([k.koordinat_status, k.luas_status, k.basis_harga], String(aneh)).toEqual([null, null, null]);
    }
  });

  it("alamat NULL / kosong → null (tanpa karangan); luas kosong → luas_m2 null", () => {
    expect(petakanBaris(ubah(ANNISA, { alamat: null })).alamat).toBeNull();
    expect(petakanBaris(ubah(ANNISA, { alamat: "" })).alamat).toBeNull();
    const k = petakanBaris(ubah(ANNISA, { alamat: null, C4: "", luas_status: "tidak_tercantum" }));
    expect(k.luas_m2).toBeNull();
    expect(keKosInfo(k)).toMatchObject({ alamat: null, luas_kamar: null, luas_m2: null, luas_status: "tidak_tercantum" });
  });

  it("status ikut ke RankResult (kartu hasil) dan diagnostik menghitungnya", () => {
    const kos = [
      ubah(ANNISA, { id: 1, lat: "-6.93", lng: "107.77", koordinat_status: "geokode", basis_harga: "tahun_dibagi_12" }),
      ubah(ANNISA, { id: 2, koordinat_status: "perkiraan", basis_harga: "bulan" }),
      ubah(ANNISA, { id: 3 }),
    ].map(petakanBaris);
    const r = urutkanKos(kos, { budget: 2_000_000, tipe: "putri", kriteria: ["harga"] }).daftar.map(keRankResult);
    const per = Object.fromEntries(r.map((x) => [x.id, x]));
    expect(per["1"]).toMatchObject({
      koordinat_status: "geokode",
      basis_harga: "tahun_dibagi_12",
      lat: -6.93,
      lng: 107.77,
    });
    expect(per["2"]).toMatchObject({ koordinat_status: "perkiraan", basis_harga: "bulan" });
    expect(per["3"]).toMatchObject({ koordinat_status: null, basis_harga: null });
    expect(diagnostikData(kos)).toMatchObject({
      koordinat_status: { geokode: 1, perkiraan: 1, "(tidak ada)": 1 },
      basis_harga: { tahun_dibagi_12: 1, bulan: 1, "(tidak ada)": 1 },
    });
  });

  it("id int → string, kolom kriteria huruf kecil (c1) tetap terbaca", () => {
    const kecil: BarisKos = {};
    for (const [k, v] of Object.entries(ANNISA)) kecil[/^C\d+$/.test(k) ? k.toLowerCase() : k] = v;
    const k = petakanBaris(kecil);
    expect(k.id).toBe("53376778");
    expect(k.nilai.luas).toBe(8.16); // dari kolom c4
    expect(k.nilai.jarak_kampus).toBe(0.108); // dari kolom c2
    expect(isKosLengkap(k)).toBe(true);
  });

  it("nilai kosong tidak dikarang: harga null → tidak lengkap; kriteria null → kosong hanya untuk kriteria itu", () => {
    expect(isKosLengkap(petakanBaris(ubah(ANNISA, { harga: null })))).toBe(false);
    const tanpaLuas = petakanBaris(ubah(ANNISA, { C4: null }));
    expect(tanpaLuas.nilai.luas).toBeNull();
    expect(isKosLengkap(tanpaLuas)).toBe(true); // kelengkapan kriteria dicek per permintaan
    expect(kriteriaTanpaData(tanpaLuas, ["harga", "luas", "ac"])).toEqual(["luas"]);
    expect(kriteriaTanpaData(tanpaLuas, ["harga", "ac"])).toEqual([]);
    // kolom biner di luar 0/1 → null, bukan ditebak
    expect(petakanBaris(ubah(ANNISA, { ac: 2 })).nilai.ac).toBeNull();
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

  it("foto_urls dari foto_url_1..5: daftar lengkap, hanya 1, tanpa foto (null), foto_url_1 kosong", () => {
    const [LENGKAP, SATU, TANPA, TANPA_SATU] = FOTO_FIXTURE;
    const lengkap = petakanBaris(LENGKAP);
    expect(lengkap.foto_urls).toEqual([1, 2, 3, 4, 5].map((i) => `https://contoh.test/foto/${i}.jpg`));
    expect(lengkap.foto_url).toBe("https://contoh.test/foto/1.jpg");
    expect(keKosInfo(lengkap).foto_urls).toEqual(lengkap.foto_urls);

    const satu = petakanBaris(SATU);
    expect(satu.foto_urls).toEqual(["https://contoh.test/foto/1.jpg"]);
    expect(satu.foto_url).toBe("https://contoh.test/foto/1.jpg");
    expect(keKosInfo(satu).foto_urls).toEqual(["https://contoh.test/foto/1.jpg"]);

    const tanpa = petakanBaris(TANPA);
    expect(tanpa.foto_urls).toEqual([]);
    expect(tanpa.foto_url).toBeNull();
    expect(keKosInfo(tanpa).foto_urls).toBeNull();

    // foto_url_1 kosong tapi foto_url_2 terisi: foto yang ada tetap dipakai, urutan terjaga.
    const tanpaSatu = petakanBaris(TANPA_SATU);
    expect(tanpaSatu.foto_urls).toEqual(["https://contoh.test/foto/2.jpg", "https://contoh.test/foto/3.jpg"]);
    expect(tanpaSatu.foto_url).toBe("https://contoh.test/foto/2.jpg");
  });

  it("foto_urls: kolom foto tidak ada sama sekali → kosong; kolom lama foto_url hanya cadangan bila foto_url_1 kosong", () => {
    expect(petakanBaris(ANNISA).foto_urls).toEqual([]); // fixture lama: hanya foto_url ""
    const lama = "https://contoh.test/lama.jpg";
    expect(petakanBaris(ubah(ANNISA, { foto_url: lama })).foto_urls).toEqual([lama]);
    expect(petakanBaris(ubah(ANNISA, { foto_url: lama })).foto_url).toBe(lama);
    // foto_url_1 ada → kolom lama diabaikan
    const baru = "https://contoh.test/baru.jpg";
    expect(petakanBaris(ubah(ANNISA, { foto_url: lama, foto_url_1: baru })).foto_urls).toEqual([baru]);
    // foto_url_1 tidak valid → cadangan dipakai, lalu foto_url_2 menyusul
    expect(
      petakanBaris(ubah(ANNISA, { foto_url: lama, foto_url_1: "javascript:alert(1)", foto_url_2: baru })).foto_urls,
    ).toEqual([lama, baru]);
    // kolom lama pun tidak valid → diabaikan
    expect(petakanBaris(ubah(ANNISA, { foto_url: "data:image/png;base64,AAAA" })).foto_urls).toEqual([]);
  });

  it("foto_url_N null/spasi/skema berbahaya tidak jadi foto; foto_urls tidak pernah melebihi 5", () => {
    const k = petakanBaris(
      ubah(ANNISA, {
        foto_url_1: null,
        foto_url_2: "   ",
        foto_url_3: "/relatif/foto.jpg",
        foto_url_4: "ftp://contoh.test/x.jpg",
        foto_url_5: "  https://contoh.test/ok.jpg  ",
      }),
    );
    expect(k.foto_urls).toEqual(["https://contoh.test/ok.jpg"]);
    expect(k.foto_urls.length).toBeLessThanOrEqual(MAKS_FOTO);
  });

  it("sumber_url = url (null bila url kosong)", () => {
    expect(keKosInfo(petakanBaris(ubah(ANNISA, { url: "https://contoh.test/kos/1" }))).sumber_url).toBe(
      "https://contoh.test/kos/1",
    );
    expect(keKosInfo(petakanBaris(ubah(ANNISA, { url: "  " }))).sumber_url).toBeNull();
    expect(keKosInfo(petakanBaris(ANNISA)).sumber_url).toBeNull();
  });

  it("gmaps_place_id: ada → teks ter-trim; kosong/spasi/bukan teks → null; kolom tidak ada → null", () => {
    const info = (perubahan: BarisKos) => keKosInfo(petakanBaris(ubah(ANNISA, perubahan)));
    expect(info({ gmaps_place_id: "  ChIJabc123  " }).gmaps_place_id).toBe("ChIJabc123");
    expect(petakanBaris(ubah(ANNISA, { gmaps_place_id: "ChIJabc123" })).gmaps_place_id).toBe("ChIJabc123");
    expect(info({ gmaps_place_id: "" }).gmaps_place_id).toBeNull();
    expect(info({ gmaps_place_id: "   " }).gmaps_place_id).toBeNull();
    expect(info({ gmaps_place_id: null }).gmaps_place_id).toBeNull();
    expect(info({ gmaps_place_id: 123 }).gmaps_place_id).toBeNull();
    // baris fixture tidak punya kolom ini sama sekali
    expect("gmaps_place_id" in ANNISA).toBe(false);
    expect(petakanBaris(ANNISA).gmaps_place_id).toBeNull();
    expect(keKosInfo(petakanBaris(ANNISA)).gmaps_place_id).toBeNull();
  });

  it("diagnostik menghitung kolom terisi dan tipe di luar daftar", () => {
    const semua = [
      ...ASLI.map(petakanBaris),
      petakanBaris(ubah(GREEN, { id: 1, tipe_penghuni: "laki-laki", url: "https://contoh.test/1", foto_url_1: "https://contoh.test/1.jpg" })),
      ...FOTO_FIXTURE.map(petakanBaris),
    ];
    expect(diagnostikData(semua)).toMatchObject({
      total: 8,
      lengkap_untuk_dss: 7,
      foto_url_terisi: 4, // GREEN + 3 baris foto yang punya foto
      foto_urls_terisi: 4,
      url_terisi: 1,
      alamat_terisi: 0,
      koordinat_terisi: 0,
      tipe_di_luar_daftar: { "laki-laki": 1 },
    });
  });
});

// ---------------------------------------------------------------------------
describe("keUrlFoto / keDaftarFoto", () => {
  it("keUrlFoto: hanya http/https valid, hasil ter-trim", () => {
    expect(keUrlFoto("https://contoh.test/a.jpg")).toBe("https://contoh.test/a.jpg");
    expect(keUrlFoto("http://contoh.test/a.jpg")).toBe("http://contoh.test/a.jpg");
    expect(keUrlFoto("  https://contoh.test/a.jpg \t")).toBe("https://contoh.test/a.jpg");
    expect(keUrlFoto("HTTPS://contoh.test/a.jpg")).toBe("HTTPS://contoh.test/a.jpg");
  });

  it("keUrlFoto: kosong, spasi, bukan teks, skema lain, relatif, tidak valid → null", () => {
    for (const v of [null, undefined, "", "   ", 42, {}, [], true]) expect(keUrlFoto(v)).toBeNull();
    for (const v of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:image/png;base64,AAAA",
      "ftp://contoh.test/a.jpg",
      "file:///etc/passwd",
      "//contoh.test/a.jpg",
      "/foto/a.jpg",
      "foto/a.jpg",
      "contoh.test/a.jpg",
      "https://",
      "http://exa mple.test/a.jpg",
      "bukan url",
    ]) {
      expect(keUrlFoto(v)).toBeNull();
    }
  });

  it("keDaftarFoto: urutan dipertahankan, kosong/tidak valid dibuang", () => {
    expect(
      keDaftarFoto(["https://a.test/1.jpg", null, "", "  ", "javascript:x", "https://a.test/2.jpg", undefined]),
    ).toEqual(["https://a.test/1.jpg", "https://a.test/2.jpg"]);
    expect(keDaftarFoto([])).toEqual([]);
    expect(keDaftarFoto([null, null, null])).toEqual([]);
  });

  it("keDaftarFoto: duplikat persis dibuang (setelah trim), yang beda huruf besar/kecil dianggap berbeda", () => {
    expect(
      keDaftarFoto(["https://a.test/1.jpg", " https://a.test/1.jpg ", "https://a.test/2.jpg", "https://a.test/1.jpg"]),
    ).toEqual(["https://a.test/1.jpg", "https://a.test/2.jpg"]);
    expect(keDaftarFoto(["https://a.test/A.jpg", "https://a.test/a.jpg"])).toHaveLength(2);
  });

  it("keDaftarFoto: maksimal MAKS_FOTO (5)", () => {
    const banyak = Array.from({ length: 8 }, (_, i) => `https://a.test/${i}.jpg`);
    expect(keDaftarFoto(banyak)).toEqual(banyak.slice(0, MAKS_FOTO));
    expect(MAKS_FOTO).toBe(5);
  });
});

// ---------------------------------------------------------------------------
describe("validasi input", () => {
  const kriteria = [...KRITERIA_DEFAULT];

  it("body /api/rank valid", () => {
    const r = validasiRankRequest({ budget: 1_000_000, tipe: "putri", kriteria });
    expect(r).toEqual({ ok: true, data: { budget: 1_000_000, tipe: "putri", kriteria } });
  });

  it("body /api/rank tidak valid → pesan jelas", () => {
    const salah: [unknown, RegExp][] = [
      [null, /objek JSON/],
      [[1, 2], /objek JSON/],
      [{ budget: -1, tipe: "putri", kriteria }, /budget/],
      [{ budget: "1000000", tipe: "putri", kriteria }, /budget/],
      [{ budget: Number.POSITIVE_INFINITY, tipe: "putri", kriteria }, /budget/],
      [{ budget: 1e6, tipe: "perempuan", kriteria }, /tipe/],
      [{ budget: 1e6, tipe: "putri", kriteria: "harga,luas" }, /kriteria/],
      [{ budget: 1e6, tipe: "putri" }, /kriteria/],
      // Format lama tidak dipertahankan.
      [{ budget: 1e6, tipe: "putri", urutan_kriteria: ["C1", "C2"] }, /kriteria/],
    ];
    for (const [body, pola] of salah) {
      const r = validasiRankRequest(body);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(pola);
    }
  });

  it("query detail: kosong → default, valid → dipakai, tidak valid → error", () => {
    const def = validasiQueryDetail(new URLSearchParams(""));
    expect(def.ok && def.data.kriteria).toEqual(kriteria);
    const isi = validasiQueryDetail(new URLSearchParams("budget=800000&tipe=Putra&kriteria=LUAS, harga"));
    expect(isi).toEqual({ ok: true, data: { budget: 800_000, tipe: "putra", kriteria: ["luas", "harga"] } });
    expect(validasiQueryDetail(new URLSearchParams("budget=abc")).ok).toBe(false);
    expect(validasiQueryDetail(new URLSearchParams("tipe=x")).ok).toBe(false);
    expect(validasiQueryDetail(new URLSearchParams("kriteria=C1,C2")).ok).toBe(false);
    expect(validasiQueryDetail(new URLSearchParams("kriteria=harga,harga")).ok).toBe(false);
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
  // Rakitan eksplisit (jarak + luas dipasang): kasus "tanpa-data" kos 5 butuh piece luas. Bukan KRITERIA_DEFAULT, yang sudah tidak memuat jarak/luas.
  const KRITERIA_UJI: KodeKriteria[] = ["harga", "jarak_kampus", "luas", "cctv"];
  const semua = [
    ...ASLI,
    ubah(ANNISA, { id: 2, nama: "uji-murah", harga: 600_000, C1: 600_000, C2: 0.9 }),
    ubah(ANNISA, { id: 3, nama: "uji-mahal", harga: 1_400_000, C1: 1_400_000, cctv: 1, ac: 1 }),
    ubah(ANNISA, { id: 4, nama: "uji-tanpa-harga", harga: null }),
    ubah(ANNISA, { id: 5, nama: "uji-tanpa-luas", C4: null }),
  ].map(petakanBaris);
  const req: RankRequest = { budget: 1_500_000, tipe: "putri", kriteria: KRITERIA_UJI };

  it("/api/rank: hanya kos lengkap yang lolos filter, rank unik, skor dibulatkan 4 desimal", () => {
    const urut = urutkanKos(semua, req);
    const hasil = urut.daftar.map(keRankResult);
    expect(hasil.map((r) => r.id).sort()).toEqual(["2", "3", "53376778"]);
    expect(hasil.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect([...hasil.map((r) => r.rank_topsis)].sort()).toEqual([1, 2, 3]);
    for (const r of hasil) {
      expect(r.tipe).toBe("putri");
      expect(r.url).toBeNull();
      expect(r.foto_url).toBeNull();
      expect(Number(r.skor_saw.toFixed(4))).toBe(r.skor_saw);
      expect(Object.keys(r.skor_kriteria)).toEqual(KRITERIA_UJI);
    }
    // id 5 lolos filter tetapi luas kosong → disembunyikan & dihitung
    expect(urut.jumlah_tanpa_data).toBe(1);
    expect(urut.tanpa_data_per_kriteria).toEqual({ harga: 0, jarak_kampus: 0, luas: 1, cctv: 0 });
    expect(urutkanKos(semua, { ...req, budget: 100_000 }).daftar).toEqual([]);
    // Tanpa kriteria luas, kos 5 ikut dinilai.
    const tanpaLuas = urutkanKos(semua, { ...req, kriteria: ["harga", "cctv"] });
    expect(tanpaLuas.jumlah_tanpa_data).toBe(0);
    expect(tanpaLuas.daftar.map((t) => t.kos.id)).toContain("5");
  });

  it("respons /api/rank membawa kriteria_dipakai (Σ bobot = 1) dan hitungan tanpa data", () => {
    const r = keRankResponse(urutkanKos(semua, req));
    expect(r.kriteria_dipakai.map((k) => k.kode)).toEqual(KRITERIA_UJI);
    expect(Math.abs(r.kriteria_dipakai.reduce((s, k) => s + k.bobot, 0) - 1)).toBeLessThan(1e-12);
    expect(r.jumlah_tanpa_data).toBe(1);
    expect(r.hasil).toHaveLength(3);
    expect(r.spearman === null || Number.isFinite(r.spearman)).toBe(true);
  });

  it("/api/kos/[id] memakai rank & skor yang sama dengan /api/rank", () => {
    const daftar = urutkanKos(semua, req).daftar.map(keRankResult);
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
      expect(luar.data.pembanding).toBe(urutkanKos(semua, req).daftar.length + 1);
      expect(Number.isFinite(luar.data.kos.skor_saw)).toBe(true);
    }
    expect(detailKos(semua, "999", req).status).toBe("tidak-ada");
    expect(detailKos(semua, "4", req).status).toBe("tidak-lengkap");
    expect(detailKos(semua, "5", req)).toEqual({ status: "tanpa-data", kriteria: ["luas"] });
    expect(detailKos(semua, "5", { ...req, kriteria: ["harga"] }).status).toBe("ada");
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

describe("catatan mutu data (label perkiraan)", () => {
  it("teks label sesuai permintaan", () => {
    expect(LABEL_JARAK_RUTE).toBe("perkiraan jarak rute");
    expect(LABEL_LOKASI_PERKIRAAN).toBe("lokasi perkiraan");
    expect(CATATAN_HARGA_TAHUNAN).toBe("harga dihitung dari tarif tahunan ÷ 12");
    expect(CATATAN_DATA_SIMULASI).toBe("Data kos sebagian simulasi/perkiraan (lokasi, jarak, luas), bukan data resmi.");
  });

  it("lokasiPerkiraan hanya untuk koordinat_status = perkiraan", () => {
    expect(lokasiPerkiraan({ koordinat_status: "perkiraan" })).toBe(true);
    for (const s of ["geokode", "terverifikasi", null, undefined, "lain"]) {
      expect(lokasiPerkiraan({ koordinat_status: s }), String(s)).toBe(false);
    }
  });

  it("hargaDariTahunan hanya untuk basis_harga = tahun_dibagi_12", () => {
    expect(hargaDariTahunan({ basis_harga: "tahun_dibagi_12" })).toBe(true);
    for (const s of ["bulan", null, undefined, "lain"]) expect(hargaDariTahunan({ basis_harga: s }), String(s)).toBe(false);
  });

  it("adaJarakRute: ada angka dan bukan imputasi; jarak dibulatkan 0,1 km", () => {
    expect(adaJarakRute({ jarak_km: 1.84 })).toBe(true);
    expect(adaJarakRute({ jarak_km: 0 })).toBe(true);
    expect(adaJarakRute({ jarak_km: null })).toBe(false);
    expect(adaJarakRute({ jarak_km: 1.1, jarak_imputasi: true })).toBe(false);
    expect(formatJarak(1.84)).toBe("1,8 km");
    expect(formatJarak(1.86)).toBe("1,9 km");
    expect(teksJarak({ jarak_km: 2.04 })).toBe("2,0 km");
  });
});

describe("jarak per kampus (jarak_unpad_km, jarak_itb_km)", () => {
  it("keJarakKm: angka valid (juga teks angka) diterima; kosong, negatif, tak hingga, bukan angka → null", () => {
    expect(keJarakKm(1.84)).toBe(1.84);
    expect(keJarakKm("2.3")).toBe(2.3);
    expect(keJarakKm(0)).toBe(0);
    for (const v of [null, undefined, "", "  ", "abc", -1, Number.NaN, Number.POSITIVE_INFINITY, {}, [], true]) {
      expect(keJarakKm(v), String(v)).toBeNull();
    }
  });

  it("mapper membaca keduanya; kolom tidak ada atau tak valid → null; C2 tidak berubah", () => {
    const k = petakanBaris(ubah(ANNISA, { jarak_unpad_km: 1.3, jarak_itb_km: "2.1" }));
    expect([k.jarak_unpad_km, k.jarak_itb_km, k.jarak_km]).toEqual([1.3, 2.1, 0.108]);
    const tanpa = petakanBaris(ubah(ANNISA, { jarak_unpad_km: null, jarak_itb_km: "x" }));
    expect([tanpa.jarak_unpad_km, tanpa.jarak_itb_km]).toEqual([null, null]);
    const polos = Object.fromEntries(Object.entries(ANNISA).filter(([n]) => !/^jarak_(unpad|itb)_km$/.test(n)));
    const lama = petakanBaris(polos);
    expect([lama.jarak_unpad_km, lama.jarak_itb_km, lama.jarak_km]).toEqual([null, null, 0.108]);
  });

  it("ikut ke RankResult, detail, dan ringkasan (field lama tidak berubah)", () => {
    const kos = [petakanBaris(ubah(ANNISA, { id: 1, jarak_unpad_km: 1.3, jarak_itb_km: 2.1 }))];
    const req: RankRequest = { budget: 2_000_000, tipe: "putri", kriteria: ["harga"] };
    const r = urutkanKos(kos, req).daftar.map(keRankResult)[0];
    expect(r).toMatchObject({ jarak_km: 0.108, jarak_unpad_km: 1.3, jarak_itb_km: 2.1 });
    const d = detailKos(kos, "1", req);
    expect(d.status === "ada" && d.data.kos).toMatchObject({ jarak_unpad_km: 1.3, jarak_itb_km: 2.1 });
    expect(keRingkas(kos[0])).toMatchObject({ jarak_km: 0.108, jarak_unpad_km: 1.3, jarak_itb_km: 2.1 });
  });

  it("formatJarakKampus: dibulatkan 0,1 km, koma desimal; kosong → \"-\"", () => {
    expect(formatJarakKampus(1.34)).toBe("1,3 km");
    expect(formatJarakKampus(2.15)).toBe("2,1 km");
    expect(formatJarakKampus(12)).toBe("12,0 km");
    for (const v of [null, undefined, Number.NaN]) expect(formatJarakKampus(v)).toBe("-");
  });

  it("adaJarakPerKampus dan adaJarakRute", () => {
    expect(adaJarakPerKampus({ jarak_unpad_km: 1 })).toBe(true);
    expect(adaJarakPerKampus({ jarak_itb_km: 0 })).toBe(true);
    expect(adaJarakPerKampus({ jarak_unpad_km: null, jarak_itb_km: null })).toBe(false);
    expect(adaJarakRute({ jarak_unpad_km: 1.2, jarak_km: null })).toBe(true);
    expect(adaJarakRute({ jarak_km: 1.1, jarak_imputasi: true })).toBe(false);
    expect(adaJarakRute({})).toBe(false);
  });
});

describe("peringkat dengan piece jarak per kampus", () => {
  // Dekat Unpad tetapi jauh dari ITB, dan sebaliknya; harga sama supaya hanya jarak yang membedakan.
  const kos = [
    ubah(ANNISA, { id: 1, nama: "dekat-unpad", jarak_unpad_km: 0.5, jarak_itb_km: 4.0, C2: 0.5 }),
    ubah(ANNISA, { id: 2, nama: "dekat-itb", jarak_unpad_km: 4.0, jarak_itb_km: 0.5, C2: 0.5 }),
    ubah(ANNISA, { id: 3, nama: "tengah", jarak_unpad_km: 2.0, jarak_itb_km: 2.0, C2: 2.0 }),
    ubah(ANNISA, { id: 4, nama: "tanpa-unpad", jarak_unpad_km: null, jarak_itb_km: 1.0, C2: 1.0 }),
    ubah(ANNISA, { id: 5, nama: "tanpa-itb", jarak_unpad_km: 1.0, jarak_itb_km: null, C2: 1.0 }),
  ].map(petakanBaris);
  const rank = (kriteria: KodeKriteria[]) =>
    urutkanKos(kos, { budget: 2_000_000, tipe: "putri", kriteria });
  const idUrut = (h: ReturnType<typeof rank>) => h.daftar.map((t) => t.kos.id);

  it("jarak_unpad: makin dekat Unpad makin tinggi (cost); kos tanpa nilai dikecualikan dan dihitung", () => {
    const h = rank(["jarak_unpad"]);
    expect(idUrut(h)).toEqual(["1", "5", "3", "2"]); // 0,5 < 1,0 < 2,0 < 4,0 km; kos 4 (null) tidak ikut
    expect(h.jumlah_tanpa_data).toBe(1);
    expect(h.tanpa_data_per_kriteria).toEqual({ jarak_unpad: 1 });
  });

  it("jarak_itb: urutan berbalik; kos tanpa jarak ITB dikecualikan", () => {
    const h = rank(["jarak_itb"]);
    expect(idUrut(h)).toEqual(["2", "4", "3", "1"]); // 0,5 < 1,0 < 2,0 < 4,0 km; kos 5 (null) tidak ikut
    expect(h.tanpa_data_per_kriteria).toEqual({ jarak_itb: 1 });
  });

  it("prioritas Unpad di atas ITB mengubah pemenang; dua piece dipasang → kos dengan salah satu null dikecualikan", () => {
    expect(idUrut(rank(["jarak_unpad", "jarak_itb"]))[0]).toBe("1");
    expect(idUrut(rank(["jarak_itb", "jarak_unpad"]))[0]).toBe("2");
    const dua = rank(["jarak_unpad", "jarak_itb"]);
    expect(idUrut(dua).sort()).toEqual(["1", "2", "3"]);
    expect(dua.jumlah_tanpa_data).toBe(2);
    expect(dua.tanpa_data_per_kriteria).toEqual({ jarak_unpad: 1, jarak_itb: 1 });
  });

  it("piece lama jarak_kampus (C2) tetap jalan; tanpa piece jarak, nilai null tidak mengecualikan kos", () => {
    const lama = rank(["jarak_kampus"]);
    expect(lama.jumlah_tanpa_data).toBe(0);
    expect(idUrut(lama)).toHaveLength(5);
    const tanpaJarak = rank(["harga"]);
    expect(tanpaJarak.jumlah_tanpa_data).toBe(0);
    expect(idUrut(tanpaJarak)).toHaveLength(5);
  });

  it("detail kos: null di piece terpasang → tanpa-data; tanpa piece itu → ada", () => {
    const req = { budget: 2_000_000, tipe: "putri" as const, kriteria: ["jarak_unpad" as KodeKriteria] };
    expect(detailKos(kos, "4", req)).toEqual({ status: "tanpa-data", kriteria: ["jarak_unpad"] });
    expect(detailKos(kos, "4", { ...req, kriteria: ["jarak_itb"] }).status).toBe("ada");
  });
});
