/**
 * 项目工作区加载骨架屏。
 * SSR 查询项目数据期间展示，避免白屏。
 */
export default function Loading() {
  return (
    <div className="h-[100dvh] flex flex-col">
      {/* 顶栏骨架 */}
      <div className="h-14 border-b border-border-neutral-l1 bg-bg-base-default flex items-center px-4 gap-2">
        <div className="h-6 w-32 bg-bg-overlay-l1 rounded animate-pulse" />
        <div className="flex-1" />
        <div className="h-8 w-20 bg-bg-overlay-l1 rounded-lg animate-pulse" />
        <div className="h-8 w-20 bg-bg-overlay-l1 rounded-lg animate-pulse" />
        <div className="h-8 w-20 bg-bg-overlay-l1 rounded-lg animate-pulse" />
      </div>
      {/* 内容区骨架 */}
      <div className="flex-1 bg-bg-base-default p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-bg-overlay-l1 rounded animate-pulse" />
          <div className="h-4 w-full bg-bg-overlay-l1 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-bg-overlay-l1 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-bg-overlay-l1 rounded animate-pulse" />
          <div className="h-32 w-full bg-bg-overlay-l1 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
