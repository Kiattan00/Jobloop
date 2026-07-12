# AI_HANDOFF — JobLoop

## 项目标识

- 目录名：JobLoop
- 名称大小写固定为：JobLoop

## 当前产品定位

JobLoop 是一个多版本简历生成、岗位匹配与投递决策工作台。用户上传或粘贴一份原始简历后，AI 生成 2-3 个面向不同岗位方向的基础简历版本；用户批量粘贴 JD 后，系统判断每个岗位推荐哪版简历、是否值得投、是否需要微调，并生成打招呼话术和投递前面试准备建议。

当前 P0 已从早期求职过程管理方向收敛为“投递前决策工作台”。当前实现已完成到 `specs/001-jobloop-p0/tasks.md` 的主路径收尾：简历库、基础简历生成、岗位分析工作台、单岗位详情、公司补充信息、岗位微调和 AI 输出追溯都已接入本地持久化；同时支持轻量 Supabase 增强模式，用于同步原始 PDF、简历来源记录和 AI 调用日志。

## 核心路径

1. 录入原始简历
2. AI 生成 2-3 个基础简历版本
3. 用户确认并保存基础简历版本到简历库
4. 批量粘贴多个 JD，或输入岗位 URL / 上传岗位截图识别 JD
5. 为每个 JD 补充可选公司信息
6. AI 分别生成岗位分析总览
7. 用户进入单岗位详情查看完整分析
8. AI 生成打招呼话术、面试准备建议和岗位微调建议或微调版简历

## P0 页面

1. 首页入口：`/`
2. 简历库：`/resumes`
3. 基础简历生成页：`/resumes/generate`
4. 岗位分析工作台：`/analyses`
5. 单岗位分析详情页：`/analyses/[jobId]`

旧过程稿路由已改为新版 P0 导向：

1. `/jobs/new` → `/jd-batch`
2. `/jobs/urbantech-product-manager` → `/analyses`
3. `/feedback` → `/resumes`
4. `/reports/urbantech-match` → `/analyses`

## P0 LLM 调用

1. 基础简历版本生成：`/api/ai/resume-versions`
2. 岗位分析工作台中的 JD 匹配分析：`/api/ai/batch-analysis`
3. 单岗位完整分析：`/api/ai/job-detail`
4. 岗位微调简历：`/api/ai/tailored-resume`
5. 单岗位结构化补充：`/api/ai/job-enrich`
6. 单岗位评分：`/api/ai/job-score`
7. 岗位链接识别：`/api/ai/jd-url`
8. 岗位截图 OCR：`/api/ai/jd-image`

当前实现已接入 OpenRouter 的 OpenAI-compatible 服务端调用；模型通过环境变量配置。普通文本模型默认值为 `openai/gpt-4o-mini`，截图 OCR 可通过 `OPENROUTER_VISION_MODEL` 单独覆盖，否则复用 `OPENROUTER_MODEL`。

## P0 数据实体

1. 原始简历
2. 基础简历版本
3. 批量 JD 输入
4. 岗位 JD
5. 公司补充信息
6. 岗位分析结果
7. 单岗位完整分析
8. 岗位微调版
9. AI 输出

## 明确不在范围内

- 完整公司全量情报研究、招聘平台搜索结果可信度判断或自动化情报审计
- Chrome 插件或招聘网站自动抓取
- 批量自动投递
- 完整求职 CRM 状态流转
- 面试后反馈录入和复盘闭环
- 复杂 Word/PDF 排版导出
- 多个 JD 的完整分析同时铺满一个页面
- AI 自动覆盖用户已经确认保存的简历版本

## 公司信息与链接策略

P0 保留“公司补充信息，可选”输入框，让用户手动粘贴公司背景、风评、融资、团队或岗位真实性线索。当前服务端会尝试用 OpenRouter web search 做公司补充信息和岗位 URL 识别，但核心分析必须能在搜索失败时降级完成。

岗位分析页当前支持：

