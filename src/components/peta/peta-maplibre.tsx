"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
/** Tanpa event 'load' (utama) / 'idle' (cadangan) dalam waktu ini, pindah ke tahap berikutnya. */
const BATAS_WAKTU_MUAT_MS = 8_000;
const PADDING = { top: 62, bottom: 36, left: 40, right: 56 } as const;
const SUMBER_PERKIRAAN = "lokasi-perkiraan";
/** Id sumber vektor pada style Liberty (https://tiles.openfreemap.org/styles/liberty). */
const SUMBER_UTAMA = "openmaptiles";
const SUMBER_RASTER = "osm";
const ATRIBUSI_OSM = "© OpenStreetMap contributors";
const MAKS_PERINGATAN = 8;

/** Style cadangan minimal: ubin raster OpenStreetMap standar. */
const GAYA_RASTER: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    [SUMBER_RASTER]: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: ATRIBUSI_OSM,
    },
  },
  layers: [{ id: "osm", type: "raster", source: SUMBER_RASTER }],
};

/**
 * MapLibre 6 menurunkan URL worker dari `import.meta.url` modulnya. Setelah dibundel
 * Turbopack, URL itu menunjuk ke berkas yang salah (berkas pustaka utama, bukan
 * maplibre-gl-worker.mjs), worker gagal jalan, dan dasar peta tidak pernah tergambar
 * padahal marker DOM tetap tampil. Maka URL worker diberikan eksplisit: Turbopack
 * menyalin berkas ini sebagai aset statis (/_next/static/media/...) satu origin.
 */
