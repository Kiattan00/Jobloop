import { ArrowRight, FileStack, Sparkles, Target } from "lucide-react";
import { GlassPanel } from "@/components/jobloop/glass-panel";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import {
  ActionLink,
  PageHeader,
  SectionTitle,
} from "@/components/jobloop/page-chrome";

const steps = [
  {
    title: "生成基础简历",
    copy: "在简历库页进入生成流程，基于原始简历与目标岗位方向生成多个基础版本。",
    icon: FileStack,
  },
  {
    title: "岗位分析工作台",
    copy: "在同一页面内输入多个 JD，逐个完成匹配分析并保留历史记录。",
    icon: Target,
  },
  {
    title: "投递前决策",
    copy: "判断推荐简历、匹配分、是否值得投和是否需要微调。",
    icon: Sparkles,
  },
];

export default function Home() {
  return (
    <JobLoopShell active="/">
      <div className="grid min-h-[720px] gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassPanel className="h-full p-6 lg:p-8">
          <PageHeader
            eyebrow="P0 workspace"
            title="多版本简历匹配与投递决策"
            subtitle="先建立可复用的简历版本库，再进入岗位分析工作台完成 JD 解析、匹配判断与单岗位投递前准备。"
          />
          <div className="mt-7 flex flex-wrap gap-3">
            <ActionLink href="/resumes" tone="primary">
              进入简历库
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </ActionLink>
            <ActionLink href="/analyses">进入岗位分析</ActionLink>
          </div>
        </GlassPanel>

        <GlassPanel className="h-full p-6">
          <SectionTitle title="当前 MVP" subtitle="Phase 3 完成范围" />
          <div className="mt-5 grid gap-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  className="grid gap-3 rounded-lg border border-white/18 bg-white/10 p-4 sm:grid-cols-[auto_1fr]"
                  key={step.title}
                >
                  <div className="flex size-10 items-center justify-center rounded-md border border-cyan-200/50 bg-cyan-300/12 text-cyan-100">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/60">
                      {step.copy}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>
    </JobLoopShell>
  );
}
