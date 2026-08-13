import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { copy } from "@/lib/copy";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-void px-6 text-center text-fog">
      <span className="text-ember" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-cjk text-lg font-semibold" lang="zh-Hant">
        {copy.errZh}
      </h1>
      <p className="font-display text-sm text-mist" lang="en">
        {copy.errEn}
      </p>
      <p className="max-w-md font-display text-sm break-words text-mist">
        {error.message || copy.reloadEn}
      </p>
    </main>
  );
}
