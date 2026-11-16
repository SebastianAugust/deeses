import {
  Leaf,
  MapPin,
  Maximize,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserCog,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { IkonKriteria } from "@/config/kriteria";

const IKON: Record<IkonKriteria, LucideIcon> = {
  Wallet,
  MapPin,
  ShoppingBag,
  Maximize,
  Star,
  ShieldCheck,
  UserCog,
  Leaf,
};

/** Ikon lucide untuk sebuah kriteria (nama ikon dari KRITERIA di config/kriteria). */
export function KriteriaIcon({ nama, ...props }: { nama: IkonKriteria } & LucideProps) {
  const Ikon = IKON[nama];
  return <Ikon strokeWidth={2} aria-hidden {...props} />;
}
