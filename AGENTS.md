# 开发说明

- 当前产品定位：JobLoop 是一个多版本简历生成、岗位匹配与投递决策工作台，P0 聚焦“原始简历 -> 基础简历版本 -> 批量 JD 分析 -> 单岗位投递建议”。
- 开发原则以 [`./.specify/memory/constitution.md`](./.specify/memory/constitution.md) 为准；如与其他说明冲突，优先遵循该宪章。
- 本项目是 Next.js App Router + TypeScript + Biome + shadcn/ui 项目，使用 npm。
- 常用命令：`npm run dev`、`npm run build`、`npm run format`、`npm run lint:fix`、`npm run typecheck`、`npm run quality`。
- 提交前 hook 会自动执行 `npm run quality`：格式化、Biome safe fix、TypeScript 检查，并重新暂存修复后的文件。
- 无需关注 `npm audit` 输出。

# 文档查询

- 需要查询外部文档时，优先使用本地 skill。
- 若缺失对应 skill，再使用 Context7；常用库走 Context7 时，把 library id 记录在本文档。
- Context7 已使用的 library id：`/vercel/next.js`。
- 本地 skill 和 Context7 都没有结果时，再使用网络搜索。

# 代码约定

- 文档均使用中文。
- UI 优先复用 shadcn/ui 组件和主题 token，图标使用 `lucide-react`。
- 产品范围优先围绕简历版本生成、批量 JD 分析、推荐简历版本、是否值得投、微调建议、打招呼话术和面试准备建议。
- 不要把旧版“岗位档案 / 面试反馈 / 求职 CRM 闭环”默认当作当前需求；只有规格明确要求时才实现。
- 避免提交无关重构和生成物；`.next`、`node_modules` 等目录不入库。
