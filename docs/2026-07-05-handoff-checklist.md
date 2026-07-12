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

### 超时问题（已修复）

- 根因A：OpenAI SDK v6.45.0 默认 `maxRetries: 2`，超时后自动重试 2 次，60s × 3 + 退避 ≈ 180s+，远超前端 fetch 的 90s 超时
- 根因B：`{ timeout }` 参数作为 `create()` 第二参数实际上是生效的（SDK 内部用 `setTimeout(abort)` + `controller.abort()` 实现），但重试导致总耗时被放大
- 修复：
  - [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts)：
    - `getClient()` 新增 `timeout: REQUEST_TIMEOUT_MS` + `maxRetries: 0`，关闭自动重试
    - 新增 `REQUEST_TIMEOUT_MS = 60_000` 常量
    - `requestJson` 中 `{ timeout: 60_000 }` 改为 `{ timeout: REQUEST_TIMEOUT_MS }`
  - [lib/jobloop/server-ai.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai.ts)：
    - 同上同步修改 `getClient()`、`REQUEST_TIMEOUT_MS` 常量、`requestJson` 超时

### 模型切换 & 超时调整（第九轮）

- 模型从 `deepseek/deepseek-v4-flash` 切换到 `openai/gpt-4o-mini`
- 超时从 60s 提高到 120s（`REQUEST_TIMEOUT_MS = 120_000`）
- 修改范围：[lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts) 和 [lib/jobloop/server-ai.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai.ts)
- `npm run typecheck` 通过

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
| 岗位分析超时 | **已修复** | `maxRetries: 0` 关闭自动重试 + 超时 120s，模型切换 gpt-4o-mini |

## 2026-07-09 修复补充（第十轮）

### 模型切换 & 超时调整（续）

- `.env.local` 同步更新：`OPENROUTER_MODEL=openai/gpt-4o-mini`（之前仅修改了代码 DEFAULT_MODEL，但 env 覆盖了代码默认值，导致实际仍用 V4 Flash）
- `buildCompanyResearch` 超时从 `COMPANY_RESEARCH_TIMEOUT_MS`（15s）改为 `REQUEST_TIMEOUT_MS`（120s）
- `buildCompanyResearch` 整体包裹 try/catch，失败时返回 `buildFallbackCompanyResearch()` 降级数据，不再向上抛异常

### 新增独立 enrich 函数

- [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts) 新增两个导出函数：
  - `extractStructuredJdOnly(job)`：调用 `extractStructuredJd`，失败时 fallback 到 `extractStructuredJdQuick`
  - `enrichCompanyOnly(job)`：调用 `buildCompanyResearch`，内部已有 try/catch 降级
- 原有 `enrichJobWithAi` 保留未动，作为备用

### job-enrich route 拆分

- [app/api/ai/job-enrich/route.ts](/C:/Users/admin/Documents/JobLoop/app/api/ai/job-enrich/route.ts) 改为分步调用：
  1. `extractStructuredJdOnly` → 保存到 `job.structuredJd`
  2. `enrichCompanyOnly` → 保存到 `job.companyResearch`
  3. 任何一步失败只标记对应字段为降级数据，不整体失败
- `maxDuration` 从 60 提高到 120

### 前端渐进式状态更新

- [app/analyses/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/page.tsx)：
  - enrich/score 的 AbortController 超时从 90s 提高到 150s
  - 新增渐进式状态：enrich 前 "提取 JD 中..." → enrich 后 "评分中..." → 完成后 "已完成"
  - 失败时显示 "分析失败"，通过 `Promise.allSettled` 不阻塞其他卡片
- [lib/jobloop/types.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/types.ts)：`JobProcessingStatus` 新增 `"extracting_jd"`
- [components/jobloop/job-analysis-card.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/job-analysis-card.tsx)：状态标签更新
  - `extracting_jd: "提取 JD 中..."`、`enriching: "补充公司信息中..."`、`scoring: "评分中..."`、`failed: "分析失败"`
- [components/jobloop/current-analysis-list.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/current-analysis-list.tsx)：同步新增 `extracting_jd: "提取结构化JD"`

### 去重优化

- [lib/jobloop/jd-parser.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/jd-parser.ts)：去重 key 改为 `trim().toLowerCase()`，消除空格和大小写差异

### 当前待验证项汇总

