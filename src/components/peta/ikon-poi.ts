import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Fuel,
  GraduationCap,
  House,
  Landmark,
  Mosque,
  Pill,
  ShoppingBasket,
  Shirt,
  Stethoscope,
  Store,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { KategoriPoi } from "@/lib/poi";

/**
 * Ikon per kategori tempat (lucide-react). Satu sumber untuk marker, chip filter, dan popup.
 * Emoji di KATEGORI_POI (src/lib/poi.ts) sengaja tidak dipakai lagi oleh komponen peta.
 */
export const IKON_KATEGORI: Record<KategoriPoi, LucideIcon> = {
  kampus: GraduationCap,
  minimarket: Store,
  makan: Utensils,
  pasar: ShoppingBasket,
  apotek: Pill,
  klinik: Stethoscope,
  atm_bank: Landmark,
  masjid: Mosque,
  laundry: Shirt,
  spbu: Fuel,
};

export const IKON_KOS: LucideIcon = House;

/**
 * SVG ikon sebagai string HTML statis (untuk elemen DOM marker/popup MapLibre).
 * Isinya murni dari komponen lucide, tanpa teks dari data.
 */
export function svgIkon(Ikon: LucideIcon, ukuran: number, tebal = 2.2): string {
  return renderToStaticMarkup(
    createElement(Ikon, { size: ukuran, strokeWidth: tebal, color: "currentColor", "aria-hidden": true }),
  );
}
