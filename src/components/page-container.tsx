import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = ComponentProps<"main"> & {
  /** Halaman berbentuk grid (mis. Hasil) boleh melebar sampai 1200px di desktop. */
  wide?: boolean;
};

/** Pembungkus halaman mobile-first: ±480px di tengah, melebar di desktop. */
export function PageContainer({ wide = false, className, ...props }: PageContainerProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-[480px] flex-1 flex-col px-5 py-6",
        wide ? "lg:max-w-[1200px] lg:px-8" : "lg:max-w-[720px]",
        className,
      )}
      {...props}
    />
  );
}
