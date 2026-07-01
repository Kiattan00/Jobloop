import { CheckCircle2, Rocket, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const stack = ["App Router", "TypeScript", "Biome", "shadcn/ui"];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-3xl rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Rocket className="size-4" aria-hidden="true" />
          </span>
          JobLoop Starter
        </div>

        <div className="mt-8 space-y-4">
          <h1 className="text-3xl font-semibold tracking-normal text-card-foreground">
            Next.js 初始页已就绪
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            这是一个用于校验 shadcn/ui 样式、Lucide 图标和基础构建链路的 dummy
            页面。
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {stack.map((item) => (
            <div
              className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm"
              key={item}
            >
              <CheckCircle2
                className="size-4 text-primary"
                aria-hidden="true"
              />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button type="button">
            <Sparkles data-icon="inline-start" aria-hidden="true" />
            shadcn/ui 已加载
          </Button>
          <p className="text-sm text-muted-foreground">
            提交前会自动 format、safe fix、typecheck。
          </p>
        </div>
      </section>
    </main>
  );
}
