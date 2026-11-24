import { infoKategori, teksJarakGarisLurus, type TempatTerdekat } from "@/lib/poi";
import { IKON_KATEGORI, IKON_KOS, svgIkon } from "./ikon-poi";

/** Warna aksen aplikasi (token --color-accent), dengan cadangan bila variabel CSS tidak ada. */
export const WARNA_AKSEN = "var(--color-accent, #1d5fd1)";

/** Elemen penanda beserta isi popup-nya (semua teks data lewat textContent, bukan HTML). */
export type Penanda = {
  kunci: string;
  lat: number;
  lng: number;
  elemen: HTMLElement;
  popup: HTMLElement;
  /** Tinggi pin (px) dari ujung runcing: dipakai sebagai offset popup. */
  tinggi: number;
  nama: string;
};

type Ukuran = { lingkar: number; ikon: number; ujung: number };
/** Ujung runcing menimpa tepi bawah lingkaran sebanyak ini (margin-top negatif di CSS). */
const UJUNG_MENYATU = 2;
const UKURAN_KOS: Ukuran = { lingkar: 44, ikon: 22, ujung: 9 };
const UKURAN_KAMPUS: Ukuran = { lingkar: 36, ikon: 18, ujung: 8 };
const UKURAN_TEMPAT: Ukuran = { lingkar: 30, ikon: 15, ujung: 6 };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, kelas = "", teks?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (kelas) e.className = kelas;
  if (teks !== undefined) e.textContent = teks;
  return e;
}

/**
 * Pin bundar berwarna + ikon putih + ujung runcing kecil. Anchor marker: "bottom".
 *
 * Dua lapis, supaya posisi marker tidak pernah bergeser:
 * - elemen LUAR = elemen yang diberikan ke maplibregl.Marker. Hanya width/height tetap
 *   (ujung pin = tepi bawah = koordinat). MapLibre yang mengatur position dan transform-nya;
 *   JANGAN beri CSS position/top/left/transform/margin di sini.
 * - elemen DALAM (.peta-pin) = tampilan, efek hover/scale (transform-origin bottom center).
 */
function buatPin(warna: string, ikonSvg: string, u: Ukuran, nama: string, label?: string): HTMLElement {
  const tinggi = u.lingkar + u.ujung - UJUNG_MENYATU;

  const luar = el("div", "peta-pin-luar");
  luar.style.width = `${u.lingkar}px`;
  luar.style.height = `${tinggi}px`;
  luar.setAttribute("role", "button");
  luar.tabIndex = 0;
  luar.setAttribute("aria-label", nama);

  const dalam = el("div", "peta-pin");
  const lingkar = el("div", "peta-pin__lingkar");
  lingkar.style.cssText = `width:${u.lingkar}px;height:${u.lingkar}px;background:${warna}`;
  lingkar.innerHTML = ikonSvg; // statis: SVG dari komponen lucide

  const ujung = el("div", "peta-pin__ujung");
  ujung.style.cssText = `border-left-width:${u.ujung - 1}px;border-right-width:${u.ujung - 1}px;border-top:${u.ujung}px solid ${warna}`;

  dalam.append(lingkar, ujung);
  if (label) dalam.prepend(el("div", "peta-pin__label", label));
  luar.appendChild(dalam);
  return luar;
}

/** Isi popup: ikon bulat berwarna + nama (tebal) + baris keterangan. */
function buatIsiPopup(warna: string, ikonSvg: string, judul: string, baris: string[]): HTMLElement {
  const akar = el("div", "peta-popup__isi");
  const lencana = el("span", "peta-popup__ikon");
  lencana.style.background = warna;
  lencana.innerHTML = ikonSvg;
  const teks = el("div", "peta-popup__teks");
  teks.appendChild(el("strong", "peta-popup__judul", judul));
  for (const b of baris) teks.appendChild(el("span", "peta-popup__baris", b));
  akar.append(lencana, teks);
  return akar;
}

export function buatPenandaKos(opsi: {
  nama: string;
  lat: number;
  lng: number;
  perkiraan: boolean;
  labelPerkiraan: string;
  radiusPerkiraanM: number;
}): Penanda {
  const { nama, lat, lng, perkiraan, labelPerkiraan, radiusPerkiraanM } = opsi;
  const u = UKURAN_KOS;
  const baris = perkiraan ? [`Kos · ${labelPerkiraan}`, `Bisa meleset hingga ±${radiusPerkiraanM} m`] : ["Kos"];
  return {
    kunci: "kos",
    lat,
    lng,
    nama,
    tinggi: u.lingkar + u.ujung - UJUNG_MENYATU,
    elemen: buatPin(WARNA_AKSEN, svgIkon(IKON_KOS, u.ikon, 2.3), u, `Kos ${nama}`, nama),
    popup: buatIsiPopup(WARNA_AKSEN, svgIkon(IKON_KOS, 14, 2.4), nama, baris),
  };
}

export function buatPenandaTempat(t: TempatTerdekat): Penanda {
  const kat = infoKategori(t.kategori);
  const ikon = IKON_KATEGORI[t.kategori];
  const u = t.kategori === "kampus" ? UKURAN_KAMPUS : UKURAN_TEMPAT;
  return {
    kunci: `poi:${t.id}`,
    lat: t.lat,
    lng: t.lng,
    nama: t.nama,
    tinggi: u.lingkar + u.ujung - UJUNG_MENYATU,
    elemen: buatPin(kat.warna, svgIkon(ikon, u.ikon), u, `${t.nama}, ${kat.label}`),
    popup: buatIsiPopup(kat.warna, svgIkon(ikon, 14, 2.4), t.nama, [
      kat.label,
      `${teksJarakGarisLurus(t.jarak_m)} garis lurus`,
    ]),
  };
}
