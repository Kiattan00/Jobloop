# 数据模型：JobLoop P0

## 原始简历

**作用**：用户最初录入的完整简历内容，是生成基础简历版本的来源。

**关键字段**：

- `id`：唯一标识
- `title`：用户可识别的名称，例如“原始简历”
- `content`：完整简历正文
- `createdAt`：创建时间
- `updatedAt`：更新时间

**验证规则**：

- `content` 不能为空
- 生成基础简历版本前必须存在至少一份原始简历

## 基础简历版本

**作用**：面向不同岗位方向的可复用简历版本，由 AI 生成草稿并经用户确认保存，也可由用户编辑。

**关键字段**：

- `id`：唯一标识
- `sourceResumeId`：来源原始简历
- `name`：版本名称，例如“AI 产品经理版”
- `targetDirection`：适用岗位方向
- `rewriteFocus`：改写重点
- `content`：完整简历正文
- `status`：`draft`、`saved`
- `createdAt`：创建时间
- `updatedAt`：更新时间

**关系**：

- 一个原始简历可以生成多个基础简历版本
- 一个基础简历版本可以被多个岗位分析结果推荐
- 一个基础简历版本可以派生多个岗位微调版

**验证规则**：

- 保存到简历库前必须经用户确认
- `saved` 状态版本不得被 AI 静默覆盖

**状态流转**：

```text
draft -> saved
saved -> saved（用户手动编辑后仍为已保存版本）
```

## 批量 JD 输入

**作用**：用户一次提交的多个 JD 集合，用于批量解析和分析。

**关键字段**：

- `id`：唯一标识
- `title`：批次名称，可自动生成
- `jobIds`：本批次包含的岗位 JD
- `createdAt`：创建时间

**关系**：

- 一个批量 JD 输入包含多个岗位 JD

**验证规则**：

- 至少包含一个可分析的岗位 JD

## 岗位 JD

**作用**：单个岗位的输入记录，是岗位分析的核心输入。

**关键字段**：

- `id`：唯一标识
- `batchId`：所属批量 JD 输入
- `companyName`：公司名称，可为空但需提示缺失
- `jobTitle`：岗位名称
- `jobUrl`：岗位链接，可选
- `jdText`：JD 正文
- `companyInfo`：用户粘贴的公司补充信息，可选
- `createdAt`：创建时间
- `updatedAt`：更新时间

**关系**：

- 一个岗位 JD 对应一个岗位分析结果
- 一个岗位 JD 可以对应一个单岗位完整分析
- 一个岗位 JD 可以对应多个 AI 输出记录

**验证规则**：

- `jdText` 是 P0 分析主输入；只有链接但无 JD 正文时应提示用户补充正文
- `companyInfo` 为空时不阻塞分析

## 岗位分析结果

**作用**：用于总览页比较多个岗位的决策级摘要。

**关键字段**：

- `id`：唯一标识
- `jobId`：来源岗位 JD
- `recommendedResumeVersionId`：推荐基础简历版本
- `matchScore`：匹配分
- `applyDecision`：`recommend`、`cautious`、`not_recommended`
- `needsTailoring`：是否需要微调
- `mainRisk`：主要风险
- `summary`：一句话结论
- `createdAt`：创建时间

**关系**：

- 一个岗位分析结果必须绑定一个岗位 JD
- 一个岗位分析结果必须绑定推荐基础简历版本
- 一个岗位分析结果可进入单岗位完整分析

**验证规则**：

- `matchScore` 应可被用户理解为岗位匹配程度
- `applyDecision` 必须能直接支持投递优先级判断

## 单岗位完整分析

**作用**：详情页展示的完整岗位分析内容。

**关键字段**：

- `id`：唯一标识
- `jobId`：来源岗位 JD
- `analysisResultId`：来源岗位分析结果
- `conclusion`：结论
- `strengths`：关键优势
- `gaps`：风险缺口
- `recommendedActions`：建议行动
- `outreachMessage`：打招呼话术
- `interviewPrep`：投递前面试准备建议
- `createdAt`：创建时间

**关系**：

- 一个单岗位完整分析绑定一个岗位 JD 和一个岗位分析结果

**验证规则**：

- 内容必须分区展示，不得只保存为单段长文本
- 打招呼话术与面试建议必须基于当前岗位 JD 和推荐简历版本

## 岗位微调版

**作用**：针对某个岗位，从推荐基础简历版本派生出的微调建议或微调正文。

**关键字段**：

- `id`：唯一标识
- `jobId`：来源岗位 JD
- `sourceResumeVersionId`：来源基础简历版本
- `title`：微调版本名称
- `tailoringNotes`：微调建议
- `content`：微调版简历正文，可选
- `createdAt`：创建时间

**关系**：

- 一个岗位微调版必须绑定岗位 JD
- 一个岗位微调版必须绑定来源基础简历版本

**验证规则**：

- 不得覆盖来源基础简历版本
- 必须让用户看出该微调版来自哪份基础简历和哪个 JD

## AI 输出

**作用**：所有 AI 生成内容的追溯记录。

**关键字段**：

- `id`：唯一标识
- `type`：`resume_versions`、`batch_analysis`、`job_detail_analysis`、`tailored_resume`
- `sourceResumeId`：可选来源原始简历
- `resumeVersionIds`：相关基础简历版本
- `jobIds`：相关岗位 JD
- `inputSummary`：输入摘要
- `outputRefId`：生成结果对应实体
- `createdAt`：创建时间

**验证规则**：

- 每条 AI 输出必须能追溯到至少一种来源：原始简历、基础简历版本、岗位 JD、公司补充信息或岗位分析结果
- AI 输出不得直接替用户执行投递或覆盖已保存版本
