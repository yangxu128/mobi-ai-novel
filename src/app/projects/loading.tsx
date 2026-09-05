/**
 * /projects 路由骨架：与实际布局一致（侧边栏大卡 + 页头 + 卡片网格）
 */
export default function Loading() {
  return (
    <div className="flex min-h-full flex-wrap bg-[var(--bg-canvas)]">
      {/* 侧边栏骨架 */}
      <div className="hidden h-[100dvh] w-72 shrink-0 p-4 md:block">
        <div className="flex h-full flex-col rounded-3xl border border-border-neutral-l1 bg-bg-base-default p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-bg-overlay-l2 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-14 rounded bg-bg-overlay-l1 animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-bg-overlay-l1 animate-pulse" />
            </div>
          </div>
          <div className="mt-8 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 rounded-xl bg-bg-overlay-l1 animate-pulse" />
            ))}
          </div>
          <div className="mt-auto h-28 rounded-2xl bg-bg-overlay-l1 animate-pulse" />
        </div>
      </div>

      {/* 内容区骨架 */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="h-9 w-36 rounded bg-bg-overlay-l1 animate-pulse" />
              <div className="h-4 w-52 rounded bg-bg-overlay-l1 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-56 rounded-full bg-bg-overlay-l1 animate-pulse" />
              <div className="h-9 w-24 rounded-xl bg-bg-overlay-l1 animate-pulse" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl border border-border-neutral-l1 bg-bg-base-default p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded bg-bg-overlay-l2 animate-pulse" />
                  <div className="h-4 w-32 rounded bg-bg-overlay-l1 animate-pulse" />
                </div>
                <div className="mt-4 flex gap-1.5">
                  <div className="h-6 w-12 rounded-full bg-bg-overlay-l1 animate-pulse" />
                  <div className="h-6 w-20 rounded-full bg-bg-overlay-l1 animate-pulse" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-bg-overlay-l1 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-bg-overlay-l1 animate-pulse" />
                </div>
                <div className="mt-5 border-t border-border-neutral-l1 pt-3">
                  <div className="h-3 w-24 rounded bg-bg-overlay-l1 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
