"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TRANSISI } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Crossfade antar-state (mis. skeleton → konten): saat `kunci` berganti, isi
 * lama memudar keluar sambil isi baru memudar masuk di tempat yang sama.
 */
export function Crossfade({
  kunci,
  children,
  className,
}: {
  kunci: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={kunci}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANSISI}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
