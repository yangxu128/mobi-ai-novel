export default function Loading() {
  return (
    <div className="container py-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-neutral-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-neutral-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-neutral-100 rounded animate-pulse" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-white border border-neutral-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
