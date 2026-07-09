# JobLoop 交接清单（2026-07-05）

## 本轮目标

1. 支持文本型 PDF 上传、文本提取、生成简历卡片、保留 PDF 查看入口。
2. 给首页、简历库、岗位分析、分析详情补预设示例内容。
3. 把岗位分析从“大同步请求”拆向“单岗位异步 enrich / score”。

## 已完成

### 依赖

- 已安装 `pdf-parse`
- 已修改 [package.json](/C:/Users/admin/Documents/JobLoop/package.json)
- 已修改 [package-lock.json](/C:/Users/admin/Documents/JobLoop/package-lock.json)

### 类型与状态

- 已修改 [lib/jobloop/types.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/types.ts)

已新增：

- `ResumeSourceType`
- `ResumeExtractionStatus`
- `JobProcessingStatus`
- `SourceResume` 的 PDF 相关字段
- `JobJd.processingStatus`
- `JobAnalysisResult.status`

### Demo 数据

- 已修改 [lib/jobloop/seed-data.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/seed-data.ts)

已新增：

- `sampleJdBatchInput`
- `createDemoJobLoopState()`

当前 demo 已覆盖：

- 示例原始简历
- 示例 PDF 简历源
- 示例基础简历版本
- 示例岗位
- 示例分析结果
- 示例详情
- 示例微调简历

### 本地存储

- 已修改 [lib/jobloop/storage.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/storage.ts)

已完成：

- demo fallback 读取
- `hasPersistedJobLoopState()`
- `updateJob(job)`
- `updateAnalysisResult(result)`
- `save*` 方法改为基于真实持久状态写入

### 简历资产辅助

- 已修改 [lib/jobloop/generators.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/generators.ts)

已新增：

- `createImportedResumeAsset(...)`

### PDF 提取后端

- 已新增 [lib/jobloop/pdf-text.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/pdf-text.ts)
- 已新增 [app/api/resumes/upload-pdf/route.ts](/C:/Users/admin/Documents/JobLoop/app/api/resumes/upload-pdf/route.ts)

当前能力：

- 仅支持文本型 PDF
- 返回提取文字、标题、文件名、页数

### 岗位分析服务端拆分

- 已修改 [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts)
- 已新增 [app/api/ai/job-enrich/route.ts](/C:/Users/admin/Documents/JobLoop/app/api/ai/job-enrich/route.ts)
- 已新增 [app/api/ai/job-score/route.ts](/C:/Users/admin/Documents/JobLoop/app/api/ai/job-score/route.ts)

已新增：

- `enrichJobWithAi(job)`
- `scoreJobWithAi(job, resumeVersions)`

### 组件层

- 已修改 [components/jobloop/resume-version-card.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/resume-version-card.tsx)
- 已修改 [components/jobloop/current-analysis-list.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/current-analysis-list.tsx)
- 已修改 [components/jobloop/job-analysis-card.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/job-analysis-card.tsx)

当前已支持：

- 简历来源标签
- PDF 查看入口
- demo 只读提示
- 岗位处理中状态展示

### 简历库页面

- 已修改 [app/resumes/page.tsx](/C:/Users/admin/Documents/JobLoop/app/resumes/page.tsx)

当前意图：

- 同页支持示例内容、文本粘贴、PDF 上传
- 上传后直接沉淀为基础简历卡片

## 未完成

### 最高优先级

1. 验证 [app/resumes/page.tsx](/C:/Users/admin/Documents/JobLoop/app/resumes/page.tsx) 是否通过类型检查并能正常运行
2. 接通 [app/analyses/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/page.tsx) 的单岗位异步分析流程

### 还没改完的页面

- [app/page.tsx](/C:/Users/admin/Documents/JobLoop/app/page.tsx)
  - 待补首页 demo 摘要
- [app/analyses/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/page.tsx)
  - 待切到 `job-enrich` / `job-score`
- [app/analyses/history/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/history/page.tsx)
  - 待补 demo 模式体验
