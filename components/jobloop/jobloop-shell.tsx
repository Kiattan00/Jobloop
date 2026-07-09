import Link from "next/link";
import type { ReactNode } from "react";
import { jobLoopRoutes } from "@/lib/jobloop/routes";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./glass-panel";

export function JobLoopShell({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <main className="jobloop-bg relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-10">
      <GlassPanel
        intensity="shell"
        className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[1380px] flex-col p-6 sm:p-8 lg:p-10"
      >
        <header className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="flex flex-wrap items-end gap-x-7 gap-y-4">
            <Link
              href="/"
              className="font-serif text-5xl font-black leading-none tracking-normal text-white drop-shadow-sm sm:text-6xl lg:text-7xl"
            >
              JOBLOOP
            </Link>
            <div className="hidden h-16 w-px bg-white/24 sm:block" />
            <div>
              <p className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                投递决策工作台
              </p>
              <p className="mt-1 text-sm uppercase tracking-normal text-white/56">
                Resume matching and decision workspace
              </p>
            </div>
          </div>
        </header>

        <nav className="mt-8 flex flex-wrap gap-3">
          {jobLoopRoutes.map((item) => (
            <Link
              className={cn(
                "min-w-24 rounded-lg border px-5 py-3 text-center text-sm font-semibold transition",
                active === item.href
                  ? "border-white/34 bg-black/58 text-white shadow-inner"
                  : "border-white/30 bg-white/14 text-white/82 hover:bg-white/20",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-7 flex-1">{children}</div>
      </GlassPanel>
    </main>
  );
}
