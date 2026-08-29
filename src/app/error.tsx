"use client";

/**
 * 全局错误边界。
 * 任何未被子级 error.tsx 捕获的运行时错误都会在这里展示。
 */
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-semibold">出了点问题</h2>
        <p className="text-sm text-text-tertiary">
          页面遇到了意外错误，可以尝试重新加载。
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
