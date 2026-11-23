"use client";

import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ATRIBUSI_OSM,
  RADIUS_PERKIRAAN_M,
  infoKategori,
  teksJarakGarisLurus,
  type TempatTerdekat,
} from "@/lib/poi";
import { LABEL_LOKASI_PERKIRAAN } from "@/lib/format";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUSI_HTML =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> (ODbL)';
const AKSEN = "#1d5fd1";
const ZOOM_MAKS_FIT = 17;

type Props = {
  nama: string;
  lat: number;
  lng: number;
  /** Lokasi perkiraan → lingkaran ±200 m, bukan klaim titik pasti. */
  perkiraan: boolean;
  /** Tempat yang sedang tampil (sudah disaring chip kategori). */
  tempat: TempatTerdekat[];
};

/** Pin kos: lingkaran aksen dengan rumah putih. Murni HTML statis (tanpa teks dari data). */
const HTML_PIN_KOS =
  `<div style="width:40px;height:40px;border-radius:9999px;background:var(--color-accent,${AKSEN});border:3px solid #fff;` +
  'box-shadow:0 4px 12px rgba(29,95,209,.45);display:flex;align-items:center;justify-content:center">' +
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/></svg></div>';

function ikonKos() {
  return L.divIcon({ className: "", html: HTML_PIN_KOS, iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22] });
}

function ikonTempat(emoji: string, warna: string) {
  const html =
    `<div style="width:28px;height:28px;border-radius:9999px;background:#fff;border:2px solid ${warna};` +
    'box-shadow:0 2px 6px rgba(30,45,90,.3);display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1">' +
    `${emoji}</div>`;
  return L.divIcon({ className: "", html, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] });
}

/** Isi popup sebagai DOM (textContent): nama tempat dari OSM tidak pernah diperlakukan sebagai HTML. */
function isiPopup(judul: string, baris: string[]): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "font:13px/1.4 var(--font-jakarta),system-ui,sans-serif;display:flex;flex-direction:column;gap:2px";
  const h = document.createElement("strong");
  h.textContent = judul;
  el.appendChild(h);
  for (const b of baris) {
    const p = document.createElement("span");
    p.textContent = b;
    p.style.color = "#4e5463";
    el.appendChild(p);
  }
  return el;
}

/**
 * Peta Leaflet: pin kos + tempat sekitar. Hanya dimuat di klien (dynamic, ssr:false).
 * Geser/zoom mati sampai pengguna menekan "Aktifkan peta", supaya satu jari di layar
 * sentuh dan roda mouse tidak menjebak scroll halaman.
 */
export default function PetaLeaflet({ nama, lat, lng, perkiraan, tempat }: Props) {
  const wadah = useRef<HTMLDivElement>(null);
  const peta = useRef<L.Map | null>(null);
  const lapis = useRef<L.LayerGroup | null>(null);
  const [interaktif, setInteraktif] = useState(false);

  // Buat peta sekali.
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const map = L.map(el, {
      center: [lat, lng],
      zoom: 16,
      maxZoom: 19,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
    });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATRIBUSI_HTML }).addTo(map);
    L.control.attribution({ prefix: false }).addTo(map);
    lapis.current = L.layerGroup().addTo(map);
    peta.current = map;
    return () => {
      map.remove();
      peta.current = null;
      lapis.current = null;
    };
    // lat/lng awal hanya untuk posisi pertama; pembaruan ditangani efek penanda di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gambar ulang penanda + fit-bounds saat data atau filter berubah.
  useEffect(() => {
    const map = peta.current;
    const grup = lapis.current;
    if (!map || !grup) return;
    grup.clearLayers();
    const batas = L.latLngBounds([[lat, lng]]);

    if (perkiraan) {
      const lingkaran = L.circle([lat, lng], {
        radius: RADIUS_PERKIRAAN_M,
        color: AKSEN,
        weight: 1.5,
        fillColor: AKSEN,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(grup);
      batas.extend(lingkaran.getBounds());
    }

    L.marker([lat, lng], { icon: ikonKos(), zIndexOffset: 1000, title: nama, alt: nama })
      .bindPopup(
        isiPopup(nama, [perkiraan ? `${LABEL_LOKASI_PERKIRAAN} (bisa meleset hingga ±${RADIUS_PERKIRAAN_M} m)` : "Lokasi kos"]),
      )
      .addTo(grup);

    for (const t of tempat) {
      const kat = infoKategori(t.kategori);
      L.marker([t.lat, t.lng], { icon: ikonTempat(kat.emoji, kat.warna), title: t.nama, alt: t.nama })
        .bindPopup(isiPopup(t.nama, [kat.label, `${teksJarakGarisLurus(t.jarak_m)} garis lurus`]))
        .addTo(grup);
      batas.extend([t.lat, t.lng]);
    }

    map.invalidateSize();
    map.fitBounds(batas, { padding: [28, 28], maxZoom: ZOOM_MAKS_FIT, animate: false });
  }, [nama, lat, lng, perkiraan, tempat]);

  // Interaksi (geser, zoom sentuh/roda/klik ganda) hanya setelah diaktifkan.
  useEffect(() => {
    const map = peta.current;
    if (!map) return;
    const aksi = interaktif ? "enable" : "disable";
    map.dragging[aksi]();
    map.touchZoom[aksi]();
    map.scrollWheelZoom[aksi]();
    map.doubleClickZoom[aksi]();
    map.boxZoom[aksi]();
    map.keyboard[aksi]();
  }, [interaktif]);

  return (
    <div className="relative h-full w-full">
      <div ref={wadah} role="application" aria-label={`Peta lokasi ${nama}. ${ATRIBUSI_OSM}`} className="h-full w-full" />
      <button
        type="button"
        aria-pressed={interaktif}
        onClick={() => setInteraktif((v) => !v)}
        className="tekan absolute bottom-2 left-2 z-[1000] min-h-9 rounded-full border border-white/90 bg-white/90 px-3 text-xs font-bold text-ink shadow-[0_4px_14px_rgba(30,45,90,.18)]"
      >
        {interaktif ? "Kunci peta" : "Aktifkan peta"}
      </button>
    </div>
  );
}
