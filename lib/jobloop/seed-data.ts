import type { JobLoopState } from "./types";

export const createEmptyJobLoopState = (): JobLoopState => ({
  sourceResumes: [],
  resumeVersions: [],
  jdBatches: [],
  jobs: [],
  analysisResults: [],
  detailAnalyses: [],
  tailoredResumes: [],
  aiOutputs: [],
});

export const sampleSourceResume = `近 4 年产品经验，负责过 AI 辅助写作、B 端工作台和增长实验。
擅长用户研究、需求拆解、PRD、跨团队推进、数据指标复盘和上线后迭代。
曾推动一个 AI 内容生成工具从 0 到 1 上线，负责 Prompt 体验、用户反馈收集和转化漏斗优化。
希望申请 AI 产品经理、增长产品经理和 B 端产品经理方向岗位。`;
