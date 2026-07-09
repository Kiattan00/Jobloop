"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionAdvicePanels } from "@/components/jobloop/action-advice-panels";
import { AiOutputTrace } from "@/components/jobloop/ai-output-trace";
import { JobAnalysisDetail } from "@/components/jobloop/job-analysis-detail";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import { EmptyState } from "@/components/jobloop/page-chrome";
import { TailoredResumePanel } from "@/components/jobloop/tailored-resume-panel";
import {
  getJobLoopState,
  saveDetailAnalysis,
  saveTailoredResume,
} from "@/lib/jobloop/storage";
import { fetchWithSupabaseAuth } from "@/lib/jobloop/supabase-browser";
import type {
  AiOutput,
  JobDetailAnalysis,
  JobLoopState,
  TailoredResume,
} from "@/lib/jobloop/types";

export default function AnalysisDetailPage() {
  const params = useParams<{ jobId: string }>();
  const [state, setState] = useState<JobLoopState | null>(null);
  const [loading, setLoading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const current = getJobLoopState();
      const job = current.jobs.find((item) => item.id === params.jobId);
      const result = current.analysisResults.find(
        (item) => item.jobId === params.jobId,
      );
      const resumeVersion = current.resumeVersions.find(
        (item) => item.id === result?.recommendedResumeVersionId,
      );
      const existingDetail = current.detailAnalyses.find(
        (item) => item.jobId === params.jobId,
      );

      if (!job || !result) {
        setState(current);
        return;
      }

      if (result.status && result.status !== "ready") {
        setState(current);
        return;
      }

      if (!existingDetail) {
        setLoading(true);
        try {
          const response = await fetchWithSupabaseAuth("/api/ai/job-detail", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              job,
              result,
              resumeVersion,
            }),
          });
          const data = (await response.json()) as {
            detail?: JobDetailAnalysis;
            aiOutput?: AiOutput;
            error?: string;
          };

          if (!response.ok || !data.detail) {
            throw new Error(data.error || "单岗位分析生成失败，请稍后重试。");
          }

          saveDetailAnalysis(data.detail, data.aiOutput);
          setState(getJobLoopState());
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "单岗位分析生成失败，请稍后重试。",
          );
          setState(current);
        } finally {
          setLoading(false);
        }
        return;
      }

      setState(current);
    };

    void bootstrap();
  }, [params.jobId]);

  if (state === null) {
    return (
      <JobLoopShell active="/analyses">
        <div className="grid min-h-[720px] gap-6">
          <div className="rounded-lg border border-white/18 bg-white/10 p-5 text-sm text-white/72 backdrop-blur-2xl">
            正在加载岗位详情...
          </div>
        </div>
      </JobLoopShell>
    );
  }

  const job = state.jobs.find((item) => item.id === params.jobId);
  const result = state.analysisResults.find(
    (item) => item.jobId === params.jobId,
  );
  const resumeVersion = state.resumeVersions.find(
    (version) => version.id === result?.recommendedResumeVersionId,
  );
  const detail = state.detailAnalyses.find(
    (item) => item.jobId === params.jobId,
  );
  const tailoredResume = state.tailoredResumes.find(
    (item) => item.jobId === params.jobId,
  );
  const traceOutputs =
    state.aiOutputs.filter(
      (output) =>
        output.jobIds.includes(params.jobId) ||
        output.outputRefId === detail?.id ||
        output.outputRefId === tailoredResume?.id,
    ) ?? [];

  if (!job || !result) {
    return (
      <JobLoopShell active="/analyses">
        <EmptyState
          actionHref="/analyses"
          actionLabel="返回岗位分析"
          description="没有找到该岗位的分析结果，可能是本地数据已清空。"
          title="单岗位分析不存在"
        />
      </JobLoopShell>
    );
  }

  const canGenerateTailored =
    result.status === "ready" &&
    Boolean(resumeVersion) &&
    result.needsTailoring &&
    result.matchScore >= 70;
  const tailoredHelperText = tailoredResume
    ? undefined
    : result.status !== "ready"
      ? "请先等待岗位评分与详情报告准备完成，再决定是否生成微调版。"
      : !result.needsTailoring
        ? "当前岗位匹配度已足够，不建议优先生成微调版。"
        : result.matchScore < 70
          ? "当前岗位综合价值偏谨慎，建议先确认是否值得投入微调成本。"
          : "该岗位值得继续优化，建议生成微调版后再投递。";

  const generateTailored = async () => {
    if (!job || !resumeVersion || !canGenerateTailored) {
      return;
    }

    setTailoring(true);
    setError(null);

    try {
      const response = await fetchWithSupabaseAuth("/api/ai/tailored-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job,
          resumeVersion,
          detail,
        }),
      });
      const data = (await response.json()) as {
        tailoredResume?: TailoredResume;
        aiOutput?: AiOutput;
        error?: string;
      };

      if (!response.ok || !data.tailoredResume) {
        throw new Error(data.error || "微调简历生成失败，请稍后重试。");
      }

      saveTailoredResume(data.tailoredResume, data.aiOutput);
      setState(getJobLoopState());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "微调简历生成失败，请稍后重试。",
      );
    } finally {
      setTailoring(false);
    }
  };

  return (
    <JobLoopShell active="/analyses">
      <div className="grid min-h-[720px] gap-6">
        <Link
          className="text-sm font-semibold text-cyan-100/80 hover:text-cyan-50"
          href="/analyses"
        >
          ← 返回岗位分析
        </Link>

        {loading ? (
          <div className="rounded-lg border border-cyan-200/30 bg-cyan-300/10 p-5 text-sm text-cyan-50">
            正在调用 AI 生成单岗位完整分析...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200/25 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {detail ? (
          <>
            <JobAnalysisDetail
              detail={detail}
              job={job}
              result={result}
              resumeVersion={resumeVersion}
            />
            <TailoredResumePanel
              canGenerate={canGenerateTailored}
              helperText={tailoredHelperText}
              onGenerate={() => void generateTailored()}
              tailoredResume={tailoredResume}
            />
            {tailoring ? (
              <div className="rounded-lg border border-cyan-200/30 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                正在生成岗位微调简历...
              </div>
            ) : null}
            <ActionAdvicePanels detail={detail} />
            <AiOutputTrace
              job={job}
              outputs={traceOutputs}
              resumeVersion={resumeVersion}
            />
          </>
        ) : (
          <EmptyState
            actionHref="/analyses"
            actionLabel="返回岗位分析"
            description={
              result.status === "failed"
                ? result.errorMessage ||
                  "当前岗位分析失败，请稍后重新发起分析。"
                : "当前岗位还没有完成单岗位分析生成，请等待卡片状态变为已完成后再查看详情。"
            }
            title={
              result.status === "failed" ? "岗位分析失败" : "正在准备详情内容"
            }
          />
        )}
      </div>
    </JobLoopShell>
  );
}
