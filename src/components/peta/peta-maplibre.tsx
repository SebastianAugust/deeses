"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./peta.css";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { RADIUS_PERKIRAAN_M, type TempatTerdekat } from "@/lib/poi";
import { LABEL_LOKASI_PERKIRAAN } from "@/lib/format";
import { PetaGagal } from "./peta-gagal";
import { buatPenandaKos, buatPenandaTempat, type Penanda } from "./penanda";

/** Gaya vektor OpenFreeMap (tanpa API key). Atribusi: OpenFreeMap, OpenMapTiles, OpenStreetMap. */
const URL_GAYA = "https://tiles.openfreemap.org/styles/liberty";
const ZOOM_MAKS_FIT = 17;
const ZOOM_PUSAT = 16;
const BATAS_WAKTU_MUAT_MS = 20_000;
const PADDING = { top: 62, bottom: 36, left: 40, right: 56 } as const;
const SUMBER_PERKIRAAN = "lokasi-perkiraan";

const TOMBOL =
  "tekan flex size-10 items-center justify-center rounded-xl border border-white/90 bg-white/95 text-ink shadow-[0_4px_14px_rgba(30,45,90,.18)] hover:bg-soft";

export type PropsPeta = {
  nama: string;
  lat: number;
  lng: number;
  /** Lokasi perkiraan: lingkaran ±200 m (layer GeoJSON), bukan klaim titik pasti. */
  perkiraan: boolean;
  /** Tautan Google Maps untuk cadangan bila peta gagal dimuat (null = tanpa tombol). */
  urlCadangan: string | null;
  /** Tempat yang sedang tampil (sudah disaring chip kategori). */
  tempat: TempatTerdekat[];
};

