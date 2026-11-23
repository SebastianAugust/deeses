#!/usr/bin/env node
/**
 * Mengambil tempat penting di sekitar Jatinangor dari OpenStreetMap (Overpass API)
 * dan menulis public/data/poi-jatinangor.json: [{ id, nama, kategori, lat, lng }].
 *
 *   node scripts/ambil-poi.mjs
 *
 * Tanpa dependensi. Dijalankan SEKALI (hasilnya di-commit); bukan bagian dari build.
 * Overpass timeout/429/5xx → ulangi 3x dengan jeda; tetap gagal → berhenti (exit 1),
 * file TIDAK ditulis dan tidak ada data karangan.
 * Data © OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const BBOX = { selatan: -6.97, barat: 107.73, utara: -6.9, timur: 107.81 };
const KELUARAN = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/poi-jatinangor.json");
const PERCOBAAN = 3;
const JEDA_MS = [5000, 15000, 30000];
/** Dua entri sekategori bernama sama yang berjarak kurang dari ini dianggap duplikat. */
const JARAK_DUPLIKAT_M = 60;

/** Aturan kategori: tag OSM → kategori. Urutan = prioritas bila satu objek cocok lebih dari satu. */
const ATURAN = [
  { kategori: "minimarket", cocok: (t) => ["convenience", "supermarket"].includes(t.shop) },
  { kategori: "pasar", cocok: (t) => t.amenity === "marketplace" },
  { kategori: "apotek", cocok: (t) => t.amenity === "pharmacy" },
  { kategori: "klinik", cocok: (t) => ["clinic", "hospital", "doctors"].includes(t.amenity) },
  { kategori: "atm_bank", cocok: (t) => ["atm", "bank"].includes(t.amenity) },
  { kategori: "masjid", cocok: (t) => t.amenity === "place_of_worship" && t.religion === "muslim" },
  { kategori: "makan", cocok: (t) => ["restaurant", "cafe", "fast_food"].includes(t.amenity) },
  { kategori: "laundry", cocok: (t) => t.shop === "laundry" },
  { kategori: "spbu", cocok: (t) => t.amenity === "fuel" },
];

/** Kategori yang boleh tanpa nama (diberi nama kategori). */
const NAMA_CADANGAN = { atm_bank: "ATM/Bank", minimarket: "Minimarket" };

const LANDMARK = [
  { id: "landmark/unpad", nama: "Gerbang Unpad (Tugu Makalangan)", kategori: "kampus", lat: -6.9313996, lng: 107.7761314 },
  { id: "landmark/itb", nama: "ITB Jatinangor", kategori: "kampus", lat: -6.9336088, lng: 107.7682456 },
];

function kueri() {
  const kotak = `${BBOX.selatan},${BBOX.barat},${BBOX.utara},${BBOX.timur}`;
  const baris = [
    `nwr["shop"~"^(convenience|supermarket|laundry)$"](${kotak});`,
    `nwr["amenity"~"^(marketplace|pharmacy|clinic|hospital|doctors|atm|bank|place_of_worship|restaurant|cafe|fast_food|fuel)$"](${kotak});`,
  ];
  return `[out:json][timeout:90];\n(\n  ${baris.join("\n  ")}\n);\nout center tags;`;
}

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

async function ambilOverpass() {
  let terakhir = "";
  for (let i = 0; i < PERCOBAAN; i++) {
    try {
      const res = await fetch(OVERPASS, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "carikos-poi-script" },
        body: new URLSearchParams({ data: kueri() }),
        signal: AbortSignal.timeout(120_000),
      });
      if (res.ok) {
        const json = await res.json();
        // Overpass kadang membalas 200 dengan "remark" runtime error saat kehabisan waktu/memori.
        if (Array.isArray(json.elements) && !String(json.remark ?? "").includes("runtime error")) return json.elements;
        terakhir = `balasan tidak lengkap: ${json.remark ?? "tanpa elements"}`;
      } else {
        terakhir = `HTTP ${res.status}`;
      }
    } catch (e) {
      terakhir = e instanceof Error ? e.message : String(e);
    }
    console.error(`Percobaan ${i + 1}/${PERCOBAAN} gagal: ${terakhir}`);
    if (i < PERCOBAAN - 1) await tidur(JEDA_MS[i]);
  }
  throw new Error(`Overpass tetap gagal setelah ${PERCOBAAN} percobaan (${terakhir}). Tidak ada file yang ditulis.`);
}

function haversineM(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}

function jadikanTempat(el) {
  const tag = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const aturan = ATURAN.find((a) => a.cocok(tag));
  if (!aturan) return null;
  let nama = (tag.name ?? "").trim();
  if (nama === "" && NAMA_CADANGAN[aturan.kategori]) {
    nama = (tag.brand ?? tag.operator ?? "").trim() || NAMA_CADANGAN[aturan.kategori];
  }
  if (nama === "") return null;
  return { id: `${el.type}/${el.id}`, nama, kategori: aturan.kategori, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

function buangDuplikat(daftar) {
  const hasil = [];
  const idDipakai = new Set();
  for (const t of daftar) {
    if (idDipakai.has(t.id)) continue;
    const kembar = hasil.some(
      (h) => h.kategori === t.kategori && h.nama.toLowerCase() === t.nama.toLowerCase() && haversineM(h, t) < JARAK_DUPLIKAT_M,
    );
    if (kembar) continue;
    idDipakai.add(t.id);
    hasil.push(t);
  }
  return hasil;
}

const elemen = await ambilOverpass();
const dariOsm = buangDuplikat(elemen.map(jadikanTempat).filter(Boolean));
dariOsm.sort((a, b) => a.kategori.localeCompare(b.kategori) || a.nama.localeCompare(b.nama, "id") || a.id.localeCompare(b.id));
const semua = [...LANDMARK, ...dariOsm];

await mkdir(dirname(KELUARAN), { recursive: true });
await writeFile(KELUARAN, `[\n${semua.map((t) => "  " + JSON.stringify(t)).join(",\n")}\n]\n`, "utf8");

const hitung = {};
for (const t of semua) hitung[t.kategori] = (hitung[t.kategori] ?? 0) + 1;
console.log(`Elemen mentah Overpass: ${elemen.length}; ditulis: ${semua.length} tempat → ${KELUARAN}`);
console.log(JSON.stringify(hitung, null, 2));
