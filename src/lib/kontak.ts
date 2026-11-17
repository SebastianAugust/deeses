import { SITE_NAME } from "@/config/site";

/** Pesan pembuka WhatsApp yang terisi otomatis. */
export function pesanWa(namaKos: string): string {
  return `Halo, saya lihat ${namaKos} di ${SITE_NAME}, masih ada kamar kosong?`;
}

/** https://wa.me/<nomor>?text=… (nomor dibersihkan jadi digit saja; awalan 0 → 62). */
export function tautanWa(nomor: string, namaKos: string): string {
  let digit = nomor.replace(/\D/g, "");
  if (digit.startsWith("0")) digit = `62${digit.slice(1)}`;
  return `https://wa.me/${digit}?text=${encodeURIComponent(pesanWa(namaKos))}`;
}

/** tel:<nomor> (hanya digit dan +). */
export function tautanTelp(nomor: string): string {
  return `tel:${nomor.replace(/[^\d+]/g, "")}`;
}