- [app/analyses/[jobId]/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/[jobId]/page.tsx)
  - 待补 demo 详情与未完成态

### 旧链路还没降级完

- [app/api/ai/batch-analysis/route.ts](/C:/Users/admin/Documents/JobLoop/app/api/ai/batch-analysis/route.ts)
- [app/resumes/generate/page.tsx](/C:/Users/admin/Documents/JobLoop/app/resumes/generate/page.tsx)

## 建议按三步推进

### 第一步：把本地原型跑顺

目标：

- 不接 Supabase
- 先把当前前端原型、PDF 提取、demo 数据和异步岗位分析流程跑通

当前状态：

- 已完成代码实现
- 已通过 `npm run quality`

范围：

1. 修正并验证简历库页
2. 改岗位分析页为单岗位异步流程
3. 补首页 demo
4. 补历史页和详情页 demo
5. 跑 `npm run typecheck`
6. 跑 `npm run quality`
7. 做手工回归

### 第二步：补齐异步分析闭环

目标：

- 继续不接 Supabase
- 把 `job-enrich` / `job-score` / `job-detail` / `tailored-resume` 的前后状态流转补完整

当前状态：

- 已完成代码实现
- 已通过 `npm run quality`

范围：

1. 完善岗位卡片阶段状态展示
2. 完善详情页未完成态与失败态
3. 降级旧的 `batch-analysis` 入口
4. 评估并弱化旧的“基础简历生成”主入口

### 第三步：接入 Supabase

目标：

- 将本地 `localStorage` 原型升级成真正线上可恢复的数据层
- 将 PDF 文件与分析结果持久化

范围：

1. 引入 Supabase 数据表与 Storage
2. 将 [lib/jobloop/storage.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/storage.ts) 从本地存储迁移到服务端持久化
3. 将 PDF 预览从本地 data URL 切换到 Storage URL
4. 为异步分析结果提供持久化与恢复能力

## 建议验证清单

### 简历库

- 能看到示例内容
- 能上传文本型 PDF
- 能生成简历卡片
- 能点击“查看 PDF”
- 卡片正文来自提取文字

### 岗位分析

- 输入多个 JD 后先出现标题卡片
- 每张卡片独立经历：
  - `补充信息中`
  - `评分中`
  - `已完成`

### 详情页

- demo 模式下能看到示例详情
- 真实数据模式下只在 ready 后进入详情

## 当前风险

1. [lib/jobloop/server-ai.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai.ts) 和 [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts) 在本轮开始前就是脏文件，接手时要注意区分。
2. PDF 预览当前准备走本地 data URL，只适合原型，不是长期线上文件方案。
3. 还没有执行 `typecheck` 和 `quality`，当前代码不应直接视为可交付完成态。
4. Supabase 明确放在第三步处理，本轮和下一轮默认不接入，以避免在数据结构仍快速变化时过早绑定持久化层。
## 2026-07-06 修复补充

- 已修复岗位详情 `report` 可能返回对象的问题：
- 服务端在 [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts) 增加了结构化 `report` 转纯文本的归一化逻辑。
- 前端详情组件 [components/jobloop/job-analysis-detail.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/job-analysis-detail.tsx) 增加了兜底渲染，避免对象内容直接打坏页面。
- 已重做文本型 PDF 提取实现：
- [lib/jobloop/pdf-text.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/pdf-text.ts) 已切换为 `pdfjs-dist` 文本提取，并显式指定本地 worker 路径。
- 本轮已重新通过：
- `npm run typecheck`
- `npm run build`
- 待下一轮优先手工复验：
- `/api/resumes/upload-pdf` 在线上构建产物下的真实上传结果
- `/api/ai/job-detail` 返回结构化 `report` 时的详情页展示效果
- 2026-07-07 补充：
- `pdf.worker.mjs` 的 `.next/server/chunks` 路径报错已修复。
- 修复方式：在 [lib/jobloop/pdf-text.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/pdf-text.ts) 里预注入 `globalThis.pdfjsWorker`，让 `pdfjs-dist` 的 Node fake worker 直接使用内存中的 `WorkerMessageHandler`，不再走运行时动态 import `./pdf.worker.mjs`。
- 新增类型声明文件 [pdfjs-worker.d.ts](/C:/Users/admin/Documents/JobLoop/pdfjs-worker.d.ts)。
- 复测结果：`/api/resumes/upload-pdf` 已不再报 worker 路径错误；当前 `tmp-demo.pdf` 返回的是 PDF 内容解析错误 `Page dictionary kid reference points to wrong type of object.`，属于测试 PDF 本身问题，不是 worker 装载问题。