let workerSudahDiatur = false;
function aturWorker() {
  if (workerSudahDiatur) return;
  workerSudahDiatur = true;
  maplibregl.setWorkerUrl(
    new URL("../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
  );
}

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

/** Lingkaran geodesik sederhana (cukup akurat untuk ratusan meter) sebagai cincin Polygon GeoJSON. */
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
 *
 * Rantai cadangan: style vektor OpenFreeMap Liberty → style raster OSM → pesan "Peta tidak
 * dapat dimuat" (penanda disembunyikan). Satu ubin/sprite/glyph yang gagal TIDAK menggeser tahap.
 */
export default function PetaMaplibre({ nama, lat, lng, perkiraan, urlCadangan, tempat }: PropsPeta) {
  const wadah = useRef<HTMLDivElement>(null);
  const peta = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const penandaAktif = useRef<maplibregl.Marker[]>([]);
  const [siap, setSiap] = useState(false);
  const [gagal, setGagal] = useState(false);
  const pertama = useRef(true);

  // Lingkaran perkiraan: GeoJSON + cincin (untuk fit-bounds). GeoJSON disimpan di ref supaya
  // bisa dipasang ulang setiap kali style berganti (utama -> cadangan).
  const lingkaran = useMemo(() => {
    const cincin = perkiraan ? poligonLingkaran(lat, lng, RADIUS_PERKIRAAN_M) : [];
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: perkiraan
        ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [cincin] } }]
        : [],
    };
    return { cincin, data };
  }, [lat, lng, perkiraan]);
  const lingkaranRef = useRef(lingkaran.data);
  useEffect(() => {
    lingkaranRef.current = lingkaran.data;
    (peta.current?.getSource(SUMBER_PERKIRAAN) as maplibregl.GeoJSONSource | undefined)?.setData(lingkaran.data);
  }, [lingkaran]);

  // Buat peta sekali.
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    let map: maplibregl.Map;
    try {
      aturWorker();
      map = new maplibregl.Map({
        container: el,
        style: URL_GAYA,
        center: [lng, lat],
        zoom: ZOOM_PUSAT,
        maxZoom: 19,
        attributionControl: false, // dipasang manual supaya sesuai style yang aktif
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
    } catch (e) {
      // WebGL tidak tersedia / gagal inisialisasi.
      console.warn("[peta] MapLibre gagal dibuat (WebGL?):", e instanceof Error ? e.message : e);
      const t = setTimeout(() => setGagal(true), 0);
      return () => clearTimeout(t);
    }
    map.touchZoomRotate.disableRotation();

    type Tahap = "utama" | "cadangan";
    let tahap: Tahap = "utama";
    let gayaTerpasang = false; // 'style.load' sudah terjadi untuk style aktif
    let sudahMuat = false; // 'load'/'idle' sudah terjadi pada tahap ini
    let ubinBerhasil = 0; // ubin sumber dasar yang berhasil dimuat pada tahap ini
    let ubinGalat = 0;
    let jumlahPeringatan = 0;
    let selesai = false; // sudah gagal total / peta dibongkar
    let atribusi: maplibregl.AttributionControl | null = null;
    let batasWaktu: ReturnType<typeof setTimeout> | undefined;

    const gayaAktif = () => (tahap === "utama" ? URL_GAYA : "osm-raster");
    const sumberDasar = () => (tahap === "utama" ? SUMBER_UTAMA : SUMBER_RASTER);
    const catat = (pesan: string, rinci?: unknown) => {
      if (jumlahPeringatan++ >= MAKS_PERINGATAN) return;
      console.warn(`[peta] ${pesan}`, { gaya: gayaAktif(), rinci });
    };

    const pasangAtribusi = () => {
      if (atribusi) map.removeControl(atribusi);
      // Style Liberty hanya menyebut "Data from OpenStreetMap": tambahkan atribusi ODbL.
      atribusi = new maplibregl.AttributionControl({
        compact: false,
        customAttribution: tahap === "utama" ? ATRIBUSI_OSM : undefined,
      });
      map.addControl(atribusi, "bottom-right");
    };
    pasangAtribusi();

    const pasangLingkaran = () => {
      if (map.getSource(SUMBER_PERKIRAAN)) return;
      map.addSource(SUMBER_PERKIRAAN, { type: "geojson", data: lingkaranRef.current });
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
    };

    const gagalTotal = (alasan: string) => {
      if (selesai) return;
      selesai = true;
      clearTimeout(batasWaktu);
      catat(`peta tidak dapat dimuat (kedua style gagal): ${alasan}`);
      setGagal(true);
    };

    const mulaiPenghitung = () => {
      clearTimeout(batasWaktu);
      batasWaktu = setTimeout(() => {
        if (selesai || sudahMuat) return;
        if (tahap === "utama") beralihKeCadangan("tidak ada event 'load' dalam 8 detik");
        else gagalTotal("tidak ada event 'idle' dalam 8 detik");
      }, BATAS_WAKTU_MUAT_MS);
    };

    function beralihKeCadangan(alasan: string) {
      if (selesai || tahap === "cadangan") return;
      catat(`style utama gagal, beralih ke raster OpenStreetMap: ${alasan}`);
      tahap = "cadangan";
      gayaTerpasang = false;
      sudahMuat = false;
      ubinBerhasil = 0;
      ubinGalat = 0;
      jumlahPeringatan = 0;
      pasangAtribusi();
      // Penanda DOM tidak ikut style; lingkaran dipasang ulang di 'style.load'.
      map.setStyle(GAYA_RASTER, { diff: false });
      mulaiPenghitung();
    }

    // Dengarkan SEMUA 'error' (sekaligus mencegah console.error bawaan MapLibre), tetapi hanya
    // yang membuat style/sumber dasar tak bisa dipakai yang menggeser tahap. Satu ubin,
    // sprite, atau glyph yang gagal cukup dicatat.
    map.on("error", (e) => {
      if (selesai) return;
      const err = (e as { error?: unknown }).error;
      const pesan = err instanceof Error ? err.message : String(err);
      const info = e as { sourceId?: string; tile?: unknown };
      catat(`error: ${pesan}`, { sumber: info.sourceId, ubin: Boolean(info.tile) });
      if (info.tile && info.sourceId === sumberDasar()) ubinGalat++;
      const gayaGagal = !gayaTerpasang; // JSON style tidak terunduh / tidak valid
      const sumberGagal = !info.tile && info.sourceId === sumberDasar(); // TileJSON sumber dasar gagal
      const workerGagal = /worker/i.test(pesan);
      if (tahap === "utama" && (gayaGagal || sumberGagal || workerGagal)) beralihKeCadangan(pesan);
      else if (tahap === "cadangan" && gayaGagal) gagalTotal(pesan);
    });
    map.on("style.load", () => {
      gayaTerpasang = true;
      pasangLingkaran();
      setSiap(true);
    });
    map.on("data", (e) => {
      const info = e as { tile?: unknown; sourceId?: string };
      if (info.tile && info.sourceId === sumberDasar()) ubinBerhasil++;
    });
    const saatSelesaiMuat = () => {
      sudahMuat = true;
      // Selesai dimuat tetapi tak satu pun ubin dasar berhasil: dasar peta kosong.
      if (ubinGalat > 0 && ubinBerhasil === 0) {
        if (tahap === "utama") beralihKeCadangan("semua ubin dasar gagal dimuat");
        else gagalTotal("semua ubin raster gagal dimuat");
      }
    };
    map.on("load", saatSelesaiMuat);
    map.on("idle", saatSelesaiMuat);
    mulaiPenghitung();

    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      anchor: "bottom",
      className: "peta-popup",
      maxWidth: "260px",
    });
    peta.current = map;
    return () => {
      selesai = true;
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

  // Gambar ulang penanda + fit-bounds saat data atau filter berubah. Di mode gagal total
  // penanda disembunyikan (peta kosong dengan pin hanya membingungkan).
  useEffect(() => {
    const map = peta.current;
    const pop = popup.current;
    if (!map || !pop || !siap || gagal) return;

    const batas = new maplibregl.LngLatBounds([lng, lat], [lng, lat]);
    for (const p of lingkaran.cincin) batas.extend(p);

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
  }, [siap, gagal, nama, lat, lng, perkiraan, tempat, lingkaran]);

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
