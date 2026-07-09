import { ArrowRight, FileStack, Sparkles, Target } from "lucide-react";
import { GlassPanel } from "@/components/jobloop/glass-panel";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import {
  ActionLink,
  PageHeader,
  SectionTitle,
} from "@/components/jobloop/page-chrome";
import { createDemoJobLoopState } from "@/lib/jobloop/seed-data";

const steps = [
  {
    title: "录入或上传简历",
    copy: "支持直接粘贴文本，也支持上传文本型 PDF，系统会把提取出的正文沉淀为可编辑卡片。",
    icon: FileStack,
  },
  {
    title: "岗位分析工作台",
    copy: "输入多个 JD 后，先看到岗位标题卡片，再逐个回填公司信息、匹配分和投递判断。",
    icon: Target,
  },
  {
    title: "投递前决策",
    copy: "在详情页继续查看完整分析、话术建议和是否需要生成微调版简历。",
    icon: Sparkles,
  },
];

export default function Home() {
  const demoState = createDemoJobLoopState();
  const topJob = demoState.jobs[0];
  const topResult = demoState.analysisResults[0];
  const topResume = demoState.resumeVersions[0];

  return (
    <JobLoopShell active="/">
      <div className="grid min-h-[720px] gap-5 lg:grid-cols-[1.06fr_0.94fr]">
        <GlassPanel className="h-full p-6 lg:p-8">
          <PageHeader
            eyebrow="P0 workspace"
            title="多版本简历匹配与投递决策"
            subtitle="先建立可复用的简历版本库，再进入岗位分析工作台完成 JD 解析、匹配判断与单岗位投递前准备。首次打开会看到一套预设示例内容，录入真实数据后会自动切换。"
          />
          <div className="mt-7 flex flex-wrap gap-3">
            <ActionLink href="/resumes" tone="primary">
              进入简历库
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </ActionLink>
            <ActionLink href="/analyses">进入岗位分析</ActionLink>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-white/18 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                示例简历
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {demoState.resumeVersions.length} 张基础卡片
              </p>
              <p className="mt-1 text-sm leading-6 text-white/60">
                当前默认展示文本录入与 PDF 导入两种来源。
              </p>
            </div>
            <div className="rounded-lg border border-white/18 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                示例岗位
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {demoState.jobs.length} 个 JD 卡片
              </p>
              <p className="mt-1 text-sm leading-6 text-white/60">
                先显示岗位标题，再逐步补充评分与详情。
              </p>
            </div>
            <div className="rounded-lg border border-white/18 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                示例结论
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {topResult?.matchScore ?? "--"}% 匹配分
              </p>
              <p className="mt-1 text-sm leading-6 text-white/60">
                高价值岗位可继续查看详情并决定是否生成微调版。
              </p>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-5">
          <GlassPanel className="p-6">
            <SectionTitle
              title="当前 MVP"
              subtitle="本地原型阶段可直接体验的主链路"
            />
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

          <GlassPanel className="p-6">
            <SectionTitle
              title="示例快照"
              subtitle="默认演示内容会在录入真实数据后自动被替换"
            />
            <div className="mt-5 rounded-lg border border-white/18 bg-white/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                {topJob?.companyName}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {topJob?.jobTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/62">
                推荐简历：{topResume?.name ?? "未找到"}，当前示例分数为{" "}
                {topResult?.matchScore ?? "--"}%，说明文字会在详情页继续展开。
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>
    </JobLoopShell>
  );
}
