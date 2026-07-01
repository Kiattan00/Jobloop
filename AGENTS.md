# 开发说明

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
- 避免提交无关重构和生成物；`.next`、`node_modules` 等目录不入库。
