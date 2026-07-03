# 任务列表：JobLoop P0 多版本简历匹配与投递决策工作台

**输入**：来自 `specs/001-jobloop-p0/` 的设计文档

**前置条件**：`plan.md`、`spec.md`、`research.md`、`data-model.md`、`contracts/ui-ai-contracts.md`、`quickstart.md`

**测试说明**：规格未要求 TDD 或自动化测试，本任务清单默认不新增测试任务；通过人工核心路径验证、浏览器烟测和 `npm run quality` 收口。

**组织原则**：任务按用户故事分组，保证每条故事都可以独立实现、独立验收。旧过程稿页面只作为视觉参考，最终页面结构以新版 P0 为准。

## Phase 1：初始化与共享准备

**目标**：建立新版 P0 所需的目录、页面入口和视觉基础，避免继续被旧原型页面结构牵引。

- [X] T001 创建新版 P0 页面目录骨架于 `app/resumes/`、`app/resumes/generate/`、`app/jd-batch/`、`app/analyses/`、`app/analyses/[jobId]/`
- [X] T002 创建 JobLoop 业务组件目录骨架于 `components/jobloop/`
- [X] T003 [P] 创建 JobLoop 领域逻辑目录骨架于 `lib/jobloop/`
- [X] T004 [P] 将 `docs/JOBLOOP_VISUAL_STYLE.md` 中的玻璃面板、青色强调、背景蒙版等设计 token 映射到 `app/globals.css`
- [X] T005 更新新版 P0 入口导航和页面链接于 `app/page.tsx`
- [X] T006 标注旧过程稿组件仅作为视觉参考于 `components/jobloop-prototype.tsx`

---

## Phase 2：基础阻塞项

**目标**：完成所有用户故事共享的数据类型、持久化边界、生成函数边界和布局基础。

- [X] T007 创建原始简历、基础简历版本、批量 JD、岗位 JD、岗位分析、单岗位完整分析、岗位微调版和 AI 输出类型于 `lib/jobloop/types.ts`
- [X] T008 创建轻量持久化读写入口，支持刷新恢复所有 P0 实体于 `lib/jobloop/storage.ts`
- [X] T009 [P] 创建演示种子数据和空状态数据工厂于 `lib/jobloop/seed-data.ts`
- [X] T010 创建基础简历生成、批量 JD 分析、单岗位完整分析和岗位微调的生成函数入口于 `lib/jobloop/generators.ts`
- [X] T011 [P] 创建新版 P0 路由常量与导航配置于 `lib/jobloop/routes.ts`
- [X] T012 创建共用 JobLoop 页面外壳组件于 `components/jobloop/jobloop-shell.tsx`
- [X] T013 [P] 创建共用玻璃面板组件于 `components/jobloop/glass-panel.tsx`
- [X] T014 创建共用页面标题、主操作区和空状态组件于 `components/jobloop/page-chrome.tsx`

**检查点**：完成后，后续故事可以复用统一类型、存储、生成入口、视觉外壳和导航。

---

## Phase 3：用户故事 1 - 从原始简历生成基础版本（优先级：P1）

**目标**：用户粘贴原始简历后，生成 2-3 个基础简历版本草稿，并确认保存到简历库。

**独立验收方式**：进入基础简历生成页，粘贴一份原始简历，生成 2-3 个版本草稿，保存至少一个版本后在简历库看到该版本。

- [X] T015 [P] [US1] 实现基础简历生成页面于 `app/resumes/generate/page.tsx`
- [X] T016 [P] [US1] 实现原始简历输入表单组件于 `components/jobloop/resume-source-form.tsx`
- [X] T017 [P] [US1] 实现基础简历草稿卡片组件于 `components/jobloop/resume-version-draft-card.tsx`
- [X] T018 [US1] 实现 `generateBaseResumeVersions` 生成 2-3 个基础简历版本草稿于 `lib/jobloop/generators.ts`
- [X] T019 [US1] 实现用户确认保存草稿为 `saved` 简历版本的流程于 `components/jobloop/resume-version-confirmation.tsx`
- [X] T020 [P] [US1] 实现简历库页面，展示已保存基础简历版本于 `app/resumes/page.tsx`
- [X] T021 [P] [US1] 实现基础简历版本卡片，展示名称、适用方向、改写重点和操作入口于 `components/jobloop/resume-version-card.tsx`
- [X] T022 [US1] 串联基础简历生成页保存动作与简历库刷新恢复于 `app/resumes/generate/page.tsx`

**检查点**：US1 可以单独演示，且不依赖批量 JD、岗位分析或微调能力。