/** Lingkaran geodesik sederhana (cukup akurat untuk ratusan meter) sebagai Polygon GeoJSON. */
function poligonLingkaran(lat: number, lng: number, radiusM: number, langkah = 64) {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const cincin: [number, number][] = [];
  for (let i = 0; i <= langkah; i++) {
    const a = (i / langkah) * 2 * Math.PI;
    cincin.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return cincin;
}

function kurangGerak(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Peta MapLibre GL: pin kos + tempat sekitar. Hanya dimuat di klien (dynamic, ssr:false).
 * Gestur kooperatif: di layar sentuh digeser dengan dua jari (satu jari menggulir halaman),
 * di desktop roda mouse butuh Ctrl/⌘ supaya scroll halaman tidak terjebak.
 */
export default function PetaMaplibre({ nama, lat, lng, perkiraan, urlCadangan, tempat }: PropsPeta) {
  const wadah = useRef<HTMLDivElement>(null);
  const peta = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const penandaAktif = useRef<maplibregl.Marker[]>([]);
  const [siap, setSiap] = useState(false);
  const [gagal, setGagal] = useState(false);
  const pertama = useRef(true);

  // Buat peta sekali.
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: el,
        style: URL_GAYA,
        center: [lng, lat],
        zoom: ZOOM_PUSAT,
        maxZoom: 19,
        attributionControl: { compact: false, customAttribution: "© OpenStreetMap contributors" },
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Tahan Ctrl dan gulir untuk memperbesar peta",
          "CooperativeGesturesHandler.MacHelpText": "Tahan ⌘ dan gulir untuk memperbesar peta",
          "CooperativeGesturesHandler.MobileHelpText": "Gunakan dua jari untuk menggeser peta",
          "NavigationControl.ZoomIn": "Perbesar",
          "NavigationControl.ZoomOut": "Perkecil",
        },
      });
    } catch {
      // WebGL tidak tersedia / gagal inisialisasi.
      const t = setTimeout(() => setGagal(true), 0);
      return () => clearTimeout(t);
    }
    map.touchZoomRotate.disableRotation();

    let gayaTerpasang = false;
    let sudahMuat = false;
    const gagalkan = () => {
      if (!sudahMuat) setGagal(true);
    };
    // Dengarkan 'error' supaya MapLibre tidak mencetak console.error; hanya kegagalan
    // memuat gaya (sebelum style.load) yang dianggap fatal. Tile/ikon yang hilang diabaikan.
    map.on("error", () => {
      if (!gayaTerpasang) gagalkan();
    });
    map.on("style.load", () => {
      gayaTerpasang = true;
      map.addSource(SUMBER_PERKIRAAN, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: `${SUMBER_PERKIRAAN}-isi`,
        type: "fill",
        source: SUMBER_PERKIRAAN,
        paint: { "fill-color": "#1d5fd1", "fill-opacity": 0.14 },
      });
      map.addLayer({
        id: `${SUMBER_PERKIRAAN}-garis`,
        type: "line",
        source: SUMBER_PERKIRAAN,
        paint: { "line-color": "#1d5fd1", "line-width": 1.5, "line-opacity": 0.75, "line-dasharray": [3, 2] },
      });
      setSiap(true);
    });
    map.on("load", () => {
      sudahMuat = true;
    });
    const batasWaktu = setTimeout(gagalkan, BATAS_WAKTU_MUAT_MS);

    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      anchor: "bottom",
      className: "peta-popup",
      maxWidth: "260px",
    });
    peta.current = map;
    return () => {
      clearTimeout(batasWaktu);
      popup.current?.remove();
      popup.current = null;
      map.remove();
      peta.current = null;
      penandaAktif.current = [];
      setSiap(false);
    };
    // lat/lng awal hanya untuk posisi pertama; pembaruan ditangani efek penanda di bawah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gambar ulang lingkaran perkiraan, penanda, dan fit-bounds saat data atau filter berubah.
  useEffect(() => {
    const map = peta.current;
    const pop = popup.current;
    if (!map || !pop || !siap) return;

    const batas = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);

    const sumber = map.getSource(SUMBER_PERKIRAAN) as maplibregl.GeoJSONSource | undefined;
    if (perkiraan) {
      const cincin = poligonLingkaran(lat, lng, RADIUS_PERKIRAAN_M);
      sumber?.setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [cincin] } }],
      });
      for (const p of cincin) batas.extend(p);
    } else {
      sumber?.setData({ type: "FeatureCollection", features: [] });
    }

    // Kampus dan kos digambar belakangan supaya berada di atas pin tempat biasa.
    const daftar: Penanda[] = [
      ...tempat.filter((t) => t.kategori !== "kampus").map(buatPenandaTempat),
      ...tempat.filter((t) => t.kategori === "kampus").map(buatPenandaTempat),
      buatPenandaKos({
        nama,
        lat,
        lng,
        perkiraan,
        labelPerkiraan: LABEL_LOKASI_PERKIRAAN,
        radiusPerkiraanM: RADIUS_PERKIRAAN_M,
      }),
    ];

    let terpasang: string | null = null;
    const saatTutup = () => {
      terpasang = null;
    };
    pop.on("close", saatTutup);
    const tampilkan = (p: Penanda) => {
      pop.setOffset([0, -(p.tinggi + 3)]).setLngLat([p.lng, p.lat]).setDOMContent(p.popup).addTo(map);
    };

    penandaAktif.current = daftar.map((p, i) => {
      p.elemen.style.zIndex = String(i + 1);
      const hoverBisa = () => window.matchMedia("(hover: hover)").matches;
      p.elemen.addEventListener("mouseenter", () => {
        if (terpasang === null && hoverBisa()) tampilkan(p);
      });
      p.elemen.addEventListener("mouseleave", () => {
        if (terpasang === null && hoverBisa()) pop.remove();
      });
      const pilih = (e: Event) => {
        e.stopPropagation(); // jangan diteruskan ke peta (closeOnClick akan menutup popup)
        if (terpasang === p.kunci) {
          pop.remove();
          return;
        }
        pop.remove();
        tampilkan(p);
        terpasang = p.kunci;
      };
      p.elemen.addEventListener("click", pilih);
      p.elemen.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pilih(e);
        }
      });
      return new maplibregl.Marker({ element: p.elemen, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
    });
    for (const p of tempat) batas.extend([p.lng, p.lat]);

    map.resize();
    map.fitBounds(batas, {
      padding: PADDING,
      maxZoom: ZOOM_MAKS_FIT,
      duration: pertama.current || kurangGerak() ? 0 : 350,
    });
    pertama.current = false;
    return () => {
      pop.off("close", saatTutup);
      for (const m of penandaAktif.current) m.remove();
      penandaAktif.current = [];
      pop.remove();
    };
  }, [siap, nama, lat, lng, perkiraan, tempat]);

  const pusatkan = useCallback(() => {
    const map = peta.current;
    if (!map) return;
    map.easeTo({
      center: [lng, lat],
      zoom: Math.min(Math.max(map.getZoom(), 15.5), ZOOM_MAKS_FIT),
      duration: kurangGerak() ? 0 : 400,
    });
  }, [lat, lng]);

  return (
    <div className="peta-wadah relative h-full w-full">
      <div
        ref={wadah}
        role="application"
        aria-label={`Peta lokasi ${nama}`}
        className="h-full w-full [&_.maplibregl-canvas]:outline-none"
      />
      {gagal ? (
        <PetaGagal href={urlCadangan} className="absolute inset-0 z-20" />
      ) : (
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
          <button type="button" className={TOMBOL} aria-label="Perbesar peta" onClick={() => peta.current?.zoomIn()}>
            <Plus size={18} aria-hidden />
          </button>
          <button type="button" className={TOMBOL} aria-label="Perkecil peta" onClick={() => peta.current?.zoomOut()}>
            <Minus size={18} aria-hidden />
          </button>
          <button type="button" className={TOMBOL} aria-label="Pusatkan ke kos" onClick={pusatkan}>
            <LocateFixed size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
