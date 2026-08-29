"use client";

/**
 * 项目工作区错误边界。
 * 捕获 ProjectWorkspace 及其子组件的运行时错误。
 */
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProjectError]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-semibold">项目加载失败</h2>
        <p className="text-sm text-text-tertiary">
          {error.message || "无法加载项目数据，请稍后重试。"}
        </p>
        {error.digest && (
          <p className="text-xs text-text-tertiary/60">错误编号：{error.digest}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} className="bg-bg-brand text-text-onbrand hover:bg-bg-brand-hover">
            重试
          </Button>
          <Button
            variant="outline"
            className="border-border-neutral-l2"
            onClick={() => (window.location.href = "/projects")}
          >
            返回项目列表
          </Button>
        </div>
      </div>
    </div>
  );
}
