"use client";

import { ViewTransition, type ReactNode } from "react";

/**
 * Pembungkus tiap page.tsx untuk transisi antar halaman (View Transitions API
 * lewat <ViewTransition> React). Navigasi Next = transition, jadi halaman lama
 * memudar dan halaman baru masuk dengan fade + geser 10px (CSS di globals.css).
 * Hanya snapshot yang dianimasikan, jadi elemen `position: fixed` (bottom bar)
 * tidak terganggu. Update di halaman yang sama (mis. query params) tidak
 * dianimasikan (default="none").
 */
export function Halaman({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="halaman-masuk" exit="halaman-keluar" default="none">
      {children}
    </ViewTransition>
  );
}
