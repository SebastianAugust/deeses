"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { DURASI_TOAST_MS, TRANSISI } from "@/lib/motion";

type ToastInput = {
  pesan: string;
  aksi?: { label: string; onClick: () => void };
};
type Toast = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

/** Tampilkan toast kaca kecil, mis. toast({ pesan, aksi: { label: "Batalkan", onClick } }). */
export function useToast() {
  return useContext(ToastContext);
}

/** Satu toast sekaligus; toast baru menggantikan yang lama. Hilang sendiri setelah 5 detik. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const tampilkan = useCallback((t: ToastInput) => setToast({ ...t, id: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), DURASI_TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={tampilkan}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[84px] z-50 flex justify-center px-4 lg:bottom-6"
      >
        <AnimatePresence>
          {toast ? (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={TRANSISI}
              className="glass-strong pointer-events-auto flex max-w-[440px] items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 text-sm font-semibold text-ink"
            >
              <span>{toast.pesan}</span>
              {toast.aksi ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.aksi?.onClick();
                    setToast(null);
                  }}
                  className="tekan h-11 flex-none rounded-full px-3.5 font-bold text-accent-ink hover:bg-white"
                >
                  {toast.aksi.label}
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
