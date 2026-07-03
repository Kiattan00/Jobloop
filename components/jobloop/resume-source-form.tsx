"use client";

import { sampleSourceResume } from "@/lib/jobloop/seed-data";

export function ResumeSourceForm({
  value,
  onChange,
  targetIntent,
  onIntentChange,
}: {
  value: string;
  onChange: (value: string) => void;
  targetIntent: string;
  onIntentChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-3 text-sm font-medium text-white/72">
        原始简历
        <textarea
          className="min-h-52 w-full resize-y rounded-md border border-white/24 bg-white/12 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/42 focus:border-cyan-300/80 focus:bg-white/16 focus:ring-3 focus:ring-cyan-300/16"
          onChange={(event) => onChange(event.target.value)}
          placeholder={sampleSourceResume}
          value={value}
        />
      </label>

      <label className="grid gap-3 text-sm font-medium text-white/72">
        意向行业 / 岗位（单次仅输入 1 个目标岗位）
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-white/24 bg-white/12 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/42 focus:border-cyan-300/80 focus:bg-white/16 focus:ring-3 focus:ring-cyan-300/16"
          onChange={(event) => onIntentChange(event.target.value)}
          placeholder="例如：政务售前工程师"
          value={targetIntent}
        />
      </label>
    </div>
  );
}
