import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  intensity?: "shell" | "panel" | "card";
};

export function GlassPanel({
  className,
  intensity = "panel",
  ...props
}: GlassPanelProps) {
  const tone = {
    shell:
      "border-white/38 bg-neutral-500/28 shadow-[0_26px_90px_rgba(0,0,0,0.5)]",
    panel:
      "border-white/24 bg-white/13 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_20px_70px_rgba(0,0,0,0.28)]",
    card: "border-white/20 bg-white/10 shadow-[0_14px_44px_rgba(0,0,0,0.18)]",
  }[intensity];

  return (
    <div
      className={cn("rounded-lg border backdrop-blur-2xl", tone, className)}
      {...props}
    />
  );
}
