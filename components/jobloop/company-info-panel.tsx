import type { CompanyResearch } from "@/lib/jobloop/types";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./glass-panel";

export function CompanyInfoPanel({
  value,
  research,
  onChange,
  compact = false,
  className,
}: {
  value?: string;
  research?: CompanyResearch;
  onChange?: (value: string) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <GlassPanel
      intensity="card"
      className={cn("flex h-full flex-col", compact ? "p-4" : "p-5", className)}
    >
      <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
        公司补充信息
      </p>
      <h3 className="mt-1 text-base font-semibold text-white">公司补充信息</h3>
      {onChange ? (
        <>
          <p className="mt-3 text-xs leading-5 text-white/52">
            这里先保留人工补充入口，后续会替换为联网搜索后整理的结构化公司信息。
          </p>
          <textarea
            className="mt-4 min-h-24 w-full rounded-md border border-white/18 bg-black/18 p-3 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-cyan-200/70"
            onChange={(event) => onChange(event.target.value)}
            placeholder="行业、规模、主营业务、主要产品、公司风评、来源备注..."
            value={value ?? ""}
          />
        </>
      ) : (
        <div className="mt-3 space-y-3 text-sm leading-7 text-white/66">
          <InfoRow label="从属行业" value={research?.industry} />
          <InfoRow label="公司规模" value={research?.companyScale} />
          <InfoRow label="主营业务" value={research?.mainBusiness} />
          <InfoRow
            label="主要产品"
            value={research?.keyProducts?.filter(Boolean).join("、")}
          />
          <InfoRow label="公司风评" value={research?.reputation} />
          <div className="rounded-md border border-white/12 bg-white/6 p-3">
            <p className="text-sm font-semibold text-white">补充摘要</p>
            <p className="mt-2 text-sm leading-7 text-white/66">
              {research?.summary ||
                value ||
                "暂未补充公司信息。这里后续将承载联网搜索整理后的行业、规模、主营业务、主要产品和公司风评摘要。"}
            </p>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-white/12 bg-white/6 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/66">
        {value || "待补充"}
      </p>
    </div>
  );
}