---

## Phase 4：用户故事 2 - 批量粘贴 JD 并生成分析总览（优先级：P2）

**目标**：用户批量粘贴多个 JD，系统独立解析并生成可比较的岗位分析总览。

**独立验收方式**：已有至少一个基础简历版本时，粘贴至少 3 个 JD，生成总览页，并能看到每个岗位的推荐简历、匹配分、是否值得投、是否需要微调和主要风险。

- [X] T023 [P] [US2] 实现批量 JD 输入页面于 `app/jd-batch/page.tsx`
- [X] T024 [P] [US2] 实现批量 JD 文本输入组件于 `components/jobloop/jd-batch-input.tsx`
- [X] T025 [P] [US2] 实现 JD 批量解析函数，识别岗位名、公司、链接和正文于 `lib/jobloop/jd-parser.ts`
- [X] T026 [P] [US2] 实现可编辑解析结果列表组件于 `components/jobloop/parsed-job-list.tsx`
- [X] T027 [US2] 实现 `generateBatchAnalysis`，基于岗位 JD 与简历版本生成决策级岗位分析结果于 `lib/jobloop/generators.ts`
- [X] T028 [P] [US2] 实现岗位分析总览页面于 `app/analyses/page.tsx`
- [X] T029 [P] [US2] 实现岗位分析卡片或表格行组件于 `components/jobloop/job-analysis-card.tsx`
- [X] T030 [US2] 串联批量 JD 输入提交、岗位分析结果保存和跳转总览页于 `app/jd-batch/page.tsx`

**检查点**：US2 与 US1 组合后可完成“简历版本 -> 批量 JD -> 分析总览”的投递前筛选路径。

---

## Phase 5：用户故事 3 - 查看单岗位完整分析并生成微调简历（优先级：P3）

**目标**：用户从总览进入单岗位详情，查看完整分析、话术、面试准备建议，并生成岗位微调建议或微调版简历。

**独立验收方式**：从任一岗位分析卡片进入详情页，能看到完整分析，触发微调后看到来源岗位和来源基础简历版本。

- [X] T031 [P] [US3] 实现单岗位分析详情页面于 `app/analyses/[jobId]/page.tsx`
- [X] T032 [P] [US3] 实现单岗位完整分析展示组件于 `components/jobloop/job-analysis-detail.tsx`
- [X] T033 [US3] 实现 `generateJobDetailAnalysis`，生成结论、优势、风险、行动、话术和面试准备建议于 `lib/jobloop/generators.ts`
- [X] T034 [P] [US3] 实现打招呼话术与面试建议分区组件于 `components/jobloop/action-advice-panels.tsx`
- [X] T035 [P] [US3] 实现岗位微调生成函数，绑定来源岗位与来源基础简历版本于 `lib/jobloop/tailoring.ts`
- [X] T036 [P] [US3] 实现岗位微调建议或微调版简历展示组件于 `components/jobloop/tailored-resume-panel.tsx`
- [X] T037 [US3] 串联详情页查看、返回总览和生成微调动作于 `app/analyses/[jobId]/page.tsx`

**检查点**：US3 可以从已有岗位分析结果独立验收，且不会覆盖基础简历版本。

---

## Phase 6：用户故事 4 - 补充公司信息但不强依赖联网搜索（优先级：P4）

**目标**：用户可手动补充公司信息，系统将其纳入分析上下文；联网能力只作为 Beta / Coming soon 占位。

**独立验收方式**：在批量 JD 或单岗位详情中填写公司补充信息，分析仍可生成；未填写公司信息时不阻塞；页面展示联网补充占位且不出现真实搜索结果。

- [X] T038 [P] [US4] 实现公司补充信息面板和联网占位入口于 `components/jobloop/company-info-panel.tsx`
- [X] T039 [US4] 将公司补充信息面板接入批量 JD 输入流程于 `app/jd-batch/page.tsx`
- [X] T040 [US4] 将公司补充信息展示与编辑入口接入单岗位详情页于 `app/analyses/[jobId]/page.tsx`
- [X] T041 [US4] 确保批量分析和单岗位分析读取 `companyInfo` 但不依赖联网搜索于 `lib/jobloop/generators.ts`
- [X] T042 [US4] 为未填写公司补充信息的岗位补充非阻塞提示文案于 `components/jobloop/company-info-panel.tsx`

**检查点**：US4 可以证明公司信息增强链路存在，同时 P0 没有真实联网搜索依赖。

---

## Phase 7：用户故事 5 - 管理简历版本与分析结果（优先级：P5）

