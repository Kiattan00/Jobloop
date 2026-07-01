# JobLoop

JobLoop 是一个面向多岗位投递求职者的反馈式 AI 工作台。它把简历、JD、面试反馈和岗
位进展沉淀为持续更新的岗位档案，并基于这些上下文生成匹配分析、面试复盘与下一步准
备建议。

## 产品目标

本项目当前聚焦 MVP，实现以下核心闭环：

1. 新增岗位
2. 录入 JD 与简历
3. 生成匹配分析
4. 保存岗位档案
5. 录入面试反馈
6. 生成复盘与下一步建议
7. 更新岗位状态

## P0 范围

- 总览仪表盘
- 新增岗位
- 岗位档案页
- 面试反馈录入
- 分析报告页

## P0 AI 能力

- JD 与简历匹配分析
- 结构化信息提取
- 面试反馈复盘
- 下一步准备建议
- 可选的模拟面试问题生成

## 当前不做

- 批量自动投递
- 全网抓取岗位
- 复杂 Agent
- 对所有岗位自动深度分析
- 复杂 Word/PDF 导出
- 公司全量情报研究

## 技术栈

- Next.js App Router
- TypeScript
- Biome
- shadcn/ui
- `lucide-react`
- npm

## 常用命令

```bash
npm run dev
npm run build
npm run format
npm run lint:fix
npm run typecheck
npm run quality
```

## 开发约束

- 所有文档使用中文
- UI 优先复用 shadcn/ui 与主题 token
- 以 MVP 核心路径正确为第一优先级
- 避免过度抽象、防御性编程和无关重构
- 交付前至少完成核心路径人工验证，并通过静态检查
