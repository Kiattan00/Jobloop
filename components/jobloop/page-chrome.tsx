import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
        {subtitle}
      </p>
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-normal text-white">
        {title}
      </h2>
      <p className="mt-1 text-sm text-white/58">{subtitle}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/28 bg-black/16 p-6 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/58">
        {description}
      </p>
      <Link
        className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export function ActionLink({
  href,
  children,
  tone = "quiet",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "quiet" | "primary";
  className?: string;
}) {
  return (
    <Link
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition",
        tone === "primary"
          ? "border-cyan-200/70 bg-cyan-300/18 text-cyan-50 shadow-[0_0_28px_rgba(70,210,225,0.18)] hover:bg-cyan-300/24"
          : "border-white/24 bg-white/13 text-white/82 hover:bg-white/18",
        className,
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
