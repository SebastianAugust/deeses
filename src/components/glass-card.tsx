import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

type GlassCardProps = ComponentProps<"div"> & {
  /** Padding dalam kartu. Default "md" (16px). */
  padding?: keyof typeof PADDING;
  /** Pakai .glass-strong (lebih pekat), mis. di atas foto. */
  strong?: boolean;
};

/** Kartu kaca: .glass + radius besar. */
export function GlassCard({
  padding = "md",
  strong = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(strong ? "glass-strong" : "glass", "rounded-3xl", PADDING[padding], className)}
      {...props}
    />
  );
}
