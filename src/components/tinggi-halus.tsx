"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TRANSISI } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Wadah yang tingginya beranimasi halus mengikuti isinya (diukur dengan
 * ResizeObserver). Overflow hanya dipotong selama animasi, supaya focus ring
 * dan bayangan tombol tidak terpotong. Reduced motion: tinggi langsung berubah.
 */
export function TinggiHalus({ children, className }: { children: ReactNode; className?: string }) {
  const isiRef = useRef<HTMLDivElement>(null);
  const [tinggi, setTinggi] = useState<number | "auto">("auto");
  const [beranimasi, setBeranimasi] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = isiRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entri]) => setTinggi(entri.borderBoxSize[0]?.blockSize ?? entri.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height: tinggi }}
      transition={reduced ? { duration: 0 } : TRANSISI}
      onAnimationStart={() => setBeranimasi(true)}
      onAnimationComplete={() => setBeranimasi(false)}
      className={cn(beranimasi && "overflow-hidden", className)}
    >
      <div ref={isiRef}>{children}</div>
    </motion.div>
  );
}
