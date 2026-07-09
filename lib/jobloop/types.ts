export type ResumeVersionStatus = "draft" | "saved";

export type ApplyDecision = "recommend" | "cautious" | "not_recommended";

export type ResumeSourceType = "pasted" | "pdf";

export type ResumeExtractionStatus = "pending" | "success" | "failed";

export type JobProcessingStatus =
  | "draft"
  | "extracting_jd"
  | "enriching"
  | "scoring"
  | "ready"
  | "failed";

export type AiOutputType =
  | "resume_versions"
  | "batch_analysis"
  | "job_detail_analysis"
  | "tailored_resume";

export type SourceResume = {
  id: string;
  title: string;
  content: string;
  targetIntent?: string;
  sourceType?: ResumeSourceType;
  fileName?: string;
  fileUrl?: string;
  extractionStatus?: ResumeExtractionStatus;
  extractionMethod?: "pdf-text";
  createdAt: string;
  updatedAt: string;
};

export type ResumeVersion = {
  id: string;
  sourceResumeId: string;
  name: string;
  targetDirection: string;
  rewriteFocus: string;
  content: string;
  status: ResumeVersionStatus;
  createdAt: string;
  updatedAt: string;
};

export type JdBatch = {
  id: string;
  title: string;
  jobIds: string[];
  createdAt: string;
};

export type StructuredJd = {
  companyName: string;
  jobTitle: string;
  salaryRange?: string;
  responsibilities: string[];
  skillRequirements: string[];
  experienceRequirement?: string;
  educationRequirement?: string;
  location?: string;
  benefits: string[];
  sourceUrl?: string;
  rawSummary: string;
};

export type CompanyResearch = {
  industry?: string;
  companyScale?: string;
  mainBusiness?: string;
  keyProducts: string[];
  reputation?: string;
  summary: string;
  searchedAt: string;
  citations?: Array<{
    title: string;
    url: string;
  }>;
};

export type JobJd = {
  id: string;
  batchId: string;
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  jdText: string;
  companyInfo?: string;
  structuredJd?: StructuredJd;
  companyResearch?: CompanyResearch;
  processingStatus?: JobProcessingStatus;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
};

export type ScoreBreakdown = {
  industryMatch: number;
  companyStrength: number;
  roleMatch: number;
  salaryCompetitiveness: number;
  growthPotential: number;
};

export type ScoreBreakdownReasons = {
  industryMatch: string;
  companyStrength: string;
  roleMatch: string;
  salaryCompetitiveness: string;
  growthPotential: string;
};

export type JobAnalysisResult = {
  id: string;
  jobId: string;
  recommendedResumeVersionId: string;
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  applyDecision: ApplyDecision;
  needsTailoring: boolean;
  mainRisk: string;
  summary: string;
  status?: JobProcessingStatus;
  errorMessage?: string;
  createdAt: string;
};

export type JobDetailAnalysis = {
  id: string;
  jobId: string;
  analysisResultId: string;
  conclusion: string;
  report: string;
  scoreBreakdownReasons: ScoreBreakdownReasons;
  outreachMessage: string;
  interviewPrep: string[];
  strengths?: string[];
  gaps?: string[];
  recommendedActions?: string[];
  createdAt: string;
};

export type TailoredResume = {
  id: string;
  jobId: string;
  sourceResumeVersionId: string;
  title: string;
  tailoringNotes: string[];
  content?: string;
  createdAt: string;
};

export type AiOutput = {
  id: string;
  type: AiOutputType;
  provider?: string;
  model?: string;
  sourceResumeId?: string;
  resumeVersionIds: string[];
  jobIds: string[];
  inputSummary: string;
  outputRefId: string;
  createdAt: string;
};

export type JobLoopState = {
  sourceResumes: SourceResume[];
  resumeVersions: ResumeVersion[];
  jdBatches: JdBatch[];
  jobs: JobJd[];
  analysisResults: JobAnalysisResult[];
  detailAnalyses: JobDetailAnalysis[];
  tailoredResumes: TailoredResume[];
  aiOutputs: AiOutput[];
};