## 2026-07-07 修复补充（第二轮）

### 问题1：日期行 "19Jun.2026" 被误解析成单独 JD

- 根因：[lib/jobloop/jd-parser.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/jd-parser.ts) 的 `splitBlocks` 行遍历中，噪声行（日期、空行、分享/举报等）未被过滤，日期行独立成块后触发单独 draft。
- 修复：在 `splitBlocks` 内层行遍历中增加 `if (isNoiseLine(line)) continue;`，跳过所有噪声行。
- 影响：日期行不再单独成块，也不会污染后续块的标题提取。

### 问题2：岗位标题被识别成"职责"

- 根因：`findValue` 用 `startsWith` 匹配 label，当 JD 正文含 "岗位职责：..." 时，`startsWith("岗位")` 为 true，替换后剩下 "职责：..." 作为 jobTitle。
- 修复：收紧 `findValue` 的 labeled 匹配，改用 `new RegExp(`^${label}\s*[:：]`, "i").test(line)`，要求 label 后必须紧跟 `:` 或 `：` 分隔符，避免 "岗位职责" 被当作 "岗位" 字段。
- 影响：`extractJobTitle` 不再被 labeled 分支误捕，会落到 `looksLikeJobTitle` 分支正确识别含 "解决方案" 等 hint 的岗位名。

### 问题3：超时2分钟 + "Cannot read properties of undefined (reading 'companyName')" + 处理失败

- 根因A（undefined错误）：`extractStructuredJd` 假设模型返回 `{structuredJd: {...}}`，但模型可能返回扁平 `{companyName, jobTitle, ...}`，此时 `data.structuredJd` 为 undefined 导致崩溃。
- 根因B（超时）：`requestJson` 的 OpenAI client 调用无显式超时；前端 fetch 也无超时。
- 修复：
  - [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts)：
    - `extractStructuredJd`：优先取 `data.structuredJd`、次取扁平 `data`（含 `companyName` 字段）、最终 fallback 到 `extractStructuredJdQuick(job)`。
    - `enrichJobWithAi` / `generateBatchAnalysisWithAi`：将 `extractStructuredJd` 调用包进 try/catch，失败时 fallback 到 quick 提取，保证 enrich 流程不因模型返回格式偏差而整体失败。
    - `requestJson`：给 `client.chat.completions.create` 加 `{ timeout: 30_000 }`。
  - [app/analyses/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/page.tsx)：
    - `job-enrich` 和 `job-score` 的 fetch 各加 `AbortController` + 90 秒超时。
    - 超时错误给出明确提示 "岗位分析超时，请稍后重试该批次。"
  - [components/jobloop/current-analysis-list.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/current-analysis-list.tsx)：
    - failed 状态下不再显示 "未匹配到简历版本"，改为显示 "分析失败，可稍后重试该批次"。

### 本轮待验证

- `npm run typecheck` 通过
- 手动复验：在 http://localhost:3007 测试 JD 解析、岗位标题识别、enrich/score 超时和兜底逻辑


## 2026-07-07 修复补充（第三轮）

### 问题1（续）：日期行仍被解析成单独 JD