1. 直接粘贴 JD 正文。
2. 在原输入框中粘贴单个 http/https 岗位链接，分析前自动调用 `/api/ai/jd-url` 识别。
3. 点击输入框右侧图片按钮上传岗位截图，调用 `/api/ai/jd-image` 做严格 OCR。

Boss 直聘等招聘平台存在登录、安全验证和反爬限制。`/api/ai/jd-url` 会先尝试服务端直读页面文本，再使用 OpenRouter web search 兜底；若仍无法拿到足够正文，应提示用户上传岗位截图或直接粘贴 JD 正文，不要编造不可见内容。

P1 可以再讨论搜索 API、浏览器插件或招聘网站保存入口。

## 视觉交接

当前已有一版前端过程稿，包含 Dashboard、岗位档案、反馈、报告等旧页面。这些页面不再代表新版 P0 的信息架构，但其视觉方向需要保留：

- 图书馆背景
- 半透明玻璃界面
- 黑白灰主体
- 青色状态强调
- 顶部品牌与导航
- 工作台气质，而不是营销页或聊天机器人首屏

视觉风格说明见：`docs/JOBLOOP_VISUAL_STYLE.md`

旧过程稿参考：

- `components/jobloop-prototype.tsx`
- `app/globals.css`
- `screenshots/`
- `docs/dashboard image.png`

## 产品原则

P0 必须帮助用户完成投递前决策，而不是生成一次性 AI 文本。每一条 AI 输出都必须能追溯到来源简历、JD、公司补充信息或岗位分析结果，并帮助用户判断下一步怎么投、用哪版简历、是否需要微调。

## 建议实现顺序

1. 依据 `specs/001-jobloop-p0/spec.md` 生成 plan
2. 建立原始简历、基础简历版本、JD、岗位分析和 AI 输出的数据模型
3. 完成简历库与基础简历生成流程
4. 完成批量 JD 输入与岗位分析总览
5. 完成单岗位分析详情
6. 完成岗位微调建议或微调版简历
7. 按 `docs/JOBLOOP_VISUAL_STYLE.md` 拆分可复用视觉组件

## 宪章状态

`.specify/memory/constitution.md` 已同步到 2.0.0，P0 边界与当前规格一致：简历版本库优先、批量岗位决策优先、推荐可追溯与用户控制。

## 验证清单

- 录入一份原始简历
- 生成 2-3 个基础简历版本
- 保存至少一个基础简历版本
- 批量粘贴至少 3 个 JD
- 单个输入框粘贴岗位 URL，触发识别后再分析
- 单个输入框上传岗位截图，确认 OCR 文字不补写不可见内容
- 生成岗位分析总览
- 从岗位卡片进入单岗位详情
- 生成打招呼话术、面试准备建议和岗位微调建议
- 刷新后确认简历版本、JD、分析结果和微调内容仍然存在

## 当前实现备注

- 本地模式仍使用浏览器 `localStorage`，键名为 `jobloop:p0-state`。
- Supabase 增强模式只同步必要数据：`resume-pdfs` bucket 中的原始 PDF、`resume_sources` 表中的简历来源记录、`ai_run_logs` 表中的 AI 调用日志及其来源元数据。
- 若未配置 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，必须保持本地模式可正常运行。
- 批量 JD 解析支持空行、`---` 或 `###` 分隔。
- 公司信息是可选输入；公司补充和 URL 识别均允许降级，不应阻塞用户手动粘贴 JD 的主流程。
- 一级导航只保留：入口、简历库、岗位分析。
- 生成简历页和单岗位详情页改为二级页面，通过返回键回到母页面。
- 旧 Dashboard/岗位档案/反馈/报告组件仍可作为视觉参考，但不再作为 P0 信息架构来源。

## 最近提交

- `ec020fb`：新增岗位 URL 识别、岗位截图 OCR、多模态文字识别入口；补充 Supabase AI 日志来源元数据；已推送到 `origin/main`。