**目标**：用户能管理简历版本、查看历史分析与微调内容，并在刷新后恢复关键数据。

**独立验收方式**：保存简历版本、完成批量分析、生成岗位微调后刷新页面，仍能在简历库、总览和详情页找回内容。

- [X] T043 [US5] 完善 `storage.ts` 中原始简历、基础简历版本、岗位 JD、分析结果、完整分析、微调版和 AI 输出的读写方法于 `lib/jobloop/storage.ts`
- [X] T044 [P] [US5] 实现简历版本查看、编辑、复制、下载操作组件于 `components/jobloop/resume-version-actions.tsx`
- [X] T045 [P] [US5] 实现分析历史列表组件于 `components/jobloop/analysis-history.tsx`
- [X] T046 [US5] 在简历库页面接入简历版本管理和微调版列表于 `app/resumes/page.tsx`
- [X] T047 [US5] 在岗位分析总览页接入历史批次与刷新恢复逻辑于 `app/analyses/page.tsx`
- [X] T048 [P] [US5] 实现 AI 输出追溯展示组件于 `components/jobloop/ai-output-trace.tsx`
- [X] T049 [US5] 在单岗位详情页展示来源简历、来源 JD、公司补充信息和 AI 输出追溯于 `app/analyses/[jobId]/page.tsx`

**检查点**：US5 完成后，P0 的主要数据都能恢复、追溯和再次使用。

---

## 最终收尾与共性事项

- [X] T050 将旧原型路由改为新版 P0 导航或占位说明于 `app/jobs/new/page.tsx`、`app/jobs/urbantech-product-manager/page.tsx`、`app/feedback/page.tsx`、`app/reports/urbantech-match/page.tsx`
- [X] T051 统一新版页面的玻璃面板、按钮、青色强调和响应式间距于 `app/globals.css`
- [X] T052 更新实现后的开发交接说明于 `docs/AI_HANDOFF.md`
- [X] T053 更新验证说明和当前页面路径于 `specs/001-jobloop-p0/quickstart.md`
- [X] T054 按 quickstart 执行人工核心路径验证并记录结果于 `specs/001-jobloop-p0/quickstart.md`
- [X] T055 运行 `npm run quality` 并根据结果修复相关文件，命令定义见 `package.json`

---

## 依赖与执行顺序

- Phase 1 必须先完成，用于建立目录、入口和视觉基础。
- Phase 2 是所有用户故事的阻塞项，必须在 US1 前完成。
- US1 是 MVP，完成后即可单独演示“原始简历 -> 基础简历版本 -> 简历库”。
- US2 依赖 US1 至少有一个基础简历版本。
- US3 依赖 US2 已产生岗位分析结果。
- US4 可在 US2 后并行推进，也可在 US3 前后补齐。
- US5 依赖 US1-US3 的核心实体与页面已存在。
- 最终收尾必须在所有用户故事完成后执行。

## 并行执行示例

### Phase 1 可并行

- T003 可与 T004 并行，因为分别处理 `lib/jobloop/` 和 `app/globals.css`。

### Phase 2 可并行

- T009、T011、T013 可并行，因为分别处理 `lib/jobloop/seed-data.ts`、`lib/jobloop/routes.ts`、`components/jobloop/glass-panel.tsx`。

### US1 可并行

- T015、T016、T017、T020、T021 可并行，分别处理页面、表单、草稿卡、简历库和版本卡组件。

### US2 可并行

- T023、T024、T025、T026、T028、T029 可并行，分别处理输入页、输入组件、解析函数、解析列表、总览页和分析卡。

### US3 可并行

- T031、T032、T034、T035、T036 可并行，分别处理详情页、详情组件、建议面板、微调函数和微调展示。

### US4 可并行

- T038 可先独立实现，随后 T039 和 T040 可并行接入不同页面。

### US5 可并行

- T044、T045、T048 可并行，分别处理简历操作、历史列表和 AI 输出追溯组件。

## 实施策略

### MVP 优先

1. 完成 Phase 1 和 Phase 2。
2. 完成 US1，先验证用户能从原始简历生成并保存基础简历版本。
3. 完成 US2，验证批量 JD 分析总览能形成投递优先级判断。
4. 完成 US3，补齐单岗位行动建议和岗位微调。
5. 完成 US4 和 US5，增强公司信息与可恢复、可追溯能力。

### 质量门槛

- 每个用户故事完成后按对应“独立验收方式”手动检查。
- 任务完成前不引入真实联网搜索、自动投递、旧求职 CRM 状态流转或面试后复盘。
- 收尾阶段必须执行 `npm run quality`，并在交付说明中记录是否通过。
