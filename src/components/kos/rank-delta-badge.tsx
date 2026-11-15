"use client";

import { AnimatePresence, motion } from "motion/react";
import { TRANSISI_CEPAT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Badge kecil "▲ n" (hijau, naik) / "▼ n" (oranye, turun) setelah peringkat berubah. */
export function RankDeltaBadge({ delta, className }: { delta?: number; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {delta ? (
        <motion.span
          key={delta}
          initial={{ opacity: 0, y: delta > 0 ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={TRANSISI_CEPAT}
          className={cn(
            "text-[11px] font-bold whitespace-nowrap tabular-nums",
            delta > 0 ? "text-naik" : "text-turun",
            className,
          )}
        >
          <span aria-hidden>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
          </span>
          <span className="sr-only">
            {delta > 0 ? `naik ${delta} peringkat` : `turun ${-delta} peringkat`}
          </span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