| 问题 | 状态 | 说明 |
|---|---|---|
| 日期行被解析为 JD | 代码已修复，待重启验证 | isNoiseLine + isDateOnlyBlock + MIN_BLOCK_LENGTH 三重过滤 |
| 岗位名识别为"职责" | 代码已修复，待重启验证 | findValue 收紧 + extractJobTitle 二次验证 |
| 402 credits 不足 | 已修复 | max_tokens: 4096 限制 |
| 公司信息联网搜索 | 已修复 | buildCompanyResearch 补 max_tokens: 2048 + try/catch 降级 |
| Unexpected end of JSON input | 已修复 | parseJsonPayload 提取 JSON 对象 + scoreJobWithAi try/catch 兜底 |
| PDF 提取不分段 | 已修复，待重启验证 | Y 坐标分行 + splitBulletLines 分点检测 |
| 岗位分析超时 | **已修复** | `maxRetries: 0` 关闭自动重试 + 超时 150s，模型切换 gpt-4o-mini |
| 重复卡片 | **未解决** | 单个 JD 仍解析出两个相同卡片，去重 `.trim().toLowerCase()` 后依然存在 |
| 分析用时过长 | **未解决** | 卡片处于"评分中"状态 2-3 分钟以上仍未完成，需排查 API 调用延迟或阻塞问题 |
## 2026-07-09 修复补充（第十一轮）

### 单个 JD 出现两张相同卡片的根因

- 根因不在 parser 主流程，而在分析结果持久化。
- [app/analyses/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/page.tsx) 会先写入一条 placeholder result，用于显示 `extracting_jd` / `scoring` 状态。
- `/api/ai/job-score` 返回后，前端又会写入一条新的最终 result。
- 原来的 [lib/jobloop/storage.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/storage.ts) 里，`saveBatchAnalysis` 是按 `result.id` 合并，不是按 `jobId` 合并。
- 这会导致同一个 `jobId` 同时保留两条记录：
- 一条是一直停在 `scoring` 的 placeholder。
- 一条是后写入的 `ready` 或 fallback `ready` 结果。
- 这和用户现场看到的“一张失败/已完成，另一张一直评分中”完全一致。

### 已修复内容

- [lib/jobloop/storage.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/storage.ts)
- 新增 `dedupeAnalysisResults(results)`，按 `jobId` 去重。
- 去重策略：优先保留 `ready` / `failed` 等终态结果；同优先级时再按 `createdAt` 保留更新的一条。
- `normalizeState` 现在会在读取本地 `localStorage` 时自动去重，可顺带清理已有脏数据。
- `saveBatchAnalysis` 改为按 `jobId` 合并，不再因为新旧 `result.id` 不同而留下重复卡片。

### 当前判断

- 这次“两个一模一样标题卡片”的主因已经明确，不是单纯“3007 页面没更新”。
- 前面的 parser 去重修复仍然有价值，但不足以解释这次的现象。
- 这次更核心的是 `analysisResults` 的写回去重逻辑错误。
## 2026-07-09 修复补充（第十二轮）

### 本轮目标
- 深挖并修复 `/api/ai/job-score` 的 `AI 评分失败: Connection error / fetch failed` 问题。
- 目标不是继续拉长超时，而是确认到底是模型慢、接口超时，还是服务端建连实现本身不稳定。

### 本轮定位结论
- 当前问题主因不是“链路太长导致纯超时”。
- 同一份测试数据下：
  - `/api/ai/job-enrich` 可在约 10 秒内成功返回。
  - `/api/ai/job-score` 旧实现会在约 5 秒内快速失败，并进入 fallback。
- 进一步对比发现：
  - PowerShell 直连 OpenRouter 的评分请求可以成功返回。
  - 独立 Node 脚本直连 OpenRouter 的评分请求也可以成功返回。
  - 失败集中发生在 Next.js 路由运行时里的评分请求实现。
- 旧错误链路演进：
  - OpenAI SDK：`Connection error`
  - 改成 route 内 `fetch`：`fetch failed`
  - 改成原生 `https.request` 后暴露出更明确的底层错误：`Client network socket disconnected before secure TLS connection was established`
- 这说明瓶颈更偏向服务端运行时建连稳定性，而不是 OpenRouter 账户、模型、token、prompt 或纯响应时长。

### 已完成修复
- 文件：
  - [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts)
- 修复内容：
  - 移除该文件里普通 JSON 请求对 OpenAI SDK 的依赖，改为自建 `postOpenRouterChatCompletion(...)`。
  - 使用 Node 原生 `https.request` 直连 OpenRouter，避开 Next 路由内不稳定的 SDK / fetch 建连路径。
  - 新增 `IPV4_ONLY_AGENT = new https.Agent({ family: 4, keepAlive: false })`，强制评分链路走 IPv4，规避 TLS 建连前断开的网络问题。
  - 保留原有 trace 打点与 fallback 逻辑，出错时仍可降级，但现在 trace 信息更可定位。

### 本地实测结果
- 最新通过验证端口：
  - `http://localhost:3013`
- 关键接口回归：
  - `/api/ai/job-enrich`
    - 仍可正常返回。
  - `/api/ai/job-score`
    - 已从 fallback 失败恢复为正常评分返回。
    - 基于 `tmp-job-score.json` 的本地直测结果：
      - 用时约 `8.7s`
      - `matchScore = 79`
      - `mainRisk = 薪资信息缺失`
      - 不再出现 `Connection error` / `fetch failed`
