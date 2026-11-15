"use client";

import { AnimatePresence, motion } from "motion/react";
import { TRANSISI_CEPAT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Teks/angka yang berganti dengan fade + geser kecil (angka tabular).
 * Dengan reduced motion, geserannya hilang dan tinggal fade.
 */
export function AnimatedText({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex overflow-hidden align-bottom tabular-nums", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ opacity: 0, y: "45%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-45%" }}
          transition={TRANSISI_CEPAT}
          className="inline-block whitespace-pre"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