- 在 [lib/jobloop/jd-parser.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/jd-parser.ts) 增加双重防护：
  - `splitBlocks` 内层行遍历中 `isNoiseLine(line)` 跳过噪声行（第一轮已加）
  - `parseJdBatchText` 新增 `isDateOnlyBlock` 过滤，若 block 仅含一行日期则直接丢弃
- 注意：若修改后仍出现日期块，请确认 dev server 已重启（Next.js 对 `lib/` 目录变更不自动热更新）

### 问题2（续）：岗位名被识别为"职责"

- 根因：`findValue` 虽已收紧为要求 `:` 或 `：` 分隔符，但若 JD 中有 "岗位：职责" 这种行，仍会匹配并返回 "职责"。
- 修复：在 [lib/jobloop/jd-parser.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/jd-parser.ts) 的 `extractJobTitle` 中，对 `labeled` 结果做二次验证——若提取值包含 `JD_BODY_HINTS` 或 `RECRUITER_HINTS` 中的词（如"职责""要求"等），或长度不足 2，则拒绝并 fallback 到 `looksLikeJobTitle`。

### 问题3：402 credits 不足

- 根因：`requestJson` 调用 OpenAI client 时未设 `max_tokens`，默认请求模型最大 token 数（16000），超出用户 OpenRouter 余额（12666）。
- 修复：在 [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts) 的 `client.chat.completions.create` 中增加 `max_tokens: 4096`。

### 本轮验证

- `npm run typecheck` 通过
- 待手工复验：在 http://localhost:3007 重启 dev server 后，测试 JD 解析、岗位标题识别、评分流程

## 2026-07-07 修复补充（第四轮）

### PDF 提取不分段

- 根因：[lib/jobloop/pdf-text.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/pdf-text.ts) 中 `textContent.items` 直接用 `.join(" ")` 拼接，所有文字 item 被连成一段，丢失换行和段落结构。
- 修复：新增 `buildLinesFromItems` 函数，利用 pdfjs-dist 每个 text item 的 `transform` 坐标：
  - 按 Y 坐标（`transform[5]`）分组为行，容差 2px
  - 行内按 X 坐标（`transform[4]`）排序后空格拼接
  - 行按 Y 从大到小排序（PDF 坐标系顶部 Y 值大）
  - 段落检测：计算行间距中位数，间距超过中位数 1.6 倍时插入空行作为段落分隔
- 移除了旧的 `normalizePdfText` 函数，不再需要后处理去空行。
- `npm run typecheck` 通过
## 2026-07-07 修复补充（第五轮）

### PDF 提取不分段（续）

- 问题：第四轮的 Y 坐标分行策略对该 PDF 几乎没生效，因为 pdfjs-dist 返回的 text item 的 Y 坐标差异极小，导致所有文字被拼成一行，分点符号也未分离。
- 修复：在 lib/jobloop/pdf-text.ts 增加内容层面的分点检测：
  - 新增 splitBulletLines 函数，在 Y 坐标分行之后做后处理
  - BULLET_PATTERN：匹配常见项目符号（圆点、菱形、三角等），在其前插入换行
  - NUMBERED_PATTERN：匹配 1. 2) 等编号项，在其前插入换行
  - DASH_BULLET：匹配短横线分点（至少 2 个空格，避免误伤日期范围）
  - Y 容差从 2 降到 1，不再对 Y 坐标做 Math.round，保留原始浮点值
  - 段落间距比率从 1.6 调到 1.8
- npm run typecheck 通过

## 2026-07-07 修复补充（第六轮）

### 模型确认

- 当前调用模型：`OPENROUTER_MODEL=deepseek/deepseek-chat`（即 DeepSeek V3），定义在 `.env.local`
- 代码默认值是 `deepseek/deepseek-v4-flash`，但被 env 覆盖
- 若要切 V4，改 `.env.local` 中 `OPENROUTER_MODEL` 为 `deepseek/deepseek-v4-flash`

### 日期解析 & 重复卡片（续）