- 构建验证：
  - `npm run build` 通过

### 当前判断
- “评分中卡很久 + 最后失败”这个问题，本轮已经定位并修到服务端评分请求实现层。
- 如果你后续在前端页面上仍看到旧的 fallback 卡片或重复卡片，优先怀疑：
  - 打开的不是最新端口实例；
  - 浏览器里残留了历史 `localStorage` 分析结果；
  - 页面仍停留在旧进程（如 3006/3007）的结果视图。

## 2026-07-13 修复补充（第十三轮）

### 本轮目标

- 将“已上传 PDF + 简历来源记录 + AI 分析记录”同步到 Supabase 的轻量增强模式补齐到当前边界。
- 在岗位分析模块新增 URL 识别、图片输入和多模态文字识别能力。
- 按用户标注调整 UI：图片上传按钮放在每个 JD 输入框右侧，原 textarea 支持 URL，保持 JD 输入区和分析结果区整体尺寸不变。

### 已完成内容

- Supabase 同步：
  - [docs/supabase-lite.sql](/C:/Users/admin/Documents/JobLoop/docs/supabase-lite.sql) 增补 `ai_run_logs` 元数据字段：`local_ai_output_id`、`provider`、`source_resume_id`、`resume_version_ids`、`job_ids`、`updated_at`。
  - [lib/jobloop/ai-run-log.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/ai-run-log.ts) 和 [lib/jobloop/supabase-server.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/supabase-server.ts) 支持把 AI 输出来源元数据 upsert 到 Supabase。
  - 注意：本轮没有把完整 `localStorage` 状态搬到 Supabase，仍遵守轻量同步边界。
- 岗位 URL 识别：
  - 新增 [app/api/ai/jd-url/route.ts](/C:/Users/admin/Documents/JobLoop/app/api/ai/jd-url/route.ts)。
  - [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts) 新增 `extractJdFromUrlWithAi(url)`。
  - 识别顺序：服务端直读招聘页面 HTML → 清洗可读文本 → AI 抽取 JD；若不足，再走 OpenRouter `web_search` 兜底。
  - Boss 直聘等平台若因登录/安全验证导致正文不可读，会返回明确提示，要求用户上传截图或粘贴 JD 正文，不编造正文。
- 岗位截图 OCR：
  - 新增 [app/api/ai/jd-image/route.ts](/C:/Users/admin/Documents/JobLoop/app/api/ai/jd-image/route.ts)。
  - [lib/jobloop/server-ai-jobs.ts](/C:/Users/admin/Documents/JobLoop/lib/jobloop/server-ai-jobs.ts) 新增 `extractJdFromImageWithAi(...)`。
  - OCR prompt 已收紧为“严格逐字转写”，只返回 `{ jdText }`，不从截图推断公司名或岗位名，避免杜撰。
- 前端入口：
  - [components/jobloop/jd-batch-input.tsx](/C:/Users/admin/Documents/JobLoop/components/jobloop/jd-batch-input.tsx) 每个 JD 输入行右侧新增图片上传按钮，保留清空按钮。
  - [app/analyses/page.tsx](/C:/Users/admin/Documents/JobLoop/app/analyses/page.tsx) 在分析前识别 URL-only 输入，并将识别出的 JD 写回原输入框后进入原有分析流程。

### 本轮验证

- `npm run typecheck` 通过。
- `npm run build` 通过。
- `npm run quality` 通过；仍有既有 Biome unsafe suggested fixes 警告，未自动改动。
- 功能提交已完成并推送：
  - commit：`ec020fb Add JD URL and image extraction`
  - remote：`origin/main`

### 手动验收建议

1. 打开 `http://localhost:3001/analyses`，在任一 JD 输入框粘贴普通 JD 正文，确认原有批量分析流程不回退。
2. 在单个输入框粘贴 Boss 直聘链接，点击“开始岗位分析”：
   - 若平台页面可读，应自动回填“公司 / 岗位 / 链接 / JD 正文”并继续分析。
   - 若平台限制读取，应显示“请上传岗位截图或粘贴 JD 正文”的明确提示。
3. 点击输入框右侧图片按钮上传岗位截图，确认 textarea 被 OCR 文本替换，且不出现截图中不存在的职责、工具或要求。
4. 上传一份 PDF 简历，刷新页面后确认本地模式仍可查看；Supabase 环境下确认 `resume-pdfs`、`resume_sources`、`ai_run_logs` 有对应记录。

### 当前注意点

- `localhost:3000` 被其他项目占用时，JobLoop 本地页面应使用 `http://localhost:3001/analyses`。
- URL 识别不能绕过招聘平台登录、安全验证或反爬限制；截图 OCR / 粘贴正文是 Boss 链接失败时的推荐兜底。
- OCR 是视觉模型能力，生产环境如需稳定识图，建议设置 `OPENROUTER_VISION_MODEL` 为明确支持 image input 的模型。
