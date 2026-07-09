export async function POST(request: Request) {
  void request;

  return Response.json(
    {
      error:
        "批量同步分析入口已降级。请改用新的岗位分析流程：先创建岗位卡片，再逐个调用 job-enrich 与 job-score。",
    },
    { status: 410 },
  );
}