- 在 lib/jobloop/jd-parser.ts 的 parseJdBatchText 增加两层防护：
  - `MIN_BLOCK_LENGTH = 30`：过滤掉长度不足 30 字符的 block（日期行过滤兜底）
  - 去重：按 `companyName + jobTitle` 去重，防止相同 JD 被解析为多张卡片
- 注意：lib/ 目录变更 Next.js 不会热更新，务必重启 dev server

### 公司信息联网搜索

- 根因：buildCompanyResearch 的 OpenRouter 调用未设 max_tokens，可能触发 402 导致联网搜索失败
- 修复：在 lib/jobloop/server-ai-jobs.ts 的 buildCompanyResearch 中增加 `max_tokens: 2048`
- npm run typecheck 通过

## 2026-07-07 修复补充（第七轮）

### "Unexpected end of JSON input" 错误

- 根因：lib/jobloop/server-ai-jobs.ts 的 parseJsonPayload 只处理 markdown 代码块，但模型返回的 JSON 外部可能带额外文字（如 `{...json...}\n\n备注...`），导致 JSON.parse 失败。
- 修复：
  - parseJsonPayload：先尝试直接解析；失败时通过 firstIndexOf("{") + lastIndexOf("}") 提取 JSON 对象再解析
  - scoreJobWithAi：包裹 try/catch，失败时调用 buildFallbackScoreResult 返回兜底评分结果，卡片显示 "AI 评分暂时不可用" 而非白屏崩溃
- npm run typecheck 通过

## 2026-07-07 修复补充（第八轮）

### 模型切换 & 超时优化

- 模型从 deepseek/deepseek-chat（V3）切换到 deepseek/deepseek-v4-flash（.env.local 中 OPENROUTER_MODEL）
- requestJson 超时从 30s 提高到 60s（lib/jobloop/server-ai-jobs.ts + lib/jobloop/server-ai.ts）
- COMPANY_RESEARCH_TIMEOUT_MS 从 8s 提高到 15s
- server-ai.ts 的 requestJson 补了 max_tokens: 4096 + timeout: 60_000（之前缺失）

### 超时问题（未解决）

- 切换 V4 Flash + 60s 超时后，岗位分析仍然超时失败
- 前端 AbortController 设 90s，后端 requestJson 设 60s，但 client.chat.completions.create 的 { timeout: 60_000 } 参数可能未被 OpenAI SDK 正确识别
- 可能原因：
  1. OpenAI SDK 的 create() 第二个参数 { timeout } 仅在特定版本支持，当前版本可能不生效
  2. OpenRouter 代理层延迟高，60s 仍不够
  3. 网络环境导致请求卡住
- 建议后续排查：
  1. 确认 OpenAI SDK 版本及 timeout 参数是否生效
  2. 在 getClient() 中设置全局 timeout 而非 per-request
  3. 考虑使用 AbortController 在服务端也加超时兜底
  4. 检查 OpenRouter API 可用性及延迟

### 当前待验证项汇总

| 问题 | 状态 | 说明 |
|---|---|---|
| 日期行被解析为 JD | 代码已修复，待重启验证 | isNoiseLine + isDateOnlyBlock + MIN_BLOCK_LENGTH 三重过滤 |
| 岗位名识别为"职责" | 代码已修复，待重启验证 | findValue 收紧 + extractJobTitle 二次验证 |
| 402 credits 不足 | 已修复 | max_tokens: 4096 限制 |
| 公司信息联网搜索 | 已修复 | buildCompanyResearch 补 max_tokens: 2048 |
| Unexpected end of JSON input | 已修复 | parseJsonPayload 提取 JSON 对象 + scoreJobWithAi try/catch 兜底 |
| PDF 提取不分段 | 已修复，待重启验证 | Y 坐标分行 + splitBulletLines 分点检测 |
| 重复卡片 | 已修复，待重启验证 | MIN_BLOCK_LENGTH 过滤 + 按 companyName/jobTitle 去重 |
| 岗位分析超时 | **未解决** | V4 Flash + 60s 超时仍失败，需排查 SDK timeout 参数是否生效 |
