"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { TRANSISI } from "@/lib/motion";

/**
 * reducedMotion="user": kalau pengguna mengaktifkan prefers-reduced-motion,
 * animasi transform & layout dimatikan, perubahan opacity tetap jalan.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={TRANSISI}>
      {children}
    </MotionConfig>
  );
}
