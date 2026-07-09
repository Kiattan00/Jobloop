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

export const sampleJdBatchInput = `公司：LoopAI
岗位：AI 产品经理
链接：https://example.com/jobs/loopai-pm
JD：负责 AI 工作台与业务流程产品规划，推进需求分析、原型设计、跨团队协同与上线迭代。需要 3 年以上 B 端或 AI 产品经验，熟悉数据分析与用户调研。

---

公司：星流科技
岗位：增长产品经理
链接：https://example.com/jobs/xingliu-growth
JD：负责用户增长、转化漏斗优化、活动实验与数据复盘。要求具备增长策略、数据指标体系与跨团队推进能力。`;

const demoTimestamp = "2026-07-05T09:30:00.000Z";

export function createDemoJobLoopState(): JobLoopState {
  return {
    sourceResumes: [
      {
        id: "demo-source-pasted",
        title: "AI 产品经理原始简历",
        content: sampleSourceResume,
        targetIntent: "AI 产品经理",
        sourceType: "pasted",
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      {
        id: "demo-source-pdf",
        title: "产品运营原始简历（PDF）",
        content:
          "5 年 B 端产品与运营经验，负责工作台流程梳理、数据看板设计、用户访谈与增长实验。曾推动客服工作台与知识库协同改版，提升一线处理效率与转化表现。",
        targetIntent: "增长产品经理",
        sourceType: "pdf",
        fileName: "demo-growth-resume.pdf",
        fileUrl:
          "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHNbMyAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMzAwIDE0NF0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDY2Pj5zdHJlYW0KQlQKL0YxIDE4IFRmCjQwIDkwIFRkCihKb2JMb29wIERlbW8gUERGKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAgbiAKMDAwMDAwMDI0NyAwMDAwMCBuIAowMDAwMDAwMzYzIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNDUzCiUlRU9G",
        extractionStatus: "success",
        extractionMethod: "pdf-text",
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
    ],
    resumeVersions: [
      {
        id: "demo-resume-ai",
        sourceResumeId: "demo-source-pasted",
        name: "AI 产品通用版",
        targetDirection: "AI 产品经理方向",
        rewriteFocus: "强调 AI 功能落地、需求拆解、跨团队协作和数据复盘。",
        content:
          "一、个人优势\n- AI 产品推进：负责过 AI 辅助写作工具从 0 到 1 上线，覆盖需求拆解、Prompt 体验与上线复盘。\n- B 端工作台经验：熟悉后台流程、需求优先级和跨团队推进。\n\n二、教育背景\n- 本科，信息管理相关专业\n\n三、项目经历\n- AI 内容生成工具：负责需求调研、流程设计、功能上线与迭代复盘。\n\n四、工作经验\n- 产品经理：推进 B 端工作台、增长实验与用户反馈闭环。\n\n五、技能证书\n- PRD、原型、数据分析、用户研究",
        status: "saved",
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      {
        id: "demo-resume-growth",
        sourceResumeId: "demo-source-pdf",
        name: "增长产品基础版",
        targetDirection: "增长产品经理方向",
        rewriteFocus: "强调增长实验、转化漏斗、用户调研和数据指标分析。",
        content:
          "一、个人优势\n- 增长实验：持续跟踪转化漏斗与活动效果，复盘投放与路径优化。\n- 运营协同：能将业务问题拆成流程、策略与看板改进项。\n\n二、教育背景\n- 本科，市场营销相关专业\n\n三、项目经历\n- 客服工作台改版：梳理流程、联动知识库和数据看板，提升处理效率。\n\n四、工作经验\n- 产品运营：负责增长策略、活动实验、数据监测和协同推进。\n\n五、技能证书\n- SQL、Excel、活动策划、用户访谈",
        status: "saved",
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
    ],
    jdBatches: [
      {
        id: "demo-batch-1",
        title: "示例岗位分析 1",
        jobIds: ["demo-job-1", "demo-job-2"],
        createdAt: demoTimestamp,
      },
    ],
    jobs: [
      {
        id: "demo-job-1",
        batchId: "demo-batch-1",
        companyName: "LoopAI",
        jobTitle: "AI 产品经理",
        jobUrl: "https://example.com/jobs/loopai-pm",
        jdText:
          "负责 AI 工作台与业务流程产品规划，推进需求分析、原型设计、跨团队协同与上线迭代。需要 3 年以上 B 端或 AI 产品经验，熟悉数据分析与用户调研。",
        companyInfo:
          "AI 工作流工具公司，处于成长阶段，主打企业知识与自动化助手。",
        processingStatus: "ready",
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
      {
        id: "demo-job-2",
        batchId: "demo-batch-1",
        companyName: "星流科技",
        jobTitle: "增长产品经理",
        jobUrl: "https://example.com/jobs/xingliu-growth",
        jdText:
          "负责用户增长、转化漏斗优化、活动实验与数据复盘。要求具备增长策略、数据指标体系与跨团队推进能力。",
        companyInfo: "SaaS 增长服务公司，强调商业化和用户转化效率。",
        processingStatus: "ready",
        createdAt: demoTimestamp,
        updatedAt: demoTimestamp,
      },
    ],
    analysisResults: [
      {
        id: "demo-analysis-1",
        jobId: "demo-job-1",
        recommendedResumeVersionId: "demo-resume-ai",
        matchScore: 84,
        scoreBreakdown: {
          industryMatch: 82,
          companyStrength: 78,
          roleMatch: 88,
          salaryCompetitiveness: 72,
          growthPotential: 86,
        },
        applyDecision: "recommend",
        needsTailoring: true,
        mainRisk: "业务场景偏企业知识管理，需要补足行业表达。",
        summary:
          "岗位方向高度一致，适合优先投递，但建议补强企业知识库与流程自动化表述。",
        status: "ready",
        createdAt: demoTimestamp,
      },
      {
        id: "demo-analysis-2",
        jobId: "demo-job-2",
        recommendedResumeVersionId: "demo-resume-growth",
        matchScore: 76,
        scoreBreakdown: {
          industryMatch: 70,
          companyStrength: 74,
          roleMatch: 79,
          salaryCompetitiveness: 68,
          growthPotential: 83,
        },
        applyDecision: "cautious",
        needsTailoring: true,
        mainRisk: "增长实验经验有基础，但商业化策略案例还不够强。",
        summary: "可投，但最好先微调成增长导向表述，强化转化漏斗与实验结果。",
        status: "ready",
        createdAt: demoTimestamp,
      },
    ],
    detailAnalyses: [
      {
        id: "demo-detail-1",
        jobId: "demo-job-1",
        analysisResultId: "demo-analysis-1",
        conclusion:
          "值得优先投递，核心匹配在 AI 产品落地与 B 端流程经验，主要短板是行业场景表达仍可更贴近企业知识管理。",
        report:
          "## 公司解读\nLoopAI 属于企业 AI 工作流工具方向，强调知识组织与业务自动化。\n\n## 岗位画像\n岗位更偏 B 端 AI 产品经理，需要能够把需求调研、流程设计和上线迭代串起来。\n\n## 匹配分析\n你在 AI 辅助写作和工作台产品方面已有直接经验，强项在需求拆解、Prompt 体验和跨团队推进。需要补足的是把既有经验翻译成企业知识与流程自动化语言。\n\n## 风险与机会\n机会在于岗位方向高度一致，风险在于行业理解的外显度还不够。",
        scoreBreakdownReasons: {
          industryMatch: "已有 AI 与 B 端经验，行业迁移成本较低。",
          companyStrength: "成长型公司，方向明确但规模信息有限。",
          roleMatch: "职责与既有产品推进经历高度贴合。",
          salaryCompetitiveness: "JD 未写清薪资，按中性偏上估计。",
          growthPotential: "AI 工具赛道仍有成长空间。",
        },
        outreachMessage:
          "您好，我过去负责过 AI 工具与 B 端工作台的从 0 到 1 与迭代优化，和贵司岗位在需求拆解、流程设计和跨团队协作上匹配度较高，希望进一步交流。",
        interviewPrep: [
          "准备 1 个 AI 产品从 0 到 1 的完整案例。",
          "准备 1 个指标复盘与迭代决策案例。",
          "准备如何把用户反馈转成需求优先级的表达。",
        ],
        createdAt: demoTimestamp,
      },
    ],
    tailoredResumes: [
      {
        id: "demo-tailored-1",
        jobId: "demo-job-1",
        sourceResumeVersionId: "demo-resume-ai",
        title: "LoopAI / AI 产品经理微调版",
        tailoringNotes: [
          "把 AI 辅助写作经验改写为企业知识流程与助手场景。",
          "强化工作台、流程、权限与上线协同表达。",
          "补一句针对企业知识管理产品的业务理解。",
        ],
        content: "这是示例微调版简历正文，实际使用时会根据岗位信息生成。",
        createdAt: demoTimestamp,
      },
    ],
    aiOutputs: [],
  };
}
