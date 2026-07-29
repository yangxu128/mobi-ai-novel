export default function Loading() {
  return (
    <div className="container py-4 space-y-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-neutral-100 rounded animate-pulse" />
          <div className="h-7 w-32 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-56 bg-neutral-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-48 bg-neutral-100 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 h-[calc(100vh-14rem)] space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="h-7 w-7 rounded-full bg-neutral-100 animate-pulse" />
              <div className="hidden md:block space-y-1">
                <div className="h-4 w-12 bg-neutral-100 rounded animate-pulse" />
                <div className="hidden lg:block h-3 w-20 bg-neutral-100 rounded animate-pulse" />
              </div>
              {i < 6 && <div className="flex-1 h-px mx-2 bg-neutral-100" />}
            </div>
          ))}
        </div>
        <div className="h-32 bg-neutral-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-neutral-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
