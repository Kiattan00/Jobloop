import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Layers3,
  MessageSquareText,
  Mic2,
  Plus,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";

// 旧过程稿仅作为 JobLoop 玻璃工作台视觉参考；新版 P0 页面以 specs/001-jobloop-p0/spec.md 为准。
const navItems = [
  { href: "/", label: "总览", area: "dashboard" },
  { href: "/jobs/new", label: "岗位", area: "jobs" },
  { href: "/feedback", label: "反馈", area: "feedback" },
  { href: "/reports/urbantech-match", label: "报告", area: "reports" },
];

const quickActions = [
  { href: "/jobs/new", label: "新增岗位", icon: Plus },
  { href: "/feedback", label: "录入反馈", icon: Mic2 },
  { href: "/reports/urbantech-match", label: "今日建议", icon: Sparkles },
];

const inputBase =
  "min-h-10 w-full rounded-md border border-white/24 bg-white/12 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/42 focus:border-cyan-300/80 focus:bg-white/16 focus:ring-3 focus:ring-cyan-300/16";

const panel =
  "rounded-lg border border-white/24 bg-white/13 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl";

function PrototypeShell({
  activeArea,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  activeArea: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080807] px-4 py-5 text-white sm:px-6 lg:px-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.22),rgba(0,0,0,0.68)),url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_6%,rgba(255,255,255,0.2),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.5))]"
      />
      <section className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[1380px] flex-col rounded-[26px] border border-white/38 bg-neutral-500/28 p-6 shadow-[0_26px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8 lg:p-10">
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
                {title}
              </p>
              <p className="mt-1 text-sm uppercase tracking-normal text-white/56">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <div className="flex h-11 min-w-[220px] items-center gap-2 rounded-full border border-white/28 bg-white/12 px-4 text-sm text-white/58">
              <Search className="size-4" aria-hidden="true" />
              Search jobs...
            </div>
            <div className="flex size-11 items-center justify-center rounded-full border border-white/28 bg-white/22 font-semibold">
              K
            </div>
          </div>
        </header>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <nav className="flex flex-wrap gap-3">
            {navItems.map((item) => (
              <Link
                className={`min-w-28 rounded-lg border px-8 py-3 text-center text-sm font-semibold transition ${
                  activeArea === item.area
                    ? "border-white/34 bg-black/58 text-white shadow-inner"
                    : "border-white/30 bg-white/14 text-white/82 hover:bg-white/20"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold transition ${
                    index === 0
                      ? "border-white/30 bg-black/58 text-white"
                      : "border-white/28 bg-white/16 text-white/84 hover:bg-white/22"
                  }`}
                  href={action.href}
                  key={action.href}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-4 text-xs font-medium uppercase tracking-normal text-cyan-200/70">
            {eyebrow}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-normal text-white">
        {title}
      </h2>
      <p className="mt-1 text-sm text-white/58">{subtitle}</p>
    </div>
  );
}

function GlassButton({
  href,
  children,
  tone = "quiet",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "quiet" | "primary";
}) {
  return (
    <Link
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold ${
        tone === "primary"
          ? "border-cyan-200/70 bg-cyan-300/18 text-cyan-50 shadow-[0_0_28px_rgba(70,210,225,0.18)]"
          : "border-white/24 bg-white/13 text-white/82"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function DashboardPreview() {
  const stats = [
    { label: "收藏", english: "SAVED", value: "36" },
    { label: "投递", english: "SUBMITTED", value: "12" },
    { label: "面试", english: "INTERVIEW", value: "5", active: true },
    { label: "Offer", english: "OFFER", value: "1" },
  ];

  return (
    <PrototypeShell
      activeArea="dashboard"
      eyebrow="Dashboard preview"
      title="求职总览"
      subtitle="Dashboard"
    >
      <div className="grid gap-5">
        <section className={`${panel} p-6 lg:p-8`}>
          <SectionTitle title="求职状态" subtitle="Pipeline overview" />
          <div className="mt-5 grid gap-5 md:grid-cols-4">
            {stats.map((stat) => (
              <Link
                className={`rounded-lg border p-5 transition ${
                  stat.active
                    ? "border-cyan-200/80 bg-cyan-200/9 shadow-[0_0_34px_rgba(70,210,225,0.16)]"
                    : "border-white/24 bg-white/12 hover:bg-white/16"
                }`}
                href="/jobs/urbantech-product-manager"
                key={stat.english}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold">{stat.label}</p>
                    <p className="text-xs text-white/54">{stat.english}</p>
                  </div>
                  {stat.active ? (
                    <span className="rounded-full border border-cyan-200/70 bg-cyan-300/18 px-3 py-1 text-xs text-cyan-50">
                      当前重点
                    </span>
                  ) : null}
                </div>
                <p className="mt-7 font-serif text-7xl font-black leading-none text-black/90">
                  {stat.value}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
          <section className={`${panel} p-6`}>
            <SectionTitle
              title="Loop timeline"
              subtitle="收藏 → 投递 → 面试 → 结果"
            />
            <div className="mt-9 px-2">
              <div className="relative h-16">
                <div className="absolute left-3 right-3 top-4 h-1 rounded-full bg-white/58" />
                <div className="absolute left-[34%] right-[12%] top-4 h-1 rounded-full bg-cyan-300/86" />
                {["收藏", "投递", "面试", "结果"].map((item, index) => (
                  <div
                    className="absolute top-0 -translate-x-1/2"
                    key={item}
                    style={{ left: `${[3, 34, 66, 97][index]}%` }}
                  >
                    <div
                      className={`mx-auto rounded-full border ${
                        index === 2
                          ? "size-9 border-cyan-200 bg-cyan-300/30 p-1 shadow-[0_0_22px_rgba(70,210,225,0.42)]"
                          : "size-5 border-white/76 bg-white/90"
                      }`}
                    >
                      {index === 2 ? (
                        <div className="size-full rounded-full bg-cyan-300" />
                      ) : null}
                    </div>
                    <p className="mt-3 text-center text-sm font-medium text-white/84">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={`${panel} p-6`}>
            <SectionTitle title="今日建议" subtitle="AI next actions" />
            <div className="mt-5 grid gap-3">
              {[
                ["准备 Coze → Web 项目复盘", "高"],
                ["完善 UrbanTech 面试追问", "中"],
                ["更新 JobLoop 岗位档案", "低"],
              ].map(([text, level]) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-md border border-white/24 bg-white/62 px-4 py-2 text-sm font-semibold text-neutral-900"
                  href="/reports/urbantech-match"
                  key={text}
                >
                  <span>{text}</span>
                  <span className="text-cyan-700">{level}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <Link
          className={`${panel} flex flex-wrap items-end justify-between gap-5 p-6 transition hover:bg-white/17`}
          href="/jobs/urbantech-product-manager"
        >
          <div>
            <p className="text-2xl font-semibold">
              重点岗位：AI 产品经理 · UrbanTech Studio
            </p>
            <p className="mt-2 text-sm text-white/62">
              阶段：二面后复盘 ｜ 下一步：准备 90 秒项目回答
            </p>
          </div>
          <div className="text-right">
            <span className="text-6xl font-black text-cyan-300">82%</span>
            <span className="ml-3 text-sm text-white/64">匹配度</span>
          </div>
        </Link>
      </div>
    </PrototypeShell>
  );
}

export function NewJobPreview() {
  return (
    <PrototypeShell
      activeArea="jobs"
      eyebrow="Create dossier"
      title="新增岗位"
      subtitle="New job dossier"
    >
      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.8fr]">
        <section className={`${panel} p-6 lg:p-8`}>
          <SectionTitle
            title="建立岗位档案"
            subtitle="岗位信息、JD 与主简历形成单一录入路径"
          />

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-white/70">
              岗位名称
              <input
                className={inputBase}
                defaultValue="AI 产品经理"
                aria-label="岗位名称"
              />
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              公司或组织
              <input
                className={inputBase}
                defaultValue="UrbanTech Studio"
                aria-label="公司或组织"
              />
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              当前阶段
              <select
                className={inputBase}
                aria-label="当前阶段"
                defaultValue="saved"
              >
                <option value="saved">收藏 SAVED</option>
                <option value="submitted">投递 SUBMITTED</option>
                <option value="interview">面试 INTERVIEW</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              岗位链接
              <input
                className={inputBase}
                defaultValue="https://jobs.example/urban-ai-pm"
                aria-label="岗位链接"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <label className="grid gap-2 text-sm text-white/70">
              JD 内容
              <textarea
                className={`${inputBase} min-h-64 resize-none`}
                defaultValue={
                  "负责 AI 产品从需求定义到上线验证，沉淀用户反馈闭环；需要理解 LLM 应用、数据指标和跨团队协作。"
                }
                aria-label="JD 内容"
              />
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              默认主简历
              <textarea
                className={`${inputBase} min-h-64 resize-none`}
                defaultValue={
                  "近 4 年产品经验，负责过 AI 辅助写作、增长实验和 B 端工作台。熟悉用户研究、PRD、指标拆解与迭代复盘。"
                }
                aria-label="默认主简历"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <GlassButton href="/reports/urbantech-match" tone="primary">
              <Sparkles className="size-4" aria-hidden="true" />
              生成匹配分析
            </GlassButton>
            <GlassButton href="/jobs/urbantech-product-manager">
              保存为岗位档案
              <ArrowRight className="size-4" aria-hidden="true" />
            </GlassButton>
          </div>
        </section>

        <aside className={`${panel} p-6`}>
          <SectionTitle title="档案预览" subtitle="AI 输出将沉淀到该岗位" />
          <div className="mt-6 grid gap-4">
            {[
              ["01", "岗位上下文", "标题、公司、链接、阶段与备注"],
              ["02", "匹配分析", "结论、优势、缺口、风险、建议"],
              ["03", "面试事件", "轮次、问题、表现和待补强事项"],
              ["04", "下一步行动", "绑定阶段的 next actions"],
            ].map(([step, title, copy]) => (
              <div
                className="rounded-lg border border-white/20 bg-black/18 p-4"
                key={step}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-md border border-cyan-200/55 bg-cyan-300/12 text-xs font-bold text-cyan-100">
                    {step}
                  </span>
                  <p className="font-semibold">{title}</p>
                </div>
                <p className="mt-2 text-sm text-white/58">{copy}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PrototypeShell>
  );
}

export function JobDossierPreview() {
  return (
    <PrototypeShell
      activeArea="jobs"
      eyebrow="Job dossier"
      title="岗位档案"
      subtitle="UrbanTech Studio"
    >
      <div className="grid gap-5">
        <section className={`${panel} p-6 lg:p-8`}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm text-white/58">AI 产品经理</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white lg:text-4xl">
                UrbanTech Studio · 二面后复盘
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/64">
                该岗位更看重从模糊需求到产品闭环的推进能力。当前风险集中在技术方案表达和项目指标证据。
              </p>
            </div>
            <div className="grid min-w-56 grid-cols-2 overflow-hidden rounded-lg border border-white/24 bg-white/12">
              <div className="border-r border-white/18 p-4">
                <p className="text-xs text-white/52">MATCH</p>
                <p className="mt-1 text-4xl font-black text-cyan-300">82%</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-white/52">STAGE</p>
                <p className="mt-2 rounded-full border border-cyan-200/60 bg-cyan-300/14 px-3 py-1 text-center text-sm text-cyan-50">
                  面试
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr_0.75fr]">
          <section className={`${panel} p-6`}>
            <SectionTitle title="下一步行动" subtitle="Next actions" />
            <div className="mt-5 grid gap-3">
              {[
                "整理 90 秒 Coze 项目复盘",
                "补充 AI 评估指标与失败案例",
                "准备反问：业务闭环与团队节奏",
              ].map((item) => (
                <div
                  className="flex items-center gap-3 rounded-md border border-white/20 bg-black/16 p-3 text-sm"
                  key={item}
                >
                  <CheckCircle2 className="size-4 text-cyan-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <GlassButton href="/feedback" tone="primary">
                <Mic2 className="size-4" />
                录入本轮反馈
              </GlassButton>
            </div>
          </section>

          <section className={`${panel} p-6`}>
            <SectionTitle
              title="AI 分析卷宗"
              subtitle="JD、简历与反馈持续沉淀"
            />
            <div className="mt-5 grid gap-4">
              {[
                [
                  "匹配结论",
                  "产品闭环、用户研究和 B 端工作台经验高度匹配；需要强化 LLM 技术边界表达。",
                ],
                [
                  "关键优势",
                  "有从 0 到 1 项目经验，能讲清需求发现、指标拆解和上线后的验证过程。",
                ],
                [
                  "风险缺口",
                  "JD 对 AI 评估、Prompt 质量控制和跨工程协作要求较高，简历证据仍偏泛。",
                ],
              ].map(([title, copy]) => (
                <article
                  className="rounded-lg border border-white/20 bg-white/10 p-4"
                  key={title}
                >
                  <p className="font-semibold text-cyan-100">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/66">{copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={`${panel} p-6`}>
            <SectionTitle title="时间线" subtitle="Pipeline" />
            <div className="mt-6 grid gap-5">
              {[
                { date: "6 月 20 日", done: true, stage: "收藏" },
                { date: "6 月 22 日", done: true, stage: "投递" },
                { date: "6 月 26 日", done: true, stage: "一面" },
                { date: "等待补录", done: false, stage: "二面反馈" },
              ].map(({ date, done, stage }) => (
                <div className="flex gap-3" key={stage}>
                  <div
                    className={`mt-1 size-3 rounded-full ${
                      done ? "bg-cyan-300" : "border border-white/42"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold">{stage}</p>
                    <p className="text-xs text-white/50">{date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={`${panel} p-6`}>
            <SectionTitle title="JD 摘要" subtitle="Job description" />
            <p className="mt-4 text-sm leading-7 text-white/66">
              负责 AI
              产品需求定义、上线验证、用户反馈闭环与增长实验，需要与算法、工程、运营团队协同推进。
            </p>
          </section>
          <section className={`${panel} p-6`}>
            <SectionTitle title="主简历摘要" subtitle="Default resume" />
            <p className="mt-4 text-sm leading-7 text-white/66">
              近 4 年产品经验，覆盖 AI 辅助写作、B
              端工作台、用户研究、PRD、指标拆解与迭代复盘。
            </p>
          </section>
        </div>
      </div>
    </PrototypeShell>
  );
}

export function FeedbackPreview() {
  return (
    <PrototypeShell
      activeArea="feedback"
      eyebrow="Interview feedback"
      title="录入反馈"
      subtitle="Interview review"
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className={`${panel} p-6 lg:p-8`}>
          <SectionTitle
            title="记录这次面试"
            subtitle="先保存事实，再生成复盘建议"
          />

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-white/70 md:col-span-2">
              关联岗位
              <select
                className={inputBase}
                aria-label="关联岗位"
                defaultValue="urbantech"
              >
                <option value="urbantech">
                  AI 产品经理 · UrbanTech Studio
                </option>
                <option value="jobloop">Growth PM · JobLoop</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              面试轮次
              <select
                className={inputBase}
                aria-label="面试轮次"
                defaultValue="second"
              >
                <option value="first">一面</option>
                <option value="second">二面</option>
                <option value="final">终面</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm text-white/70">
              面试问题与追问
              <textarea
                className={`${inputBase} min-h-56 resize-none`}
                defaultValue={
                  "1. 讲一个你从 0 到 1 推进 AI 功能的项目。\n2. 如何判断 Prompt 质量？\n3. 如果上线后留存没有提升，你会怎么复盘？"
                }
                aria-label="面试问题与追问"
              />
            </label>
            <label className="grid gap-2 text-sm text-white/70">
              我的表现与不确定点
              <textarea
                className={`${inputBase} min-h-56 resize-none`}
                defaultValue={
                  "项目背景讲得清楚，但指标解释偏散；Prompt 质量控制只讲了人工检查，没有提自动评估。对业务指标反问不足。"
                }
                aria-label="我的表现与不确定点"
              />
            </label>
          </div>

          <label className="mt-5 grid gap-2 text-sm text-white/70">
            待补强事项
            <textarea
              className={`${inputBase} min-h-28 resize-none`}
              defaultValue="补一页 AI 质量评估方法；准备失败实验复盘；把 Coze 项目回答压缩到 90 秒。"
              aria-label="待补强事项"
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <GlassButton href="/jobs/urbantech-product-manager">
              保存反馈
            </GlassButton>
            <GlassButton href="/reports/urbantech-match" tone="primary">
              <Sparkles className="size-4" />
              生成复盘建议
            </GlassButton>
          </div>
        </section>

        <aside className={`${panel} p-6`}>
          <SectionTitle title="复盘回流" subtitle="绑定到岗位档案" />
          <div className="mt-6 rounded-lg border border-cyan-200/40 bg-cyan-300/10 p-5">
            <p className="text-sm font-semibold text-cyan-50">本次反馈将更新</p>
            <ul className="mt-4 grid gap-3 text-sm text-white/68">
              <li className="flex gap-3">
                <ClipboardList className="size-4 text-cyan-300" />
                岗位时间线新增“二面反馈”
              </li>
              <li className="flex gap-3">
                <Target className="size-4 text-cyan-300" />
                下一步行动替换为可执行准备项
              </li>
              <li className="flex gap-3">
                <FileText className="size-4 text-cyan-300" />
                生成面试复盘报告
              </li>
            </ul>
          </div>

          <div className="mt-5 grid gap-3">
            {["表现总结", "风险点", "改进方向", "下一轮准备建议"].map(
              (item) => (
                <div
                  className="rounded-md border border-white/20 bg-black/18 px-4 py-3 text-sm"
                  key={item}
                >
                  {item}
                </div>
              ),
            )}
          </div>
        </aside>
      </div>
    </PrototypeShell>
  );
}

export function ReportPreview() {
  return (
    <PrototypeShell
      activeArea="reports"
      eyebrow="Analysis report"
      title="分析报告"
      subtitle="Match report"
    >
      <div className="grid gap-5 lg:grid-cols-[0.75fr_1.45fr]">
        <aside className={`${panel} self-start p-6`}>
          <Link
            className="inline-flex items-center gap-2 text-sm text-white/68"
            href="/jobs/urbantech-product-manager"
          >
            <ArrowLeft className="size-4" />
            返回岗位档案
          </Link>

          <div className="mt-7 rounded-lg border border-cyan-200/50 bg-cyan-300/12 p-5">
            <p className="text-xs text-cyan-100/80">MATCH SCORE</p>
            <p className="mt-2 text-6xl font-black text-cyan-300">82%</p>
            <p className="mt-3 text-sm leading-6 text-white/68">
              高匹配，但需要把 AI 评估、失败复盘和业务指标证据讲得更具体。
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {[
              ["岗位", "AI 产品经理"],
              ["公司", "UrbanTech Studio"],
              ["阶段", "二面后复盘"],
              ["来源", "JD + 简历 + 面试反馈"],
            ].map(([label, value]) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border border-white/18 bg-white/10 px-4 py-3 text-sm"
                key={label}
              >
                <span className="text-white/52">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className={`${panel} p-6 lg:p-8`}>
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/16 pb-6">
            <div>
              <p className="text-sm text-white/56">结构化 AI 输出</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white">
                UrbanTech Studio 匹配分析与复盘建议
              </h1>
            </div>
            <GlassButton href="/feedback" tone="primary">
              更新面试反馈
              <ChevronRight className="size-4" />
            </GlassButton>
          </div>

          <div className="mt-7 grid gap-5">
            {[
              [
                "结论",
                "你与该岗位的核心产品能力高度匹配，尤其是用户问题定义、B 端流程拆解和上线后验证。下一轮应把表达从“我做过”推进到“我如何证明它有效”。",
                BookOpen,
              ],
              [
                "关键优势",
                "Coze Web 项目可以支撑 AI 产品落地经验；增长实验经历能证明你关注指标闭环；跨团队推进经历符合 JD 的协作要求。",
                Building2,
              ],
              [
                "风险缺口",
                "Prompt 质量控制、AI 评估指标和失败实验复盘需要更强证据。面试官可能继续追问工程协作和上线后的真实效果。",
                Layers3,
              ],
              [
                "建议行动",
                "准备 90 秒项目回答、1 个失败案例、1 组评估指标，以及 3 个反问问题；所有材料回填到岗位档案，供下一次复盘继续使用。",
                MessageSquareText,
              ],
            ].map(([title, copy, Icon]) => {
              const ReportIcon = Icon as typeof FileText;
              return (
                <article
                  className="grid gap-4 rounded-lg border border-white/20 bg-white/10 p-5 md:grid-cols-[auto_1fr]"
                  key={title as string}
                >
                  <div className="flex size-11 items-center justify-center rounded-md border border-cyan-200/50 bg-cyan-300/12 text-cyan-100">
                    <ReportIcon className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{title as string}</h2>
                    <p className="mt-2 text-sm leading-7 text-white/68">
                      {copy as string}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-7 rounded-lg border border-white/18 bg-black/18 p-5">
            <p className="text-sm font-semibold text-white">下一步准备清单</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {["90 秒项目复盘", "AI 质量评估指标", "失败实验与改进"].map(
                (item) => (
                  <div
                    className="rounded-md border border-white/18 bg-white/10 px-4 py-3 text-sm text-white/78"
                    key={item}
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </div>
    </PrototypeShell>
  );
}
